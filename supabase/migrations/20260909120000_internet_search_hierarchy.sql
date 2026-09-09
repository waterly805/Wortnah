-- Guided Internet search hierarchy with companion-managed labels and exact final queries.
create table public.internet_search_choices (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.communication_spaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  option_key text not null check (option_key ~ '^[a-z0-9-]+$'),
  parent_key text,
  search_level smallint not null check (search_level between 1 and 4),
  label_de text not null check (char_length(btrim(label_de)) between 1 and 140),
  label_en text not null default '' check (char_length(label_en) <= 140),
  query_de text check (query_de is null or char_length(btrim(query_de)) between 1 and 300),
  query_en text check (query_en is null or char_length(btrim(query_en)) between 1 and 300),
  is_published boolean not null default true,
  sort_order integer not null default 1000 check (sort_order between 0 and 1000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, option_key),
  foreign key (space_id, parent_key) references public.internet_search_choices(space_id, option_key) on delete cascade,
  check ((search_level = 1 and parent_key is null) or (search_level > 1 and parent_key is not null))
);

comment on table public.internet_search_choices is
  'Companion-managed 1-4 level guided search. Final queries stay separate from the shared activity timeline.';

create index internet_search_choices_parent_order_idx
  on public.internet_search_choices (space_id, parent_key, sort_order)
  where is_published;

alter table public.internet_search_choices enable row level security;

create policy internet_search_choices_select on public.internet_search_choices
  for select to authenticated using ((select private.is_space_member(space_id)));
create policy internet_search_choices_insert on public.internet_search_choices
  for insert to authenticated with check (
    created_by = (select auth.uid())
    and (select private.has_space_role(space_id, array['companion']))
  );
create policy internet_search_choices_update on public.internet_search_choices
  for update to authenticated using ((select private.has_space_role(space_id, array['companion'])))
  with check ((select private.has_space_role(space_id, array['companion'])));
create policy internet_search_choices_delete on public.internet_search_choices
  for delete to authenticated using ((select private.has_space_role(space_id, array['companion'])));

grant select, insert, update, delete on public.internet_search_choices to authenticated;
grant all privileges on public.internet_search_choices to service_role;

create trigger internet_search_choices_set_updated_at before update on public.internet_search_choices
  for each row execute function private.set_updated_at();

create or replace function private.keep_search_choice_owner()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.space_id <> old.space_id or new.created_by <> old.created_by then
    raise exception 'Search choice ownership is immutable';
  end if;
  return new;
end;
$$;

create trigger internet_search_choices_keep_owner before update on public.internet_search_choices
  for each row execute function private.keep_search_choice_owner();

with catalog(option_key, parent_key, search_level, sort_order, label_de, label_en, query_de, query_en) as (
values
  ('information', null, 1, 10, 'Informationen', 'Information', null, null),
  ('places', null, 1, 20, 'Orte und Gesundheit', 'Places and health', null, null),
  ('travel', null, 1, 30, 'Wege und Fahrpläne', 'Routes and timetables', null, null),
  ('media', null, 1, 40, 'Musik und Videos', 'Music and videos', null, null),
  ('food-language', null, 1, 50, 'Kochen und Sprache', 'Cooking and language', null, null),
  ('search-help', null, 1, 60, 'Ergebnisse und Hilfe', 'Results and help', null, null),
  ('weather', 'information', 2, 10, 'Wetter', 'Weather', null, null),
  ('news', 'information', 2, 20, 'Nachrichten', 'News', null, null),
  ('television', 'information', 2, 30, 'Fernsehprogramm', 'TV guide', null, null),
  ('weather-time', 'weather', 3, 10, 'Zeit auswählen', 'Choose a time', null, null),
  ('weather-detail', 'weather', 3, 20, 'Temperatur oder Regen', 'Temperature or rain', null, null),
  ('weather-today', 'weather-time', 4, 10, 'Heute', 'Today', 'Wie wird das Wetter heute?', 'What will the weather be like today?'),
  ('weather-tomorrow', 'weather-time', 4, 20, 'Morgen', 'Tomorrow', 'Wie wird das Wetter morgen?', 'What will the weather be like tomorrow?'),
  ('weather-weekend', 'weather-time', 4, 30, 'Wochenende', 'Weekend', 'Wie wird das Wetter am Wochenende?', 'What will the weather be like this weekend?'),
  ('temperature-today', 'weather-detail', 4, 10, 'Wie warm wird es?', 'How warm will it be?', 'Wie warm wird es heute?', 'How warm will it be today?'),
  ('rain-today', 'weather-detail', 4, 20, 'Regnet es?', 'Will it rain?', 'Regnet es heute?', 'Will it rain today?'),
  ('news-today', 'news', 3, 10, 'Nachrichten heute', 'Today''s news', 'Was sind die Nachrichten von heute?', 'What is today''s news?'),
  ('news-germany', 'news', 3, 20, 'Neues aus Deutschland', 'News from Germany', 'Was gibt es Neues aus Deutschland?', 'What''s new in Germany?'),
  ('sports-news', 'news', 3, 30, 'Sportnachrichten', 'Sports news', 'Was gibt es Neues im Sport?', 'What''s new in sports?'),
  ('tv-today', 'television', 3, 10, 'Heute im Fernsehen', 'On TV today', 'Was läuft heute im Fernsehen?', 'What''s on TV today?'),
  ('show-find', 'television', 3, 20, 'Meine Sendung', 'My programme', 'Wann läuft meine Sendung?', 'When is my programme on?'),
  ('business', 'places', 2, 10, 'Geschäft und Kontakt', 'Business and contact', null, null),
  ('health-place', 'places', 2, 20, 'Arzt und Apotheke', 'Doctor and pharmacy', null, null),
  ('opening-hours', 'business', 3, 10, 'Öffnungszeiten', 'Opening hours', 'Wann hat dieses Geschäft geöffnet?', 'When is this business open?'),
  ('address', 'business', 3, 20, 'Adresse', 'Address', 'Wie lautet die Adresse?', 'What is the address?'),
  ('phone-number', 'business', 3, 30, 'Telefonnummer', 'Phone number', 'Wie lautet die Telefonnummer?', 'What is the phone number?'),
  ('doctor-find', 'health-place', 3, 10, 'Arztpraxis finden', 'Find a doctor''s office', 'Ich möchte eine Arztpraxis finden.', 'I want to find a doctor''s office.'),
  ('pharmacy-find', 'health-place', 3, 20, 'Nächste Apotheke', 'Nearest pharmacy', 'Wo ist die nächste Apotheke?', 'Where is the nearest pharmacy?'),
  ('pharmacy-emergency', 'health-place', 3, 30, 'Apotheken-Notdienst', 'Emergency pharmacy', 'Welche Apotheke hat Notdienst?', 'Which pharmacy is on emergency duty?'),
  ('route', 'travel', 2, 10, 'Weg finden', 'Find a route', null, null),
  ('public-transport', 'travel', 2, 20, 'Bus und Bahn', 'Bus and train', null, null),
  ('directions', 'route', 3, 10, 'Wie komme ich dorthin?', 'How do I get there?', 'Wie komme ich dorthin?', 'How do I get there?'),
  ('bus', 'public-transport', 3, 10, 'Nächster Bus', 'Next bus', 'Wann fährt der nächste Bus?', 'When is the next bus?'),
  ('train', 'public-transport', 3, 20, 'Nächster Zug', 'Next train', 'Wann fährt der nächste Zug?', 'When is the next train?'),
  ('timetable', 'public-transport', 3, 30, 'Fahrplan', 'Timetable', 'Ich möchte den Fahrplan sehen.', 'I want to see the timetable.'),
  ('watch', 'media', 2, 10, 'Film und Serie', 'Films and series', null, null),
  ('listen', 'media', 2, 20, 'Musik und Radio', 'Music and radio', null, null),
  ('film', 'watch', 3, 10, 'Film finden', 'Find a film', 'Ich möchte einen Film finden.', 'I want to find a film.'),
  ('series', 'watch', 3, 20, 'Serie finden', 'Find a series', 'Ich möchte eine Serie finden.', 'I want to find a series.'),
  ('video', 'watch', 3, 30, 'Video ansehen', 'Watch a video', 'Ich möchte ein Video ansehen.', 'I want to watch a video.'),
  ('music', 'listen', 3, 10, 'Musik hören', 'Listen to music', 'Ich möchte Musik hören.', 'I want to listen to music.'),
  ('radio', 'listen', 3, 20, 'Radio hören', 'Listen to radio', 'Ich möchte Radio hören.', 'I want to listen to the radio.'),
  ('cooking', 'food-language', 2, 10, 'Kochen', 'Cooking', null, null),
  ('language', 'food-language', 2, 20, 'Wörter verstehen', 'Understand words', null, null),
  ('recipe', 'cooking', 3, 10, 'Rezept finden', 'Find a recipe', 'Ich möchte ein Rezept finden.', 'I want to find a recipe.'),
  ('dish', 'cooking', 3, 20, 'Gericht kochen', 'Cook a dish', 'Wie koche ich dieses Gericht?', 'How do I cook this dish?'),
  ('translate', 'language', 3, 10, 'Wort übersetzen', 'Translate a word', 'Bitte übersetze dieses Wort.', 'Please translate this word.'),
  ('meaning', 'language', 3, 20, 'Bedeutung eines Wortes', 'Meaning of a word', 'Was bedeutet dieses Wort?', 'What does this word mean?'),
  ('images', 'language', 3, 30, 'Bilder dazu', 'Related pictures', 'Ich möchte Bilder dazu sehen.', 'I want to see pictures of it.'),
  ('display-results', 'search-help', 2, 10, 'Ergebnisse anzeigen', 'Show results', null, null),
  ('change-search', 'search-help', 2, 20, 'Suche ändern', 'Change search', null, null),
  ('large-text', 'display-results', 3, 10, 'Große Schrift', 'Large text', 'Bitte zeige die Ergebnisse in großer Schrift.', 'Please show the results in large text.'),
  ('read-results', 'display-results', 3, 20, 'Ergebnisse vorlesen', 'Read results aloud', 'Bitte lies mir die Ergebnisse vor.', 'Please read the results to me.'),
  ('continue-reading', 'display-results', 3, 30, 'Weiterlesen', 'Continue reading', 'Bitte lies weiter.', 'Please continue reading.'),
  ('explain-simple', 'display-results', 3, 40, 'Einfach erklären', 'Explain simply', 'Bitte erkläre das einfach.', 'Please explain that simply.'),
  ('search-again', 'change-search', 3, 10, 'Noch einmal suchen', 'Search again', 'Bitte suche noch einmal.', 'Please search again.'),
  ('other-results', 'change-search', 3, 20, 'Andere Ergebnisse', 'Other results', 'Bitte zeige andere Ergebnisse.', 'Please show other results.')
), companion_spaces as (
  select distinct on (sm.space_id) sm.space_id, sm.profile_id
  from public.space_members sm
  where sm.role = 'companion' and sm.is_active
  order by sm.space_id, sm.joined_at
)
insert into public.internet_search_choices (
  space_id, created_by, option_key, parent_key, search_level, sort_order,
  label_de, label_en, query_de, query_en, is_published
)
select cs.space_id, cs.profile_id, c.option_key, c.parent_key, c.search_level, c.sort_order,
       c.label_de, c.label_en, c.query_de, c.query_en, true
from companion_spaces cs cross join catalog c
on conflict (space_id, option_key) do nothing;

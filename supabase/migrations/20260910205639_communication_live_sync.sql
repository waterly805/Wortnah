-- Repair the pilot communication hierarchy so Admin and Werner share one canonical source.
with canonical as (
  select pap.space_id, pap.profile_id as admin_profile_id
  from public.pilot_access_profiles pap
  where pap.profile_key = 'admin1'
    and pap.space_id is not null
    and pap.profile_id is not null
), catalog(option_key, label_de, label_en, sort_order) as (
  values
    ('reply', 'Antworten', 'Replies', 10),
    ('request', 'Ich brauche etwas', 'I need something', 20),
    ('ask', 'Ich habe eine Frage', 'I have a question', 30),
    ('tell', 'Ich möchte etwas erzählen', 'I want to tell something', 40),
    ('express', 'So geht es mir', 'How I feel', 50),
    ('opinion', 'Meine Meinung und Entscheidung', 'My opinion and decision', 60)
)
insert into public.communication_custom_choices (
  space_id, created_by, option_key, choice_level, purpose_key, topic_key,
  label_de, label_en, is_published, practice_eligible, priority, sort_order, source_name
)
select
  canonical.space_id, canonical.admin_profile_id, catalog.option_key, 'purpose', null, null,
  catalog.label_de, catalog.label_en, true, false, 'high', catalog.sort_order,
  'Wortnah-Word-Database-First-Launch v2.0'
from canonical cross join catalog
on conflict (option_key) do nothing;

with canonical as (
  select pap.space_id
  from public.pilot_access_profiles pap
  where pap.profile_key = 'admin1' and pap.space_id is not null
), catalog(option_key, label_de, label_en, sort_order) as (
  values
    ('reply', 'Antworten', 'Replies', 10),
    ('request', 'Ich brauche etwas', 'I need something', 20),
    ('ask', 'Ich habe eine Frage', 'I have a question', 30),
    ('tell', 'Ich möchte etwas erzählen', 'I want to tell something', 40),
    ('express', 'So geht es mir', 'How I feel', 50),
    ('opinion', 'Meine Meinung und Entscheidung', 'My opinion and decision', 60)
)
update public.communication_custom_choices choice
set label_de = catalog.label_de,
    label_en = catalog.label_en,
    choice_level = 'purpose',
    purpose_key = null,
    topic_key = null,
    is_published = true,
    priority = 'high',
    sort_order = catalog.sort_order,
    source_name = 'Wortnah-Word-Database-First-Launch v2.0',
    updated_at = now()
from canonical, catalog
where choice.space_id = canonical.space_id
  and choice.option_key = catalog.option_key;

-- Preserve companion-created content that landed in an older pilot space.
-- A deterministic recovered key makes the repair safe to run more than once.
with canonical as (
  select pap.space_id, pap.profile_id as admin_profile_id
  from public.pilot_access_profiles pap
  where pap.profile_key = 'admin1'
    and pap.space_id is not null
    and pap.profile_id is not null
), recoverable as (
  select old.*
  from public.communication_custom_choices old, canonical
  where old.space_id <> canonical.space_id
    and old.source_name = 'Wortnah Admin'
    and not exists (
      select 1
      from public.communication_custom_choices current
      where current.space_id = canonical.space_id
        and current.choice_level = old.choice_level
        and current.label_de = old.label_de
        and current.purpose_key is not distinct from old.purpose_key
        and current.topic_key is not distinct from old.topic_key
    )
)
insert into public.communication_custom_choices (
  space_id, created_by, option_key, choice_level, purpose_key, topic_key,
  label_de, label_en, is_published, practice_eligible, priority, sort_order, source_name
)
select
  canonical.space_id, canonical.admin_profile_id,
  'recovered_' || replace(recoverable.id::text, '-', ''),
  recoverable.choice_level, recoverable.purpose_key, recoverable.topic_key,
  recoverable.label_de, recoverable.label_en, recoverable.is_published,
  recoverable.practice_eligible, recoverable.priority, recoverable.sort_order,
  'Wortnah Admin'
from recoverable cross join canonical
on conflict (option_key) do nothing;

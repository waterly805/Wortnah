-- Expands the existing companion-controlled patient setting from 8 to 12.
-- The application continues to allow only the explicit values 2, 4, 6, 8, 10, and 12.
alter table public.profile_preferences
  drop constraint if exists profile_preferences_choice_count_check;

alter table public.profile_preferences
  add constraint profile_preferences_choice_count_check
  check (choice_count in (2, 4, 6, 8, 10, 12));

alter table public.space_settings
  drop constraint if exists space_settings_visible_topic_count_check;

alter table public.space_settings
  add constraint space_settings_visible_topic_count_check
  check (visible_topic_count in (2, 4, 6, 8, 10, 12));

update public.space_settings
set visible_topic_count = 12,
    updated_at = now()
where space_id in (
  select space_id
  from public.pilot_access_profiles
  where profile_key = 'werner'
);

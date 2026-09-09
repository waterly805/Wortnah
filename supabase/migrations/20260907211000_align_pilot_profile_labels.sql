-- Keeps the three fixed pilot profile names consistent across the access,
-- profile, and membership records. Safe to repeat after manual alignment.
update public.pilot_access_profiles
set label = case profile_key
  when 'admin1' then 'Admin 1'
  when 'admin2' then 'Admin 2'
  else label
end
where profile_key in ('admin1', 'admin2');

update public.profiles as profile
set display_name = case pilot.profile_key
  when 'admin1' then 'Admin 1'
  when 'admin2' then 'Admin 2'
  else profile.display_name
end
from public.pilot_access_profiles as pilot
where pilot.profile_id = profile.id
  and pilot.profile_key in ('admin1', 'admin2');

update public.space_members as membership
set label = case pilot.profile_key
  when 'admin1' then 'Admin 1'
  when 'admin2' then 'Admin 2'
  else membership.label
end
from public.pilot_access_profiles as pilot
where pilot.profile_id = membership.profile_id
  and pilot.space_id = membership.space_id
  and pilot.profile_key in ('admin1', 'admin2');

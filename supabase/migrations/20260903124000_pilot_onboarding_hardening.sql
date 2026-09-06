create index space_invites_created_by_idx on public.space_invites (created_by);
create index space_invites_used_by_idx on public.space_invites (used_by) where used_by is not null;

create policy profile_access_no_client_table_access on public.profile_access
  for all to authenticated using (false) with check (false);

create policy space_invites_no_client_table_access on public.space_invites
  for all to authenticated using (false) with check (false);

alter function public.bootstrap_companion_space() security invoker;

comment on table public.trusted_devices is
  'Server-managed trusted device records. Device tokens are hashes; daily PIN verifiers are salted hashes in profile_access.';

comment on function public.create_user_invite() is
  'Intentional authenticated RPC. Verifies companion membership, permits only one active primary user, and returns a short-lived single-use code.';
comment on function public.accept_user_invite(text) is
  'Intentional authenticated RPC. Accepts only an unexpired single-use hashed invite and creates the primary-user membership.';
comment on function public.set_access_pin(text) is
  'Intentional authenticated RPC. Restricts PINs to four digits and stores a salted bcrypt hash.';
comment on function public.verify_access_pin(text) is
  'Intentional authenticated RPC. Applies a five-attempt lockout before comparing the salted hash.';

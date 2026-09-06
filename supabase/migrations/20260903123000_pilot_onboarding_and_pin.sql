create table public.profile_access (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  pin_hash text not null,
  failed_attempts smallint not null default 0 check (failed_attempts between 0 and 20),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.space_invites (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.communication_spaces(id) on delete cascade,
  token_hash text not null unique,
  intended_role text not null default 'user' check (intended_role = 'user'),
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (used_at is null or used_at >= created_at)
);

create index space_invites_space_active_idx
  on public.space_invites (space_id, expires_at)
  where used_at is null;

alter table public.profile_access enable row level security;
alter table public.space_invites enable row level security;

create trigger profile_access_set_updated_at before update on public.profile_access
  for each row execute function private.set_updated_at();

grant all privileges on public.profile_access to service_role;
grant all privileges on public.space_invites to service_role;

create or replace function public.bootstrap_companion_space()
returns table(space_id uuid, member_role text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_space_id uuid;
  v_role text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select sm.space_id, sm.role
    into v_space_id, v_role
  from public.space_members sm
  where sm.profile_id = v_uid and sm.is_active
  order by sm.joined_at
  limit 1;

  if v_space_id is null then
    insert into public.communication_spaces (name, created_by)
    values ('Mein Bereich', v_uid)
    returning id into v_space_id;

    insert into public.space_members (space_id, profile_id, role, label)
    values (v_space_id, v_uid, 'companion', 'Begleitung');

    insert into public.profile_preferences (profile_id, updated_by)
    values (v_uid, v_uid)
    on conflict (profile_id) do nothing;

    insert into public.space_settings (space_id, updated_by)
    values (v_space_id, v_uid)
    on conflict (space_id) do nothing;

    v_role := 'companion';
  end if;

  return query select v_space_id, v_role;
end;
$$;

create or replace function public.create_user_invite()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_space_id uuid;
  v_token text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select sm.space_id into v_space_id
  from public.space_members sm
  where sm.profile_id = v_uid
    and sm.role = 'companion'
    and sm.is_active
  order by sm.joined_at
  limit 1;

  if v_space_id is null then
    raise exception 'Companion membership required';
  end if;

  if exists (
    select 1 from public.space_members sm
    where sm.space_id = v_space_id and sm.role = 'user' and sm.is_active
  ) then
    raise exception 'This space already has an active user';
  end if;

  v_token := pg_catalog.upper(pg_catalog.encode(extensions.gen_random_bytes(4), 'hex'));

  insert into public.space_invites (space_id, token_hash, created_by, expires_at)
  values (
    v_space_id,
    pg_catalog.encode(extensions.digest(pg_catalog.convert_to(v_token, 'UTF8'), 'sha256'), 'hex'),
    v_uid,
    now() + interval '30 minutes'
  );

  return v_token;
end;
$$;

create or replace function public.accept_user_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_invite public.space_invites%rowtype;
  v_hash text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_token is null or length(btrim(p_token)) <> 8 then
    raise exception 'Invalid invitation code';
  end if;

  v_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(pg_catalog.upper(btrim(p_token)), 'UTF8'), 'sha256'),
    'hex'
  );

  select * into v_invite
  from public.space_invites si
  where si.token_hash = v_hash
    and si.used_at is null
    and si.expires_at > now()
  for update;

  if v_invite.id is null then
    raise exception 'Invitation code is invalid or expired';
  end if;

  insert into public.space_members (space_id, profile_id, role, label)
  values (v_invite.space_id, v_uid, 'user', 'Mein Bereich');

  insert into public.profile_preferences (profile_id, updated_by)
  values (v_uid, v_uid)
  on conflict (profile_id) do nothing;

  update public.space_invites
  set used_at = now(), used_by = v_uid
  where id = v_invite.id;

  return v_invite.space_id;
end;
$$;

create or replace function public.set_access_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must contain exactly four digits';
  end if;

  insert into public.profile_access (profile_id, pin_hash, failed_attempts, locked_until)
  values (v_uid, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)), 0, null)
  on conflict (profile_id) do update
    set pin_hash = excluded.pin_hash,
        failed_attempts = 0,
        locked_until = null,
        updated_at = now();

  return true;
end;
$$;

create or replace function public.verify_access_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_access public.profile_access%rowtype;
begin
  if v_uid is null then
    return false;
  end if;

  select * into v_access
  from public.profile_access pa
  where pa.profile_id = v_uid
  for update;

  if v_access.profile_id is null then
    return false;
  end if;

  if v_access.locked_until is not null and v_access.locked_until > now() then
    return false;
  end if;

  if extensions.crypt(p_pin, v_access.pin_hash) = v_access.pin_hash then
    update public.profile_access
    set failed_attempts = 0, locked_until = null, updated_at = now()
    where profile_id = v_uid;
    return true;
  end if;

  update public.profile_access
  set failed_attempts = least(failed_attempts + 1, 20),
      locked_until = case when failed_attempts + 1 >= 5 then now() + interval '5 minutes' else null end,
      updated_at = now()
  where profile_id = v_uid;

  return false;
end;
$$;

revoke all on function public.bootstrap_companion_space() from public, anon;
revoke all on function public.create_user_invite() from public, anon;
revoke all on function public.accept_user_invite(text) from public, anon;
revoke all on function public.set_access_pin(text) from public, anon;
revoke all on function public.verify_access_pin(text) from public, anon;

grant execute on function public.bootstrap_companion_space() to authenticated;
grant execute on function public.create_user_invite() to authenticated;
grant execute on function public.accept_user_invite(text) to authenticated;
grant execute on function public.set_access_pin(text) to authenticated;
grant execute on function public.verify_access_pin(text) to authenticated;

comment on table public.profile_access is 'Server-side daily PIN verifier state. PINs are salted hashes and failed attempts are rate-limited.';
comment on table public.space_invites is 'Short-lived one-time codes for enrolling the primary user into a companion-created communication space.';

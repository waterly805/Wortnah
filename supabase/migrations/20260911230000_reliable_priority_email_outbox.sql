-- Reliable priority-email outbox for Wortnah 0.5.5.
-- Messages commit first. Important deliveries are queued transactionally and a
-- small scheduled worker retries transient provider failures without duplicates.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

alter table public.messages
  add column if not exists navigation_path_de text not null default '',
  add column if not exists email_notification_requested boolean not null default false;

comment on column public.messages.navigation_path_de is
  'Immutable German communication path captured when Werner sends the message.';

create table if not exists public.email_notification_recipients (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.communication_spaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  email text not null,
  notify_normal boolean not null default false,
  notify_important boolean not null default true,
  notify_very_important boolean not null default true,
  enabled boolean not null default true,
  consented_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.communication_spaces(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  recipient_id uuid references public.email_notification_recipients(id) on delete set null,
  recipient_email text not null,
  status text not null default 'queued',
  provider text not null default 'gmail_smtp',
  provider_message_id text,
  error_code text,
  attempt_count integer not null default 0,
  max_attempts integer not null default 7,
  next_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  locked_at timestamptz,
  locked_by uuid,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.email_notification_deliveries
  add column if not exists provider text not null default 'gmail_smtp',
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 7,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists last_attempt_at timestamptz,
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by uuid;

do $$
declare status_constraint record;
begin
  for status_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.email_notification_deliveries'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.email_notification_deliveries drop constraint %I', status_constraint.conname);
  end loop;
end $$;

alter table public.email_notification_deliveries
  drop constraint if exists email_notification_deliveries_attempt_count_check,
  drop constraint if exists email_notification_deliveries_max_attempts_check;

alter table public.email_notification_deliveries
  add constraint email_notification_deliveries_status_check
    check (status in ('queued', 'processing', 'retrying', 'sent', 'failed')),
  add constraint email_notification_deliveries_attempt_count_check
    check (attempt_count between 0 and max_attempts),
  add constraint email_notification_deliveries_max_attempts_check
    check (max_attempts between 1 and 12);

create unique index if not exists email_notification_deliveries_message_recipient_uidx
  on public.email_notification_deliveries (message_id, recipient_id)
  where recipient_id is not null;

create index if not exists email_notification_deliveries_worker_idx
  on public.email_notification_deliveries (next_attempt_at, created_at)
  where status in ('queued', 'retrying', 'processing');

create index if not exists messages_sent_at_retention_idx
  on public.messages (sent_at)
  where deleted_at is null;

alter table public.email_notification_recipients enable row level security;
alter table public.email_notification_deliveries enable row level security;

drop policy if exists email_notification_recipients_select_companion on public.email_notification_recipients;
drop policy if exists email_notification_recipients_insert_companion on public.email_notification_recipients;
drop policy if exists email_notification_recipients_update_companion on public.email_notification_recipients;
drop policy if exists email_notification_recipients_delete_companion on public.email_notification_recipients;

create policy email_notification_recipients_select_companion
  on public.email_notification_recipients for select to authenticated
  using ((select private.has_space_role(space_id, array['companion'])));

create policy email_notification_recipients_insert_companion
  on public.email_notification_recipients for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and consented_at is not null
    and (select private.has_space_role(space_id, array['companion']))
  );

create policy email_notification_recipients_update_companion
  on public.email_notification_recipients for update to authenticated
  using ((select private.has_space_role(space_id, array['companion'])))
  with check ((select private.has_space_role(space_id, array['companion'])));

create policy email_notification_recipients_delete_companion
  on public.email_notification_recipients for delete to authenticated
  using ((select private.has_space_role(space_id, array['companion'])));

drop policy if exists email_notification_deliveries_select_companion on public.email_notification_deliveries;
create policy email_notification_deliveries_select_companion
  on public.email_notification_deliveries for select to authenticated
  using ((select private.has_space_role(space_id, array['companion'])));

revoke all on public.email_notification_recipients from anon;
revoke all on public.email_notification_deliveries from anon;
grant select, insert, update, delete on public.email_notification_recipients to authenticated;
grant select on public.email_notification_deliveries to authenticated;
grant all on public.email_notification_recipients to service_role;
grant all on public.email_notification_deliveries to service_role;

create or replace function private.prepare_email_notification_recipient()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  new.email := lower(btrim(new.email));
  new.notify_normal := false;
  new.updated_at := now();
  if new.enabled and (
    select count(*)
    from public.email_notification_recipients existing
    where existing.space_id = new.space_id
      and existing.enabled
      and existing.id <> new.id
  ) >= 3 then
    raise exception 'At most three enabled email recipients are allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists email_notification_recipients_prepare on public.email_notification_recipients;
create trigger email_notification_recipients_prepare
before insert or update on public.email_notification_recipients
for each row execute function private.prepare_email_notification_recipient();

create unique index if not exists email_notification_recipients_active_email_uidx
  on public.email_notification_recipients (space_id, lower(email))
  where enabled;

create or replace function private.queue_priority_email_deliveries()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if new.priority not in ('important', 'very_important') then
    return new;
  end if;

  insert into public.email_notification_deliveries (
    space_id, message_id, recipient_id, recipient_email, status,
    provider, attempt_count, max_attempts, next_attempt_at
  )
  select
    new.space_id, new.id, recipient.id, recipient.email, 'queued',
    'gmail_smtp', 0, 7, now()
  from public.email_notification_recipients recipient
  where recipient.space_id = new.space_id
    and recipient.enabled
    and recipient.consented_at is not null
    and case
      when new.priority = 'important' then recipient.notify_important
      when new.priority = 'very_important' then recipient.notify_very_important
      else false
    end
  on conflict (message_id, recipient_id) where recipient_id is not null do nothing;

  return new;
end;
$$;

drop trigger if exists messages_queue_priority_email_deliveries on public.messages;
create trigger messages_queue_priority_email_deliveries
after insert on public.messages
for each row execute function private.queue_priority_email_deliveries();

create table if not exists private.email_worker_config (
  singleton boolean primary key default true check (singleton),
  worker_key text not null default encode(gen_random_bytes(32), 'hex'),
  updated_at timestamptz not null default now()
);

insert into private.email_worker_config (singleton)
values (true)
on conflict (singleton) do nothing;

revoke all on private.email_worker_config from public, anon, authenticated;

create or replace function public.claim_email_notification_deliveries(
  worker_key text,
  requested_message_id uuid default null,
  batch_size integer default 3
)
returns table (
  delivery_id uuid,
  message_id uuid,
  space_id uuid,
  recipient_email text,
  body_de text,
  navigation_path_de text,
  priority text,
  sent_at timestamptz,
  attempt_count integer,
  max_attempts integer
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare claimant uuid := gen_random_uuid();
begin
  if not exists (
    select 1 from private.email_worker_config config
    where config.singleton
      and config.worker_key = claim_email_notification_deliveries.worker_key
  ) then
    raise exception 'Not permitted';
  end if;

  return query
  with candidates as (
    select delivery.id
    from public.email_notification_deliveries delivery
    where (requested_message_id is null or delivery.message_id = requested_message_id)
      and delivery.attempt_count < delivery.max_attempts
      and delivery.next_attempt_at <= now()
      and (
        delivery.status in ('queued', 'retrying')
        or (delivery.status = 'processing' and delivery.locked_at < now() - interval '5 minutes')
      )
    order by delivery.next_attempt_at, delivery.created_at
    for update skip locked
    limit greatest(1, least(batch_size, 10))
  ), claimed as (
    update public.email_notification_deliveries delivery
    set status = 'processing',
        locked_at = now(),
        locked_by = claimant,
        last_attempt_at = now(),
        attempt_count = delivery.attempt_count + 1,
        updated_at = now()
    from candidates
    where delivery.id = candidates.id
    returning delivery.*
  )
  select
    claimed.id,
    claimed.message_id,
    claimed.space_id,
    claimed.recipient_email,
    message.body_de,
    message.navigation_path_de,
    message.priority,
    message.sent_at,
    claimed.attempt_count,
    claimed.max_attempts
  from claimed
  join public.messages message on message.id = claimed.message_id
  where message.deleted_at is null
    and message.priority in ('important', 'very_important');
end;
$$;

revoke all on function public.claim_email_notification_deliveries(text, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_email_notification_deliveries(text, uuid, integer) to service_role;

create or replace function public.finish_email_notification_delivery(
  worker_key text,
  target_delivery_id uuid,
  delivered boolean,
  safe_error_code text default null,
  provider_id text default null,
  retryable boolean default true
)
returns text
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare delivery public.email_notification_deliveries%rowtype;
declare delay_minutes integer;
declare final_status text;
begin
  if not exists (
    select 1 from private.email_worker_config config
    where config.singleton
      and config.worker_key = finish_email_notification_delivery.worker_key
  ) then
    raise exception 'Not permitted';
  end if;

  select * into delivery
  from public.email_notification_deliveries
  where id = target_delivery_id
  for update;

  if delivery.id is null then raise exception 'Delivery not found'; end if;
  if delivery.status = 'sent' then return 'sent'; end if;

  if delivered then
    update public.email_notification_deliveries
    set status = 'sent', provider_message_id = provider_id, error_code = null,
        sent_at = now(), next_attempt_at = now(), locked_at = null,
        locked_by = null, updated_at = now()
    where id = target_delivery_id;
    return 'sent';
  end if;

  if not retryable or delivery.attempt_count >= delivery.max_attempts then
    final_status := 'failed';
    delay_minutes := 0;
  else
    final_status := 'retrying';
    delay_minutes := (array[1, 5, 15, 60, 180, 720])[least(delivery.attempt_count, 6)];
  end if;

  update public.email_notification_deliveries
  set status = final_status,
      error_code = left(coalesce(safe_error_code, 'provider_failed'), 80),
      next_attempt_at = case when final_status = 'retrying' then now() + make_interval(mins => delay_minutes) else now() end,
      locked_at = null,
      locked_by = null,
      updated_at = now()
  where id = target_delivery_id;

  return final_status;
end;
$$;

revoke all on function public.finish_email_notification_delivery(text, uuid, boolean, text, text, boolean) from public, anon, authenticated;
grant execute on function public.finish_email_notification_delivery(text, uuid, boolean, text, text, boolean) to service_role;

create or replace function public.retry_email_notification_delivery(target_delivery_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare target_space_id uuid;
begin
  select space_id into target_space_id
  from public.email_notification_deliveries
  where id = target_delivery_id;

  if target_space_id is null
    or not private.has_space_role(target_space_id, array['companion']) then
    raise exception 'Not permitted';
  end if;

  update public.email_notification_deliveries
  set status = 'retrying', attempt_count = 0, error_code = null,
      next_attempt_at = now(), locked_at = null, locked_by = null, updated_at = now()
  where id = target_delivery_id
    and status = 'failed';
  return found;
end;
$$;

revoke all on function public.retry_email_notification_delivery(uuid) from public, anon;
grant execute on function public.retry_email_notification_delivery(uuid) to authenticated;

create or replace function public.get_email_worker_key()
returns text
language sql
security definer
set search_path = private, pg_temp
as $$ select worker_key from private.email_worker_config where singleton $$;

revoke all on function public.get_email_worker_key() from public, anon, authenticated;
grant execute on function public.get_email_worker_key() to service_role;

create or replace function private.apply_wortnah_message_retention()
returns integer
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare removed integer;
begin
  delete from public.messages message
  where message.sent_at < now() - interval '30 days'
    and message.space_id = '317579c9-9b2e-42fb-8713-832edbc25556'::uuid;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function private.apply_wortnah_message_retention() from public, anon, authenticated;
grant execute on function private.apply_wortnah_message_retention() to service_role;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'wortnah-message-retention-30-days';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'wortnah-message-retention-30-days',
    '40 2 * * *',
    'select private.apply_wortnah_message_retention();'
  );
end $$;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'wortnah-email-alert-worker';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule(
    'wortnah-email-alert-worker',
    '*/2 * * * *',
    $job$
      select net.http_post(
        url := 'https://dffmqcqidqkbqeorjtlb.supabase.co/functions/v1/send-message-email-alerts',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-wortnah-worker-key', (select worker_key from private.email_worker_config where singleton)
        ),
        body := '{"mode":"drain"}'::jsonb,
        timeout_milliseconds := 90000
      );
    $job$
  );
end $$;

comment on table public.email_notification_deliveries is
  'Durable priority-email outbox. Message insert queues once; the worker leases, retries and records a safe terminal result.';

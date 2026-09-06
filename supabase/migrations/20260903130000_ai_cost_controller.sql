-- Wortnah AI cost controller: AI remains disabled and budgeted at zero until a
-- Begleitung profile deliberately enables a future, reviewed AI capability.

create table public.ai_budget_settings (
  space_id uuid primary key references public.communication_spaces(id) on delete cascade,
  ai_enabled boolean not null default false,
  review_mode text not null default 'manual_only'
    check (review_mode in ('manual_only', 'disabled')),
  monthly_request_limit integer not null default 0 check (monthly_request_limit >= 0),
  monthly_input_token_limit integer not null default 0 check (monthly_input_token_limit >= 0),
  monthly_output_token_limit integer not null default 0 check (monthly_output_token_limit >= 0),
  monthly_cost_limit_cents integer not null default 0 check (monthly_cost_limit_cents >= 0),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_usage_ledger (
  id bigint generated always as identity primary key,
  space_id uuid not null references public.communication_spaces(id) on delete cascade,
  feature text not null check (feature in ('weekly_review', 'content_suggestion', 'german_quality_review', 'ui_review', 'topic_review')),
  provider text not null check (char_length(provider) between 1 and 80),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost_cents integer not null default 0 check (estimated_cost_cents >= 0),
  was_cached boolean not null default false,
  request_fingerprint text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create index ai_usage_ledger_space_occurred_idx
  on public.ai_usage_ledger (space_id, occurred_at desc);
create index ai_usage_ledger_space_feature_occurred_idx
  on public.ai_usage_ledger (space_id, feature, occurred_at desc);

alter table public.ai_budget_settings enable row level security;
alter table public.ai_usage_ledger enable row level security;

create policy ai_budget_settings_select_companion on public.ai_budget_settings for select to authenticated
  using ((select private.has_space_role(space_id, array['companion']::text[])));
create policy ai_budget_settings_insert_companion on public.ai_budget_settings for insert to authenticated
  with check ((select private.has_space_role(space_id, array['companion']::text[])));
create policy ai_budget_settings_update_companion on public.ai_budget_settings for update to authenticated
  using ((select private.has_space_role(space_id, array['companion']::text[])))
  with check ((select private.has_space_role(space_id, array['companion']::text[])));

create policy ai_usage_ledger_select_companion on public.ai_usage_ledger for select to authenticated
  using ((select private.has_space_role(space_id, array['companion']::text[])));

revoke all on public.ai_budget_settings from anon, authenticated;
revoke all on public.ai_usage_ledger from anon, authenticated;
grant select, insert, update on public.ai_budget_settings to authenticated;
grant select on public.ai_usage_ledger to authenticated;
grant usage, select on sequence public.ai_usage_ledger_id_seq to service_role;

create trigger ai_budget_settings_set_updated_at before update on public.ai_budget_settings
  for each row execute function private.set_updated_at();

create or replace function private.create_ai_budget_settings_for_space()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ai_budget_settings (space_id)
  values (new.id)
  on conflict (space_id) do nothing;
  return new;
end;
$$;

revoke all on function private.create_ai_budget_settings_for_space() from public, anon, authenticated;

create trigger communication_spaces_create_ai_budget_settings
  after insert on public.communication_spaces
  for each row execute function private.create_ai_budget_settings_for_space();

insert into public.ai_budget_settings (space_id)
select id from public.communication_spaces
on conflict (space_id) do nothing;

comment on table public.ai_usage_ledger is 'Server-written AI usage only. Do not store prompts, message text, recordings, photographs, or user identifiers in metadata.';

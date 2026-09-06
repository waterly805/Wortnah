create index ai_budget_settings_updated_by_idx
  on public.ai_budget_settings (updated_by)
  where updated_by is not null;

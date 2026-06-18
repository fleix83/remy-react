-- Add English explainer text for the forum category description panels.
-- The categories table already carries description_de/fr/it; this adds the
-- fourth UI language so admins can maintain the panel copy in DE/FR/IT/EN.
alter table public.categories add column if not exists description_en text;

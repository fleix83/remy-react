-- Add English category names so the forum categories are fully 4-language
-- (DE/FR/IT/EN), matching the description_* columns. name_en is nullable and
-- falls back to name_de in the UI until populated.
alter table public.categories add column if not exists name_en varchar;

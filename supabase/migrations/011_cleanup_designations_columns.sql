-- Migration: Cleanup designations table
-- 1. Drop unused description columns
-- 2. Rename all _f (feminine) columns to _w (weiblich)

-- Drop description columns (unused)
ALTER TABLE public.designations
  DROP COLUMN IF EXISTS description_de,
  DROP COLUMN IF EXISTS description_fr,
  DROP COLUMN IF EXISTS description_it;

-- Rename German columns from _f to _w
ALTER TABLE public.designations
  RENAME COLUMN name_de_short_f TO name_de_short_w;

ALTER TABLE public.designations
  RENAME COLUMN name_de_long_f TO name_de_long_w;

-- Rename French columns from _f to _w
ALTER TABLE public.designations
  RENAME COLUMN name_fr_short_f TO name_fr_short_w;

ALTER TABLE public.designations
  RENAME COLUMN name_fr_long_f TO name_fr_long_w;

-- Rename Italian columns from _f to _w
ALTER TABLE public.designations
  RENAME COLUMN name_it_short_f TO name_it_short_w;

ALTER TABLE public.designations
  RENAME COLUMN name_it_long_f TO name_it_long_w;

-- Update comments
COMMENT ON COLUMN public.designations.name_de_short_w IS 'German short form (feminine/weiblich)';
COMMENT ON COLUMN public.designations.name_de_long_w IS 'German long form (feminine/weiblich)';
COMMENT ON COLUMN public.designations.name_fr_short_w IS 'French short form (feminine/weiblich)';
COMMENT ON COLUMN public.designations.name_fr_long_w IS 'French long form (feminine/weiblich)';
COMMENT ON COLUMN public.designations.name_it_short_w IS 'Italian short form (feminine/weiblich)';
COMMENT ON COLUMN public.designations.name_it_long_w IS 'Italian long form (feminine/weiblich)';

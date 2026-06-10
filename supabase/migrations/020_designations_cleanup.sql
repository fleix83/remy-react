-- Designations redesign cleanup: remove legacy structures.
-- Prerequisites (verified before applying): new frontend deployed (staging
-- build of 3a7bafa9), keyword backfill complete, full_title populated for
-- every therapist that had a legacy designation value.
DROP TABLE IF EXISTS public.designations_old;
ALTER TABLE public.therapists DROP COLUMN IF EXISTS designation;
ALTER TABLE public.therapists DROP COLUMN IF EXISTS short_designation;
ALTER TABLE public.posts DROP COLUMN IF EXISTS designation;

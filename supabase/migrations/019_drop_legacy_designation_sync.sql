-- Drop the legacy designation auto-sync trigger.
-- sync_therapist_designation_fields() copied gendered name variants from the
-- old designations table onto therapists; the lean designations table (018)
-- has no such columns, so the trigger errors on every designation_id/gender
-- write and the sync concept itself is obsolete (labels are read via the
-- designations FK embed, full_title is verbatim).
DROP TRIGGER IF EXISTS sync_therapist_designation ON public.therapists;
DROP FUNCTION IF EXISTS public.sync_therapist_designation_fields();

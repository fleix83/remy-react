-- Soft-deactivation flag for therapists: inactive entries stay in the DB
-- (and keep their post associations) but are hidden from public lists.
ALTER TABLE public.therapists
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

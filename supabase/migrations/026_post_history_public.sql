-- Add a per-user toggle for whether their aggregated post history is shown
-- on their public profile. Default true = visible (matches prior behaviour).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS post_history_public boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.users.post_history_public IS
  'When false, other users see only the bio card on this user''s public profile (post history hidden). Profile-page presentation only; individual posts stay public.';

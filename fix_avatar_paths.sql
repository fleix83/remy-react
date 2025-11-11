-- Fix old avatar paths that point to non-existent uploads/avatars/ directory
-- This will set them to NULL so the app uses generated SVG avatars as fallback

-- Update all users with old avatar paths to NULL
UPDATE public.users
SET avatar_url = NULL
WHERE avatar_url LIKE 'uploads/avatars/%';

-- Verify the changes
SELECT id, email, username, avatar_url
FROM public.users
ORDER BY email;

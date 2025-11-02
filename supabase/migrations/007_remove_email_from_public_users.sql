-- Remove email column from public.users table for privacy
-- Email remains in auth.users for password reset functionality

-- Drop the email column from public.users
ALTER TABLE public.users DROP COLUMN IF EXISTS email;

-- Update the handle_new_user function to not insert email into public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Email is still accessible in auth.users for:
-- 1. Password reset functionality
-- 2. Supabase Auth operations
-- But it's no longer exposed in the public.users table where admins can query it

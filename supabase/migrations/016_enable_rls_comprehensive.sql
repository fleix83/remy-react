-- Migration: Enable Row-Level Security on all tables
-- Drops all existing policies and recreates canonical set with moderation-aware logic.
-- Idempotent: safe to run multiple times.

BEGIN;

-- ============================================================
-- A) ENABLE RLS ON ALL PUBLIC TABLES
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_saved ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- B) DROP ALL EXISTING POLICIES
-- ============================================================

-- users
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- posts
DROP POLICY IF EXISTS "Published posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Users can view published posts" ON posts;
DROP POLICY IF EXISTS "Users can view all posts" ON posts;
DROP POLICY IF EXISTS "Users can view approved posts" ON posts;
DROP POLICY IF EXISTS "Allow read published posts" ON posts;
DROP POLICY IF EXISTS "Users can create posts" ON posts;
DROP POLICY IF EXISTS "Allow all inserts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
DROP POLICY IF EXISTS "Moderators can update post moderation status" ON posts;

-- comments
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments;
DROP POLICY IF EXISTS "Active comments are viewable by everyone" ON comments;
DROP POLICY IF EXISTS "Users can view published comments" ON comments;
DROP POLICY IF EXISTS "Users can view all comments" ON comments;
DROP POLICY IF EXISTS "Users can view approved comments" ON comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
DROP POLICY IF EXISTS "Moderators can update comment moderation status" ON comments;

-- messages
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages they sent" ON messages;

-- post_saved
DROP POLICY IF EXISTS "Users can view their own drafts" ON post_saved;
DROP POLICY IF EXISTS "Users can create drafts" ON post_saved;
DROP POLICY IF EXISTS "Users can update their drafts" ON post_saved;
DROP POLICY IF EXISTS "Users can delete their drafts" ON post_saved;

-- user_blocks
DROP POLICY IF EXISTS "Users can manage their blocks" ON user_blocks;

-- therapists
DROP POLICY IF EXISTS "Anyone can view therapists" ON therapists;
DROP POLICY IF EXISTS "Authenticated users can create therapists" ON therapists;
DROP POLICY IF EXISTS "Admins can update therapist review status" ON therapists;
DROP POLICY IF EXISTS "Admins can delete therapists" ON therapists;

-- documents
DROP POLICY IF EXISTS "Anyone can read published documents" ON documents;
DROP POLICY IF EXISTS "Only admins can insert documents" ON documents;
DROP POLICY IF EXISTS "Only admins can update documents" ON documents;
DROP POLICY IF EXISTS "Only admins can delete documents" ON documents;

-- ============================================================
-- C) CREATE CANONICAL POLICIES
-- ============================================================

-- ---- users ----

CREATE POLICY "Public profiles are viewable by everyone" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ---- posts (moderation-aware) ----

CREATE POLICY "Users can view approved posts" ON posts
  FOR SELECT USING (
    (moderation_status = 'approved' AND is_published = true)
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Users can create posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and moderators can update posts" ON posts
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Users and moderators can delete posts" ON posts
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('moderator', 'admin')
    )
  );

-- ---- comments (moderation-aware) ----

CREATE POLICY "Users can view approved comments" ON comments
  FOR SELECT USING (
    (moderation_status = 'approved' AND is_published = true)
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and moderators can update comments" ON comments
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Users and moderators can delete comments" ON comments
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('moderator', 'admin')
    )
  );

-- ---- messages ----

CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- UPDATE includes receiver for markMessagesAsRead()
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ---- post_saved ----

CREATE POLICY "Users can manage their own saved posts" ON post_saved
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- user_blocks ----

CREATE POLICY "Users can manage their blocks" ON user_blocks
  FOR ALL USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

-- ---- therapists ----

CREATE POLICY "Anyone can view therapists" ON therapists
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create therapists" ON therapists
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can update therapists" ON therapists
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'moderator')
      AND users.is_banned = false
    )
  );

CREATE POLICY "Admins can delete therapists" ON therapists
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_banned = false
    )
  );

-- ---- documents ----

CREATE POLICY "Anyone can read published documents" ON documents
  FOR SELECT USING (published = true);

CREATE POLICY "Only admins can insert documents" ON documents
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Only admins can update documents" ON documents
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Only admins can delete documents" ON documents
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ---- categories ----

CREATE POLICY "Anyone can read categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert categories" ON categories
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can update categories" ON categories
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can delete categories" ON categories
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ---- designations ----

CREATE POLICY "Anyone can read designations" ON designations
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert designations" ON designations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can update designations" ON designations
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can delete designations" ON designations
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ---- tags ----

CREATE POLICY "Anyone can read tags" ON tags
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert tags" ON tags
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can update tags" ON tags
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can delete tags" ON tags
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ---- post_tags ----

CREATE POLICY "Anyone can read post_tags" ON post_tags
  FOR SELECT USING (true);

CREATE POLICY "Post owners can add tags" ON post_tags
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('moderator', 'admin'))
  );

CREATE POLICY "Post owners can remove tags" ON post_tags
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = post_id AND posts.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('moderator', 'admin'))
  );

-- ============================================================
-- D) COLUMN-LEVEL GRANTS ON USERS TABLE
--    Prevent users from changing role, is_banned, is_active
-- ============================================================

REVOKE UPDATE ON public.users FROM authenticated;
GRANT UPDATE (
  username,
  avatar,
  biography,
  avatar_url,
  bio,
  default_canton,
  language_preference,
  messages_active,
  updated_at
) ON public.users TO authenticated;

-- ============================================================
-- E) SECURITY DEFINER FUNCTIONS FOR ADMIN OPERATIONS
-- ============================================================

-- Function: update_user_role (admin only)
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID,
  new_role user_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can change roles
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_banned = false
  ) THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;

  -- Prevent demoting yourself (safety)
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;

  UPDATE users
  SET role = new_role, updated_at = NOW()
  WHERE id = target_user_id;
END;
$$;

-- Function: toggle_user_ban (moderator/admin only)
CREATE OR REPLACE FUNCTION public.toggle_user_ban(
  target_user_id UUID,
  ban_status BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only moderators/admins can ban/unban
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('moderator', 'admin')
    AND is_banned = false
  ) THEN
    RAISE EXCEPTION 'Only moderators and admins can ban/unban users';
  END IF;

  -- Prevent banning yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot ban/unban yourself';
  END IF;

  UPDATE users
  SET is_banned = ban_status, updated_at = NOW()
  WHERE id = target_user_id;
END;
$$;

-- Grant execute to authenticated users (RPC callable)
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_user_ban(UUID, BOOLEAN) TO authenticated;

COMMIT;

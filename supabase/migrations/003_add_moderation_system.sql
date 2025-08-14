-- Migration: Add Pre-Publication Moderation System
-- Description: Adds moderation workflow fields to posts and comments tables

-- Create moderation status enum
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected');

-- Add moderation fields to posts table
ALTER TABLE posts ADD COLUMN moderation_status moderation_status DEFAULT 'pending';
ALTER TABLE posts ADD COLUMN moderated_by UUID REFERENCES users(id);
ALTER TABLE posts ADD COLUMN moderated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE posts ADD COLUMN rejection_reason TEXT;

-- Add moderation fields to comments table
ALTER TABLE comments ADD COLUMN is_published BOOLEAN DEFAULT false;
ALTER TABLE comments ADD COLUMN moderation_status moderation_status DEFAULT 'pending';
ALTER TABLE comments ADD COLUMN moderated_by UUID REFERENCES users(id);
ALTER TABLE comments ADD COLUMN moderated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE comments ADD COLUMN rejection_reason TEXT;

-- Mark all existing content as approved (migration safety)
-- This ensures existing content remains visible during the transition
UPDATE posts SET 
  moderation_status = 'approved',
  moderated_at = NOW()
WHERE moderation_status = 'pending';

UPDATE comments SET 
  is_published = true,
  moderation_status = 'approved',
  moderated_at = NOW()
WHERE moderation_status = 'pending';

-- Create indexes for performance
CREATE INDEX idx_posts_moderation_status ON posts(moderation_status);
CREATE INDEX idx_posts_moderated_at ON posts(moderated_at);
CREATE INDEX idx_comments_moderation_status ON comments(moderation_status);
CREATE INDEX idx_comments_is_published ON comments(is_published);
CREATE INDEX idx_comments_moderated_at ON comments(moderated_at);

-- Update RLS policies for posts table
-- Only show approved posts to regular users, all posts to moderators/admins

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view published posts" ON posts;
DROP POLICY IF EXISTS "Users can view all posts" ON posts;

-- New policy: Regular users can only see approved posts
CREATE POLICY "Users can view approved posts" ON posts
  FOR SELECT USING (
    moderation_status = 'approved' AND is_published = true
    OR auth.uid() = user_id  -- Users can see their own posts regardless of status
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('moderator', 'admin')
    )  -- Moderators and admins can see all posts
  );

-- Update RLS policies for comments table
-- Only show approved and published comments to regular users

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view published comments" ON comments;
DROP POLICY IF EXISTS "Users can view all comments" ON comments;

-- New policy: Regular users can only see approved and published comments
CREATE POLICY "Users can view approved comments" ON comments
  FOR SELECT USING (
    moderation_status = 'approved' AND is_published = true
    OR auth.uid() = user_id  -- Users can see their own comments regardless of status
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('moderator', 'admin')
    )  -- Moderators and admins can see all comments
  );

-- Add policy for moderators to update moderation status
CREATE POLICY "Moderators can update post moderation status" ON posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('moderator', 'admin')
    )
  );

CREATE POLICY "Moderators can update comment moderation status" ON comments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('moderator', 'admin')
    )
  );

-- Create a view for moderation queue (for easy querying)
CREATE OR REPLACE VIEW moderation_queue AS
SELECT 
  'post' as content_type,
  id,
  user_id,
  title,
  content,
  created_at,
  moderation_status,
  moderated_by,
  moderated_at,
  rejection_reason
FROM posts 
WHERE moderation_status = 'pending'

UNION ALL

SELECT 
  'comment' as content_type,
  id,
  user_id,
  NULL as title,  -- Comments don't have titles
  content,
  created_at,
  moderation_status,
  moderated_by,
  moderated_at,
  rejection_reason
FROM comments 
WHERE moderation_status = 'pending'

ORDER BY created_at ASC;

-- Grant access to the moderation queue view for moderators
GRANT SELECT ON moderation_queue TO authenticated;
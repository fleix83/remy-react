-- Add is_draft column to posts table to distinguish between drafts and submitted posts
-- Migration: 008_add_is_draft_to_posts.sql
-- Purpose: Fix issue where draft posts appear in moderation queue

-- Add is_draft column with default false (existing posts are considered submitted)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;

-- Add index for better query performance on drafts
CREATE INDEX IF NOT EXISTS idx_posts_is_draft ON posts(is_draft);

-- Add composite index for common draft queries
CREATE INDEX IF NOT EXISTS idx_posts_user_draft ON posts(user_id, is_draft) WHERE is_active = true;

-- Update any existing unpublished posts with pending status to be drafts
-- This assumes unpublished + pending = draft, but you may want to review this logic
UPDATE posts
SET is_draft = true
WHERE is_published = false
  AND moderation_status = 'pending'
  AND is_active = true;

-- Add comment explaining the column
COMMENT ON COLUMN posts.is_draft IS 'True if post is a draft (not submitted for moderation yet), false if submitted/published';

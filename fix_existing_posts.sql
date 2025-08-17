-- Fix existing posts that should be approved but are currently pending
-- This ensures all existing content remains visible

UPDATE posts SET 
  moderation_status = 'approved',
  moderated_at = NOW()
WHERE moderation_status IS NULL OR moderation_status = 'pending';

UPDATE comments SET 
  is_published = true,
  moderation_status = 'approved',
  moderated_at = NOW()
WHERE moderation_status IS NULL OR moderation_status = 'pending';
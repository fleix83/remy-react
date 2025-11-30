-- Migration: Make canton nullable for Rant posts (Category 4)
-- This allows users to create Rant posts without selecting a canton
-- Created: 2024-12-XX

-- Make canton column nullable in posts table
ALTER TABLE public.posts
  ALTER COLUMN canton DROP NOT NULL;

-- Update any existing empty string values to NULL for consistency
UPDATE public.posts
SET canton = NULL
WHERE canton = '';

-- Add comment for documentation
COMMENT ON COLUMN public.posts.canton IS 'Canton code - nullable for Rant posts (category_id = 4)';

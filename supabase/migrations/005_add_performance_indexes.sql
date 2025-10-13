-- Migration: Add Performance Indexes
-- Description: Adds indexes to improve query performance across all tables
-- Date: 2025-01-13

-- ============================================================================
-- POSTS TABLE INDEXES
-- ============================================================================

-- Individual column indexes for WHERE clauses
CREATE INDEX IF NOT EXISTS idx_posts_is_published ON posts(is_published);
CREATE INDEX IF NOT EXISTS idx_posts_is_active ON posts(is_active);
CREATE INDEX IF NOT EXISTS idx_posts_is_banned ON posts(is_banned);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_canton ON posts(canton);
CREATE INDEX IF NOT EXISTS idx_posts_therapist_id ON posts(therapist_id);

-- Composite indexes for common query patterns
-- This index optimizes the most common query: published, active, non-banned, approved posts
CREATE INDEX IF NOT EXISTS idx_posts_status_composite ON posts(is_published, is_active, is_banned, moderation_status)
  WHERE is_published = true AND is_active = true AND is_banned = false;

-- This index optimizes user profile queries (posts by user, sorted by date)
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);

-- This index optimizes category filtering with date sorting
CREATE INDEX IF NOT EXISTS idx_posts_category_created ON posts(category_id, created_at DESC)
  WHERE is_published = true AND is_active = true AND is_banned = false;

-- This index optimizes canton filtering
CREATE INDEX IF NOT EXISTS idx_posts_canton_created ON posts(canton, created_at DESC)
  WHERE is_published = true AND is_active = true AND is_banned = false;

-- ============================================================================
-- COMMENTS TABLE INDEXES
-- ============================================================================

-- Individual column indexes
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_is_published ON comments(is_published);
CREATE INDEX IF NOT EXISTS idx_comments_moderation_status ON comments(moderation_status);

-- Composite indexes for common query patterns
-- This index optimizes loading comments for a post (most common query)
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at ASC);

-- This index optimizes user profile queries (comments by user, sorted by date)
CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments(user_id, created_at DESC);

-- This index optimizes approved comment counts for posts
CREATE INDEX IF NOT EXISTS idx_comments_post_approved ON comments(post_id, moderation_status)
  WHERE is_published = true AND moderation_status = 'approved';

-- ============================================================================
-- THERAPISTS TABLE INDEXES
-- ============================================================================

-- Index for canton filtering
CREATE INDEX IF NOT EXISTS idx_therapists_canton ON therapists(canton);

-- Composite index for sorting by name (most common sort order)
CREATE INDEX IF NOT EXISTS idx_therapists_name ON therapists(last_name ASC, first_name ASC);

-- Text search indexes for ILIKE queries
CREATE INDEX IF NOT EXISTS idx_therapists_last_name_trgm ON therapists USING gin(last_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_therapists_first_name_trgm ON therapists USING gin(first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_therapists_institution_trgm ON therapists USING gin(institution gin_trgm_ops);

-- ============================================================================
-- USER_BLOCKS TABLE INDEXES
-- ============================================================================

-- Individual indexes for lookups
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_at ON user_blocks(blocked_at DESC);

-- Composite index for user's blocked list (most common query)
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_date ON user_blocks(blocker_id, blocked_at DESC);

-- Composite index for reverse lookups (who blocked me)
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_blocker ON user_blocks(blocked_id, blocker_id);

-- ============================================================================
-- POST_DRAFTS TABLE INDEXES
-- ============================================================================

-- Composite index for user draft queries
CREATE INDEX IF NOT EXISTS idx_post_drafts_user_updated ON post_drafts(user_id, updated_at DESC);

-- ============================================================================
-- USERS TABLE INDEXES
-- ============================================================================

-- Text search index for username searches (ILIKE queries)
CREATE INDEX IF NOT EXISTS idx_users_username_trgm ON users USING gin(username gin_trgm_ops);

-- Index for email lookups (though email is already unique, this speeds up searches)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- CATEGORIES TABLE INDEXES
-- ============================================================================

-- Index for active category filtering
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active) WHERE is_active = true;

-- ============================================================================
-- DESIGNATIONS TABLE INDEXES
-- ============================================================================

-- Index for active designation filtering
CREATE INDEX IF NOT EXISTS idx_designations_is_active ON designations(is_active) WHERE is_active = true;

-- ============================================================================
-- NOTIFICATIONS TABLE INDEXES (if exists)
-- ============================================================================

-- Composite index for user notifications sorted by date
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read)
  WHERE is_read = false;

-- ============================================================================
-- ENABLE pg_trgm EXTENSION (if not already enabled)
-- ============================================================================

-- This extension is needed for the trigram indexes (gin_trgm_ops) above
-- It enables efficient ILIKE searches on text fields
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- ANALYZE TABLES
-- ============================================================================

-- Update statistics for the query planner to use the new indexes effectively
ANALYZE posts;
ANALYZE comments;
ANALYZE therapists;
ANALYZE user_blocks;
ANALYZE post_drafts;
ANALYZE users;
ANALYZE categories;
ANALYZE designations;

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

/*
Expected Performance Improvements:

1. Posts queries: 30-70% faster
   - Status filtering (is_published, is_active, is_banned) now uses indexes
   - Date sorting uses index instead of full table scan
   - Canton/category filtering significantly faster

2. Comments queries: 40-60% faster
   - Loading comments for posts uses composite index
   - User comment history much faster

3. Therapist searches: 50-80% faster
   - Trigram indexes enable fast ILIKE searches
   - Name sorting uses composite index

4. User blocking: 60-90% faster
   - All blocking queries use indexes
   - Both forward and reverse lookups optimized

5. General improvements:
   - Reduced I/O operations
   - Better use of query planner
   - Faster pagination
   - More efficient JOIN operations

Maintenance Notes:
- Indexes increase write overhead slightly (~5-10%)
- Indexes require storage space (~10-20% of table size)
- VACUUM ANALYZE recommended after bulk operations
- Monitor index usage with pg_stat_user_indexes
*/

-- Remove the legacy post_saved table.
--
-- post_saved was the original "drafts" implementation (migration 002). It was
-- superseded first by post_drafts (migration 003) and ultimately by the
-- posts.is_draft flag, which is what the app uses today
-- (UserContentService.getUserDrafts queries posts where is_draft = true).
--
-- At drop time the table was empty (0 rows) with no inbound foreign keys,
-- triggers, views, or function references, and no application code touched it.
DROP TABLE IF EXISTS public.post_saved;

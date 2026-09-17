-- Post bookmarks ("Gespeichert" tab in the user profile).
--
-- One row per (user, post). Rows are private to their owner: the RLS policy
-- below is the only access path, so nobody can read or forge another user's
-- bookmarks. Visibility of the bookmarked post itself is still governed by
-- the posts SELECT policy (a post that gets unpublished simply disappears
-- from the tab). Deleting a post or a user cascades.

CREATE TABLE public.post_bookmarks (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  post_id INTEGER NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);

CREATE INDEX post_bookmarks_user_id_created_at_idx
  ON public.post_bookmarks (user_id, created_at DESC);

ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their bookmarks" ON public.post_bookmarks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

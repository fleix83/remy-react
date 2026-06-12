-- Migration 023: notifications table + realtime publication
--
-- Migration 003 defined a notifications table but was never applied to the
-- live database, so the entire in-app notification system (red dots for
-- unread messages / answered posts) silently no-ops. This creates the lean
-- subset the client actually uses.
--
-- Additionally the supabase_realtime publication contains NO tables on the
-- live database, so every postgres_changes subscription in the app
-- (messages, notifications, posts) receives nothing. We add the tables the
-- client subscribes to.

-- 1. Notification type enum (covers values used by the client today + room for planned ones)
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'comment_reply',
    'post_comment',
    'private_message',
    'post_mention',
    'system',
    'therapist_pending'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_post_id INTEGER REFERENCES public.posts(id) ON DELETE CASCADE,
  related_comment_id INTEGER REFERENCES public.comments(id) ON DELETE CASCADE,
  related_therapist_id INTEGER REFERENCES public.therapists(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unread-dot count and badge queries filter on user + is_read
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id)
  WHERE NOT is_read;

-- 3. Row level security: users only see/manage their own notifications;
--    any authenticated user may create one (client inserts a notification
--    for the receiver when sending a message / answering a post).
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Realtime: postgres_changes only fires for tables in this publication.
--    RLS still applies — clients only receive rows they are allowed to read.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

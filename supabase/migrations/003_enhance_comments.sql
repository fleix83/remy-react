-- Enhanced comments table for threading and moderation
ALTER TABLE public.comments ADD COLUMN parent_comment_id INTEGER REFERENCES comments(id);
ALTER TABLE public.comments ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE public.comments ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.comments ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.comments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.comments ADD COLUMN quoted_text TEXT;

-- Add updated_at trigger for comments
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create notifications table for real-time updates
CREATE TYPE notification_type AS ENUM (
  'comment_reply',
  'post_comment', 
  'private_message',
  'post_mention',
  'therapist_review'
);

CREATE TABLE public.notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_post_id INTEGER REFERENCES posts(id),
  related_comment_id INTEGER REFERENCES comments(id),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON notifications 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own notifications" ON notifications 
  FOR UPDATE USING (auth.uid() = user_id);

-- Update comments policies to account for new fields
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments;
CREATE POLICY "Active comments are viewable by everyone" ON comments 
  FOR SELECT USING (is_active = true AND is_banned = false);

-- Create post_drafts table (improved version of post_saved)
CREATE TABLE public.post_drafts (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  canton VARCHAR(2),
  therapist_id INTEGER REFERENCES therapists(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for post_drafts
ALTER TABLE post_drafts ENABLE ROW LEVEL SECURITY;

-- Post drafts policies
CREATE POLICY "Users can manage their own drafts" ON post_drafts FOR ALL USING (auth.uid() = user_id);

-- Add updated_at trigger for post_drafts
CREATE TRIGGER update_post_drafts_updated_at BEFORE UPDATE ON post_drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
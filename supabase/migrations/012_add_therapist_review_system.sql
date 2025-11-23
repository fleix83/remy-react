-- Add review tracking fields to therapists table
ALTER TABLE therapists
  ADD COLUMN needs_review boolean DEFAULT true,
  ADD COLUMN reviewed_by uuid REFERENCES users(id),
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN created_by uuid REFERENCES users(id);

-- Add new notification type for therapist pending review
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'therapist_pending';

-- Add related_therapist_id to notifications table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'related_therapist_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_therapist_id integer REFERENCES therapists(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create function to notify admins when new therapist needs review
CREATE OR REPLACE FUNCTION notify_admins_of_new_therapist()
RETURNS TRIGGER AS $$
DECLARE
  admin_user RECORD;
BEGIN
  -- Only notify if needs review
  IF NEW.needs_review = true THEN
    FOR admin_user IN
      SELECT id FROM users WHERE role = 'admin' AND is_banned = false
    LOOP
      INSERT INTO notifications (user_id, type, title, message, related_therapist_id, is_read)
      VALUES (
        admin_user.id,
        'therapist_pending',
        'Neuer Therapeut zur Prüfung',
        format('%s %s wartet auf Freigabe', NEW.first_name, NEW.last_name),
        NEW.id,
        false
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new therapist notifications
DROP TRIGGER IF EXISTS therapist_pending_notification ON therapists;
CREATE TRIGGER therapist_pending_notification
  AFTER INSERT ON therapists
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_of_new_therapist();

-- Row Level Security Policies

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view therapists" ON therapists;
DROP POLICY IF EXISTS "Authenticated users can create therapists" ON therapists;
DROP POLICY IF EXISTS "Admins can update therapist review status" ON therapists;
DROP POLICY IF EXISTS "Admins can delete therapists" ON therapists;

-- Everyone can view all therapists (they're auto-approved)
CREATE POLICY "Anyone can view therapists" ON therapists
  FOR SELECT USING (true);

-- Authenticated users can create therapists
CREATE POLICY "Authenticated users can create therapists" ON therapists
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins/moderators can update therapists
CREATE POLICY "Admins can update therapist review status" ON therapists
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'moderator')
      AND users.is_banned = false
    )
  );

-- Only admins can delete therapists
CREATE POLICY "Admins can delete therapists" ON therapists
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_banned = false
    )
  );

-- Set existing therapists to not need review (they're already vetted)
UPDATE therapists SET needs_review = false WHERE needs_review IS NULL;

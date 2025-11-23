# Therapist Moderation System - Migration Instructions

## Overview
This document contains the instructions for deploying the therapist moderation system to production.

## What This Feature Does
- **User-created therapists** are auto-approved but flagged for review (`needs_review = true`)
- **CSV bulk imports** are auto-approved without review flag (`needs_review = false`)
- **Admin notifications** are automatically sent when new therapists are created manually
- **Moderation queue** shows therapists needing review as list elements with:
  - Green "Therapeut" badge
  - Blue clickable therapist name linking to profile
  - "Freigeben" (dismiss) button - green like publish button
  - "Löschen" (delete) button
- **Therapist profile pages** show yellow "Wird geprüft" flag banner (visible only to admins/moderators)
- **Therapist selector dropdown** shows yellow flag icon next to therapists needing review (visible only to admins/moderators)

## Migration Steps

### Step 1: Apply Database Migration

The migration file is located at: `supabase/migrations/012_add_therapist_review_system.sql`

**Option A: Using Supabase CLI**
```bash
# If using local Supabase project
supabase db push

# Or apply specific migration
supabase migration up
```

**Option B: Using Supabase Dashboard**
1. Go to Supabase Dashboard > SQL Editor
2. Copy the entire contents of `012_add_therapist_review_system.sql`
3. Paste and execute the SQL

**Option C: Using MCP (if available)**
```bash
# Use the mcp__supabase__apply_migration tool
# Name: "add_therapist_review_system"
# Query: <contents of migration file>
```

### Step 2: Verify Database Changes

After applying the migration, verify the following:

**1. Check therapists table columns:**
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'therapists'
  AND column_name IN ('needs_review', 'reviewed_by', 'reviewed_at', 'created_by');
```

Expected result: 4 rows showing the new columns.

**2. Check notification type:**
```sql
SELECT unnest(enum_range(NULL::notification_type));
```

Expected result: Should include 'therapist_pending' in the list.

**3. Check foreign key relationships:**
```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'therapists'
  AND tc.constraint_type = 'FOREIGN KEY';
```

Expected result: Should include `therapists_created_by_fkey` and `therapists_reviewed_by_fkey`.

**4. Check RLS policies:**
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'therapists';
```

Expected result: 4 policies (SELECT, INSERT, UPDATE, DELETE).

**5. Check trigger:**
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'therapist_pending_notification';
```

Expected result: 1 row showing the trigger on 'therapists' table.

### Step 3: Update TypeScript Types

After the migration is applied, regenerate TypeScript types:

```bash
supabase gen types typescript --local > src/types/database.types.ts
```

Or manually verify that `src/types/database.types.ts` includes:
- `needs_review`, `reviewed_by`, `reviewed_at`, `created_by` in Therapist Row type
- `therapist_pending` in NotificationType
- `related_therapist_id` in notifications table
- `therapist` as a content_type option in ModerationQueueItem

### Step 4: Test the Feature

**1. Test Manual Therapist Creation:**
- Create a new therapist via the UI
- Verify `needs_review = true` in database
- Verify admin receives notification
- Verify therapist appears in moderation queue
- Verify yellow flag shows on therapist profile (admin view)
- Verify yellow flag icon shows in dropdown (admin view)

**2. Test CSV Import:**
- Import therapists via CSV
- Verify `needs_review = false` in database
- Verify NO notifications sent
- Verify therapists do NOT appear in moderation queue

**3. Test Moderation Actions:**
- Click "Freigeben" button in moderation queue
- Verify therapist removed from queue
- Verify `needs_review = false` in database
- Verify `reviewed_by` and `reviewed_at` are set
- Test delete button as well

**4. Test Non-Admin View:**
- Login as regular user
- Verify therapists are visible (auto-approved)
- Verify NO yellow flags shown
- Verify therapist selector works normally

## Rollback Instructions

If you need to rollback this migration:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS therapist_pending_notification ON therapists;
DROP FUNCTION IF EXISTS notify_admins_of_new_therapist();

-- Remove policies
DROP POLICY IF EXISTS "Anyone can view therapists" ON therapists;
DROP POLICY IF EXISTS "Authenticated users can create therapists" ON therapists;
DROP POLICY IF EXISTS "Admins can update therapist review status" ON therapists;
DROP POLICY IF EXISTS "Admins can delete therapists" ON therapists;

-- Remove columns from therapists table
ALTER TABLE therapists
  DROP COLUMN IF EXISTS needs_review,
  DROP COLUMN IF EXISTS reviewed_by,
  DROP COLUMN IF EXISTS reviewed_at,
  DROP COLUMN IF EXISTS created_by;

-- Remove column from notifications table
ALTER TABLE notifications DROP COLUMN IF EXISTS related_therapist_id;

-- Note: Cannot easily remove enum value 'therapist_pending' from notification_type
-- This would require recreating the enum type and updating all references
```

## Files Modified in This Implementation

### Database Migration
- `supabase/migrations/012_add_therapist_review_system.sql` - NEW FILE

### TypeScript Types
- `src/types/database.types.ts` - MODIFIED
  - Added `needs_review`, `reviewed_by`, `reviewed_at`, `created_by` to Therapist type
  - Added `therapist_pending` to NotificationType
  - Added `related_therapist_id` to notifications
  - Updated ModerationQueueItem to support 'therapist' content type

### Services
- `src/services/therapists.service.ts` - MODIFIED
  - Updated `createTherapist()` to set `needs_review = true`
  - Updated `bulkImportTherapists()` to set `needs_review = false`
  - Added `dismissReview()` method

- `src/services/therapist-import.service.ts` - MODIFIED (already done in previous session)
  - Updated to use `bulkImportTherapists()` which sets `needs_review = false`

- `src/services/moderation-queue.service.ts` - MODIFIED
  - Added therapist query with graceful error handling
  - Added `dismissTherapist()`, `deleteTherapist()` methods
  - Updated bulk operations to support therapist type

### Components
- `src/components/admin/ModerationQueue.tsx` - MODIFIED
  - Added 'therapeuten' filter option
  - Added green "Therapeut" badge rendering
  - Added therapist-specific content rendering (blue link to profile)
  - Added therapist action buttons (Freigeben, Löschen)
  - Updated bulk operations

- `src/components/therapist/TherapistDirectoryPage.tsx` - MODIFIED
  - Added yellow "Wird geprüft" flag banner (visible to admins/moderators only)

- `src/components/therapist/TherapistSelector.tsx` - MODIFIED
  - Added yellow flag icon in dropdown next to therapists with `needs_review = true`
  - Only visible to admins/moderators

## Feature Flags / Configuration

This feature has no feature flags. It's always active once the migration is applied.

The feature gracefully handles the case where the migration hasn't been applied yet:
- The moderation queue will skip therapist items with a warning in the console
- Other moderation features (posts, comments) continue to work normally

## Support & Troubleshooting

### Issue: Moderation queue shows error about missing foreign key
**Solution:** The database migration hasn't been applied yet. Apply migration following Step 1.

### Issue: Notifications not being sent for new therapists
**Solution:** Check that the trigger exists:
```sql
SELECT * FROM information_schema.triggers WHERE trigger_name = 'therapist_pending_notification';
```

### Issue: CSV imports creating therapists with needs_review = true
**Solution:** Verify that `therapist-import.service.ts` is calling `bulkImportTherapists()` method, not `createTherapist()`.

### Issue: Yellow flags not showing for admins
**Solution:** Verify user role is 'admin' or 'moderator' in the database.

## Related Documentation
- Moderation Queue Documentation: (link to existing docs)
- Therapist System Documentation: (link to existing docs)
- Notification System Documentation: (link to existing docs)

---

**Date Created:** 2025-11-21
**Migration Version:** 012
**Status:** Ready for Production Deployment

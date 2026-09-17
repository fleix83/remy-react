# Therapist users (HIN-verified)

Verified therapists are ordinary accounts with one extra, server-managed
column: `users.therapist_verified_at`. It is **not** a `user_role` value, so a
therapist can also be a moderator. Anywhere a user name is shown, a verified
therapist renders in blue with a checkmark (`src/components/user/UserName.tsx`).

## Verification (migration `034_therapist_users.sql`)

1. The register form has a checkbox "Ich bin Therapeut:in". When ticked, the
   client requires a personal HIN address and passes `is_therapist: true` in
   the signup metadata. The checkbox is intent only.
2. `handle_new_user()` sets `therapist_verified_at = now()` **only if** the
   metadata flag is set **and** `auth.users.email` matches
   `^[a-z]+(-[a-z]+)*(\.[a-z]+(-[a-z]+)*)+@hin\.ch$` (`is_hin_personal_email`).
   Team/function mailboxes (`team@hin.ch`), digits, and HIN members on their
   own domain are excluded on purpose.
3. Supabase Auth refuses logins until the address is confirmed, so the flag is
   effectively gated on email confirmation. Keep "Confirm email" enabled.
4. `guard_users_privileged_columns` reverts client changes to the column;
   internal functions opt out via `set_config('remy.internal','on',true)`.
5. Changing the email to a non-HIN address (trigger on `auth.users`) clears the
   flag and unlinks the directory entry.

What HIN proves: an identified Swiss healthcare professional, not specifically
a psychotherapist. The badge tooltip says "Verifizierte:r Therapeut:in".

## Directory profile claims

Link between account and directory row: `therapists.user_id` (unique) +
`claimed_at`. `created_by` is the data-entry actor and is never used for
ownership.

Flow (`claim_therapist_profile()` RPC, idempotent, called after onboarding and
from the profile card):

- The verified name comes from the HIN local part (`hin_email_name_parts`).
- Matching uses `name_key` (umlauts -> ae/oe/ue, accents stripped) and
  `name_key_short` (umlauts -> a/o/u) against `first_name`/`last_name`.
- Exactly one match and it is unclaimed -> linked automatically, an
  `approved/auto` row is written to `therapist_claims`.
- Zero matches, several matches, or the one match belongs to another account
  -> a `pending` claim; moderators/admins get a `therapist_pending`
  notification.

Moderation (`ModerationQueue` -> filter "Profil-Anfragen",
`TherapistClaimsPanel`):

- `get_therapist_claim_candidates(claim_id)` returns the 10 best rows by
  pg_trgm similarity; the panel also has a free-text search.
- `resolve_therapist_claim(claim_id, action, therapist_id, note)` with
  `link` | `create` (new row from the HIN name, `needs_review = true`) |
  `reject` (note becomes the notification text). The claimant gets a `system`
  notification either way.
- `unlink_therapist_profile(therapist_id)` (admin table, TherapistRow).

## Owner editing

- `therapists` UPDATE policy "Owners can update their therapist profile"
  (`user_id = auth.uid()`), in addition to the staff policy.
- `guard_therapists_privileged_columns` reverts `needs_review`, `reviewed_*`,
  `created_by`, `user_id`, `claimed_at`, `is_active` for non-staff callers.
- The directory page shows the edit pencil to the owner; the edit modal now
  also has `specialty` and `services`.
- Profiles created by the claim flow have `needs_review = false` (migration 035); the "wird geprüft" flag is also hidden in the UI for any linked row.
- INSERT policy (security item M2) is closed: non-staff may only insert rows
  with `created_by = auth.uid()`, `needs_review = true`, `user_id is null`.

## CSV import

Import skips rows that already exist in the database (same
`first|last|canton`, or `inst:institution|canton` for institution rows).
Existing rows are never updated by an import.

## Testing the migration locally

`supabase/migrations/034_therapist_users.sql` was exercised against a
throwaway Postgres 14 with a stubbed `auth` schema (13 scenario groups:
verification, guards, auto-link, owner edits, ambiguous/no-match claims,
resolve link/create/reject, RLS, email-change revocation, unlink). Live schema
notes: `users` has no column-level grants live (016 not effective) and
`therapists.is_active` (021) is not live; the migration is written for that.

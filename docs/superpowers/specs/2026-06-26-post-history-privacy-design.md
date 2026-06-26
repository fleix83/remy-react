# Post-history privacy + public profiles — design

**Date:** 2026-06-26
**Branch:** main-light
**Status:** Approved (ready for implementation plan)

## Goal

Let a user choose whether their post history is visible to other users. Clicking
another user's avatar opens a **public profile** that mirrors the user's own
profile, minus the settings, with the post-history section shown only when that
user's privacy setting is *public*.

Two states for a viewed user's public profile:

1. **Öffentlich (public):** bio card **+** post history (posts only).
2. **Privat (private):** bio card **only**.

## Decisions (locked)

| Question | Decision |
| --- | --- |
| Scope | Build the full public profile: avatar-click → public profile page that mirrors the own profile (no settings), history conditional on the privacy flag. |
| Private view | **Bio card only** — hide the entire content/history section. |
| Public history contents | **Posts only** — no comments tab, no drafts tab. |
| German label | **Beitragsverlauf**, values **Öffentlich / Privat**. |
| Default visibility | **Public** (existing users + new sign-ups). |
| Clickable avatars | **All** author avatars: post card, post view, comment, messaging. |

## Scope boundary (important)

This setting controls **only the profile page's aggregated post-history list**.
A user's individual posts remain visible in the forum feed and on post-detail
pages exactly as today — they are already public content. This is a presentation
choice on the profile page, **not** a security/RLS control that hides posts
globally. No row-level-security changes are required; enforcement is reading the
viewed user's `post_history_public` flag and conditionally rendering the history
section.

## Architecture

### 1. Data model

- Add column to `users`:
  ```sql
  ALTER TABLE public.users
    ADD COLUMN post_history_public boolean NOT NULL DEFAULT true;
  ```
- Add a repo migration file under `supabase/migrations/`.
- Update `src/types/database.types.ts`: add `post_history_public` to the `users`
  table `Row` (`boolean`), `Insert` (`boolean | null` / optional), and `Update`
  (`boolean | null` / optional). The derived `User` type picks it up
  automatically.
- Ensure the profile type used by the auth store (`UserProfile`) includes the
  field so `updateProfile` can write it.
- **Live DB:** applying this column to the live Supabase project
  (`pxmouonbnyeofvlqgini`) requires the user's approval via the claude.ai
  connector. The migration file + SQL will be handed over; do not apply silently.

### 2. Setting UI — `src/components/user/ProfileSettings.tsx`

- Add `post_history_public: boolean` to `formData`, initialised from
  `userProfile.post_history_public ?? true`.
- New settings row **directly below "Bevorzugte Sprache"** (Language Preference),
  reusing the existing Messages-toggle pattern:
  - Edit mode: a toggle switch (on = public).
  - Read mode: a badge showing **Öffentlich** (green) / **Privat** (gray),
    mirroring the green/gray treatment used by the Messages toggle.
- Include the field in the `updateProfile({ ... })` payload in `handleSubmit`
  and in the reset logic in `handleCancel` / the init `useEffect`.

### 3. Shared header — `src/components/user/ProfileHeader.tsx` (new)

Extract the identical "banner + overlapping avatar + bio card" block currently
inline in `UserProfile.tsx` (≈ lines 111–223) into a presentational component.

- Props:
  - `user: User` — the profile being shown.
  - `editable: boolean` — when `true`, render the own-profile affordances; when
    `false`, render read-only.
  - Optional editable handlers/state (only used when `editable`): background
    upload click + `uploadingBackground` + `backgroundHover` + file input ref /
    `onBackgroundChange`, avatar `showUpload`, and the "Bearbeiten" (edit
    settings) button `onEditClick`.
- Read-only mode renders: gradient banner (+ `background_image_url` if set),
  overlapping avatar (`showUpload={false}`), and the bio card (username,
  "registered on" date, bio). No upload targets, no edit button.

The page scaffold (outer wrappers, the top bar with the back-to-forum button,
and — own profile only — the mobile menu + settings/BlockedUsers section) stays
in each parent component.

### 4. Refactor — `src/components/user/UserProfile.tsx`

- Replace the inline banner/avatar/bio block with `<ProfileHeader editable ... />`,
  passing the existing upload/edit state + handlers.
- Behaviour unchanged: settings toggle, BlockedUsers, background/avatar upload,
  mobile menu all preserved.

### 5. Public profile — `src/components/user/PublicProfile.tsx` (new)

- Route `/user/:id`, registered **inside the authed routes** in `src/App.tsx`
  (alongside `/post/:id`, no `Layout` wrapper — same pattern as the own profile).
  Lazy-loaded like the other route components.
- On mount, read `:id`:
  - If `:id === currentUser.id` → `navigate('/profile', { replace: true })`
    (own profile keeps edit features; you always see your own history).
  - Else fetch the target user via a new single-user fetch (see §7).
- Render:
  - Page scaffold + top bar (back-to-forum button), same look as own profile.
  - `<ProfileHeader user={target} editable={false} />` — **always**.
  - If `target.post_history_public` → `<UserContent userId={target.id} publicView />`.
  - Else → nothing below the bio card.
- Loading + not-found states (spinner; "user not found" fallback).

### 6. Posts-only mode — `src/components/user/UserContent.tsx`

- Add `publicView?: boolean` prop.
- When `publicView`:
  - Render **only the posts tab** (hide comments + drafts tabs and their data
    loads).
  - Edit/delete affordances are already gated by `user.id === post.user_id`, so a
    non-owner viewer sees none; no extra change needed there, but verify drafts
    can never load in this mode.
- Own-profile usage (no `publicView`) is unchanged: posts / comments / drafts.

### 7. Single-user fetch — service

- Add a method to fetch one user's public profile fields by id, e.g.
  `UserSearchService.getPublicUser(userId)` (or a small `users.service.ts` if a
  better fit emerges during implementation). Select:
  `id, username, avatar_url, background_image_url, bio, created_at, role,
  post_history_public`.

### 8. Clickable avatars — `src/components/user/UserAvatar.tsx`

- Add optional `clickable?: boolean` (default `false`).
- When `true`: wrap the avatar so a click calls `navigate('/user/' + user.id)`
  with `stopPropagation` (so it doesn't also trigger the surrounding card/row
  click). Adds `cursor-pointer`.
- Uses `react-router-dom`'s `useNavigate` inside the component.
- The large editable own-avatar (`showUpload` on the own profile) stays
  non-clickable.
- Enable `clickable` at these call sites:
  - `src/components/forum/PostCard.tsx` (post author)
  - `src/components/forum/PostView.tsx` (post author)
  - `src/components/forum/CommentCard.tsx` (comment author)
  - `src/components/messaging/MessagesList.tsx`
  - `src/components/messaging/MessageBubble.tsx`
  - `src/components/messaging/ConversationHeader.tsx`

### 9. i18n

Add to the **profile** namespace across locale files (DE primary; FR/IT/EN get
the keys, falling back to German where translation is pending):

- `settings.postHistory` = "Beitragsverlauf"
- `settings.public` = "Öffentlich"
- `settings.private` = "Privat"

Reuse existing profile strings for the public profile page (`header.backToForum`,
`header.registeredOn`, `content.*`, etc.). Add a "user not found" string if one
does not already exist.

## Data flow

```
click author avatar (clickable)
  → navigate('/user/:id')
    → PublicProfile
        :id === me ? redirect /profile
                   : fetch target user
        render ProfileHeader (read-only, always)
        target.post_history_public
          ? render UserContent(publicView)  // posts only
          : (nothing)
```

## Error handling

- Public profile: spinner while loading; graceful "user not found" if the fetch
  returns nothing.
- Setting save: existing success/error message pattern in `ProfileSettings`.
- Avatar navigation: a missing/invalid id lands on the not-found state.

## Testing

- Vitest unit test for `PublicProfile` rendering logic: given
  (`post_history_public` × self/other), assert which section renders (bio only vs
  bio + posts; self redirects). Mock the user fetch + auth store.
- Manual: toggle the setting, open the profile as another user, confirm
  public → posts-only history, private → bio only, and that own `/profile` is
  unchanged.

## Files

**New**
- `supabase/migrations/<timestamp>_add_post_history_public.sql`
- `src/components/user/ProfileHeader.tsx`
- `src/components/user/PublicProfile.tsx`

**Modified**
- `src/types/database.types.ts`
- `src/components/user/ProfileSettings.tsx`
- `src/components/user/UserProfile.tsx`
- `src/components/user/UserContent.tsx`
- `src/components/user/UserAvatar.tsx`
- `src/services/user-search.service.ts` (or new `users.service.ts`)
- `src/App.tsx`
- `src/components/forum/PostCard.tsx`
- `src/components/forum/PostView.tsx`
- `src/components/forum/CommentCard.tsx`
- `src/components/messaging/MessagesList.tsx`
- `src/components/messaging/MessageBubble.tsx`
- `src/components/messaging/ConversationHeader.tsx`
- profile i18n locale files (de/fr/it/en)

## Out of scope (YAGNI)

- Admin/moderator override to see private history (privacy applies to all
  non-owners). Moderation tooling is separate.
- Hiding individual posts from the forum feed (posts stay public).
- Granular per-tab privacy (comments shown separately, etc.).
- A "send message" button on the public profile (not requested).

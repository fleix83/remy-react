# Remy React Forum

Modern React + Supabase rebuild of the Remy psychotherapy patient forum (German/Swiss).

## Performance standards

All performance-related work must follow `docs/performance.md` — that doc is the canonical 11-section snappiness checklist (optimistic UI, instant feedback, parallel fetches, skeletons, transform-only animations, virtualization, code splitting, etc.). Cross-check against it when adding features or touching interactive surfaces. Re-run the audit if the app starts feeling sluggish.

## Tech stack

- **Frontend:** React 19 + TypeScript, Vite 7
- **Styling:** Tailwind CSS v4
- **Data:** Supabase (Postgres, Auth, Realtime, Storage) + TanStack Query v5
- **State:** Zustand
- **Editor:** TipTap v3
- **Router:** react-router-dom v7
- **i18n:** i18next + react-i18next (DE primary)
- **Tests:** Vitest + Testing Library (installed, suite minimal)

## Deploy workflow

- Active dev branch is `main-light`. PRs merge into `main`.
- `dist/` and the `staging`/`dist` branches are built automatically by GitHub Actions on push — **never** run `npm run build` manually for deploy purposes, and never commit hand-built `dist/` artifacts.
- `.htaccess` is copied into `dist/` by the build script.

## Status

Core forum is production-ready. Phases 1–5 complete; Phase 4 (user management) and Phase 6 (polish) are mostly landed.

### Implemented
- Auth (login/register/reset/confirm), profiles, avatars
- Posts: create/edit/view, rich text, categories, cantons, designations, tags, date-range filtering
- Comments: threaded replies, citations from selected text, inline edit/delete, realtime
- Therapist directory: profiles, search, designation matching, CSV import, post associations
- **Messaging:** 1:1 conversations, unread indicators, send-message entry points (`src/components/messaging/`)
- **User blocking:** `user-blocks.service.ts`, `BlockedUsers.tsx`
- **Notifications:** unread-message dot on avatar (`notifications.store.ts`)
- **Admin moderation:** `AdminDashboard`, `ModerationQueue`, designation management
- Mobile UX: badge-based metadata, 60vh editor, full-screen modals
- Desktop UX: sidebar filters (categories, cantons, designations, date range), inline new-post editor

### Outstanding
- Push notifications (browser/email) — currently in-app dot only
- Comprehensive test suite (Vitest scaffolded, few tests written)
- Sentry / production error tracking
- Full i18n coverage (DE done, FR/IT pending)
- Production deployment ownership / monitoring

## Security — pre-launch checklist

From the 2026-07 security review. **Already fixed** (live): migration `028_security_hardening_rls.sql` applied + verified — dropped `users.email`, trigger-guards on `users`/`posts`/`comments`/`messages` block self-promotion to admin, moderation self-approval, and message tampering. Frontend on `blue`: DOMPurify sanitization of post/comment HTML (`src/lib/sanitize.ts`) + CSP/security headers in `.htaccess`.

**Must clear these BEFORE going to production** (deferred while the app has only test/seed data, no real patients — low urgency now, but they become urgent the moment real users sign up):

- [ ] **H4 — leaked secrets in public git history.** Repo is public, 0 forks. `migrate_users.sql` contained **plaintext passwords** loaded into `auth.users`; `pandoc.sql` had 7 bcrypt hashes + real emails (files now deleted from HEAD but still in history). Action: (1) rotate/reset the affected Supabase Auth passwords + invalidate sessions; (2) purge files from history (`git filter-repo --invert-paths --path pandoc.sql --path migrate_users.sql --path migrate_posts.sql --path schema_dump.sql`, then force-push all branches); (3) request GitHub cache purge. Also move the `.env` anon key to CI secrets and `git rm --cached` the `.env*` files.
- [ ] **M1 — `notifications` INSERT is `WITH CHECK (true)`.** Any user can forge a notification to anyone. Move notification creation server-side (triggers on comment/message insert) and revoke client INSERT.
- [ ] **M2 — `therapists` INSERT is `WITH CHECK (true)`.** Any authenticated user can inject directory rows. Restrict INSERT to moderators/admins (or enforce `created_by = auth.uid()`).
- [ ] **H2 — Google Fonts loaded from Google's CDN** (`src/index.css`) leaks visitor IPs abroad (revDSG/anonymity). Self-host the fonts, then drop the `fonts.googleapis.com`/`fonts.gstatic.com` entries from the CSP in `.htaccess`.
- [ ] **H3 — `users` SELECT is `USING (true)` to anon**, still exposing `role`/`is_banned`/`created_at`. Restrict to a minimal public column projection (view or column grants).

See the `rls-security-holes-2026-07` memory for full detail and confirmed exploit paths.

## Architecture

```
src/
├── components/
│   ├── admin/       # AdminDashboard, ModerationQueue, designation editor
│   ├── auth/        # login, register, password reset, email confirm
│   ├── forum/       # PostCard, PostView, PostEditor, comments, FilterModal
│   ├── layout/      # nav, sidebar, menu
│   ├── messaging/   # conversations, message composer, MessagesPage
│   ├── static/      # community guidelines, welcome
│   ├── therapist/   # directory, profiles, designation UI
│   ├── ui/          # BadgeDropdown, RichTextEditor, TagInput, InlineEditCell
│   └── user/        # UserProfile, ProfileSettings, BlockedUsers, UserAvatar
├── services/        # Supabase access layer (one file per resource)
├── stores/          # Zustand: auth, forum, comments, messages, notifications
├── hooks/           # custom hooks
├── types/           # TS types (Supabase-generated + domain)
├── constants/       # cantons, categories, etc.
├── lib/             # supabase client, helpers
└── utils/           # pure utilities
```

## Database

Implemented tables: `users`, `categories`, `posts`, `comments`, `therapists`, `designations`, `messages`, `user_blocks`, plus moderation/tagging tables. Schema changes go through Supabase migrations (see `docs/supabase.md`, `docs/THERAPIST_MODERATION_MIGRATION.md`).

## Reference docs

- `docs/performance.md` — snappiness checklist (mandatory reading for perf work)
- `docs/supabase.md` — Supabase schema & policies
- `docs/designations.md` — therapist designation taxonomy
- `docs/languages.md` — language/i18n notes
- `docs/THERAPIST_MODERATION_MIGRATION.md` — moderation migration history
- `docs/review.md` — review notes

## Commands

```bash
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build && copy .htaccess (CI uses this; don't commit dist/)
npm run preview      # preview built app
npm run lint         # eslint
```

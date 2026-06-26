# Post-History Privacy + Public Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users mark their post history public/private; clicking any author avatar opens a read-only public profile that mirrors the own profile and shows the post history (posts only) only when that user is public.

**Architecture:** Add a `post_history_public` boolean to `users` (default public). Extract the profile banner/avatar/bio block into a shared `ProfileHeader` used by both the own profile (`UserProfile`) and a new read-only `PublicProfile` (`/user/:id`). A pure helper decides whether to render the history section. `UserAvatar` gains an opt-in `clickable` prop that navigates to `/user/:id`.

**Tech Stack:** React 19 + TypeScript, Vite 7, Tailwind v4, Supabase (Postgres) + TanStack Query, react-router-dom v7, i18next, Vitest.

## Global Constraints

- Active dev branch is `main-light`; do **not** run `npm run build` for deploy and do **not** commit `dist/`.
- Live Supabase project id: `pxmouonbnyeofvlqgini`. Apply migrations via the claude.ai Supabase connector (`mcp__claude_ai_Supabase__apply_migration`), authorized by the user for this work.
- `UserProfile` (auth store) is a type alias of `User` = `Tables<'users'>`; adding the column to `database.types.ts` propagates everywhere.
- i18n primary language is DE; add new keys to de/en/fr/it `profile.json`.
- Privacy is a profile-page presentation concern only — individual posts stay public in the forum feed. No RLS changes.
- Default `post_history_public` = `true` (public). Treat `null`/`undefined` as public.
- Type-check with `npx tsc -b` and lint with `npm run lint`; both must pass before each commit.

---

### Task 1: DB column + generated types

**Files:**
- Create: `supabase/migrations/026_post_history_public.sql`
- Modify: `src/types/database.types.ts` (users `Row`/`Insert`/`Update`, near `onboarding_complete`)

**Interfaces:**
- Produces: `users.post_history_public boolean NOT NULL DEFAULT true`; TS field `post_history_public: boolean` on `User`/`UserProfile` (Row), `post_history_public?: boolean | null` on Insert/Update.

- [ ] **Step 1: Write the migration file**

`supabase/migrations/026_post_history_public.sql`:

```sql
-- Add a per-user toggle for whether their aggregated post history is shown
-- on their public profile. Default true = visible (matches prior behaviour).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS post_history_public boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.users.post_history_public IS
  'When false, other users see only the bio card on this user''s public profile (post history hidden). Profile-page presentation only; individual posts stay public.';
```

- [ ] **Step 2: Apply the migration to the live DB**

Use the claude.ai Supabase connector:

```
mcp__claude_ai_Supabase__apply_migration(
  project_id="pxmouonbnyeofvlqgini",
  name="post_history_public",
  query="<contents of 026_post_history_public.sql>"
)
```

- [ ] **Step 3: Verify the column exists**

```
mcp__claude_ai_Supabase__execute_sql(
  project_id="pxmouonbnyeofvlqgini",
  query="select column_name, data_type, column_default, is_nullable from information_schema.columns where table_schema='public' and table_name='users' and column_name='post_history_public';"
)
```
Expected: one row, `boolean`, default `true`, `NO` nullable.

- [ ] **Step 4: Update `database.types.ts` — Row**

In the `users.Row` block, add after the `onboarding_complete: boolean | null` line:

```ts
          post_history_public: boolean
```

- [ ] **Step 5: Update `database.types.ts` — Insert and Update**

In `users.Insert`, after `onboarding_complete?: boolean | null`:

```ts
          post_history_public?: boolean | null
```

In `users.Update`, after `onboarding_complete?: boolean | null`:

```ts
          post_history_public?: boolean | null
```

- [ ] **Step 6: Type-check**

Run: `npx tsc -b`
Expected: PASS (no errors).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/026_post_history_public.sql src/types/database.types.ts
git commit -m "feat: add users.post_history_public column + types"
```

---

### Task 2: Setting UI in ProfileSettings + i18n

**Files:**
- Modify: `src/components/user/ProfileSettings.tsx`
- Modify: `src/i18n/locales/de/profile.json`, `en/profile.json`, `fr/profile.json`, `it/profile.json`

**Interfaces:**
- Consumes: `userProfile.post_history_public` (Task 1).
- Produces: settings form writes `post_history_public` via `updateProfile`.

- [ ] **Step 1: Add i18n keys**

In each `profile.json`, add three keys inside the existing `settings` object.

de (`src/i18n/locales/de/profile.json`):
```json
    "postHistory": "Beitragsverlauf:",
    "public": "Öffentlich",
    "private": "Privat",
```
en:
```json
    "postHistory": "Post history:",
    "public": "Public",
    "private": "Private",
```
fr:
```json
    "postHistory": "Historique des publications :",
    "public": "Public",
    "private": "Privé",
```
it:
```json
    "postHistory": "Cronologia dei post:",
    "public": "Pubblico",
    "private": "Privato",
```

Also add a public-profile content title inside the existing `content` object of each file (used in Task 4):

de: `"publicTitle": "Beiträge",`
en: `"publicTitle": "Posts",`
fr: `"publicTitle": "Publications",`
it: `"publicTitle": "Post",`

- [ ] **Step 2: Add field to form state**

In `ProfileSettings.tsx`, extend the `formData` initial state object (the `useState` near the top) to include:

```ts
    post_history_public: true
```

- [ ] **Step 3: Hydrate + reset the field**

In the `useEffect` that maps `userProfile` → `setFormData`, and in `handleCancel`'s `setFormData`, add:

```ts
        post_history_public: userProfile.post_history_public ?? true
```
(matching the object shape already used in both places).

- [ ] **Step 4: Persist the field**

In `handleSubmit`, add to the `updateProfile({ ... })` argument:

```ts
        post_history_public: formData.post_history_public,
```

- [ ] **Step 5: Render the toggle row**

Immediately after the closing `</div>` of the **Language Preference** row (the block whose label is `t('settings.preferredLanguage')`) and before the **Messages Toggle** row, insert:

```tsx
                {/* Post History Visibility */}
                <div className="flex items-center">
                  <div className="w-40 text-left">
                    <span className="text-sm font-medium text-gray-700">
                      {t('settings.postHistory')}
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    {isEditing ? (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, post_history_public: !formData.post_history_public })}
                        className={`
                          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2
                          ${formData.post_history_public ? 'bg-[var(--primary)]' : 'bg-gray-200'}
                        `}
                      >
                        <span
                          className={`
                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                            transition duration-200 ease-in-out
                            ${formData.post_history_public ? 'translate-x-5' : 'translate-x-0'}
                          `}
                        />
                      </button>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        (userProfile.post_history_public ?? true)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {(userProfile.post_history_public ?? true) ? t('settings.public') : t('settings.private')}
                      </span>
                    )}
                  </div>
                </div>
```

- [ ] **Step 6: Type-check + lint**

Run: `npx tsc -b && npm run lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/user/ProfileSettings.tsx src/i18n/locales/*/profile.json
git commit -m "feat: add Beitragsverlauf (post-history) privacy setting"
```

---

### Task 3: Extract `ProfileHeader`, refactor `UserProfile`

**Files:**
- Create: `src/components/user/ProfileHeader.tsx`
- Modify: `src/components/user/UserProfile.tsx`

**Interfaces:**
- Produces: `ProfileHeader` component:
  ```ts
  interface ProfileHeaderProps {
    user: User
    editable?: boolean
    uploadingBackground?: boolean
    onBackgroundChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    onEditClick?: () => void
  }
  ```
  Renders the gradient banner (+ `background_image_url`), the overlapping avatar, and the bio card (username, registered-on date, bio). When `editable`, the banner is click-to-upload with a hover "change banner" button + spinner, the avatar gets `showUpload`, and the bio card shows the "Bearbeiten" button wired to `onEditClick`.

- [ ] **Step 1: Create `ProfileHeader.tsx`**

```tsx
import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import UserAvatar from './UserAvatar'
import AvatarService from '../../services/avatar.service'
import { useActiveLanguage } from '../../hooks/useActiveLanguage'
import { intlLocale } from '../../utils/dateFormat'
import type { User } from '../../types/database.types'

interface ProfileHeaderProps {
  user: User
  editable?: boolean
  uploadingBackground?: boolean
  onBackgroundChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onEditClick?: () => void
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  editable = false,
  uploadingBackground = false,
  onBackgroundChange,
  onEditClick,
}) => {
  const { t } = useTranslation('profile')
  const lang = useActiveLanguage()
  const [backgroundHover, setBackgroundHover] = useState(false)
  const backgroundInputRef = useRef<HTMLInputElement>(null)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(intlLocale(lang), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  const handleBackgroundClick = () => {
    if (editable) backgroundInputRef.current?.click()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBackgroundChange?.(e)
    if (backgroundInputRef.current) backgroundInputRef.current.value = ''
  }

  return (
    <>
      {/* Header Container with Banner and Avatar */}
      <div className="relative">
        <div
          className={`bg-gradient-to-r from-[var(--primary)] to-[#2d8544] relative overflow-hidden group ${editable ? 'cursor-pointer' : ''}`}
          style={{
            maxHeight: '118px',
            height: '118px',
            borderTopLeftRadius: '28px',
            borderTopRightRadius: '28px',
            borderBottomLeftRadius: '0',
            borderBottomRightRadius: '0',
          }}
          onClick={handleBackgroundClick}
          onMouseEnter={() => editable && setBackgroundHover(true)}
          onMouseLeave={() => editable && setBackgroundHover(false)}
        >
          {user.background_image_url && (
            <div
              style={{
                backgroundImage: `url(${user.background_image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            />
          )}

          {editable && (
            <div className="absolute top-4 right-4">
              <div className={`bg-white/90 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm transition-opacity duration-200 ${backgroundHover || uploadingBackground ? 'opacity-100' : 'opacity-0'}`}>
                {uploadingBackground ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-[var(--primary)]"></div>
                    {t('header.uploadingBanner')}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {t('header.changeBanner')}
                  </>
                )}
              </div>
            </div>
          )}

          {editable && (
            <input
              ref={backgroundInputRef}
              type="file"
              accept={AvatarService.FILE_INPUT_ACCEPT}
              onChange={handleChange}
              className="hidden"
              disabled={uploadingBackground}
            />
          )}
        </div>

        {/* Overlapping Avatar */}
        <div className="absolute" style={{ left: '15px', top: '29px', zIndex: 10 }}>
          <UserAvatar user={user} size="large" showUpload={editable} />
        </div>
      </div>

      {/* Bio card */}
      <div
        className="shadow-sm relative"
        style={{
          backgroundColor: '#f7f5ef',
          marginTop: '0',
          paddingTop: '74px',
          paddingBottom: '32px',
          paddingLeft: '24px',
          paddingRight: '24px',
          minHeight: '200px',
          borderTopLeftRadius: '0',
          borderTopRightRadius: '0',
          borderBottomLeftRadius: '28px',
          borderBottomRightRadius: '28px',
        }}
      >
        {editable && (
          <button
            onClick={onEditClick}
            className="absolute border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm rounded-md px-3 py-1 transition-colors duration-200"
            style={{ top: '16px', right: '16px' }}
          >
            {t('header.edit')}
          </button>
        )}
        <div className="text-left">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{user.username}</h1>
          <p className="text-gray-400 text-sm mb-4">
            {t('header.registeredOn', { date: user.created_at ? formatDate(user.created_at) : t('header.unknownDate') })}
          </p>
          {user.bio && (
            <div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{user.bio}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default ProfileHeader
```

- [ ] **Step 2: Refactor `UserProfile.tsx` to use it**

Replace the inline block from `{/* Header Container with Banner and Avatar */}` through the end of the "Public Profile Information" bio card `</div>` (the block currently around lines 110–223) with:

```tsx
        <ProfileHeader
          user={userProfile}
          editable
          uploadingBackground={uploadingBackground}
          onBackgroundChange={handleBackgroundChange}
          onEditClick={() => setShowSettings(!showSettings)}
        />
```

Then:
- Add the import: `import ProfileHeader from './ProfileHeader'`.
- Remove now-unused locals: `backgroundInputRef`, `backgroundHover` / `setBackgroundHover`, `handleBackgroundClick`, and the local `formatDate` (it was only used by the bio card). Keep `uploadingBackground`/`setUploadingBackground` and `handleBackgroundChange` (still passed in). Keep `lang`/`useActiveLanguage` only if still referenced elsewhere; otherwise remove that import too.

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc -b && npm run lint`
Expected: PASS (no unused-variable errors — remove any leftovers flagged).

- [ ] **Step 4: Manual smoke check**

Run: `npm run dev`, open `/profile`. Expected: banner, avatar upload, bio card, "Bearbeiten" toggling settings, and background upload all behave exactly as before.

- [ ] **Step 5: Commit**

```bash
git add src/components/user/ProfileHeader.tsx src/components/user/UserProfile.tsx
git commit -m "refactor: extract shared ProfileHeader from UserProfile"
```

---

### Task 4: `UserContent` posts-only mode

**Files:**
- Modify: `src/components/user/UserContent.tsx`

**Interfaces:**
- Consumes: `content.publicTitle` i18n key (Task 2).
- Produces: `UserContent` accepts `publicView?: boolean`. When true: only the **posts** tab renders (no comments/drafts tabs or loads), the title uses `content.publicTitle`, and the empty-state hint (the personal "Deine…" text) is suppressed.

- [ ] **Step 1: Add the prop**

Change the props interface and signature:

```tsx
interface UserContentProps {
  userId: string
  publicView?: boolean
}

const UserContent: React.FC<UserContentProps> = ({ userId, publicView = false }) => {
```

- [ ] **Step 2: Force the posts tab in public view**

Right after the existing `useEffect` that calls `loadContent()`, add an effect that pins the tab:

```tsx
  useEffect(() => {
    if (publicView) setActiveTab('posts')
  }, [publicView])
```

- [ ] **Step 3: Hide non-post tabs + use public title**

Replace the tabs header `<h2>` title and the tab array. Change the title line to:

```tsx
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-left">{publicView ? t('content.publicTitle') : t('content.title')}</h2>
```

Change the tab list source so comments/drafts are excluded in public view:

```tsx
            {[
              { id: 'posts' as ContentTab, label: t('content.tabs.posts'), count: posts.length },
              ...(publicView ? [] : [
                { id: 'comments' as ContentTab, label: t('content.tabs.comments'), count: comments.length },
                { id: 'drafts' as ContentTab, label: t('content.tabs.drafts'), count: drafts.length },
              ]),
            ].map((tab) => (
```

- [ ] **Step 4: Suppress the personal empty-state hint**

In the posts-empty block, wrap the hint paragraph so it only shows for the owner's own view:

```tsx
                    <p className="text-gray-500">{t('content.posts.empty')}</p>
                    {!publicView && (
                      <p className="text-sm text-gray-400 mt-1">{t('content.posts.emptyHint')}</p>
                    )}
```

- [ ] **Step 5: Type-check + lint**

Run: `npx tsc -b && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/user/UserContent.tsx
git commit -m "feat: posts-only public view for UserContent"
```

---

### Task 5: Single-user fetch service method

**Files:**
- Modify: `src/services/user-search.service.ts`

**Interfaces:**
- Produces: `UserSearchService.getPublicUser(userId: string): Promise<User | null>` selecting `id, username, avatar_url, background_image_url, bio, created_at, role, post_history_public`.

- [ ] **Step 1: Add the method**

Inside the `UserSearchService` class, add:

```ts
  // Fetch a single user's public-profile fields by id. Returns null if missing.
  static async getPublicUser(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, avatar_url, background_image_url, bio, created_at, role, post_history_public')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching public user:', error)
      throw new Error('Failed to load user profile')
    }

    return (data as User) ?? null
  }
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/services/user-search.service.ts
git commit -m "feat: UserSearchService.getPublicUser"
```

---

### Task 6: Visibility helper + `PublicProfile` route

**Files:**
- Create: `src/utils/profileVisibility.ts`
- Create: `src/utils/profileVisibility.test.ts`
- Create: `src/components/user/PublicProfile.tsx`
- Modify: `src/App.tsx`
- Modify: `src/i18n/locales/de/profile.json`, `en/profile.json`, `fr/profile.json`, `it/profile.json` (add `header.notFound`)

**Interfaces:**
- Consumes: `UserSearchService.getPublicUser` (Task 5), `ProfileHeader` (Task 3), `UserContent` `publicView` (Task 4).
- Produces: pure helpers `isSelfProfile(targetId, viewerId)` and `shouldShowPostHistory(target, viewerId)`; route `/user/:id` → `PublicProfile`.

- [ ] **Step 1: Write the failing test**

`src/utils/profileVisibility.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isSelfProfile, shouldShowPostHistory } from './profileVisibility'

describe('isSelfProfile', () => {
  it('true when viewer matches target', () => {
    expect(isSelfProfile('a', 'a')).toBe(true)
  })
  it('false when different', () => {
    expect(isSelfProfile('a', 'b')).toBe(false)
  })
  it('false when no viewer', () => {
    expect(isSelfProfile('a', undefined)).toBe(false)
  })
})

describe('shouldShowPostHistory', () => {
  it('defaults to public when flag is null/undefined', () => {
    expect(shouldShowPostHistory({ id: 'a', post_history_public: null }, 'b')).toBe(true)
    expect(shouldShowPostHistory({ id: 'a' }, 'b')).toBe(true)
  })
  it('hidden for other viewers when private', () => {
    expect(shouldShowPostHistory({ id: 'a', post_history_public: false }, 'b')).toBe(false)
  })
  it('shown when public', () => {
    expect(shouldShowPostHistory({ id: 'a', post_history_public: true }, 'b')).toBe(true)
  })
  it('owner always sees their own history even when private', () => {
    expect(shouldShowPostHistory({ id: 'a', post_history_public: false }, 'a')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/utils/profileVisibility.test.ts`
Expected: FAIL (module not found / functions undefined).

- [ ] **Step 3: Implement the helper**

`src/utils/profileVisibility.ts`:

```ts
export function isSelfProfile(targetId: string, viewerId: string | undefined): boolean {
  return !!viewerId && viewerId === targetId
}

export function shouldShowPostHistory(
  target: { id: string; post_history_public?: boolean | null },
  viewerId: string | undefined,
): boolean {
  if (isSelfProfile(target.id, viewerId)) return true
  return target.post_history_public !== false // null/undefined => public
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/utils/profileVisibility.test.ts`
Expected: PASS (all assertions).

- [ ] **Step 5: Add the `header.notFound` i18n key**

Add inside each `profile.json` `header` object:

de: `"notFound": "Benutzer nicht gefunden",`
en: `"notFound": "User not found",`
fr: `"notFound": "Utilisateur introuvable",`
it: `"notFound": "Utente non trovato",`

- [ ] **Step 6: Create `PublicProfile.tsx`**

```tsx
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import ProfileHeader from './ProfileHeader'
import UserContent from './UserContent'
import UserSearchService from '../../services/user-search.service'
import { isSelfProfile, shouldShowPostHistory } from '../../utils/profileVisibility'
import type { User } from '../../types/database.types'

const PublicProfile: React.FC = () => {
  const { t } = useTranslation('profile')
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const [profile, setProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Viewing yourself: send to the editable own-profile screen.
  useEffect(() => {
    if (id && user && isSelfProfile(id, user.id)) {
      navigate('/profile', { replace: true })
    }
  }, [id, user, navigate])

  useEffect(() => {
    let cancelled = false
    if (!id || (user && isSelfProfile(id, user.id))) return
    setLoading(true)
    setNotFound(false)
    UserSearchService.getPublicUser(id)
      .then((data) => {
        if (cancelled) return
        if (!data) setNotFound(true)
        else setProfile(data)
      })
      .catch(() => { if (!cancelled) setNotFound(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('header.loading')}</p>
        </div>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">{t('header.notFound')}</p>
        <button
          onClick={() => navigate('/')}
          className="font-medium hover:opacity-80 transition-opacity"
          style={{ color: 'var(--primary)' }}
        >
          {t('header.backToForum')}
        </button>
      </div>
    )
  }

  const showHistory = shouldShowPostHistory(profile, user?.id)

  return (
    <div className="min-h-screen relative z-10" style={{ backgroundColor: '#ffffff' }}>
      <div className="profile-top-header w-full flex items-start justify-center relative">
        <div className="max-w-6xl w-full mx-auto px-4 md:px-0 h-[65px] flex justify-between items-center">
          <div className="w-6 h-6"></div>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center font-medium hover:opacity-80 transition-opacity"
            style={{ color: 'var(--primary)' }}
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" style={{ stroke: 'var(--primary)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('header.backToForum')}
          </button>
          <div className="w-6 h-6"></div>
        </div>
      </div>

      <div className="profile-content max-w-6xl mx-auto px-4 md:px-0 relative z-20" style={{ paddingTop: '30px', paddingBottom: '24px' }}>
        <ProfileHeader user={profile} editable={false} />

        {showHistory && (
          <div className="mt-6">
            <UserContent userId={profile.id} publicView />
          </div>
        )}
      </div>
    </div>
  )
}

export default PublicProfile
```

- [ ] **Step 7: Register the route in `App.tsx`**

Add the lazy import near the other lazy components:

```tsx
const PublicProfile = lazy(() => import('./components/user/PublicProfile'))
```

Inside the authed routes block (the `<>...</>` that contains `<Route path="/profile" ... />`), add — next to `/post/:id` (no `Layout`, same as own profile):

```tsx
              <Route path="/user/:id" element={<PublicProfile />} />
```

- [ ] **Step 8: Type-check, lint, test**

Run: `npx tsc -b && npm run lint && npx vitest run src/utils/profileVisibility.test.ts`
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add src/utils/profileVisibility.ts src/utils/profileVisibility.test.ts src/components/user/PublicProfile.tsx src/App.tsx src/i18n/locales/*/profile.json
git commit -m "feat: public profile route with post-history privacy"
```

---

### Task 7: Clickable avatars

**Files:**
- Modify: `src/components/user/UserAvatar.tsx`
- Modify: `src/components/forum/PostCard.tsx`, `src/components/forum/PostView.tsx`, `src/components/forum/CommentCard.tsx`
- Modify: `src/components/messaging/MessagesList.tsx`, `src/components/messaging/MessageBubble.tsx`, `src/components/messaging/ConversationHeader.tsx`

**Interfaces:**
- Consumes: route `/user/:id` (Task 6).
- Produces: `UserAvatar` accepts `clickable?: boolean`; when true the avatar navigates to `/user/${user.id}` and stops propagation.

- [ ] **Step 1: Add `clickable` to `UserAvatar`**

Add the import at the top:

```tsx
import { useNavigate } from 'react-router-dom'
```

Add `clickable` to the props interface:

```tsx
  clickable?: boolean
```

Add to the destructured props (with default):

```tsx
  clickable = false,
```

Inside the component body, add:

```tsx
  const navigate = useNavigate()

  const handleAvatarClick = (e: React.MouseEvent) => {
    if (!clickable) return
    e.stopPropagation()
    navigate(`/user/${user.id}`)
  }
```

On the outermost wrapper `<div className={`relative ${className}`}>`, add the click handler + pointer cursor when clickable:

```tsx
    <div
      className={`relative ${className} ${clickable ? 'cursor-pointer' : ''}`}
      onClick={handleAvatarClick}
    >
```

- [ ] **Step 2: Verify own-profile avatar is unaffected**

`UserProfile`/`ProfileHeader` render the large avatar without `clickable`, so the default `false` keeps it non-navigating. No change needed there. Confirm by reading `ProfileHeader.tsx` — the large `UserAvatar` has no `clickable` prop.

- [ ] **Step 3: Enable on forum author avatars**

`PostCard.tsx` — the `<UserAvatar user={post.users} size="small" ... />`: add `clickable`.
`PostView.tsx` — the author `<UserAvatar user={post.users} size="small" ... />`: add `clickable`.
`CommentCard.tsx` — the `<UserAvatar user={comment.users || {...}} size="small" ... />`: add `clickable`.

Each becomes, e.g.:

```tsx
          <UserAvatar
            user={post.users}
            size="small"
            className="flex-shrink-0"
            clickable
          />
```

- [ ] **Step 4: Enable on messaging avatars**

`MessagesList.tsx` (`user={conversation.participant}`), `MessageBubble.tsx` (`user={message.sender}`), `ConversationHeader.tsx` (`user={conversation.participant}`): add `clickable` to each `<UserAvatar … />`.

- [ ] **Step 5: Type-check + lint**

Run: `npx tsc -b && npm run lint`
Expected: PASS.

- [ ] **Step 6: Manual smoke check**

Run: `npm run dev`. From the forum: click a post author avatar → lands on `/user/:id`. With that user public → bio + posts-only history; set them private (toggle in their settings / DB) → bio card only. Click your own avatar → redirected to `/profile`. Card click (not on avatar) still opens the post.

- [ ] **Step 7: Commit**

```bash
git add src/components/user/UserAvatar.tsx src/components/forum/PostCard.tsx src/components/forum/PostView.tsx src/components/forum/CommentCard.tsx src/components/messaging/MessagesList.tsx src/components/messaging/MessageBubble.tsx src/components/messaging/ConversationHeader.tsx
git commit -m "feat: clickable author avatars open public profile"
```

---

## Self-Review

**Spec coverage:**
- Data model + migration + types → Task 1. ✓
- Setting UI ("Beitragsverlauf", Öffentlich/Privat, below language, default public) → Task 2. ✓
- Shared `ProfileHeader` + `UserProfile` refactor → Task 3. ✓
- Posts-only public history (no comments/drafts) → Task 4. ✓
- Single-user fetch → Task 5. ✓
- `PublicProfile` route, bio-only when private, self→`/profile` redirect, visibility helper + test → Task 6. ✓
- Clickable avatars (all listed call sites) → Task 7. ✓
- i18n keys (de/en/fr/it) → Tasks 2 and 6. ✓
- Scope boundary (no RLS, posts stay public) → respected (client-side render only). ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `getPublicUser` returns `User | null` (Task 5) consumed in Task 6 state typed `User | null`; `shouldShowPostHistory`/`isSelfProfile` signatures match between Task 6 helper, test, and `PublicProfile`; `ProfileHeaderProps` used identically in Tasks 3 and 6; `UserContent` `publicView` defined in Task 4 and used in Task 6; `clickable` defined in Task 7 and used at all call sites. ✓

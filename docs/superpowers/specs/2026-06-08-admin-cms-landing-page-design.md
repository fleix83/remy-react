# Admin CMS — Editable Landing Page

**Date:** 2026-06-08
**Status:** Design — pending user review
**Branch:** main-light

## Goal

All content on the landing page (`src/App.tsx`, the unauthenticated `AuthForm` view) — **excluding the top nav menu** — must be editable from the admin panel. The admin "Inhalte" tab is renamed "Cms", gains a vertical-tab layout, and the first vertical tab "Landing Page" exposes every landing string as an editable field. Content is stored in Supabase so edits persist and show to all visitors.

## Scope

### In scope (editable)

Every visible text string on the landing page **except the top nav** ("Wer oder was ist Remy?", "Login"):

- **Trust badges** (mobile info bar): Sicher / Anonym / Moderiert
- **Hero**: mobile tagline, the 4 desktop word-pills, CTA button label, register prompt, register submit label, "Schon registriert? / Login." links
- **Registration-complete** panel: title, body, hint, login link
- **Login form** copy: "REMY" title, subtitle, field labels, "Passwort vergessen? / Zurücksetzen", submit label, "Noch kein Konto? / Registrieren" links
- **Features** (`LANDING_FEATURES`, desktop): 4 × (title + lead)
- **About** section: 3 narrative paragraphs
- **Footer**: Impressum / Datenschutz link labels + hrefs, "Made by" + "Studio LUMINELLI"

### Explicitly out of scope

- **Top nav menu** (per goal).
- **Decorative SVGs**: feature blobs/icons, badge icons, illustrations (dog, saul, masken, snail, logo). These are visual assets, not copy.
- **Raw input placeholders** that are pure UI affordances (`deine@email.com`, `••••••••`). The field *labels* ("E-Mail", "Passwort") are editable; the example-value placeholders are not. (Flag during review if these should be included.)
- **Multilingual (FR/IT)**: content is stored as plain German strings. The JSON shape can later nest by locale; not built now (YAGNI).

## Approach (decided: single JSONB document)

A new `site_content` table holds named content documents. The landing page is one row, `key = 'landing'`, whose `value` (JSONB) is a structured `LandingContent` object.

- The current hardcoded strings become a typed `DEFAULT_LANDING_CONTENT` constant in code — the **canonical fallback**.
- The DB row stores **admin overrides** (the full object on save). It is *not* seeded from a migration, so there is no copy duplicated between SQL and code, and no drift risk.
- The landing page reads content through a TanStack Query hook whose `initialData` is `DEFAULT_LANDING_CONTENT`. **First paint is instant** with the exact current copy (no skeleton, no flash, no layout shift — satisfies `docs/performance.md`), then it hydrates with any DB overrides.

## Data model

### Type (`src/types/landing-content.types.ts`)

```ts
export interface LandingFeature {
  title: string
  lead: string
}

export interface LandingContent {
  badges: {
    secure: string      // "Sicher"
    anonymous: string   // "Anonym"
    moderated: string   // "Moderiert"
  }
  hero: {
    taglineMobile: string          // "Du machst eine\nPsychotherapie?" (\n = line break)
    taglineWords: string[]         // 4 desktop pills: ["Du","machst","eine","Psychotherapie?"]
    ctaLabel: string               // "Austauschen"
    registerPrompt: string         // "Melde Dich anonym und sicher an"
    registerSubmit: string         // "Registrieren"
    loginLinkPrefix: string        // "Schon registriert? Zum "
    loginLinkLabel: string         // "Login."
  }
  registrationComplete: {
    title: string                  // "Registrierung erfolgreich!"
    body: string                   // "Bitte überprüfe deine E-Mails und klicke auf den Bestätigungslink."
    hint: string                   // "Nach der Bestätigung kannst du dich einloggen."
    loginLabel: string             // "Login"
  }
  login: {
    title: string                  // "REMY"
    subtitle: string               // "Willkommen zurück"
    emailLabel: string             // "E-Mail"
    passwordLabel: string          // "Passwort"
    forgotPrefix: string           // "Passwort vergessen? "
    forgotLabel: string            // "Zurücksetzen"
    submit: string                 // "Einloggen"
    registerPrefix: string         // "Noch kein Konto? "
    registerLabel: string          // "Registrieren"
  }
  features: LandingFeature[]       // exactly 4; layout is tuned for 4
  about: {
    paragraphs: string[]           // 3 paragraphs; "Remy" auto-styled in cursive on render
  }
  footer: {
    impressumLabel: string         // "Impressum"
    impressumHref: string          // "/impressum"
    datenschutzLabel: string       // "Datenschutz"
    datenschutzHref: string        // "/datenschutz"
    madeByPrefix: string           // "Made by"
    madeByName: string             // "Studio LUMINELLI"
  }
}
```

`DEFAULT_LANDING_CONTENT: LandingContent` in the same file reproduces the **exact** current strings, including soft hyphens (`­`) and the typographic apostrophe (`’`) in the about paragraphs and "400’000".

### Table (`site_content`)

```sql
create table public.site_content (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.users(id)
);
```

RLS (exact admin-role check confirmed against live `users.role` during implementation):

- **SELECT**: `to anon, authenticated using (true)` — landing content is public.
- **INSERT / UPDATE**: `to authenticated`, allowed only when the caller is an admin:
  `exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')`.

No seed row — the row is created on the admin's first save (upsert).

## Components & data flow

```
DEFAULT_LANDING_CONTENT (code)  ──initialData──►  useLandingContent() ──► App.tsx landing render
                                                          ▲
site_content row 'landing' (DB) ──getLandingContent()─────┘  (DB overrides merged over defaults)
                                                          ▲
LandingPageEditor (admin) ──saveLandingContent()──► upsert ──invalidates query
```

### `src/services/landing-content.service.ts`

- `getLandingContent(): Promise<LandingContent>` — fetch row `key='landing'`; deep-merge `value` over `DEFAULT_LANDING_CONTENT` (so missing/new keys fall back to defaults); return defaults if no row.
- `saveLandingContent(content: LandingContent): Promise<void>` — `upsert({ key: 'landing', value: content, updated_at, updated_by })`.

### `src/hooks/useLandingContent.ts`

- `useLandingContent()` — `useQuery({ queryKey: ['landing-content'], queryFn: getLandingContent, initialData: DEFAULT_LANDING_CONTENT, staleTime: long })`. Long `staleTime` because content rarely changes; instant render from `initialData`.
- `useSaveLandingContent()` — `useMutation` calling `saveLandingContent`, invalidating `['landing-content']` on success.

### `src/App.tsx` (landing render)

Replace all in-scope literals in `AuthForm` (and the `LANDING_FEATURES` consumption) with values from `useLandingContent()`. Specifics:
- `taglineMobile` rendered with `\n` → `<br />`.
- `taglineWords[0..3]` map to the fixed pill classes `landing-tag-du / -machst / -eine / -psycho`.
- About paragraphs rendered via a small helper that wraps occurrences of "Remy" in the existing cursive `<span className="landing-remy-name">`. Soft hyphens in defaults are preserved; if an admin retypes without them, hyphenation hints are simply absent (acceptable).
- `LANDING_FEATURES` keeps its fixed `key`/`blob`/`icon` (decorative) but takes `title`/`lead` from content (`features[i]`).

### Admin: `src/components/admin/CmsTab.tsx`

- Vertical-tab shell: a left rail of buttons + a content pane. First (and currently only) vertical tab: **"Landing Page"**. Structured so more page-tabs can be added later.
- Renders `<LandingPageEditor />` for the Landing Page tab.

### Admin: `src/components/admin/LandingPageEditor.tsx`

- Loads content via `useLandingContent()` into local form state on mount.
- Grouped sections matching the type: **Trust badges**, **Hero**, **Registration complete**, **Login form**, **Features** (4 cards), **About** (paragraph textareas), **Footer**.
- Plain `<input>` / `<textarea>` fields bound to the local object.
- **Save** button → `useSaveLandingContent()`; shows saving state and disables when not dirty; success/error feedback. **Reset** restores `DEFAULT_LANDING_CONTENT` into the form (does not save until Save pressed).

### Admin: `src/components/admin/AdminDashboard.tsx`

- Rename the horizontal tab label `"Inhalte"` → `"Cms"` (the `activeTab` key stays `'content'` to minimize churn, or is renamed to `'cms'` — implementer's choice, internal only).
- The Cms tab body renders `<CmsTab />` instead of the old static moderation-info paragraph.
- **Access**: the Cms tab is **admin-only** (gated by `permissions.isAdmin`), consistent with the Designations tab. The old static moderation-guidance text (previously shown to moderators) is dropped — moderation is done in `ModerationQueue`.

## Error handling

- `getLandingContent` failure → query falls back to `initialData` (defaults); landing never breaks on a fetch error.
- `saveLandingContent` failure (e.g. RLS denies a non-admin) → editor shows an error message; form state retained so edits aren't lost.
- Deep-merge in `getLandingContent` guarantees forward/backward compatibility: an old DB row missing newly added fields still renders (defaults fill gaps).

## Testing

- **Unit**: deep-merge in `getLandingContent` (partial DB row over defaults; empty row → defaults; missing row → defaults).
- **Unit**: about-paragraph render helper wraps "Remy" correctly and handles paragraphs with 0, 1, or multiple occurrences.
- **Manual**: edit a field in the admin editor → Save → reload landing → change visible; first paint shows correct copy with no flash.
- **Manual**: non-admin cannot save (RLS denies); landing still readable when logged out.

## Out of scope / future

- Editing decorative images/illustrations.
- FR/IT localization of CMS content.
- Versioning / audit history of content edits (only `updated_at` / `updated_by` recorded).
- Additional CMS pages beyond Landing (the vertical-tab shell leaves room for them).

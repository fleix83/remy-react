# Design: Remy Public Shell + SEO/GEO Groundwork

**Date:** 2026-07-04 · **Status:** awaiting Felix's approval — nothing implemented
**Context:** [`docs/SEO-GEO-AUDIT.md`](../../SEO-GEO-AUDIT.md), [`docs/PLAN-SEO-GEO.md`](../../PLAN-SEO-GEO.md)
**Branch assumption:** `blue` (current; deploys to `staging-blue`) — ⚠️ confirm

This is "Option A: shop window" from the SEO plan: landing, About, Impressum, Datenschutz and the footer become public and SEO/GEO-ready; the forum stays login-gated. No RLS change, no moderation-pipeline change, no indexation of user or practitioner content.

## Build order (assumed — Felix was AFK when asked)

1. **Public-shell groundwork** (this spec, parts A–D)
2. **Admin SEO tab MVP** (this spec, part E)
3. **Landing page redesign** — separate follow-up design session. Open inputs from Felix: which copy is current (`copy/Landing Text.pages` edited 2026-05, but its embedded preview shows the 2026-04 state), and which `design/` screenshots show the target design.

---

## A. Public pages: `/impressum`, `/datenschutz`, `/about`

**Storage: CMS `documents` table** (same pattern as Community Guidelines): one row per page with `slug`, `published`, section-structured content. Anon read is already governed by existing RLS (`published = true`, migration `016:224-225`) — no policy changes.

- New shared component `src/components/static/StaticDocumentPage.tsx`, parameterized by slug: fetches via `documentsService.getDocumentBySlug`, renders title + sections, mounts `SeoHead` (part C). `CommunityGuidelinesPage` is left untouched for now (it carries extra inline-admin-editing machinery; consolidation is a later cleanup, not this project).
- Routes registered in `App.tsx` **before** the `!user` catch-all, alongside `/community-guidelines`:
  - `/impressum` (matches existing footer default href)
  - `/datenschutz` (matches existing footer default href)
  - `/about`
- Seed migration inserts the three documents, `published = true`, DE placeholder copy visibly marked `[ENTWURF — juristisch prüfen]`. ⚖️ Final Impressum/Datenschutz text comes from Felix/counsel; About copy can draw on the `copy/` drafts and existing `about.paragraphs` landing content.
- **Editing path:** the guidelines editor is inline machinery inside `CommunityGuidelinesPage`, not reusable as-is — so the new pages need their own edit story. Recommended: a fourth CMS rail section **"Seiten"** (documents picker → title + sections editor built from the existing `CmsField`/`CmsSection`/`CmsSaveBar` primitives, writing through `documentsService.updateDocument`). Modest new work, keeps legal texts deploy-free. Alternative if we want zero editor work in this phase: content changes go through migrations until the SEO tab phase — acceptable only if Impressum/Datenschutz iterations are expected to be rare.

## B. Footer: project description + About link

Extend `FooterContent` in `src/types/landing-content.types.ts`:

```ts
export interface FooterContent {
  description: string        // NEW — short project description, crawlable on every page
  aboutLabel: string         // NEW
  aboutHref: string          // NEW, default '/about'
  impressumLabel: string
  impressumHref: string
  datenschutzLabel: string
  datenschutzHref: string
  madeByPrefix: string
  madeByName: string
}
```

- Default `description` (DE): one to two sentences, e.g. "Remy ist eine unabhängige Patienteninitiative für die Schweiz — das anonyme, moderierte Forum für Menschen in Psychotherapie." (final wording with Felix). The deep-merge default mechanism keeps old DB rows safe.
- `FooterEditor` gains the three fields (existing `CmsField` pattern).
- Rendered in both footers — `AuthForm` landing footer (`App.tsx`) and `Layout.tsx` — as real text + real `<a>`/`<Link>` elements. GEO value: a consistent entity description on every page.

## C. Head/meta foundation

**`SeoHead` component** (`src/components/seo/SeoHead.tsx`) using React 19 native metadata hoisting (no helmet dependency): renders `<title>`, `<meta name="description">`, `<link rel="canonical">`, `og:title/description/image/url/type`, `og:locale`, and optional `<meta name="robots">`.

- **Meta content source:** new `site_content` key `'seo'`, shaped per page, localized with the existing `CONTENT_LANGS`/`localizedBranch` mechanism, typed defaults in `src/types/seo-content.types.ts` (pattern-identical to `landing-content.types.ts`):

  ```ts
  export interface PageMeta { title: string; description: string; ogImage?: string; noindex?: boolean }
  export interface SeoContent {
    pages: Record<'landing' | 'about' | 'impressum' | 'datenschutz' | 'communityGuidelines', PageMeta>
    social: { defaultOgImage: string; siteName: string }
  }
  ```

  Loaded with the existing `SiteContentService.getContent` + TanStack Query `initialData` pattern → instant render from defaults, admin overrides applied when fetched.
- **Canonical/OG URLs are absolute**, built from `VITE_SITE_URL` (new env var; `https://remyforum.ch` in `.env.production` for the future prod workflow, staging URL in `.env.staging`). Staging never emits production canonicals.
- **`<html lang>`:** set `lang="de"` in `index.html`; sync `document.documentElement.lang` on i18next `languageChanged` (init + listener in `src/i18n/index.ts`).
- **`index.html` baked defaults** (what non-JS crawlers see): DE meta description, OG defaults + share image, corrected title ("Remy — Forum für Menschen in Psychotherapie" — final wording with Felix). Align/remove the drifting `index.dev.html`/`index.prod.html` duplicates if they're no longer used by the build (verify before deleting).
- **OG share image:** 1200×630 asset in `public/images/`. ⚖️ Which visual (sofa/logo) — Felix decides; placeholder derived from `logo_claim.png` until then.
- **Organization + WebSite JSON-LD** on the landing page only (static component, JSON-LD is appropriate here): name, url, logo, description matching the footer text. No further structured data in this phase.
- **No hreflang** in this phase — there are no per-language URLs to reference; it arrives with prerendering (plan Phase 3). The `'seo'` doc is language-keyed from day one so content is ready.

## D. robots.txt, sitemap, staging protection

- `public/robots.txt` (production content): allow-all + `Sitemap: https://remyforum.ch/sitemap.xml`. ⚖️ AI-crawler directives deliberately absent until the plan's per-bot decision table is decided — ships neutral.
- `public/sitemap.xml`: static, the five public URLs (`/`, `/about`, `/impressum`, `/datenschutz`, `/community-guidelines`). Hand-maintained is correct at this scale; DB-driven generation comes with prerendering.
- **Staging must not be indexed:** both staging workflows (`deploy-staging.yml`, `deploy-staging-blue.yml`) add a post-build step:
  1. overwrite `dist/robots.txt` with `User-agent: *\nDisallow: /`
  2. append `Header set X-Robots-Tag "noindex, nofollow"` to `dist/.htaccess`
  The repo files stay production-shaped; staging deployments neutralize them. (The future production workflow ships them untouched.)

## E. Admin SEO tab (MVP)

Top-level tab in `AdminDashboard` (extend `TabId` union + `TAB_ICONS` + tabs array, `permissions.isAdmin`-gated, render block mirroring the CMS tab), internally reusing `CmsSection`/`CmsField`/`CmsSaveBar`. Three panels via the vertical-rail pattern from `CmsTab`:

1. **Meta** — per-page × per-language editor for the `'seo'` doc (title + description per page), with a live Google-snippet preview (pixel-approximate, not exact) and the code defaults shown as placeholders. Saves via existing `SiteContentService` update path.
2. **Social** — default OG title/description/image (image as URL/path field + preview thumbnail this phase; upload flow later).
3. **Status** — read-only: fetch and display `/robots.txt` + `/sitemap.xml` of the current origin, canonical host from `VITE_SITE_URL`, staging-noindex indicator, and an honest banner: client-injected meta is seen by JS-rendering crawlers (Google) but not by most LLM crawlers until prerendering lands (link to `docs/PLAN-SEO-GEO.md`).

Deliberately absent (arrives with directory indexation per plan Phase 5): noindex thresholds, erasure controls, sitemap regeneration, hreflang health.

## Data flow summary

```
site_content['seo'] (localized JSONB, admin-editable)
        │  SiteContentService.getContent('seo', DEFAULT_SEO_CONTENT, lng)
        ▼
   useSeoContent() hook (TanStack Query, initialData = defaults)
        ▼
   <SeoHead page="about" /> → React 19 hoists <title>/<meta>/<link> into <head>
```

Public pages: `documents` table → `StaticDocumentPage` → sections + `SeoHead`.
Footer: `site_content['footer']` → existing footer renderers + new fields.

## Error handling

All content fetches already fail soft (service returns defaults / null → page renders defaults or a friendly not-found state). `StaticDocumentPage` renders a minimal "Seite nicht gefunden" with correct `<title>` when a slug is missing/unpublished. No new failure modes introduced; no auth-dependent code paths on public pages.

## Testing

- Unit (Vitest, existing setup): `SeoHead` renders expected tags for a given page+language; `SeoContent` deep-merge fallback (mirrors existing `site-content.service.test.ts` style); footer renders description + three links.
- Manual verification checklist: `curl` staging build output — `dist/index.html` contains DE meta/OG; staging `robots.txt` disallows; `/impressum`, `/datenschutz`, `/about` render logged-out (no redirect to login); document.title changes per route; `html lang` follows language switch.

## Open questions for Felix

1. Build order confirmed? (assumed groundwork → SEO tab → landing redesign)
2. Branch: `blue`? (assumed)
3. About page URL: `/about` (assumed) or `/ueber-remy`?
4. Languages: DE content first with the localized structure ready (assumed), or FR/IT/EN copy in this phase too?
5. OG share image visual + final landing `<title>`/description wording.
6. Impressum/Datenschutz: who supplies the legal text, and is placeholder-live acceptable until then? (⚖️ they'd be published pages with draft markers)
7. Landing redesign inputs: current copy version + target screenshots from `design/`.

# Public Shell + SEO/GEO Groundwork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Remy's shop-window surfaces public and SEO/GEO-ready: Impressum/Datenschutz/About pages, footer project description, per-page head metadata, robots/sitemap with staging noindex protection, and an admin SEO tab.

**Architecture:** All new meta content lives in the existing `site_content` CMS (key `'seo'`, localized de/fr/it/en, typed code defaults + admin overrides via deep-merge). Static pages live in the existing `documents` table (anon-readable when `published=true` — RLS untouched). A `SeoHead` component uses React 19 native metadata hoisting (no library). Spec: `docs/superpowers/specs/2026-07-04-public-shell-design.md`.

**Tech Stack:** React 19 + TypeScript, Vite 7, TanStack Query v5, Supabase, Tailwind v4, Vitest + Testing Library, react-router-dom v7, i18next.

## Global Constraints

- Branch: `blue`. Commit per task; do NOT push until the final checkpoint (push triggers the staging-blue deploy).
- Never modify RLS policies or the moderation pipeline. All reads go through the anon-key Supabase client (`src/lib/supabase.ts`).
- Never run `npm run build` for deploy purposes and never commit `dist/` artifacts (CI builds). Local builds are for verification only; leave `dist/` out of commits.
- German is the source language; UI copy defaults are German. Admin editor labels are hardcoded German (existing CMS-editor convention, see `FooterEditor.tsx`).
- Legal page copy is DRAFT: every seeded legal text must visibly carry `[ENTWURF – juristisch prüfen]`.
- Applying the new migration to the live (shared) Supabase requires Felix's explicit approval — STOP at the checkpoint in Task 5.
- Test commands: `npx vitest run <file>` for one file, `npm run test` for all. Component tests need the `// @vitest-environment jsdom` pragma (jsdom is installed in Task 2).

---

### Task 1: SEO content model (`seo-content.types.ts`)

**Files:**
- Create: `src/types/seo-content.types.ts`
- Test: `src/types/seo-content.types.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `type SeoPageId = 'landing' | 'about' | 'impressum' | 'datenschutz' | 'communityGuidelines'`; `interface PageMeta { title: string; description: string; ogImage?: string; noindex?: boolean }`; `interface SeoContent { pages: Record<SeoPageId, PageMeta>; social: { siteName: string; defaultOgImage: string } }`; `const DEFAULT_SEO_CONTENT: SeoContent`; `function resolvePageMeta(content: SeoContent, page: SeoPageId, siteUrl: string, path: string): { title: string; description: string; canonical: string; ogImage: string; noindex: boolean }`.

- [ ] **Step 1: Write the failing test**

Create `src/types/seo-content.types.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_SEO_CONTENT, resolvePageMeta, type SeoPageId } from './seo-content.types'

describe('DEFAULT_SEO_CONTENT', () => {
  it('has non-empty German title and description for every page', () => {
    const pages = Object.keys(DEFAULT_SEO_CONTENT.pages) as SeoPageId[]
    expect(pages.sort()).toEqual(['about', 'communityGuidelines', 'datenschutz', 'impressum', 'landing'])
    for (const p of pages) {
      expect(DEFAULT_SEO_CONTENT.pages[p].title.length).toBeGreaterThan(5)
      expect(DEFAULT_SEO_CONTENT.pages[p].description.length).toBeGreaterThan(30)
    }
  })
})

describe('resolvePageMeta', () => {
  it('builds an absolute self-canonical from site URL + path', () => {
    const meta = resolvePageMeta(DEFAULT_SEO_CONTENT, 'impressum', 'https://remyforum.ch', '/impressum')
    expect(meta.canonical).toBe('https://remyforum.ch/impressum')
  })

  it('tolerates a trailing slash on the site URL', () => {
    const meta = resolvePageMeta(DEFAULT_SEO_CONTENT, 'landing', 'https://remyforum.ch/', '/')
    expect(meta.canonical).toBe('https://remyforum.ch/')
  })

  it('falls back to the social default OG image and makes it absolute', () => {
    const meta = resolvePageMeta(DEFAULT_SEO_CONTENT, 'about', 'https://remyforum.ch', '/about')
    expect(meta.ogImage).toBe('https://remyforum.ch/images/logo_claim.png')
  })

  it('keeps an already-absolute page OG image untouched and defaults noindex to false', () => {
    const content = structuredClone(DEFAULT_SEO_CONTENT)
    content.pages.about.ogImage = 'https://cdn.example.org/x.png'
    const meta = resolvePageMeta(content, 'about', 'https://remyforum.ch', '/about')
    expect(meta.ogImage).toBe('https://cdn.example.org/x.png')
    expect(meta.noindex).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/seo-content.types.test.ts`
Expected: FAIL — "Failed to resolve import ./seo-content.types"

- [ ] **Step 3: Write the implementation**

Create `src/types/seo-content.types.ts`:

```ts
/**
 * Editable SEO metadata for the public pages.
 *
 * Same CMS pattern as landing-content.types.ts: these DEFAULT_* constants are
 * the canonical fallback, rendered instantly; the `site_content` row with key
 * 'seo' stores admin overrides only (localized de/fr/it/en, German fallback).
 */

export type SeoPageId = 'landing' | 'about' | 'impressum' | 'datenschutz' | 'communityGuidelines'

export interface PageMeta {
  title: string
  description: string
  /** Absolute URL or site-relative path; falls back to social.defaultOgImage. */
  ogImage?: string
  noindex?: boolean
}

export interface SeoContent {
  pages: Record<SeoPageId, PageMeta>
  social: {
    siteName: string
    defaultOgImage: string
  }
}

export const DEFAULT_SEO_CONTENT: SeoContent = {
  pages: {
    landing: {
      title: 'Remy – Forum für Menschen in Psychotherapie',
      description:
        'Auf Remy tauschst du dich anonym über deine Erfahrungen in der Psychotherapie aus – sicher, moderiert und unabhängig. Eine Patienteninitiative für die Schweiz.',
    },
    about: {
      title: 'Über Remy – die Patienteninitiative',
      description:
        'Was Remy ist, wie das Forum moderiert wird und warum es Remy braucht: die unabhängige Patienteninitiative für Menschen in Psychotherapie in der Schweiz.',
    },
    impressum: {
      title: 'Impressum – Remy',
      description:
        'Impressum und Kontaktangaben von Remy, dem Schweizer Forum für Menschen in Psychotherapie.',
    },
    datenschutz: {
      title: 'Datenschutz – Remy',
      description:
        'Datenschutzerklärung von Remy: welche Daten wir speichern, wie wir sie schützen und welche Rechte du hast.',
    },
    communityGuidelines: {
      title: 'Community Guidelines – Remy',
      description:
        'Die Spielregeln des Remy-Forums: respektvoller Austausch, Anonymität und der Umgang mit Erfahrungsberichten über Therapeut:innen.',
    },
  },
  social: {
    siteName: 'Remy',
    defaultOgImage: '/images/logo_claim.png',
  },
}

export interface ResolvedPageMeta {
  title: string
  description: string
  canonical: string
  ogImage: string
  noindex: boolean
}

/** Merge page meta with social defaults and absolutize URLs for rendering. */
export function resolvePageMeta(
  content: SeoContent,
  page: SeoPageId,
  siteUrl: string,
  path: string
): ResolvedPageMeta {
  const p = content.pages[page]
  const base = siteUrl.replace(/\/+$/, '')
  const ogImage = p.ogImage ?? content.social.defaultOgImage
  return {
    title: p.title,
    description: p.description,
    canonical: `${base}${path}`,
    ogImage: ogImage.startsWith('http') ? ogImage : `${base}${ogImage}`,
    noindex: p.noindex === true,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/seo-content.types.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/types/seo-content.types.ts src/types/seo-content.types.test.ts
git commit -m "feat(seo): SEO content model with defaults and meta resolver"
```

---

### Task 2: `useSeoContent` hook, `SITE_URL` constant, `SeoHead` component

**Files:**
- Modify: `src/hooks/useSiteContent.ts:48` (export `useContentDocument`)
- Create: `src/constants/site.ts`
- Create: `src/hooks/useSeoContent.ts`
- Create: `src/components/seo/SeoHead.tsx`
- Test: `src/components/seo/SeoHead.test.tsx`
- Modify: `package.json` (add `jsdom` devDependency)

**Interfaces:**
- Consumes: `useContentDocument<T>(key, defaults, lng?)` from `useSiteContent.ts` (currently un-exported — this task exports it); `DEFAULT_SEO_CONTENT`, `resolvePageMeta`, `SeoPageId`, `SeoContent` from Task 1.
- Produces: `SITE_URL: string` (from `src/constants/site.ts`); `useSeoContent(lng?): ContentDocument<SeoContent>`; `<SeoHead page={SeoPageId} titleOverride?: string />` — must be rendered inside a react-router context.

- [ ] **Step 1: Install jsdom for component tests**

```bash
npm install -D jsdom
```

- [ ] **Step 2: Write the failing test**

Create `src/components/seo/SeoHead.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

// Keep the test offline: the real service would query Supabase over the network.
vi.mock('../../services/site-content.service', () => ({
  SiteContentService: class {
    getContent = async (_key: string, defaults: unknown) => defaults
    saveContent = async () => {}
  },
}))

import SeoHead from './SeoHead'
import { DEFAULT_SEO_CONTENT } from '../../types/seo-content.types'

function renderHead(path: string, page: Parameters<typeof SeoHead>[0]['page']) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <SeoHead page={page} />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('SeoHead', () => {
  it('renders the default title and description for the landing page', () => {
    renderHead('/', 'landing')
    // React 19 hoists <title>/<meta> into <head>; query the whole document.
    expect(document.querySelector('title')?.textContent).toBe(DEFAULT_SEO_CONTENT.pages.landing.title)
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      DEFAULT_SEO_CONTENT.pages.landing.description
    )
  })

  it('renders an absolute self-canonical for the current path', () => {
    renderHead('/impressum', 'impressum')
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href')
    expect(canonical).toBe('https://remyforum.ch/impressum')
  })

  it('renders OG tags with an absolute image URL', () => {
    renderHead('/about', 'about')
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      DEFAULT_SEO_CONTENT.pages.about.title
    )
    expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toMatch(/^https:\/\//)
  })

  it('emits no robots meta unless noindex is set', () => {
    renderHead('/', 'landing')
    expect(document.querySelector('meta[name="robots"]')).toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/seo/SeoHead.test.tsx`
Expected: FAIL — "Failed to resolve import ./SeoHead"

- [ ] **Step 4: Export `useContentDocument` from the site-content hook**

In `src/hooks/useSiteContent.ts` line 48, change:

```ts
function useContentDocument<T>(key: string, defaults: T, lng?: string): ContentDocument<T> {
```

to:

```ts
export function useContentDocument<T>(key: string, defaults: T, lng?: string): ContentDocument<T> {
```

- [ ] **Step 5: Create the site constant**

Create `src/constants/site.ts`:

```ts
/**
 * Canonical public origin, used for absolute canonical/OG URLs.
 * Set per environment via VITE_SITE_URL (.env.production = https://remyforum.ch).
 * Staging builds are noindexed at the CI level, so their canonicals are moot.
 */
export const SITE_URL: string =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || 'https://remyforum.ch'
```

- [ ] **Step 6: Create the hook**

Create `src/hooks/useSeoContent.ts`:

```ts
import { useContentDocument, type ContentDocument } from './useSiteContent'
import { DEFAULT_SEO_CONTENT, type SeoContent } from '../types/seo-content.types'

/** SEO metadata document ('seo' in site_content) — defaults instantly, DB overrides when fetched. */
export function useSeoContent(lng?: string): ContentDocument<SeoContent> {
  return useContentDocument<SeoContent>('seo', DEFAULT_SEO_CONTENT, lng)
}
```

- [ ] **Step 7: Create the component**

Create `src/components/seo/SeoHead.tsx`:

```tsx
import React from 'react'
import { useLocation } from 'react-router-dom'
import { useSeoContent } from '../../hooks/useSeoContent'
import { resolvePageMeta, type SeoPageId } from '../../types/seo-content.types'
import { SITE_URL } from '../../constants/site'

interface SeoHeadProps {
  page: SeoPageId
  /** Optional dynamic title (e.g. a document title from the DB). */
  titleOverride?: string
}

/**
 * Per-page head metadata. React 19 hoists <title>/<meta>/<link> rendered in
 * components into <head> — no head-manager library needed. Content comes from
 * the localized 'seo' CMS document with code defaults as instant fallback.
 *
 * Honest limitation: this runs client-side, so it reaches JS-rendering
 * crawlers (Googlebot). Non-JS crawlers see the baked index.html defaults
 * until prerendering lands (docs/PLAN-SEO-GEO.md Phase 2).
 */
const SeoHead: React.FC<SeoHeadProps> = ({ page, titleOverride }) => {
  const { content } = useSeoContent()
  const { pathname } = useLocation()
  const meta = resolvePageMeta(content, page, SITE_URL, pathname)
  const title = titleOverride ?? meta.title

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={meta.canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={content.social.siteName} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={meta.canonical} />
      <meta property="og:image" content={meta.ogImage} />
      {meta.noindex && <meta name="robots" content="noindex" />}
    </>
  )
}

export default SeoHead
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/components/seo/SeoHead.test.tsx`
Expected: PASS (4 tests). If the title assertion fails because jsdom kept the element inline instead of hoisting, assert via `document.querySelector('title')` on the container's ownerDocument — but with React 19 + jsdom the hoist works; investigate before changing the assertion.

- [ ] **Step 9: Run the full suite to check for regressions**

Run: `npm run test`
Expected: all tests pass (existing suites unaffected).

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json src/constants/site.ts src/hooks/useSeoContent.ts src/hooks/useSiteContent.ts src/components/seo/SeoHead.tsx src/components/seo/SeoHead.test.tsx
git commit -m "feat(seo): SeoHead component with CMS-backed per-page metadata"
```

---

### Task 3: `<html lang>` sync + baked `index.html` head defaults

**Files:**
- Modify: `src/i18n/index.ts` (append after line 61, before `export default i18n`)
- Modify: `index.html`
- Modify: `.env.production` (append `VITE_SITE_URL`)
- Possibly delete: `index.dev.html`, `index.prod.html` (after reference check)

**Interfaces:**
- Consumes: the `i18n` instance and `i18nReady` promise from `src/i18n/index.ts`.
- Produces: `document.documentElement.lang` always mirrors the active base language; static head defaults for non-JS crawlers.

- [ ] **Step 1: Add the lang sync to `src/i18n/index.ts`**

Insert between the `.init({...})` call (ends line 61) and `export default i18n`:

```ts
// Keep <html lang> in sync with the active language — crawlers and screen
// readers read it, and index.html can only hardcode the German default.
const syncDocumentLang = (lng: string) => {
  document.documentElement.lang = (lng || 'de').split('-')[0]
}
i18n.on('languageChanged', syncDocumentLang)
i18nReady.then(() => syncDocumentLang(i18n.language))
```

- [ ] **Step 2: Replace the `index.html` head**

Replace the full contents of `index.html` with:

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/src/assets/r.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Remy – Forum für Menschen in Psychotherapie</title>
    <meta name="description" content="Auf Remy tauschst du dich anonym über deine Erfahrungen in der Psychotherapie aus – sicher, moderiert und unabhängig. Eine Patienteninitiative für die Schweiz." />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Remy" />
    <meta property="og:title" content="Remy – Forum für Menschen in Psychotherapie" />
    <meta property="og:description" content="Auf Remy tauschst du dich anonym über deine Erfahrungen in der Psychotherapie aus – sicher, moderiert und unabhängig. Eine Patienteninitiative für die Schweiz." />
    <meta property="og:url" content="https://remyforum.ch/" />
    <meta property="og:image" content="https://remyforum.ch/images/logo_claim.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

(The og:image is the flagged placeholder — Felix picks the real 1200×630 visual during the landing redesign.)

- [ ] **Step 2b: Give the favicon a stable public path**

```bash
cp src/assets/r.svg public/favicon.svg
```

Then change the icon link in `index.html` from `href="/src/assets/r.svg"` to `href="/favicon.svg"`. (The `/src/` path only works because Vite rewrites it at build time; a stable `/favicon.svg` URL survives direct requests from crawlers and bookmark fetchers.)

- [ ] **Step 3: Check whether the dev/prod HTML variants are referenced**

Run: `grep -rn "index.prod.html\|index.dev.html" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git .`
- If the only hits are the files themselves (or nothing): delete both — `git rm index.dev.html index.prod.html` — they are drifting duplicates of `index.html` and nothing in the build (`vite build` uses `index.html`) or CI workflows references them.
- If a script/workflow references them: do NOT delete; instead copy the new `<head>` block into both so the three files stay in sync, and note the referencing file in the commit message.

- [ ] **Step 4: Add the canonical origin to `.env.production`**

Append to `.env.production`:

```
VITE_SITE_URL=https://remyforum.ch
```

(Do not add it to `.env.staging`: staging builds are noindexed in Task 4, and `SITE_URL` falls back to the production origin, which is harmless there.)

- [ ] **Step 5: Verify the build bakes the defaults**

Run: `npm run build && grep -o 'lang="de"' dist/index.html && grep -c 'og:' dist/index.html`
Expected: `lang="de"` printed; og count ≥ 5. (Verification build only — do not commit `dist/`.)

- [ ] **Step 6: Verify lang switching in the dev server**

The dev server usually already runs on port 5173. In a browser (or via the existing session): load `http://localhost:5173/?lng=fr`, run `document.documentElement.lang` in the console. Expected: `fr`. Then switch language to German via the UI switcher → `de`.

- [ ] **Step 7: Commit**

```bash
git add index.html src/i18n/index.ts .env.production public/favicon.svg
git rm --cached index.dev.html index.prod.html 2>/dev/null; git add -u
git commit -m "feat(seo): German head defaults in index.html, html lang sync, VITE_SITE_URL"
```

---

### Task 4: robots.txt + sitemap.xml + staging noindex in CI

**Files:**
- Create: `public/robots.txt`
- Create: `public/sitemap.xml`
- Modify: `.github/workflows/deploy-staging.yml` (after the "Build application" step)
- Modify: `.github/workflows/deploy-staging-blue.yml` (after the "Build application" step)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: crawl-control files shipped in every build; staging deployments neutralized (robots disallow + `X-Robots-Tag`).

- [ ] **Step 1: Create `public/robots.txt`** (production content — AI-bot directives deliberately absent until the decision table in `docs/PLAN-SEO-GEO.md` is decided):

```
User-agent: *
Allow: /

Sitemap: https://remyforum.ch/sitemap.xml
```

- [ ] **Step 2: Create `public/sitemap.xml`** (static — the five public URLs; DB-driven generation arrives with prerendering):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://remyforum.ch/</loc></url>
  <url><loc>https://remyforum.ch/about</loc></url>
  <url><loc>https://remyforum.ch/impressum</loc></url>
  <url><loc>https://remyforum.ch/datenschutz</loc></url>
  <url><loc>https://remyforum.ch/community-guidelines</loc></url>
</urlset>
```

- [ ] **Step 3: Add the staging-noindex step to BOTH workflows**

In `.github/workflows/deploy-staging.yml` AND `.github/workflows/deploy-staging-blue.yml`, insert this step directly after the `Build application` step (same indentation as the other steps):

```yaml
      - name: Neutralize crawling on staging
        run: |
          # Staging must never be indexed: it would enter the index before
          # production and create duplicate-content problems at launch.
          printf 'User-agent: *\nDisallow: /\n' > dist/robots.txt
          rm -f dist/sitemap.xml
          printf '\n# Staging only: never index (added by CI)\nHeader set X-Robots-Tag "noindex, nofollow"\n' >> dist/.htaccess
```

- [ ] **Step 4: Verify locally**

Run: `npm run build && cat dist/robots.txt && ls dist/sitemap.xml`
Expected: production robots content + sitemap present (the CI step only rewrites them on staging deploys).
Then simulate the CI step: `printf 'User-agent: *\nDisallow: /\n' > /tmp/robots-check.txt && cat /tmp/robots-check.txt` — expected two-line disallow output.
Validate workflow YAML: `npx yaml-lint .github/workflows/deploy-staging.yml .github/workflows/deploy-staging-blue.yml 2>/dev/null || python3 -c "import yaml,sys; [yaml.safe_load(open(f)) for f in ['.github/workflows/deploy-staging.yml','.github/workflows/deploy-staging-blue.yml']]; print('YAML OK')"`
Expected: `YAML OK`.

- [ ] **Step 5: Commit**

```bash
git add public/robots.txt public/sitemap.xml .github/workflows/deploy-staging.yml .github/workflows/deploy-staging-blue.yml
git commit -m "feat(seo): robots.txt + sitemap.xml, staging deploys forced to noindex"
```

---

### Task 5: Static pages — seed migration, `StaticDocumentPage`, public routes

**Files:**
- Create: `supabase/migrations/032_seed_static_pages.sql`
- Create: `src/components/static/StaticDocumentPage.tsx`
- Test: `src/components/static/StaticDocumentPage.test.tsx`
- Modify: `src/App.tsx` (lazy import ~line 27; routes after line 83)
- Modify: `src/components/static/CommunityGuidelinesPage.tsx` (mount `SeoHead`)

**Interfaces:**
- Consumes: `DocumentsService.getDocumentBySlug(slug)` (`src/services/documents.service.ts`, returns `Document | null`, filters `published = true`); `SeoHead` + `SeoPageId` from Task 2; `Document`/`DocumentSection` types from `src/types/database.types.ts:880-890`.
- Produces: public routes `/impressum`, `/datenschutz`, `/about`; component `<StaticDocumentPage slug page />`.

- [ ] **Step 1: Write the seed migration**

Create `supabase/migrations/032_seed_static_pages.sql`:

```sql
-- Seed the public static pages (Impressum, Datenschutz, About).
-- Content is a visibly-marked DRAFT: Felix/counsel supply the final legal text
-- via the admin "Seiten" editor. ON CONFLICT keeps re-runs and live edits safe.
-- RLS: documents already allows anon SELECT where published = true (013).

INSERT INTO documents (slug, title, lead_text, sections, published) VALUES
(
  'impressum',
  'Impressum',
  '[ENTWURF – juristisch prüfen]',
  jsonb_build_array(
    jsonb_build_object('number', 1, 'title', 'Verantwortlich für diese Website', 'content', '[ENTWURF – juristisch prüfen] Remy – unabhängige Patienteninitiative, Schweiz. Trägerschaft, Rechtsform und Anschrift werden hier ergänzt.', 'examples', '[]'::jsonb),
    jsonb_build_object('number', 2, 'title', 'Kontakt', 'content', '[ENTWURF – juristisch prüfen] Kontaktadresse (E-Mail) wird hier ergänzt.', 'examples', '[]'::jsonb),
    jsonb_build_object('number', 3, 'title', 'Haftungsausschluss', 'content', '[ENTWURF – juristisch prüfen] Die Beiträge auf Remy geben die persönliche, subjektive Erfahrung der jeweiligen Autor:innen wieder. Alle Beiträge durchlaufen vor der Veröffentlichung eine Moderation gemäss den Community Guidelines.', 'examples', '[]'::jsonb)
  ),
  true
),
(
  'datenschutz',
  'Datenschutz',
  '[ENTWURF – juristisch prüfen] Der Schutz deiner Daten ist die Grundlage von Remy. Diese Erklärung beschreibt, welche Daten wir bearbeiten und welche Rechte du hast (revDSG).',
  jsonb_build_array(
    jsonb_build_object('number', 1, 'title', 'Welche Daten wir speichern', 'content', '[ENTWURF – juristisch prüfen] Wir speichern nur: Username (Pseudonym), E-Mail-Adresse, IP-Adresse (temporär) und deine öffentlichen Profilinformationen. Wir empfehlen eine anonyme E-Mail-Adresse.', 'examples', '[]'::jsonb),
    jsonb_build_object('number', 2, 'title', 'Keine Weitergabe, keine Auswertung', 'content', '[ENTWURF – juristisch prüfen] Wir geben deine Daten nicht an Dritte weiter und werten sie nicht aus.', 'examples', '[]'::jsonb),
    jsonb_build_object('number', 3, 'title', 'Deine Rechte', 'content', '[ENTWURF – juristisch prüfen] Du kannst deine Daten jederzeit selbst einsehen, ändern und vollständig löschen (Profil-Einstellungen). Auskunfts- und Löschbegehren richtest du an die Kontaktadresse im Impressum.', 'examples', '[]'::jsonb),
    jsonb_build_object('number', 4, 'title', 'Hosting und Datenbearbeitung', 'content', '[ENTWURF – juristisch prüfen] Hosting: Metanet AG (Schweiz). Datenbank/Authentifizierung: Supabase. Details und Auftragsverarbeitung werden hier ergänzt.', 'examples', '[]'::jsonb)
  ),
  true
),
(
  'about',
  'Über Remy',
  'Über 400''000 Menschen in der Schweiz machen eine Psychotherapie – aber wenige reden darüber. Remy ist der Ort, an dem du dich anonym austauschen kannst.',
  jsonb_build_array(
    jsonb_build_object('number', 1, 'title', 'Was Remy ist', 'content', 'Remy ist eine unabhängige Patienteninitiative für die Schweiz – unabhängig von staatlichen und privaten Institutionen. Hier teilen Menschen in Psychotherapie ihre Erfahrungen: mit der Therapie, mit Therapeut:innen und mit dem Weg, den sie gehen.', 'examples', '[]'::jsonb),
    jsonb_build_object('number', 2, 'title', 'Wie Remy funktioniert', 'content', 'Du schreibst anonym unter einem Pseudonym. Jeder Beitrag wird vor der Veröffentlichung moderiert. Kritik ist erlaubt – respektvoll und aus der Ich-Perspektive. Die Details stehen in den Community Guidelines.', 'examples', '[]'::jsonb),
    jsonb_build_object('number', 3, 'title', 'Warum es Remy braucht', 'content', 'Erfahrungen von Patient:innen machen die Psychotherapie-Landschaft transparenter – für alle, die eine Therapie machen oder eine:n Therapeut:in suchen. [ENTWURF – Feinschliff mit Felix]', 'examples', '[]'::jsonb)
  ),
  true
)
ON CONFLICT (slug) DO NOTHING;
```

- [ ] **Step 2: 🛑 CHECKPOINT — get Felix's approval to apply the migration**

The dev environment points at the live shared Supabase project (`pxmouonbnyeofvlqgini`); applying migrations there requires Felix's explicit approval (see `supabase-mcp-access` memory) and goes through the claude.ai Supabase connector (`mcp__claude_ai_Supabase__apply_migration`), not the local CLI. **Stop and ask before applying.** Component tests below mock the service, so Steps 3–7 proceed without the migration; the route smoke test in Step 8 needs it applied.

- [ ] **Step 3: Write the failing component test**

Create `src/components/static/StaticDocumentPage.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { Document } from '../../types/database.types'

const getDocumentBySlug = vi.fn()
vi.mock('../../services/documents.service', () => ({
  DocumentsService: class { getDocumentBySlug = getDocumentBySlug },
}))
// SeoHead inside the page fetches the 'seo' CMS doc — keep that offline too.
vi.mock('../../services/site-content.service', () => ({
  SiteContentService: class {
    getContent = async (_key: string, defaults: unknown) => defaults
    saveContent = async () => {}
  },
}))

import StaticDocumentPage from './StaticDocumentPage'

const DOC: Document = {
  id: 'x', slug: 'impressum', title: 'Impressum',
  lead_text: 'Lead-Text', published: true, locale: 'de',
  created_at: '', updated_at: '',
  sections: [{ number: 1, title: 'Verantwortlich', content: 'Remy Initiative', examples: [] }],
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/impressum']}>
        <StaticDocumentPage slug="impressum" page="impressum" />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => getDocumentBySlug.mockReset())

describe('StaticDocumentPage', () => {
  it('renders title, lead and sections from the document', async () => {
    getDocumentBySlug.mockResolvedValue(DOC)
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'Impressum' })).toBeTruthy()
    expect(screen.getByText('Lead-Text')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Verantwortlich' })).toBeTruthy()
    expect(screen.getByText('Remy Initiative')).toBeTruthy()
  })

  it('uses the document title as the page <title>', async () => {
    getDocumentBySlug.mockResolvedValue(DOC)
    renderPage()
    await screen.findByRole('heading', { level: 1 })
    expect(document.querySelector('title')?.textContent).toBe('Impressum')
  })

  it('renders a not-found state when the document is missing', async () => {
    getDocumentBySlug.mockResolvedValue(null)
    renderPage()
    expect(await screen.findByText('Seite nicht gefunden')).toBeTruthy()
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/components/static/StaticDocumentPage.test.tsx`
Expected: FAIL — "Failed to resolve import ./StaticDocumentPage"

- [ ] **Step 5: Create the component**

Create `src/components/static/StaticDocumentPage.tsx`:

```tsx
import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DocumentsService } from '../../services/documents.service'
import SeoHead from '../seo/SeoHead'
import type { SeoPageId } from '../../types/seo-content.types'

const documentsService = new DocumentsService()

interface StaticDocumentPageProps {
  /** documents.slug to load (anon-readable when published — RLS 013). */
  slug: string
  /** Which 'seo' CMS entry provides meta defaults for this page. */
  page: SeoPageId
}

/**
 * Public CMS-backed static page (Impressum, Datenschutz, About). Reachable
 * logged-out: routed before the auth catch-all in App.tsx. Content is edited
 * in the admin CMS "Seiten" section.
 */
const StaticDocumentPage: React.FC<StaticDocumentPageProps> = ({ slug, page }) => {
  const { data: doc, isFetched } = useQuery({
    queryKey: ['document', slug],
    queryFn: () => documentsService.getDocumentBySlug(slug),
    staleTime: 60 * 60 * 1000,
  })

  return (
    <div className="min-h-screen bg-[var(--bg-body)]">
      <SeoHead page={page} titleOverride={doc?.title} />
      <header className="mx-auto w-full max-w-3xl px-6 pt-8 text-left">
        <Link to="/" className="text-sm font-semibold text-[var(--primary)] transition-opacity hover:opacity-70">
          ← Remy
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl px-6 py-10 text-left">
        {!isFetched ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : !doc ? (
          <>
            <h1 className="mb-4 text-3xl font-bold text-[var(--type)]">Seite nicht gefunden</h1>
            <p className="text-slate-500">
              Diese Seite existiert nicht (mehr). <Link to="/" className="text-[var(--primary)] underline">Zur Startseite</Link>
            </p>
          </>
        ) : (
          <article>
            <h1 className="mb-6 text-3xl font-bold text-[var(--type)]">{doc.title}</h1>
            {doc.lead_text && <p className="mb-8 text-lg leading-relaxed text-slate-600">{doc.lead_text}</p>}
            {doc.sections.map((section) => (
              <section key={section.number} className="mb-8">
                <h2 className="mb-3 text-xl font-bold text-[var(--type)]">{section.title}</h2>
                <p className="whitespace-pre-line leading-relaxed text-slate-700">{section.content}</p>
              </section>
            ))}
          </article>
        )}
      </main>
    </div>
  )
}

export default StaticDocumentPage
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/components/static/StaticDocumentPage.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 7: Register the public routes and landing/guidelines SeoHead**

In `src/App.tsx`:

1. Add to the lazy imports block (after line 27, `CommunityGuidelinesPage`):

```tsx
const StaticDocumentPage = lazy(() => import('./components/static/StaticDocumentPage'))
```

2. Add a static import near the other component imports (top of file):

```tsx
import SeoHead from './components/seo/SeoHead'
```

3. After the `/community-guidelines` route (line 83), add:

```tsx
          <Route path="/impressum" element={<StaticDocumentPage slug="impressum" page="impressum" />} />
          <Route path="/datenschutz" element={<StaticDocumentPage slug="datenschutz" page="datenschutz" />} />
          <Route path="/about" element={<StaticDocumentPage slug="about" page="about" />} />
```

4. Inside the `AuthForm` component (defined in this same file, starting ~line 175): add `<SeoHead page="landing" />` as the first child of its top-level returned element (directly after the opening tag of the outermost `<div>` in its `return`).

In `src/components/static/CommunityGuidelinesPage.tsx`: import `SeoHead` (`import SeoHead from '../seo/SeoHead'`) and add `<SeoHead page="communityGuidelines" />` as the first child of the component's outermost returned element.

- [ ] **Step 8: Verify logged-out access in the dev server** *(requires the migration applied — see Step 2 checkpoint; if not yet applied, verify the not-found state renders instead and re-verify after approval)*

With the dev server on 5173, open a private window (no session): `http://localhost:5173/impressum`, `/datenschutz`, `/about`. Expected: the pages render logged-out with title/sections (or the "Seite nicht gefunden" state pre-migration); the browser tab title changes per page; `/nonexistent` still shows the login screen (catch-all intact).

- [ ] **Step 9: Run the full suite**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/032_seed_static_pages.sql src/components/static/StaticDocumentPage.tsx src/components/static/StaticDocumentPage.test.tsx src/App.tsx src/components/static/CommunityGuidelinesPage.tsx
git commit -m "feat(pages): public Impressum/Datenschutz/About routes with CMS documents"
```

---

### Task 6: Footer — project description + About link (CMS-driven in both footers)

**Files:**
- Modify: `src/types/landing-content.types.ts:61-68` (interface) and `:129-136` (defaults)
- Modify: `src/components/admin/FooterEditor.tsx:40-52`
- Modify: `src/App.tsx:858-866` (AuthForm footer)
- Modify: `src/components/layout/Layout.tsx:85-92` (hardcoded footer → CMS values)
- Test: `src/services/site-content.service.test.ts` (append a describe block)

**Interfaces:**
- Consumes: `FooterContent`, `DEFAULT_FOOTER_CONTENT`, `deepMerge` (existing); `useFooterContent()` hook (existing).
- Produces: `FooterContent` gains `description: string`, `aboutLabel: string`, `aboutHref: string` — consumed by both footers and the editor.

- [ ] **Step 1: Write the failing test**

Append to `src/services/site-content.service.test.ts`:

```ts
import { deepMerge } from './site-content.service'
import { DEFAULT_FOOTER_CONTENT } from '../types/landing-content.types'

describe('footer content new fields', () => {
  it('defaults fill description/about for legacy DB rows that lack them', () => {
    const legacyRow = { impressumLabel: 'Impressum (alt)' } // pre-existing partial override
    const merged = deepMerge(DEFAULT_FOOTER_CONTENT, legacyRow)
    expect(merged.impressumLabel).toBe('Impressum (alt)')
    expect(merged.description.length).toBeGreaterThan(20)
    expect(merged.aboutHref).toBe('/about')
    expect(merged.aboutLabel).toBe('Über Remy')
  })
})
```

(If the file already imports `deepMerge` or `describe`/`it`/`expect`, merge with the existing imports instead of duplicating them.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/services/site-content.service.test.ts`
Expected: FAIL — `description` does not exist on the merged type / is undefined.

- [ ] **Step 3: Extend the type and defaults**

In `src/types/landing-content.types.ts`, replace the `FooterContent` interface (lines 61-68) with:

```ts
export interface FooterContent {
  /** Short project description — crawlable entity text on every page. */
  description: string
  aboutLabel: string
  aboutHref: string
  impressumLabel: string
  impressumHref: string
  datenschutzLabel: string
  datenschutzHref: string
  madeByPrefix: string
  madeByName: string
}
```

Replace `DEFAULT_FOOTER_CONTENT` (lines 129-136) with:

```ts
export const DEFAULT_FOOTER_CONTENT: FooterContent = {
  description:
    'Remy ist eine unabhängige Patienteninitiative für die Schweiz – das anonyme, moderierte Forum für Menschen in Psychotherapie.',
  aboutLabel: 'Über Remy',
  aboutHref: '/about',
  impressumLabel: 'Impressum',
  impressumHref: '/impressum',
  datenschutzLabel: 'Datenschutz',
  datenschutzHref: '/datenschutz',
  madeByPrefix: 'Made by',
  madeByName: 'Studio LUMINELLI',
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/services/site-content.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the editor fields**

In `src/components/admin/FooterEditor.tsx`, insert a new section before the existing `<CmsSection title="Links">` (line 40):

```tsx
      <CmsSection title="Projektbeschrieb">
        <CmsField
          label="Kurzbeschreibung (erscheint im Footer jeder Seite)"
          value={draft.description}
          onChange={(v) => set({ description: v })}
          multiline
          rows={3}
        />
      </CmsSection>
```

And inside the `<CmsSection title="Links">` grid (after the Datenschutz fields, line 45), add:

```tsx
          <CmsField label="Über Remy – Beschriftung" value={draft.aboutLabel} onChange={(v) => set({ aboutLabel: v })} />
          <CmsField label="Über Remy – Link (URL)" value={draft.aboutHref} onChange={(v) => set({ aboutHref: v })} />
```

- [ ] **Step 6: Render description + About link in the AuthForm footer**

In `src/App.tsx` lines 858-866, the credits `<div>` currently holds the impressum/datenschutz links. Replace that block:

```tsx
          <div
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[17px] text-[#828282] md:pb-[5px] md:whitespace-nowrap"
            style={{ fontFamily: '"Nunito Sans", sans-serif' }}
          >
            <a href={footer.impressumHref} className="transition-opacity hover:opacity-70">{footer.impressumLabel}</a>
            <a href={footer.datenschutzHref} className="transition-opacity hover:opacity-70">{footer.datenschutzLabel}</a>
            <span className="hidden h-[18px] w-px self-center bg-[#828282] opacity-40 md:block" aria-hidden="true"></span>
            <span>{footer.madeByPrefix} {footer.madeByName}</span>
          </div>
```

with:

```tsx
          <div className="flex flex-col gap-3 md:pb-[5px]">
            <p
              className="max-w-md text-center text-[15px] leading-relaxed md:text-left"
              style={{ fontFamily: '"Nunito Sans", sans-serif', color: '#828282' }}
            >
              {footer.description}
            </p>
            <div
              className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[17px] text-[#828282] md:justify-start md:whitespace-nowrap"
              style={{ fontFamily: '"Nunito Sans", sans-serif' }}
            >
              <a href={footer.aboutHref} className="transition-opacity hover:opacity-70">{footer.aboutLabel}</a>
              <a href={footer.impressumHref} className="transition-opacity hover:opacity-70">{footer.impressumLabel}</a>
              <a href={footer.datenschutzHref} className="transition-opacity hover:opacity-70">{footer.datenschutzLabel}</a>
              <span className="hidden h-[18px] w-px self-center bg-[#828282] opacity-40 md:block" aria-hidden="true"></span>
              <span>{footer.madeByPrefix} {footer.madeByName}</span>
            </div>
          </div>
```

- [ ] **Step 7: Wire the Layout footer to the CMS**

In `src/components/layout/Layout.tsx`: add the import `import { useFooterContent } from '../../hooks/useSiteContent'` and, inside the `Layout` component body (alongside its existing hooks), add `const { content: footer } = useFooterContent()`.
Then replace the hardcoded links block (lines 85-92):

```tsx
            <div
              className="flex flex-col items-start gap-y-2 text-left text-[17px] text-[#828282] md:pb-[5px]"
              style={{ fontFamily: '"Nunito Sans", sans-serif' }}
            >
              <a href="/impressum" className="transition-opacity hover:opacity-70">Impressum</a>
              <a href="/datenschutz" className="transition-opacity hover:opacity-70">Datenschutz</a>
              <span>Made by<br />Studio LUMINELLI</span>
            </div>
```

with:

```tsx
            <div
              className="flex flex-col items-start gap-y-2 text-left text-[17px] text-[#828282] md:pb-[5px]"
              style={{ fontFamily: '"Nunito Sans", sans-serif' }}
            >
              <a href={footer.aboutHref} className="transition-opacity hover:opacity-70">{footer.aboutLabel}</a>
              <a href={footer.impressumHref} className="transition-opacity hover:opacity-70">{footer.impressumLabel}</a>
              <a href={footer.datenschutzHref} className="transition-opacity hover:opacity-70">{footer.datenschutzLabel}</a>
              <span>{footer.madeByPrefix}<br />{footer.madeByName}</span>
            </div>
```

(The Oscar Wilde quote on the right stays — out of scope.)

- [ ] **Step 8: Verify in the dev server**

Logged-out landing: footer shows the description and the three links; clicking "Über Remy" opens `/about`. Logged in: `Layout` footer shows the same CMS-driven links.

- [ ] **Step 9: Run the full suite and commit**

Run: `npm run test` → PASS.

```bash
git add src/types/landing-content.types.ts src/components/admin/FooterEditor.tsx src/App.tsx src/components/layout/Layout.tsx src/services/site-content.service.test.ts
git commit -m "feat(footer): CMS project description + About link in both footers"
```

---

### Task 7: Organization + WebSite JSON-LD on the landing page

**Files:**
- Create: `src/components/seo/OrgJsonLd.tsx`
- Test: `src/components/seo/OrgJsonLd.test.tsx`
- Modify: `src/App.tsx` (mount in `AuthForm`, next to the Task 5 `SeoHead`)

**Interfaces:**
- Consumes: `SITE_URL` from Task 2; `DEFAULT_FOOTER_CONTENT.description` from Task 6.
- Produces: `<OrgJsonLd />` — a `<script type="application/ld+json">` element.

- [ ] **Step 1: Write the failing test**

Create `src/components/seo/OrgJsonLd.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import OrgJsonLd from './OrgJsonLd'

describe('OrgJsonLd', () => {
  it('renders valid JSON-LD with Organization and WebSite entities', () => {
    const { container } = render(<OrgJsonLd />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const data = JSON.parse(script!.textContent || '')
    expect(data['@context']).toBe('https://schema.org')
    const types = data['@graph'].map((e: { '@type': string }) => e['@type'])
    expect(types).toEqual(['Organization', 'WebSite'])
    for (const entity of data['@graph']) {
      expect(entity.url).toMatch(/^https:\/\//)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/seo/OrgJsonLd.test.tsx`
Expected: FAIL — "Failed to resolve import ./OrgJsonLd"

- [ ] **Step 3: Create the component**

Create `src/components/seo/OrgJsonLd.tsx`:

```tsx
import React from 'react'
import { SITE_URL } from '../../constants/site'
import { DEFAULT_FOOTER_CONTENT } from '../../types/landing-content.types'

/**
 * Sitewide entity anchor for search/AI engines: who Remy is, one canonical
 * Organization + WebSite. Static by design — sameAs links get added here once
 * real external profiles exist.
 */
const ORG_ID = `${SITE_URL}/#organization`

const data = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: 'Remy',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/images/logo_claim.png`,
      description: DEFAULT_FOOTER_CONTENT.description,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Remy',
      url: `${SITE_URL}/`,
      inLanguage: 'de',
      publisher: { '@id': ORG_ID },
    },
  ],
}

const OrgJsonLd: React.FC = () => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
)

export default OrgJsonLd
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/seo/OrgJsonLd.test.tsx`
Expected: PASS.

- [ ] **Step 5: Mount on the landing page**

In `src/App.tsx`: `import OrgJsonLd from './components/seo/OrgJsonLd'` and render `<OrgJsonLd />` directly next to the `<SeoHead page="landing" />` added in Task 5 (first children of AuthForm's root element).

- [ ] **Step 6: Verify and commit**

Dev server, logged-out landing, browser console: `JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@graph'][0]['@type']` → `"Organization"`.

```bash
git add src/components/seo/OrgJsonLd.tsx src/components/seo/OrgJsonLd.test.tsx src/App.tsx
git commit -m "feat(seo): Organization + WebSite JSON-LD on the landing page"
```

---

### Task 8: Admin SEO tab (Meta editor, Social defaults, Status panel)

**Files:**
- Create: `src/components/admin/SeoTab.tsx`
- Test: `src/components/admin/SeoTab.test.tsx`
- Modify: `src/components/admin/AdminDashboard.tsx:24` (TabId), `:27-34` (icon), `:115-122` (tabs array), after `:304-306` (render block), plus the `SeoTab` import
- Modify: `src/i18n/locales/de/admin.json`, `src/i18n/locales/fr/admin.json`, `src/i18n/locales/it/admin.json`, `src/i18n/locales/en/admin.json` (add `tabs.seo`)

**Interfaces:**
- Consumes: `useSeoContent(lng)` (Task 2), `useContentEditor` from `src/hooks/useSiteContent.ts`, `CmsField`/`CmsSection`/`CmsSaveBar`/`CmsLanguageTabs` from `src/components/admin/CmsField.tsx`, `DEFAULT_SEO_CONTENT`/`SeoPageId`/`SeoContent`/`resolvePageMeta` (Task 1), `SITE_URL` (Task 2).
- Produces: `<SeoTab />` default export, mounted by `AdminDashboard` for admins.

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/SeoTab.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Keep the test offline: the real service would query Supabase over the network.
vi.mock('../../services/site-content.service', () => ({
  SiteContentService: class {
    getContent = async (_key: string, defaults: unknown) => defaults
    saveContent = async () => {}
  },
}))

import SeoTab from './SeoTab'
import { DEFAULT_SEO_CONTENT } from '../../types/seo-content.types'

function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <SeoTab />
    </QueryClientProvider>
  )
}

describe('SeoTab', () => {
  it('shows the meta editor with the default landing title', async () => {
    renderTab()
    const input = await screen.findByDisplayValue(DEFAULT_SEO_CONTENT.pages.landing.title)
    expect(input).toBeTruthy()
  })

  it('switches to the status panel via the rail', async () => {
    renderTab()
    await screen.findByDisplayValue(DEFAULT_SEO_CONTENT.pages.landing.title)
    await userEvent.click(screen.getByRole('button', { name: 'Status' }))
    expect(await screen.findByText(/robots\.txt/)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/SeoTab.test.tsx`
Expected: FAIL — "Failed to resolve import ./SeoTab"

- [ ] **Step 3: Create the component**

Create `src/components/admin/SeoTab.tsx`:

```tsx
import React, { useEffect, useState } from 'react'
import { useSeoContent } from '../../hooks/useSeoContent'
import { useContentEditor, type ContentEditor } from '../../hooks/useSiteContent'
import {
  DEFAULT_SEO_CONTENT,
  resolvePageMeta,
  type PageMeta,
  type SeoContent,
  type SeoPageId,
} from '../../types/seo-content.types'
import { SITE_URL } from '../../constants/site'
import { CmsField, CmsSection, CmsSaveBar, CmsLanguageTabs } from './CmsField'

type SeoSection = 'meta' | 'social' | 'status'

const SECTION_LABELS: Record<SeoSection, string> = {
  meta: 'Meta-Texte',
  social: 'Social / OG',
  status: 'Status',
}

/** Page list with German admin labels and their public paths (for previews). */
const PAGES: ReadonlyArray<{ id: SeoPageId; label: string; path: string }> = [
  { id: 'landing', label: 'Startseite', path: '/' },
  { id: 'about', label: 'Über Remy', path: '/about' },
  { id: 'impressum', label: 'Impressum', path: '/impressum' },
  { id: 'datenschutz', label: 'Datenschutz', path: '/datenschutz' },
  { id: 'communityGuidelines', label: 'Community Guidelines', path: '/community-guidelines' },
]

/** Admin SEO tab: meta defaults per page × language, social defaults, status. */
const SeoTab: React.FC = () => {
  const [section, setSection] = useState<SeoSection>('meta')

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <nav className="flex flex-row gap-1 md:w-48 md:shrink-0 md:flex-col" aria-label="SEO-Bereiche">
        {(Object.keys(SECTION_LABELS) as SeoSection[]).map((key) => {
          const active = section === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              aria-current={active ? 'page' : undefined}
              className={`rounded-lg px-4 py-2 text-left text-sm font-semibold transition-colors ${
                active
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-slate-500 hover:bg-[#eef3ff] hover:text-[var(--primary)]'
              }`}
            >
              {SECTION_LABELS[key]}
            </button>
          )
        })}
      </nav>

      <div className="min-w-0 flex-1">
        {section === 'meta' && <SeoMetaEditor />}
        {section === 'social' && <SeoSocialEditor />}
        {section === 'status' && <SeoStatusPanel />}
      </div>
    </div>
  )
}

/** Approximate Google result preview (visual aid, not pixel-exact). */
const SnippetPreview: React.FC<{ title: string; description: string; path: string }> = ({
  title,
  description,
  path,
}) => (
  <div className="rounded-lg border border-[#efe9df] bg-white p-4 text-left">
    <p className="text-xs text-[#202124]">{SITE_URL.replace(/^https?:\/\//, '')}{path}</p>
    <p className="truncate text-lg leading-snug text-[#1a0dab]">{title}</p>
    <p className="line-clamp-2 text-sm text-[#4d5156]">{description}</p>
  </div>
)

const SeoEditorShell: React.FC<{ children: (props: {
  editor: ContentEditor<SeoContent>
}) => React.ReactNode; lng: string }> = ({ children, lng }) => {
  const doc = useSeoContent(lng)
  const editor = useContentEditor<SeoContent>(doc, DEFAULT_SEO_CONTENT)
  if (!editor.isFetched) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        <span className="ml-3 text-slate-500">Lade Inhalte…</span>
      </div>
    )
  }
  return <>{children({ editor })}</>
}

const SeoMetaEditor: React.FC = () => {
  const [lng, setLng] = useState('de')
  return (
    <div className="space-y-4">
      <CmsLanguageTabs value={lng} onChange={setLng} />
      {lng !== 'de' && (
        <p className="text-xs text-slate-500">
          Nicht übersetzte Felder zeigen auf der Seite automatisch den deutschen Text.
        </p>
      )}
      <SeoEditorShell key={lng} lng={lng}>
        {({ editor }) => {
          const { draft, setDraft } = editor
          const setPage = (id: SeoPageId, patch: Partial<PageMeta>) =>
            setDraft((d) => ({ ...d, pages: { ...d.pages, [id]: { ...d.pages[id], ...patch } } }))
          return (
            <div className="space-y-5 pb-2">
              {PAGES.map(({ id, label, path }) => (
                <CmsSection key={id} title={label}>
                  <CmsField
                    label="Titel (Browser-Tab & Google)"
                    value={draft.pages[id].title}
                    onChange={(v) => setPage(id, { title: v })}
                    hint={`${draft.pages[id].title.length} Zeichen — Richtwert: bis ~60`}
                  />
                  <CmsField
                    label="Beschreibung (Google-Snippet)"
                    value={draft.pages[id].description}
                    onChange={(v) => setPage(id, { description: v })}
                    multiline
                    rows={3}
                    hint={`${draft.pages[id].description.length} Zeichen — Richtwert: 120–160`}
                  />
                  <SnippetPreview
                    title={draft.pages[id].title}
                    description={draft.pages[id].description}
                    path={path}
                  />
                </CmsSection>
              ))}
              <CmsSaveBar
                dirty={editor.dirty}
                isSaving={editor.isSaving}
                saved={editor.saved}
                error={editor.error}
                onSave={editor.handleSave}
                onDiscard={editor.handleDiscard}
                onLoadDefaults={editor.handleLoadDefaults}
              />
            </div>
          )
        }}
      </SeoEditorShell>
    </div>
  )
}

const SeoSocialEditor: React.FC = () => (
  <SeoEditorShell lng="de">
    {({ editor }) => {
      const { draft, setDraft } = editor
      const setSocial = (patch: Partial<SeoContent['social']>) =>
        setDraft((d) => ({ ...d, social: { ...d.social, ...patch } }))
      const preview = resolvePageMeta(draft, 'landing', SITE_URL, '/')
      return (
        <div className="space-y-5 pb-2">
          <CmsSection title="Social-Media-Vorschau (Open Graph)">
            <CmsField label="Seitenname (og:site_name)" value={draft.social.siteName} onChange={(v) => setSocial({ siteName: v })} />
            <CmsField
              label="Standard-Vorschaubild (Pfad oder URL)"
              value={draft.social.defaultOgImage}
              onChange={(v) => setSocial({ defaultOgImage: v })}
              hint="Empfohlen: 1200×630px. Gilt für alle Seiten ohne eigenes Bild."
            />
            <img src={preview.ogImage} alt="OG-Vorschau" className="max-h-40 rounded-lg border border-[#efe9df]" />
          </CmsSection>
          <CmsSaveBar
            dirty={editor.dirty}
            isSaving={editor.isSaving}
            saved={editor.saved}
            error={editor.error}
            onSave={editor.handleSave}
            onDiscard={editor.handleDiscard}
            onLoadDefaults={editor.handleLoadDefaults}
          />
        </div>
      )
    }}
  </SeoEditorShell>
)

const SeoStatusPanel: React.FC = () => {
  const [robots, setRobots] = useState<string>('lädt…')
  const [sitemap, setSitemap] = useState<string>('lädt…')

  useEffect(() => {
    fetch('/robots.txt')
      .then((r) => (r.ok ? r.text() : Promise.resolve('— nicht gefunden (404) —')))
      .then((t) => setRobots(t.slice(0, 500)))
      .catch(() => setRobots('— nicht erreichbar —'))
    fetch('/sitemap.xml')
      .then((r) => (r.ok ? r.text() : Promise.resolve('— nicht gefunden (404) —')))
      .then((t) => setSitemap(t.slice(0, 1500)))
      .catch(() => setSitemap('— nicht erreichbar —'))
  }, [])

  return (
    <div className="space-y-5 pb-2">
      <CmsSection title="Hinweis">
        <p className="text-sm text-slate-600">
          Titel und Beschreibungen werden clientseitig gesetzt: Google (führt JavaScript aus) sieht sie,
          die meisten KI-Crawler noch nicht. Vollständige Sichtbarkeit kommt mit dem Prerendering
          (siehe docs/PLAN-SEO-GEO.md, Phase 2).
        </p>
      </CmsSection>
      <CmsSection title="Kanonische Domain">
        <p className="text-sm text-slate-700">{SITE_URL}</p>
      </CmsSection>
      <CmsSection title="robots.txt (aktuelle Umgebung)">
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-slate-700">{robots}</pre>
      </CmsSection>
      <CmsSection title="sitemap.xml (aktuelle Umgebung)">
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-slate-700">{sitemap}</pre>
      </CmsSection>
    </div>
  )
}

export default SeoTab
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/SeoTab.test.tsx`
Expected: PASS (2 tests). (jsdom has no `fetch` by default in some setups — if the status test errors on fetch, the `.catch` path sets "— nicht erreichbar —" and the test still passes since it only asserts the "robots.txt" section heading.)

- [ ] **Step 5: Wire into AdminDashboard**

In `src/components/admin/AdminDashboard.tsx`:

1. Line 24: `type TabId = 'overview' | 'users' | 'therapists' | 'designations' | 'categories' | 'cms' | 'seo'`
2. Add to `TAB_ICONS` (after the `cms` entry, line 33):

```ts
  seo: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
```

3. In the `tabs` array (lines 115-122), after the `cms` entry:

```ts
    ...(permissions.isAdmin ? [{ id: 'seo' as TabId }] : []),
```

4. Import: `import SeoTab from './SeoTab'` (next to the `CmsTab` import), and after the CMS render block (lines ~304-306):

```tsx
        {/* SEO Tab */}
        {activeTab === 'seo' && permissions.isAdmin && (
          <SeoTab />
        )}
```

- [ ] **Step 6: Add the tab label to all four admin locale files**

In `src/i18n/locales/de/admin.json`, `.../fr/admin.json`, `.../it/admin.json`, `.../en/admin.json`: inside the existing `"tabs"` object, add `"seo": "SEO"` (same label in all four).

- [ ] **Step 7: Verify in the dev server**

As an admin: `/admin` shows the SEO tab; the meta editor shows defaults per page and language tabs; editing + Speichern persists (reload → value stays); Status panel shows robots/sitemap of the dev origin (404 messages in dev are fine — `public/` files ARE served by Vite, so they should render).

- [ ] **Step 8: Run the full suite and commit**

Run: `npm run test` → PASS.

```bash
git add src/components/admin/SeoTab.tsx src/components/admin/SeoTab.test.tsx src/components/admin/AdminDashboard.tsx src/i18n/locales/de/admin.json src/i18n/locales/fr/admin.json src/i18n/locales/it/admin.json src/i18n/locales/en/admin.json
git commit -m "feat(admin): SEO tab — per-page meta editor, social defaults, status panel"
```

---

### Task 9: "Seiten" CMS section — edit the static documents

**Files:**
- Create: `src/components/admin/PagesEditor.tsx`
- Test: `src/components/admin/PagesEditor.test.tsx`
- Modify: `src/components/admin/CmsTab.tsx:7-15,51-53` (add the `pages` section)

**Interfaces:**
- Consumes: `DocumentsService.getDocumentBySlug(slug)` and `DocumentsService.updateDocument(id, updates)` (`src/services/documents.service.ts`); `Document`/`DocumentSection` types; `CmsField`/`CmsSection`/`CmsSaveBar`.
- Produces: `<PagesEditor />` default export, mounted as the CMS rail section `pages`.

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/PagesEditor.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Document } from '../../types/database.types'

const getDocumentBySlug = vi.fn()
const updateDocument = vi.fn()
vi.mock('../../services/documents.service', () => ({
  DocumentsService: class {
    getDocumentBySlug = getDocumentBySlug
    updateDocument = updateDocument
  },
}))

import PagesEditor from './PagesEditor'

const DOC: Document = {
  id: 'doc-1', slug: 'impressum', title: 'Impressum',
  lead_text: 'Lead', published: true, locale: 'de', created_at: '', updated_at: '',
  sections: [{ number: 1, title: 'Kontakt', content: 'Adresse folgt', examples: [] }],
}

function renderEditor() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <PagesEditor />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  getDocumentBySlug.mockReset()
  updateDocument.mockReset()
  getDocumentBySlug.mockResolvedValue(DOC)
})

describe('PagesEditor', () => {
  it('loads the selected document into editable fields', async () => {
    renderEditor()
    expect(await screen.findByDisplayValue('Impressum')).toBeTruthy()
    expect(screen.getByDisplayValue('Kontakt')).toBeTruthy()
    expect(screen.getByDisplayValue('Adresse folgt')).toBeTruthy()
  })

  it('saves edited fields through updateDocument', async () => {
    updateDocument.mockResolvedValue(DOC)
    renderEditor()
    const title = await screen.findByDisplayValue('Impressum')
    await userEvent.clear(title)
    await userEvent.type(title, 'Impressum NEU')
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(updateDocument).toHaveBeenCalledWith(
      'doc-1',
      expect.objectContaining({ title: 'Impressum NEU' })
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/admin/PagesEditor.test.tsx`
Expected: FAIL — "Failed to resolve import ./PagesEditor"

- [ ] **Step 3: Create the editor**

Create `src/components/admin/PagesEditor.tsx`:

```tsx
import React, { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DocumentsService } from '../../services/documents.service'
import type { Document, DocumentSection } from '../../types/database.types'
import { CmsField, CmsSection, CmsSaveBar } from './CmsField'

const documentsService = new DocumentsService()

/** The static pages editable here (slug → admin label). */
const PAGE_SLUGS: ReadonlyArray<readonly [string, string]> = [
  ['impressum', 'Impressum'],
  ['datenschutz', 'Datenschutz'],
  ['about', 'Über Remy'],
]

interface PageDraft {
  title: string
  lead_text: string
  sections: DocumentSection[]
}

const toDraft = (doc: Document): PageDraft => ({
  title: doc.title,
  lead_text: doc.lead_text ?? '',
  sections: doc.sections,
})

/** Admin editor for the public static pages (documents table, German only for now). */
const PagesEditor: React.FC = () => {
  const [slug, setSlug] = useState<string>(PAGE_SLUGS[0][0])
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-[#efe9df]">
        {PAGE_SLUGS.map(([s, label]) => (
          <button
            key={s}
            type="button"
            onClick={() => setSlug(s)}
            className={`-mb-px rounded-t px-3 py-1.5 text-sm transition-colors ${
              slug === s
                ? 'border border-b-0 border-[#efe9df] bg-white font-semibold text-[var(--primary)]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <PageEditorBody key={slug} slug={slug} />
    </div>
  )
}

const PageEditorBody: React.FC<{ slug: string }> = ({ slug }) => {
  const queryClient = useQueryClient()
  const { data: doc, isFetched } = useQuery({
    queryKey: ['document', slug],
    queryFn: () => documentsService.getDocumentBySlug(slug),
  })

  const [draft, setDraft] = useState<PageDraft | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (doc && !draft) setDraft(toDraft(doc))
  }, [doc, draft])

  if (!isFetched || (doc && !draft)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        <span className="ml-3 text-slate-500">Lade Inhalte…</span>
      </div>
    )
  }
  if (!doc || !draft) {
    return <p className="py-8 text-sm text-slate-500">Dokument «{slug}» nicht gefunden — wurde die Migration 032 angewendet?</p>
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(doc))

  const setSection = (index: number, patch: Partial<DocumentSection>) =>
    setDraft((d) => d && { ...d, sections: d.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)) })

  const addSection = () =>
    setDraft((d) => d && {
      ...d,
      sections: [...d.sections, { number: d.sections.length + 1, title: '', content: '', examples: [] }],
    })

  const removeSection = (index: number) =>
    setDraft((d) => d && {
      ...d,
      sections: d.sections.filter((_, i) => i !== index).map((s, i) => ({ ...s, number: i + 1 })),
    })

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await documentsService.updateDocument(doc.id, {
        title: draft.title,
        lead_text: draft.lead_text || null,
        sections: draft.sections,
      })
      queryClient.invalidateQueries({ queryKey: ['document', slug] })
      setSaved(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5 pb-2">
      <CmsSection title="Kopf">
        <CmsField label="Seitentitel" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
        <CmsField label="Einleitung (optional)" value={draft.lead_text} onChange={(v) => setDraft({ ...draft, lead_text: v })} multiline rows={3} />
      </CmsSection>

      {draft.sections.map((section, i) => (
        <CmsSection key={i} title={`Abschnitt ${i + 1}`}>
          <CmsField label="Überschrift" value={section.title} onChange={(v) => setSection(i, { title: v })} />
          <CmsField label="Text" value={section.content} onChange={(v) => setSection(i, { content: v })} multiline rows={5} />
          <button
            type="button"
            onClick={() => removeSection(i)}
            className="text-sm font-semibold text-red-500 transition-opacity hover:opacity-70"
          >
            Abschnitt entfernen
          </button>
        </CmsSection>
      ))}

      <button
        type="button"
        onClick={addSection}
        className="rounded-lg border border-dashed border-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[#eef3ff]"
      >
        + Abschnitt hinzufügen
      </button>

      <CmsSaveBar
        dirty={dirty}
        isSaving={isSaving}
        saved={saved}
        error={error}
        onSave={handleSave}
        onDiscard={() => setDraft(toDraft(doc))}
        onLoadDefaults={() => setDraft(toDraft(doc))}
      />
    </div>
  )
}

export default PagesEditor
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/admin/PagesEditor.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Add the CMS rail section**

In `src/components/admin/CmsTab.tsx`:

```tsx
// line 3-5 area — add import:
import PagesEditor from './PagesEditor'

// line 7: type CmsSection = 'landing' | 'footer' | 'pages' | 'moderation'
// line 9: const SECTION_KEYS: CmsSection[] = ['landing', 'footer', 'pages', 'moderation']
// lines 11-15 — add label:
//   pages: 'cms.sectionPages',
// lines 51-53 — add render:
//   {section === 'pages' && <PagesEditor />}
```

Apply those five changes exactly. Then add the label key to all four admin locale files (`src/i18n/locales/{de,fr,it,en}/admin.json`), inside the existing `"cms"` object: `"sectionPages": "Seiten"` (de; use `"Pages"` for en, `"Pages"` for fr, `"Pagine"` for it).

- [ ] **Step 6: Verify in the dev server**

Admin → CMS → Seiten: the three pages load (post-migration), edits save, and the public page reflects the change after reload.

- [ ] **Step 7: Run the full suite and commit**

Run: `npm run test` → PASS.

```bash
git add src/components/admin/PagesEditor.tsx src/components/admin/PagesEditor.test.tsx src/components/admin/CmsTab.tsx src/i18n/locales/de/admin.json src/i18n/locales/fr/admin.json src/i18n/locales/it/admin.json src/i18n/locales/en/admin.json
git commit -m "feat(admin): Seiten CMS editor for Impressum/Datenschutz/About documents"
```

---

### Task 10: Final verification + handoff checkpoint

**Files:** none created — verification only.

- [ ] **Step 1: Full quality gate**

Run: `npm run lint && npm run test && npm run build`
Expected: lint clean (or only pre-existing warnings), all tests pass, build succeeds. Do not commit `dist/`.

- [ ] **Step 2: Built-output spot checks**

```bash
grep -o 'lang="de"' dist/index.html
grep -c 'og:' dist/index.html
cat dist/robots.txt
head -3 dist/sitemap.xml
```
Expected: `lang="de"`; og count ≥ 5; production robots (Allow); sitemap XML header.

- [ ] **Step 3: End-to-end pass in the dev server (logged out)**

- `/` → landing renders; tab title "Remy – Forum für Menschen in Psychotherapie"; JSON-LD script present.
- `/impressum`, `/datenschutz`, `/about` → pages render with sections and per-page tab titles (requires migration 032 applied — see Task 5 checkpoint).
- `/community-guidelines` → still renders, tab title updates.
- `/some-unknown-path` → login screen (catch-all intact).
- Footer (landing): description text + Über Remy/Impressum/Datenschutz links work.
- `?lng=fr` → `document.documentElement.lang === 'fr'`.

- [ ] **Step 4: End-to-end pass (admin)**

- `/admin` → SEO tab: edit the landing description, save, reload → persisted; Status panel renders.
- `/admin` → CMS → Seiten: edit About section text, save, open `/about` → change visible.

- [ ] **Step 5: 🛑 CHECKPOINT — report to Felix before pushing**

Pushing `blue` triggers the staging-blue deploy (now including the noindex step). Summarize what shipped, confirm the migration status, and ask Felix to approve the push. Remaining open items to restate: final legal texts (drafts are live-marked), OG image asset choice, landing redesign as the next design session.

# SEO / GEO Audit — Phase 1 Findings

**Date:** 2026-07-04 · **Branch audited:** `blue` · **Method:** read-only repo audit + live-domain checks (`curl`, `openssl`, DNS). No code was changed.

**Live-DB caveat:** RLS/moderation findings reflect the migration files as written. Migrations `023` and `028` both note that the live database has drifted from the files before; the live policy state (`pg_policies`) was **not** verified in this pass and should be confirmed before any decision relies on it.

---

## 1. Rendering verdict (the gate)

**Remy is a pure client-rendered SPA — and that is only the second-biggest problem.** Three stacked layers currently make the site invisible to search and AI engines:

1. **The live domain does not serve the app at all.** `https://remyforum.ch/` returns the Metanet hosting placeholder page ("Account: remyforum.ch"). On top of that, the TLS certificate (Let's Encrypt) **expired 2026-02-22** — every visitor for the past ~4.5 months has hit a full-page browser security warning. `robots.txt` and `sitemap.xml` return 404. The only healthy pieces are the redirects: `http→https` and `www→non-www` both 301 correctly to `https://remyforum.ch/`.
2. **Everything content-bearing is behind a login wall.** For a logged-out visitor, a catch-all route renders the login/landing screen at *every* URL (`src/App.tsx:92-93`: `!user ? <Route path="*" element={<AuthForm />} />`). `/post/:id`, `/therapists`, `/user/:id`, and the forum feed exist only inside the authenticated branch (`src/App.tsx:107-131`). Even a crawler that executes JavaScript can index nothing but the landing page. The only public routes are auth utilities and `/community-guidelines` (`src/App.tsx:80-89`).
3. **The HTML shell is empty.** `index.html` is 13 lines: `<html lang="en">`, `<title>Remy|Forum</title>`, a favicon pointing at a dev path (`/src/assets/r.svg`), and `<div id="root"></div>` (`index.html:1-13`). No meta description, no canonical, no Open Graph, no hreflang, no structured data. There is no SSR, SSG, or prerender tooling anywhere (`vite.config.ts` uses only `@vitejs/plugin-react`; `src/main.tsx` uses `createRoot`, not `hydrateRoot`; no helmet/unhead/`document.title` management exists in `src/`). LLM crawlers that don't execute JS see an empty page.

**Consequence:** SEO/GEO work is gated first by an **operations fix** (deploy + certificate), then by a **product/policy decision** (which surfaces become publicly readable at all), and only then by the **rendering strategy**. Until layers 1 and 2 change, no amount of meta-tag or schema work has any effect.

**One inversion worth naming:** while the *HTML* exposes nothing, the *Supabase REST API* (anon key ships in the bundle, `src/lib/supabase.ts:4-5`) exposes more than the product intends — see §5.

---

## 2. URL and routing inventory

| Surface | Current URL | Assessment |
|---|---|---|
| Forum feed | `/` (auth-gated) | Single URL; all filtering is client state |
| Post/thread | `/post/:id` — numeric autoincrement id (`src/App.tsx:109`, `PostView.tsx:29`) | Stable but no slug; no keywords in URL |
| Member profile | `/user/:id` — UUID (`src/App.tsx:110`) | Opaque; fine (members are pseudonymous) |
| Therapist profile | **none** — `/therapists?therapist=<id>` query param on the directory page (`TherapistDirectoryPage.tsx:35`) | **No canonical per-practitioner URL exists** |
| Categories / cantons / designations | **no URLs** — filters live in `useState` in `ForumView.tsx:29-56`; no `useSearchParams` | **No hub/category pages exist as addressable URLs** |
| Languages | Never in the URL. i18next detects via `?lng=` query → `localStorage` → browser (`src/i18n/index.ts:51-56`) | No `/de/`, `/fr/` sections; nothing for hreflang to point at |

Languages registered: `de`, `fr`, `it`, `en` with `fallbackLng: 'de'` and `load: 'languageOnly'` (`src/i18n/index.ts:6,31,34`). Locale JSON exists for all four across 8 namespaces (translation *completeness* for FR/IT not verified — CLAUDE.md still lists them as pending). **`<html lang>` is never updated** — it stays hardcoded `en` regardless of UI language; there is no `languageChanged` listener touching `documentElement.lang`.

---

## 3. Head management

**None.** No head-management library (no react-helmet/@unhead in `package.json`), no `document.title` assignment anywhere (the only hits are a CMS data field in `CommunityGuidelinesPage.tsx`), no code creating `meta`/`link` elements. The title is the static `Remy|Forum` on every route; there is no meta description, canonical, hreflang, OG, or Twitter Card anywhere in the codebase. Three root HTML variants exist (`index.html`, `index.dev.html`, `index.prod.html`) — all with the same empty head.

## 4. Structured data, sitemaps, robots, analytics

- **Structured data: none.** Zero matches for `ld+json`, `schema.org`, `itemscope`, `itemprop` across `src/` and all HTML.
- **Sitemap: none**, and no generation code anywhere in the repo (whole-tree grep for "sitemap": zero matches). Live URL 404s.
- **robots.txt: none** in `public/` or anywhere; live URL 404s. No AI-crawler directives exist. No `X-Robots-Tag` in `.htaccess`.
- **Analytics / Search Console / error tracking: none.** No gtag/Plausible/Matomo/PostHog/Sentry, no verification file or tag. (External ownership of a Search Console property can't be ruled out from the repo — not verifiable here.)
- **Social/OG image: none.**
- **`.htaccess`** (root, copied into `dist/` at build — `package.json:8`): SPA rewrite fallback, no-cache on `index.html`, and a solid 2026-07 security-header block (CSP, HSTS, X-Frame-Options DENY, `Referrer-Policy: no-referrer`). Nothing SEO-related. The **committed `dist/.htaccess` is a stale pre-security-review copy** (502 bytes vs 1770) — harmless if CI always rebuilds, but the committed `dist/` contains two overlapping builds and shouldn't be trusted.
- **CI:** two workflows only — `main-light`→`staging` branch and `blue`→`staging-blue` branch. **No production deploy workflow exists in the repo**, consistent with the domain serving a placeholder. Neither workflow generates any SEO artifact.

## 5. Indexability vs RLS

The moderation boundary itself is sound where it matters most:

- **Posts and comments are approval-gated at the RLS level.** Anonymous SELECT only matches `moderation_status = 'approved' AND is_published = true` (`supabase/migrations/016_enable_rls_comprehensive.sql:100-109` for posts, `:136-145` for comments — verified in-file). The frontend redundantly applies the same filter (`posts.service.ts:85-88`). The moderation pipeline (`supabase/functions/moderate-post/`) fails closed: LLM errors leave content `pending`; `block`→rejected, `flag`→pending (human queue), clean→approved. Guard triggers from `028` block self-approval. **Any renderer/sitemap generator that reads through the anon key can therefore never leak held or rejected content.** This is a real asset for the SSR/prerender phase.
- **But two tables are wide open to anonymous REST reads** (the anon key is public by design):
  - `users`: `USING (true)` (`016:89-90`) — every member row (username, role, is_banned, bio, canton, timestamps) is anon-readable. Already tracked as security item **H3**.
  - `therapists`: `USING (true)` (`016:196-197`) — **all practitioner rows, including soft-deactivated (`is_active=false`) and unreviewed (`needs_review=true`) ones.** The "hidden from public lists" behavior is JavaScript-only (`therapists.service.ts:15-17` filters *after* fetching; `getTherapist(id)` applies no filter at all). Adjacent to security item **M2**.
- **Practical upshot for indexation questions in the brief:** thin scraped profiles are *not* currently indexable as HTML (nothing is), but they are fully enumerable by any REST client. A future erasure workflow that only flips `is_active` would *not* actually remove a practitioner from machine-readable exposure.

**Therapist schema divergence from the brief:** there is **no GLN column** — no registry identifier of any kind exists (grep for gln/zsr/registry across `src/` + migrations: zero). Columns are name/institution/designation/canton/city/languages/etc. (`001`, `012`, `021`). Also: a post references at most **one** therapist via `posts.therapist_id` FK — there is no join table. Practitioner erasure/objection workflow: **does not exist**; the only levers are admin soft-deactivate (UI-only effect) and admin hard-delete.

## 6. Internal linking

Navigation is almost entirely imperative — `<div onClick>`/`<button onClick>` calling `navigate()` — so even in a rendered-HTML future there would be **almost no crawlable `<a href>` graph**:

- PostCard → post: clickable `div` (`PostCard.tsx:55-61`). Post → therapist: `button` → `navigate('/therapists?therapist=…')` (`PostCard.tsx:188-198`, `PostView.tsx:322-330`).
- Category badges are non-clickable `<span>`s — no category link anywhere.
- Real `<Link>`s exist in a handful of places; the notable content one is therapist-directory → posts (`TherapistDirectoryPage.tsx:268`).
- **The public landing page's footer links to `/impressum` and `/datenschutz` — neither route exists** (`src/App.tsx:862-863`, `Layout.tsx:89-90`; no matching `<Route>`). For a Swiss site this is a legal/trust gap independent of SEO (Impressum duty, revDSG privacy-policy duty).

Trust-page inventory: Community Guidelines ✅ (CMS-backed, public route) · Impressum ❌ · Datenschutz ❌ · About ❌ · public moderation policy ❌ (the "moderation rules" in the CMS are the LLM prompt, not a user-facing policy).

## 7. Performance baseline

- No captured Core Web Vitals baseline exists; `docs/performance.md` is a generic checklist (targets ~200 KB gzipped initial JS) with instructions but no recorded numbers. No `web-vitals` RUM, no analytics.
- The main entry chunk is **~2.37 MB uncompressed** (latest build in `dist/assets/`), plus vendor chunks (tiptap 371 KB, supabase 174 KB…). Routes are extensively lazy-loaded, but `ForumView`, `PostView`, `AuthForm`, and `Layout` are statically imported into the main chunk — the landing route eagerly pulls the whole forum+auth bundle. Well over the project's own target.
- Google Fonts still load from Google's CDN via three CSS `@import`s (`src/index.css:2-4`) — render-blocking *and* the known privacy item **H2**.

## 8. What could not be determined from the repo

1. **Live DB policy state** — whether migrations 016/028/029/030 are actually applied, and what out-of-band triggers/policies exist (known drift; see memory note). Needs `pg_policies` check via the Supabase connector.
2. **Where the app is actually served today** — the domain shows a placeholder; the `staging`/`staging-blue` branches deploy *somewhere* not identifiable from the repo.
3. **Metanet plan capabilities** — Node/SSR support, cron, cert auto-renewal management. This gates the rendering options; assumed Apache static + PHP only.
4. External Search Console / analytics ownership.
5. FR/IT translation completeness.
6. Real-traffic CWV (no field data possible yet).

---

## 9. Prioritised gap list (highest impact ÷ lowest effort first)

| # | Gap | Impact | Effort | Notes |
|---|---|---|---|---|
| 1 | **Domain serves Metanet placeholder; TLS cert expired 2026-02-22** | Blocks everything | Ops-only | No SEO work matters until the app is deployed at the canonical host with a valid, auto-renewing cert |
| 2 | **No public content — login wall on every content route** | Blocks all SEO/GEO | Policy decision + M | *Decision zero* for the operator: which surfaces become publicly readable (legal question, not just technical) |
| 3 | **Impressum / Datenschutz missing (dead footer links)** | Legal + YMYL trust | S | Required for a Swiss site regardless of SEO; also the cheapest E-E-A-T win |
| 4 | Baseline head hygiene: title/description per route, `lang` fix + sync, OG tags, real favicon, robots.txt | High (for whatever is public) | S | Works today for the landing page; a small head-manager utility suffices |
| 5 | **No SSR/SSG/prerendering** — empty shell to non-JS crawlers | Critical for GEO + SEO | L | Gated on #2; recommendation in the plan (prerender via CI, reading through anon-key RLS) |
| 6 | No per-therapist URLs; no category/canton hub URLs; language never in URL | Critical | M | URL architecture must precede rendering work |
| 7 | No sitemaps (and nothing to generate them) | High | M | DB-driven generator through anon key; per language |
| 8 | No Search Console / analytics | High (visibility into everything else) | S | Choice of analytics is itself a revDSG decision |
| 9 | No structured data | High for GEO | M | Forum markup + practitioner entities; **GLN column doesn't exist yet** — data-model prerequisite |
| 10 | Internal links are onClick handlers, not `<a href>` | Medium-high | M | Systematic swap to `<Link>` with real hrefs |
| 11 | Erasure/objection workflow absent; `is_active` hides only in-UI; therapists/users tables anon-readable via REST (M2/H3) | Legal exposure grows with findability | M | Must be solved *before* profiles are indexed, not after |
| 12 | Google Fonts on CDN (H2), 2.4 MB main bundle, no CWV baseline | Medium | M | Perf pass per `docs/performance.md` |

The full phased plan, the rendering recommendation, and the admin SEO tab design are in [`docs/PLAN-SEO-GEO.md`](PLAN-SEO-GEO.md).

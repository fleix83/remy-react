# PLAN: SEO & GEO for Remy

**Status: proposal — nothing here is implemented.** Grounded in [`docs/SEO-GEO-AUDIT.md`](SEO-GEO-AUDIT.md) (2026-07-04). Every phase is propose-before-implement; items marked ⚖️ are legal/policy decisions for the operator, not engineering defaults. RLS is never weakened or bypassed: every rendering, sitemap, and schema surface proposed below reads the database **through the anon key**, so the approved-only boundary applies by construction.

---

## Decision zero (blocks everything): what becomes public? ⚖️

Today every content route is login-walled. SEO/GEO is definitionally impossible until some surfaces are publicly readable, and *which* surfaces is a privacy/legal call — findability sharpens FADP and defamation exposure on named practitioners. Options, from cautious to open:

| Option | Public surfaces | SEO ceiling | Legal exposure |
|---|---|---|---|
| A. Shop window | Landing, About, guidelines, category/canton hub pages with aggregate counts only ("23 Erfahrungsberichte im Kanton Bern") | Low — brand + generic queries | Minimal |
| B. Hubs + threads | A + approved forum threads (read-only), but **no** individual practitioner profile pages | Medium-high — long-tail experience queries | Medium — practitioner names appear inside threads |
| C. Full directory | B + per-practitioner profile pages listing their threads | Highest — "Erfahrungen mit [Name]" queries land on Remy | Highest — a named-person page per practitioner; right-to-object workflow becomes mandatory *first* |

Recommendation to discuss: **target B first**, design URLs so C can be switched on per-profile later (profiles built but `noindex` until the erasure workflow exists and legal has signed off). Do not silently maximise indexation.

Prerequisites regardless of option: the M2 (therapists) and H3 (users) RLS fixes from the security checklist, because "public HTML" must never be *less* restricted than the REST API is claimed to be — and today the REST API leaks deactivated practitioners and full member rows. **RLS changes need explicit sign-off; not part of this plan's implementation scope.**

---

## Phase 0 — Ops & legal foundation (do now, independent of everything)

Effort: S. No SEO value is realisable without these; none requires decision zero.

1. **Deploy the app to remyforum.ch and fix TLS.** The domain serves the Metanet placeholder and the cert expired 2026-02-22. Create the missing production deploy workflow (mirror of `deploy-staging.yml` targeting a `dist`/production branch or Metanet FTP), and enable cert auto-renewal on the Metanet side. Verify `http→https` and `www→non-www` 301s survive (they're correct today).
2. **Impressum + Datenschutz pages.** The footer already links `/impressum` and `/datenschutz`; both are dead. Build them as CMS-backed public routes reusing the `CommunityGuidelinesPage` pattern. ⚖️ Content (legal entity, revDSG privacy text) needs the operator/counsel — engineering ships the routes with placeholder-flagged copy.
3. **H4 secret rotation** (already on the security checklist) before any traffic/publicity push — SEO success amplifies exposure of anything leaked.

## Phase 1 — Baseline head hygiene (works today, pre-rendering)

Effort: S–M. Applies to whatever is public now (the landing page) and everything later.

- **Tiny head-manager utility** (no dependency needed; ~40 lines): `useHead({title, description, canonical, og, robots})` that swaps tags on route change. React 19 also hoists `<title>`/`<meta>` rendered in components natively — prefer that; it works unchanged under SSR later.
- Fix `index.html`: `lang="de"`, real meta description (DE), proper favicon (`/favicon.svg` in `public/`, not the dev path `/src/assets/r.svg`), OG defaults + one social-share image, theme-color. Sync `document.documentElement.lang` on i18next `languageChanged`.
- **robots.txt** in `public/` — even minimal (allow all, sitemap pointer placeholder). AI-crawler policy comes in Phase 6; don't default it open or closed silently.
- Delete or align `index.dev.html`/`index.prod.html` duplication (three divergent shells is drift waiting to happen).
- **Search Console + analytics**: verify the domain (DNS TXT — works even while the placeholder is up). ⚖️ Analytics choice is a revDSG decision — recommendation: self-hosted or EU/CH-hosted privacy-first (Matomo/Plausible), cookieless config; CSP in `.htaccess` must be extended for whichever host.
- Trust surface for YMYL: public **moderation policy page** (dated: how posts are checked — LLM pre-moderation + human queue), and an **About** page. Cheap, and both search and AI engines weight these heavily in mental-health topics.

## Phase 2 — URL architecture + rendering (the gate)

Effort: L. Gated on decision zero. URLs first — rendering targets them.

### Proposed public URL scheme

Language-prefixed sections for translatable surfaces; threads live under the language they're written in:

```
/                        → x-default entry (language detect + selector)
/de/  /fr/  /it/  /en/   → localised home/hubs
/de/forum/               → forum index (paginated)
/de/forum/kategorie/<slug>/        → category hub (per canton variant: ?kanton= stays client-side, noindex)
/de/forum/beitrag/<id>-<slug>      → thread (id-first: slug can change, id 301s to current slug)
/de/therapeut/<id>-<slug>          → practitioner profile (Option C only; built but noindex under B)
/community-guidelines, /impressum, /datenschutz, /ueber-remy → static, localised via prefix too
```

- Post slugs: new nullable `slug` column on `posts`, generated on approval; canonical URL is always id-based with slug appended, so old links never break.
- The app's internal authed routes (`/post/:id` etc.) can remain; public URLs 301/canonicalise cleanly. Legacy `/post/:id` was never public, so no redirect debt.
- Category/canton hubs become real routed pages (they currently exist only as client state) — this is also the internal-linking fix: category badges and therapist chips become `<Link href>` to hub/profile URLs. **Systematically replace onClick-navigation with `<Link>`** on all content surfaces.

### Rendering options (constraint: Metanet Apache shared hosting — static files + `.htaccess`, no Node runtime assumed)

| Option | Verdict |
|---|---|
| **1. Build-time prerendering via CI (recommended)** | Vite SSR build of the *same* React components; a GH Actions job queries Supabase **with the anon key**, renders static HTML for every public URL, deploys alongside the SPA. Regenerate on schedule (e.g. 2×/day) + on-demand via Supabase webhook → `repository_dispatch` (the moderation webhook infra already exists). React hydrates on load, so users get the identical page. |
| 2. Dynamic rendering (bot-UA rewrite to a Supabase Edge Function that SSRs) | Workable stopgap, but Google discourages it long-term, UA-sniffing is brittle, and you still have to write the SSR code — so it saves nothing over option 1. Keep as fallback for freshness-critical pages only. |
| 3. Host migration to SSR platform (Node/Vercel/…) | Cleanest technically, biggest operational change. Not lean-first; revisit only if content volume makes CI prerendering too slow. |
| 4. Rely on Googlebot's JS rendering | Fails the brief: most LLM crawlers don't execute JS, and hydration-only content is second-class even for Google. Rejected. |

**Why option 1:** it fits the hosting exactly, adds no runtime infra, reuses existing CI + webhook plumbing, and — decisive for this project — **the RLS boundary is enforced by construction**, because the renderer holds only the anon key. A held or rejected post *cannot* be rendered, ever, without an RLS change. Freshness lag of minutes-to-hours after approval is acceptable for forum SEO. Incremental generation (only changed threads) keeps CI time flat as content grows.

Non-negotiable invariants for the renderer, whichever option: anon key only (never service role); an automated test that a `pending`/`rejected` fixture post appears in no HTML, no sitemap, and no JSON-LD/microdata output.

Also in this phase: the Core Web Vitals pass — the 2.37 MB main chunk must shrink (split `AuthForm`+forum out of the entry, self-host fonts = security item H2, image sizing per `docs/performance.md`). Prerendered HTML largely solves LCP for crawlers and first-time visitors.

## Phase 3 — Multilingual correctness

Effort: M. With prerendered HTML this becomes straightforward:

- **Self-referencing canonical on every language version.** Never cross-language canonicals. Absolute URLs (`https://remyforum.ch/...`) everywhere.
- **hreflang via head `<link>` tags only** (one method — not head *and* sitemap): bidirectional across `de, fr, it, en` + `x-default` → `/` (language selector/detector). Language-only codes suffice on a .ch domain; `de-CH` etc. only if Swiss-explicit targeting is wanted later. This matches the existing i18next `load: 'languageOnly'` setup.
- **Honesty rule for UGC:** a thread exists in *one* language (the language it was written in). It gets a self-canonical and **no hreflang cluster** — never present the same German text as the "French version". hreflang clusters apply only to genuinely translated surfaces: home, hubs, static/trust pages, and (if Option C) profile chrome.
- **Per-language sitemaps** generated from the DB in the same CI job (anon key): `sitemap-index.xml` → `sitemap-de.xml` etc.; threads listed in their content language's sitemap; regenerate on the same triggers as prerendering, so approval/removal propagates automatically.
- Note for the content roadmap (not this plan): keyword research per language, not translation — FR/IT users phrase therapy-experience queries differently. FR/IT UI translation completeness must be verified before promoting those sections.

## Phase 4 — Structured data & entities

Effort: M. Only meaningful once HTML is prerendered (schema in a JS-only SPA is invisible to non-rendering crawlers).

- **Threads: `DiscussionForumPosting`** with nested `Comment` items, full post/comment text, `datePublished`, `commentCount`, and `author` → pseudonymous member `ProfilePage` URL (`/user/<uuid>` — pseudonym only, never anything identity-adjacent). Use **Microdata** woven into the rendered thread markup — Google explicitly prefers Microdata/RDFa over JSON-LD for forum content (avoids duplicating full text blocks). Threads that are genuinely Q&A-shaped could use `QAPage`, but Remy threads are experience reports, not Q&A — recommend `DiscussionForumPosting` uniformly.
- **Provenance honesty:** if `digitalSourceType` is emitted, posts are human-written (LLM-*moderated* ≠ LLM-generated). `sharedContent` where posts embed/quote external material. Never mark member content as synthetic; never hide the moderation step — link the moderation-policy page instead.
- **Practitioners** (built in Option B for on-thread mentions; full pages only in Option C): `Person` type with `hasOccupation`/`hasCredential`, `workLocation` (canton/city), and `identifier` as `PropertyValue {propertyID: "GLN", value: …}`. (Not `Physician` — most psychotherapists aren't medical doctors; psychiatrists could carry an additional type later.) **Prerequisite: there is no GLN column today.** Add nullable unique `therapists.gln` via migration + backfill from the public registries. ⚖️ Registry-import terms/accuracy obligations need operator review.
- **⚖️ Rating/review markup (`Review`/`AggregateRating`) on named individuals: OFF by default.** This is a legal decision (defamation surface, FADP), not an optimisation. The plan reserves the markup but nothing emits it without sign-off.
- **Remy itself:** `Organization` + `WebSite` JSON-LD sitewide (logo, sameAs where real profiles exist) — this one is fine as JSON-LD.

## Phase 5 — Indexation governance & erasure

Effort: M. This is where SEO meets FADP, and it must land **before** Option C ever switches on.

Per-page-type defaults (admin-overridable per entity — see SEO tab):

| Page type | Default |
|---|---|
| Home, hubs, static/trust pages | index |
| Threads (approved) | index; paginated comment pages self-canonical per page (no noindex on page 2+) |
| Practitioner profiles | **noindex until ≥ N approved posts reference them** (N configurable, start 2) — thin scraped registry rows never enter the index ⚖️ operator sets N and whether profiles index at all |
| Member profiles | **noindex always** (pseudonymous; low search value, re-identification risk) |
| Search results, filter combinations, `?lng=`/`?login=` variants | noindex + canonical to clean URL; robots-disallow `/`-level query patterns |
| Held / rejected / draft content | structurally impossible in any surface (anon-key rendering; see Phase 2 invariant + test) |

**Erasure workflow (right to object / erasure, FADP):** one admin action — "remove practitioner from public web" — that atomically: sets `is_active=false` **and** a new `noindex`/`erased` flag → triggers regeneration (profile page becomes **410 Gone**, thread pages re-render with the name handling per policy ⚖️) → drops the profile from all sitemaps → emits a Search Console removal request (manual link in MVP, API later). Hard requirement flagged from the audit: today `is_active` only hides rows in the client UI while **the REST API still serves them** — the M2 RLS fix is a prerequisite for calling anything "erased". ⚖️ What erasure means for *threads that mention* the practitioner (delete? pseudonymise the name? leave?) is an operator/legal decision the workflow must parameterise, not hardcode.

## Phase 6 — GEO (lean, honest)

Mostly not a separate channel: Google's AI surfaces share ranking systems with search, and the biggest GEO lever is everything above (real HTML, clean entities, extractable structure). The genuinely GEO-specific residue:

- **Extractable passages:** hub pages open with a 2–3 sentence answer-first summary ("Auf Remy teilen Betroffene Erfahrungen mit Psychotherapeut:innen im Kanton X…"); thread pages get question-shaped `<h1>`/`<h2>` framing matching real query shapes per language ("Erfahrungen mit …", "Est-ce que … est recommandable?"). Self-contained chunks — each thread page carries its own context (who/what/where) without needing site navigation.
- **Entity clarity:** GLN-anchored practitioner entities (Phase 4), consistent `Organization`, sameAs links only where real.
- **⚖️ AI-crawler policy in robots.txt — a conscious per-bot, per-surface choice, not a default.** Proposal to decide on (enabled by the typed URL scheme, which makes path-prefix rules possible):

  | Bot | Hubs/static | Threads | Profiles |
  |---|---|---|---|
  | Search crawlers (Googlebot, Bingbot) | allow | allow | per indexation rules |
  | Answer engines w/ citation (PerplexityBot, ChatGPT-User/OAI-SearchBot) | allow | allow ⚖️ | disallow ⚖️ |
  | Training-only (GPTBot, ClaudeBot/anthropic-ai, Google-Extended, CCBot, Applebot-Extended, meta-externalagent, Bytespider) | allow | **disallow** ⚖️ | **disallow** ⚖️ |

  Rationale to weigh: citations drive discovery (helps the mission), but training ingestion of sensitive experience reports about named practitioners is hard to reconcile with erasure — a model can't unlearn a profile Remy later removes. Robots.txt is voluntary; it's policy signalling, not enforcement.
- **llms.txt:** cheap to add, no confirmed effect — fine as a one-hour add-on pointing at hubs + policies, flagged as unproven.
- **Measurement, lean:** monthly manual brand-mention checks in ChatGPT/Perplexity/AI Overviews (a 30-minute checklist, per language) + referral segmentation for `chatgpt.com`/`perplexity.ai` in analytics. Nothing heavier until it earns its place.

---

## Admin panel: the SEO tab

Fits the existing `AdminDashboard` exactly: extend the `TabId` union (`AdminDashboard.tsx:24`), add `TAB_ICONS` entry, gate with `permissions.isAdmin`, and reuse the CMS scaffolding (`CmsTab` vertical rail + `CmsSection`/`CmsField`/`CmsSaveBar`) and the users-table row pattern.

**Data model (migration, admin-write/anon-read — contains nothing sensitive, and the CI renderer must read it through the anon key):**
- `site_content` key `'seo'` (existing CMS pattern): global defaults — title/description templates per page type per language with variables (`{postTitle}`, `{therapistName}`, `{canton}`, `{count}`, `{siteName}`), OG defaults, thin-profile threshold N, robots/AI-bot policy state.
- `seo_overrides` table: `(entity_type, entity_id, lang, title, description, canonical_override, noindex, erased, updated_by, updated_at)` — sparse per-entity overrides so nothing is per-page manual labour.

**MVP (build first):**
1. **Meta defaults panel** — per-page-type template editors with live preview ("So erscheint ein Beitrag bei Google"), per language.
2. **Indexation & erasure panel** — searchable practitioner list with per-row index status, noindex toggle, thin-threshold N input, and the **"Von Google entfernen / Löschbegehren" action** wired to the Phase 5 erasure workflow (flag → regenerate → sitemap drop → removal-request link). This is the FADP-critical control and the tab's reason to exist.
3. **Sitemap status card** — last generated (from a `generation_log` row the CI job writes), URL counts per language/type, delta since last run, and a regenerate button (calls a small edge function that fires the `repository_dispatch`; the GH token lives in the edge function's secrets, never the client).

**Phase 2 of the tab:** hreflang/canonical health view (CI job emits a JSON report of orphaned/one-way pairs; tab renders it) · structured-data preview per page type (render sample entity markup + link to Google's validator) · robots.txt editor with per-bot × per-surface toggles writing the `'seo'` CMS doc.

**Phase 3 of the tab:** Search Console API panel (CWV, coverage, removal-request automation) · AI-visibility checklist tracker. Only if the earlier panels prove their worth.

---

## Open legal/policy questions ⚖️ (flagged, not decided)

1. **Decision zero:** which surfaces become publicly readable (A/B/C above)?
2. Are individual practitioner profile pages ever indexed — and if so, at what threshold N?
3. Review/rating structured data on named individuals: default stays off; needs counsel.
4. AI-crawler matrix above: confirm each cell, especially training bots on threads.
5. Erasure semantics for threads that *mention* an erased practitioner.
6. Impressum/Datenschutz content; revDSG-compliant analytics choice.
7. GLN backfill: registry terms of use, accuracy/update obligations toward practitioners.
8. Sequencing with the security checklist: M2 + H3 RLS fixes and H4 secret rotation before public launch (M2 is a hard prerequisite of the erasure promise). RLS changes only with explicit sign-off.

## Sequencing at a glance

| Phase | Depends on | Effort | Value |
|---|---|---|---|
| 0 Ops + legal pages | — | S | Unblocks everything; legal duty |
| 1 Head hygiene, Search Console, trust pages | — | S–M | Immediate; YMYL trust floor |
| Decision zero | operator ⚖️ | — | Gates 2–6 |
| 2 URLs + prerendering + CWV | 0, decision zero | L | The gate: real HTML for crawlers/LLMs |
| 3 Multilingual (canonical/hreflang/sitemaps) | 2 | M | Correct 4-language targeting |
| 4 Structured data + GLN | 2 (+ registry ⚖️) | M | Rich results; entity anchor for GEO |
| 5 Indexation governance + erasure | 2, M2 fix ⚖️ | M | Legal safety valve; must precede Option C |
| 6 GEO residue (robots matrix, passages, measurement) | 2–4 | S | Lean by design |
| Admin SEO tab MVP | 5 (erasure hook), sitemap job | M | Operator control panel |

Nothing in this plan has been implemented. Recommended first move: Phase 0 (ops + Impressum/Datenschutz) in parallel with the decision-zero discussion.

# Therapist Designations Redesign

**Date:** 2026-06-10
**Status:** Approved design, pending implementation plan

## Problem

The current designation system conflates two distinct concepts in one structure:

1. **A category** — what users filter by and pick in dropdowns. This wants to be a
   tiny, closed, curated set (Psychiater, Psychologe, Klinik, …), translated and
   gender-aware.
2. **A professional title** — the verbatim credential scraped from professional
   directories ("Fachpsychologin für Psychotherapie FSP", "Médecin spécialiste en
   psychiatrie et psychothérapie FMH"). Open-ended, per-therapist, exists only in
   the therapist's local language, only shown on the profile.

The current `designations` table (12 language/gender name columns + `parent_id`)
tries to be both. The fuzzy `findOrCreateDesignation()` in the CSV import creates a
new designation row for every scraped title that doesn't match at 80% similarity, so
curated entries and scraped junk accumulate in the same table. Result: dropdowns and
filters full of near-duplicates, and a text+FK auto-sync machinery to keep it all
consistent.

## Design decisions (made during brainstorming)

- **Curated list lives in an admin-editable DB table** (not code/i18next) — admins
  can add/rename designations and tune keywords without a deploy.
- **Gender display: pair labels only** — one inclusive label per language
  ("Psychiater:in", "Psychiatre", "Psichiatra"); same label everywhere (filter,
  cards, profile). No per-gender label variants.
- **Import classification: keyword rules + review queue** — deterministic keyword
  matching at import time; unmatched rows go to the existing `needs_review` queue.
  No AI step, no fuzzy matching.
- **Gender filter is a separate general filter** (m / f / both) on
  `therapists.gender`, independent of the designation filter.

## Data model

### `designations` table (replaces the current 16-column table)

| Column | Type | Purpose |
|---|---|---|
| `id` | serial PK | |
| `slug` | text, unique | Stable key: `psychiater`, `psychologe`, `klinik`, … |
| `label_de` | text | Pair-form label: "Psychiater:in" |
| `label_fr` | text | "Psychiatre" |
| `label_it` | text | "Psichiatra" |
| `keywords` | text | Comma-separated match patterns ("FMH, Psychiat"), admin-editable, drives import classification |
| `sort_order` | int | Dropdown/filter order; also keyword-match priority (most specific first) |
| `is_active` | boolean | Retire without deleting |
| `created_at` | timestamptz | |

Expected size: ~5–8 rows. Nothing in the system can insert rows except the admin
panel.

**Removed concepts:** the 12 `name_<lang>_<length>_<gender>` columns, `parent_id`,
`designation-matching.service.ts` (fuzzy find-or-create), and the text/FK auto-sync
machinery.

### `therapists` table changes

| Column | Change |
|---|---|
| `designation_id` | Kept. FK to new `designations` table. **Nullable in DB** (imports may arrive unclassified); **required in the manual creation form**. |
| `designation` (text) | **Renamed to `full_title`.** Verbatim scraped professional title, local language only, shown only on the therapist profile. Never parsed after import, never translated, never in a dropdown. |
| `short_designation` | **Retired/dropped.** The curated label replaces it. |
| `gender` | Unchanged ('m'/'f'/null), now actually used for the gender filter. |

## CSV import flow

The existing CSV template stays unchanged. The `designation` column (scraped full
title) maps to `full_title`; `short_designation` is ignored.

1. Import starts → load all active designations with keywords once.
2. Per row: parse → match the scraped title against each designation's keywords
   (case-insensitive substring), iterating in `sort_order` (most specific first);
   first match wins.
3. Match → insert with `designation_id` set, `needs_review = false`.
4. No match → insert with `designation_id = null`, `needs_review = true` → existing
   review queue (migration 012), where an admin assigns the designation from the
   dropdown.
5. Import summary reports "X classified, Y need review."

## Manual therapist creation (admins, mods, users via new post)

- Designation dropdown shows only active curated designations, labeled in the
  user's UI language, ordered by `sort_order`. Selection is **mandatory**.
- `full_title` is an optional free-text field ("official title, if known").
- Nothing a user types can create a designation.

## Filtering (sidebar)

- **Designation filter:** the ~6 pair-form labels in UI language, multi-select
  (same pattern as cantons/categories). Filters on `therapists.designation_id`;
  posts filter via the post→therapist association.
- **Gender filter:** separate toggle m / f / both (default both) on
  `therapists.gender`. Not combined with the designation filter.
- Therapists with `designation_id = null` (unreviewed imports) match no designation
  filter until classified.

## Display

- **Therapist profile:** curated pair-form label (UI language) + `full_title`
  verbatim underneath (therapist's local language — by design, not translated).
- **Cards / post therapist line / directory rows:** the pair-form label in UI
  language. One label everywhere; no gender-variant display logic.

## Admin panel

The existing "Berufsbezeichnung" tab is slimmed to the new table: per row —
slug, three labels, keywords, sort order, active toggle. This panel is the only
write path for designations. Admins refine keywords here when the review queue
shows recurring misses.

## Migration of existing data

1. Create the new `designations` table; seed the curated set (labels + keywords
   defined by the project owner).
2. Rename `therapists.designation` → `full_title` (existing values preserved).
3. One-time backfill: run every existing therapist's `full_title` through the same
   keyword matcher → set `designation_id`; unmatched → `needs_review = true`.
4. Verify backfill, classify the review-queue remainder by hand.
5. Drop the old designation columns/table and `short_designation`.

## Code work (for the implementation plan)

- DB migration(s): new lean `designations` table; therapist column rename/drops;
  old table teardown after verified backfill.
- Rewrite `src/services/designations.service.ts` as simple CRUD for the lean table.
- **Delete** `src/services/designation-matching.service.ts` and the auto-sync logic
  in the designations service.
- New keyword-matcher utility; wire into `src/services/therapist-import.service.ts`.
- One-time backfill (script or admin button) reusing the matcher.
- UI updates: slimmed admin panel (`src/components/admin/`), creation modal dropdown
  (`TherapistCreateModal.tsx` — 6 entries, required), sidebar designation filter +
  new gender toggle (`FilterModal.tsx` / sidebar), profile display
  (`TherapistDirectoryPage.tsx` — label + `full_title`), review queue designation
  dropdown.

## Manual work (project owner / admins)

1. Define the curated set: 5–8 designations with DE/FR/IT pair labels. Draft
   starting point (domain owner to confirm): Psychiater:in, Psycholog:in,
   Psychotherapeut:in, Klinik, optionally Hausärzt:in and Coach/Andere.
2. Seed initial keywords per designation (e.g. `FMH, Psychiat` → Psychiater:in);
   refine in the admin panel as review-queue misses recur.
3. After backfill: classify unmatched therapists in the review queue.
4. Ongoing: occasional review-queue glance after each CSV import.

## Out of scope

- AI-assisted classification (can be added later as a layer between keyword rules
  and the review queue if the unmatched tail proves large).
- Translating `full_title` (deliberately local-language only).
- Per-gender label variants on cards (pair label chosen instead).

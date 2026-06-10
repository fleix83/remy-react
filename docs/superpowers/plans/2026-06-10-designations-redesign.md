# Therapist Designations Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chaotic 12-variant designation system with a lean curated `designations` table (slug + DE/FR/IT pair labels + keywords), a verbatim `full_title` per therapist, keyword-rule classification at CSV import, and designation/gender filters.

**Architecture:** Two-phase DB migration against the shared Supabase project (additive migration 018 first so the live frontend keeps working, destructive cleanup 019 after the new code is deployed). A pure keyword-matcher utility classifies scraped titles at import; unmatched rows land in the existing `needs_review` queue. All display sites read the curated label via an embedded `designations(...)` relation on therapist selects.

**Tech Stack:** React 19 + TypeScript, Supabase (Postgres + PostgREST embeds + RLS), TanStack Query, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-10-designations-redesign-design.md`

---

## Critical constraints (read first)

1. **Shared database, live frontend.** Dev and production use the same Supabase project. Migration 018 must be ADDITIVE (`full_title` added as a copy of `designation`; legacy columns kept, NOT NULLs relaxed). The old frontend keeps working during development except for designation dropdowns/filter chips, which degrade gracefully (the old `designations` table is renamed to `designations_old`, so old dropdowns render empty). Destructive drops happen only in migration 019 (Task 16) after the new build is pushed.
2. **Never run `npm run build` for deploy purposes and never commit `dist/`** (CI builds on push). Use `npx tsc -b` for typechecking.
3. **Compile state:** Tasks 4–12 are a refactor cascade. Legacy type fields are kept *optional* in Task 2 so every task compiles; Task 13 is the typecheck checkpoint; Task 16 removes the legacy fields and re-checks.
4. **MCP tools:** Apply migrations/SQL through the `supabase` MCP server. Load tool schemas first with ToolSearch query `select:mcp__supabase__apply_migration,mcp__supabase__execute_sql`. If MCP is unavailable, stop and ask the user.
5. **Migration numbering:** `018_lean_designations.sql` and `019_designations_cleanup.sql` (017 is the latest existing).
6. Commit after every task. Branch: `main-light` (current).

---

### Task 1: Migration 018 — lean designations table (additive)

**Files:**
- Create: `supabase/migrations/018_lean_designations.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Lean designations redesign (additive phase).
-- Spec: docs/superpowers/specs/2026-06-10-designations-redesign-design.md
-- Destructive cleanup (dropping legacy columns/table) happens in 019 after the
-- new frontend is deployed — dev and prod share this database.

-- 1) Detach therapists from the old designations table. Existing designation_id
--    values reference old rows and are re-assigned by the keyword backfill later.
ALTER TABLE public.therapists DROP CONSTRAINT IF EXISTS therapists_designation_id_fkey;
UPDATE public.therapists SET designation_id = NULL;

-- 2) Keep the old table until the backfill is verified (dropped in 019).
ALTER TABLE public.designations RENAME TO designations_old;

-- 3) New lean designations table.
CREATE TABLE public.designations (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  label_de TEXT NOT NULL,
  label_fr TEXT NOT NULL DEFAULT '',
  label_it TEXT NOT NULL DEFAULT '',
  keywords TEXT,
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read designations" ON public.designations
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert designations" ON public.designations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
CREATE POLICY "Admins can update designations" ON public.designations
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );
CREATE POLICY "Admins can delete designations" ON public.designations
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- 4) Seed the draft curated set. Labels and keywords are admin-editable in the
--    admin panel; sort_order is both dropdown order and keyword-match priority
--    (most specific designation first: Psychiat before Psychotherapeut).
INSERT INTO public.designations (slug, label_de, label_fr, label_it, keywords, sort_order) VALUES
  ('psychiater',      'Psychiater:in',      'Psychiatre',         'Psichiatra',         'FMH, Psychiat, psychiatre, psichiatr', 10),
  ('psychologe',      'Psycholog:in',       'Psychologue',        'Psicologo/a',        'FSP, Psycholog, psychologue, psicolog', 20),
  ('psychotherapeut', 'Psychotherapeut:in', 'Psychothérapeute',   'Psicoterapeuta',     'Psychotherapeut, psychothérapeute, psicoterapeut', 30),
  ('klinik',          'Klinik',             'Clinique',           'Clinica',            'Klinik, Clinique, Clinica', 40),
  ('hausarzt',        'Hausärzt:in',        'Médecin de famille', 'Medico di famiglia', 'Hausarzt, Hausärztin, Allgemeinmedizin, médecine générale', 50),
  ('andere',          'Andere',             'Autre',              'Altro',              NULL, 60);

-- 5) Re-point the therapists FK at the new table.
ALTER TABLE public.therapists
  ADD CONSTRAINT therapists_designation_id_fkey
  FOREIGN KEY (designation_id) REFERENCES public.designations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_therapists_designation_id ON public.therapists(designation_id);

-- 6) full_title = verbatim scraped professional title (local language only).
--    Added as a copy; the legacy designation column is dropped in 019.
ALTER TABLE public.therapists ADD COLUMN IF NOT EXISTS full_title TEXT;
UPDATE public.therapists SET full_title = designation;
ALTER TABLE public.therapists ALTER COLUMN designation DROP NOT NULL;

-- 7) posts.designation is legacy (the new designation filter joins therapists);
--    relax NOT NULL so new code can stop writing the 'Allgemein' placeholder.
ALTER TABLE public.posts ALTER COLUMN designation DROP NOT NULL;
```

- [ ] **Step 2: Apply the migration**

Load MCP tools (ToolSearch `select:mcp__supabase__apply_migration,mcp__supabase__execute_sql`), then call `mcp__supabase__apply_migration` with `name: "lean_designations"` and the SQL above.

- [ ] **Step 3: Verify**

Run via `mcp__supabase__execute_sql`:
```sql
SELECT slug, sort_order, is_active FROM designations ORDER BY sort_order;
```
Expected: 6 rows, psychiater first.
```sql
SELECT count(*) AS with_id FROM therapists WHERE designation_id IS NOT NULL;
SELECT count(*) AS missing_title FROM therapists WHERE full_title IS DISTINCT FROM designation;
```
Expected: both 0.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/018_lean_designations.sql
git commit -m "feat: migration 018 - lean designations table, full_title on therapists (additive)"
```

---

### Task 2: TypeScript types

**Files:**
- Modify: `src/types/database.types.ts`

- [ ] **Step 1: Replace the `designations` table type block**

Find the `designations:` block (around line 126) and replace its `Row`, `Insert`, `Update`, and `Relationships` with:

```ts
      designations: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean
          keywords: string | null
          label_de: string
          label_fr: string
          label_it: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean
          keywords?: string | null
          label_de: string
          label_fr?: string
          label_it?: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean
          keywords?: string | null
          label_de?: string
          label_fr?: string
          label_it?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
```

- [ ] **Step 2: Update the `therapists` table type block**

In the `therapists` `Row` (around line 521): add `full_title: string | null`, and make the legacy fields optional (kept until Task 16 so the refactor cascade compiles):
- `designation: string` → `designation?: string | null`
- `short_designation: string | null` → `short_designation?: string | null`

In `Insert` and `Update`: add `full_title?: string | null`; change `designation: string` in `Insert` to `designation?: string | null` (it is already optional in `Update`).

- [ ] **Step 3: Add helper types and extend existing ones**

Below `export type Designation = Tables<'designations'>` (around line 880), add:

```ts
export type DesignationLabels = Pick<Designation, 'id' | 'slug' | 'label_de' | 'label_fr' | 'label_it'>
export type TherapistWithDesignation = Therapist & { designations?: DesignationLabels | null }
```

Note: `Therapist` is declared a few lines later (line ~884); move the two new lines BELOW `export type Therapist = Tables<'therapists'>` to avoid use-before-declaration.

In `PostWithRelations` (line ~889), change `therapists?: Therapist | null` to `therapists?: TherapistWithDesignation | null`.

In `ModerationQueueItem` (line ~917), under the therapist-specific fields, add `designation_id?: number | null` after `designation?: string`.

- [ ] **Step 4: Commit**

```bash
git add src/types/database.types.ts
git commit -m "feat: types for lean designations, full_title, TherapistWithDesignation"
```

(`npx tsc -b` still passes at this point — changes are additive/optional.)

---

### Task 3: Designation helpers (TDD)

**Files:**
- Create: `src/utils/designationHelpers.ts`
- Test: `src/utils/designationHelpers.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { matchDesignation, getDesignationLabel, therapistDesignationLabel } from './designationHelpers'

const matchSet = [
  { id: 1, keywords: 'FMH, Psychiat, psychiatre', sort_order: 10 },
  { id: 2, keywords: 'FSP, Psycholog', sort_order: 20 },
  { id: 3, keywords: 'Psychotherapeut', sort_order: 30 },
  { id: 4, keywords: 'Klinik', sort_order: 40 },
  { id: 6, keywords: null, sort_order: 60 }
]

describe('matchDesignation', () => {
  it('matches a simple keyword case-insensitively', () => {
    expect(matchDesignation('eidg. anerkannter PSYCHOTHERAPEUT', matchSet)).toBe(3)
  })

  it('prefers lower sort_order when multiple designations match', () => {
    // contains both "Psychiat" (10) and "Psychotherapeut" (30)
    expect(matchDesignation('Facharzt für Psychiatrie und Psychotherapie FMH', matchSet)).toBe(1)
  })

  it('matches FSP titles to psychologe before psychotherapeut', () => {
    expect(matchDesignation('Fachpsychologin für Psychotherapie FSP', matchSet)).toBe(2)
  })

  it('returns null when nothing matches', () => {
    expect(matchDesignation('Heilpraktiker', matchSet)).toBeNull()
  })

  it('ignores empty/null keyword lists and blank entries', () => {
    expect(matchDesignation('whatever', [{ id: 9, keywords: ' , ,', sort_order: 1 }])).toBeNull()
  })

  it('does not mutate the input array order', () => {
    const input = [...matchSet].reverse()
    matchDesignation('Klinik am See', input)
    expect(input[0].id).toBe(6)
  })
})

const labels = { id: 1, slug: 'psychiater', label_de: 'Psychiater:in', label_fr: 'Psychiatre', label_it: 'Psichiatra' }

describe('getDesignationLabel', () => {
  it('returns the German label by default', () => {
    expect(getDesignationLabel(labels)).toBe('Psychiater:in')
  })
  it('returns the requested language', () => {
    expect(getDesignationLabel(labels, 'fr')).toBe('Psychiatre')
    expect(getDesignationLabel(labels, 'it')).toBe('Psichiatra')
  })
  it('falls back to German when the language label is empty', () => {
    expect(getDesignationLabel({ ...labels, label_fr: '' }, 'fr')).toBe('Psychiater:in')
  })
  it('normalizes unknown languages to German', () => {
    expect(getDesignationLabel(labels, 'en')).toBe('Psychiater:in')
    expect(getDesignationLabel(labels, null)).toBe('Psychiater:in')
  })
})

describe('therapistDesignationLabel', () => {
  it('uses the curated label when the relation is embedded', () => {
    expect(therapistDesignationLabel({ full_title: 'Facharzt FMH', designations: labels })).toBe('Psychiater:in')
  })
  it('falls back to full_title for unclassified therapists', () => {
    expect(therapistDesignationLabel({ full_title: 'Facharzt FMH', designations: null })).toBe('Facharzt FMH')
  })
  it('returns empty string when nothing is available', () => {
    expect(therapistDesignationLabel({ full_title: null })).toBe('')
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/utils/designationHelpers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { DesignationLabels } from '../types/database.types'

export type AppLanguage = 'de' | 'fr' | 'it'

export function normalizeLanguage(lang?: string | null): AppLanguage {
  return lang === 'fr' || lang === 'it' ? lang : 'de'
}

/** Pair-form label ("Psychiater:in") in the requested UI language, German fallback. */
export function getDesignationLabel(d: DesignationLabels, lang?: string | null): string {
  const l = normalizeLanguage(lang)
  if (l === 'fr') return d.label_fr || d.label_de
  if (l === 'it') return d.label_it || d.label_de
  return d.label_de
}

/**
 * Display label for a therapist: curated designation label when classified,
 * otherwise the verbatim full_title (unclassified imports), otherwise ''.
 */
export function therapistDesignationLabel(
  therapist: { full_title?: string | null; designations?: DesignationLabels | null },
  lang?: string | null
): string {
  if (therapist.designations) return getDesignationLabel(therapist.designations, lang)
  return therapist.full_title || ''
}

/**
 * Classify a scraped professional title against the curated designations.
 * keywords is a comma-separated list; matching is case-insensitive substring.
 * Designations are tried in sort_order (admins put more specific ones first).
 * Returns the matched designation id or null.
 */
export function matchDesignation(
  fullTitle: string,
  designations: Array<{ id: number; keywords: string | null; sort_order: number }>
): number | null {
  const title = fullTitle.toLowerCase()
  const sorted = [...designations].sort((a, b) => a.sort_order - b.sort_order)
  for (const d of sorted) {
    const keywords = (d.keywords || '')
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean)
    if (keywords.some((k) => title.includes(k))) return d.id
  }
  return null
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npx vitest run src/utils/designationHelpers.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add src/utils/designationHelpers.ts src/utils/designationHelpers.test.ts
git commit -m "feat: designation keyword matcher and label helpers (TDD)"
```

---

### Task 4: Rewrite DesignationsService, delete the matching service

**Files:**
- Rewrite: `src/services/designations.service.ts`
- Delete: `src/services/designation-matching.service.ts`
- Modify: `src/services/posts.service.ts` (remove unused `getDesignations`, lines ~472–486)

- [ ] **Step 1: Replace `src/services/designations.service.ts` entirely**

```ts
import { supabase } from '../lib/supabase'
import type { Designation } from '../types/database.types'

/**
 * CRUD for the curated designations table (slug + DE/FR/IT pair labels +
 * import keywords). The admin panel is the only write path; nothing in the
 * app auto-creates designations.
 */
export class DesignationsService {
  async getActiveDesignations(): Promise<Designation[]> {
    const { data, error } = await supabase
      .from('designations')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('❌ DesignationsService: Error fetching designations:', error)
      throw error
    }
    return data || []
  }

  async getAllDesignations(): Promise<Designation[]> {
    const { data, error } = await supabase
      .from('designations')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('❌ DesignationsService: Error fetching all designations:', error)
      throw error
    }
    return data || []
  }

  async createDesignation(designationData: Omit<Designation, 'id' | 'created_at'>): Promise<Designation> {
    const { data, error } = await supabase
      .from('designations')
      .insert([designationData])
      .select()
      .single()

    if (error) {
      console.error('❌ DesignationsService: Error creating designation:', error)
      throw error
    }
    return data
  }

  async updateDesignation(
    id: number,
    updates: Partial<Omit<Designation, 'id' | 'created_at'>>
  ): Promise<Designation> {
    const { data, error } = await supabase
      .from('designations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ DesignationsService: Error updating designation:', error)
      throw error
    }
    return data
  }

  async deleteDesignation(id: number): Promise<void> {
    const { error } = await supabase.from('designations').delete().eq('id', id)
    if (error) {
      console.error('❌ DesignationsService: Error deleting designation:', error)
      throw error
    }
  }

  async toggleDesignationStatus(id: number, isActive: boolean): Promise<Designation> {
    return this.updateDesignation(id, { is_active: isActive })
  }
}
```

(The old `getDisplayName`, `formatDesignationName`, `getDesignationWithVariants`, `syncTherapistsWithDesignation`, and `getBaseDesignationsWithVariantCounts` are deliberately gone. Callers are migrated in Tasks 7, 9, 11.)

- [ ] **Step 2: Delete the fuzzy matching service**

```bash
git rm src/services/designation-matching.service.ts
```

- [ ] **Step 3: Remove the unused `getDesignations()` method from `posts.service.ts`**

Delete the whole method (it queries the designations table and is referenced nowhere) and the now-unused `Designation` import if present.

- [ ] **Step 4: Commit**

```bash
git add -A src/services/designations.service.ts src/services/posts.service.ts
git commit -m "refactor: lean DesignationsService; delete fuzzy designation matching"
```

Note: `npx tsc -b` now fails in files migrated by later tasks (e.g. `therapist-import.service.ts` imports the deleted service). That is expected until the Task 13 checkpoint.

---

### Task 5: CSV import rework

**Files:**
- Modify: `src/services/therapist-import.service.ts`
- Modify: `src/services/therapists.service.ts` (`bulkImportTherapists` only — rest in Task 6)
- Modify: `src/components/therapist/TherapistCreateModal.tsx` (import-result display only — rest in Task 7)

- [ ] **Step 1: Rework `therapist-import.service.ts`**

1. Replace the import of the deleted service:
```ts
// remove
import { DesignationMatchingService } from './designation-matching.service'
// add
import { DesignationsService } from './designations.service'
import { matchDesignation } from '../utils/designationHelpers'
import type { Designation } from '../types/database.types'
```
2. Replace the `ParsedTherapist` interface:
```ts
interface ParsedTherapist {
  canton: string | null
  city: string | null
  form_of_address: string
  first_name: string
  last_name: string
  full_title: string
  designation_id: number | null
  needs_review: boolean
  institution: string | null
  description: string | null
  languages: string | null
  gender: string | null
}
```
3. Remove the class field `private designationMatchingService = new DesignationMatchingService()`.
4. In `validateRow`, change the designation length limit from 50 to 255 (scraped full titles are long):
```ts
if (String(row.designation).trim().length > 255) {
  return { valid: false, error: 'designation exceeds 255 characters' }
}
```
5. In `countCompleteFields`, replace `if (therapist.designation) count++` with `if (therapist.full_title) count++` and delete the `short_designation` line.
6. Replace `parseTherapist` (now synchronous; classification is a pure function):
```ts
/**
 * Parse and normalize therapist data from a CSV row.
 * The scraped title is stored verbatim in full_title; the curated designation
 * is assigned by keyword matching. Unmatched rows are flagged for review.
 */
parseTherapist(row: any, designations: Designation[]): ParsedTherapist {
  const fullTitle = row.designation?.trim() || ''
  const detectedGender = fullTitle ? this.detectGender(fullTitle) : null
  const designationId = fullTitle ? matchDesignation(fullTitle, designations) : null

  return {
    canton: row.canton?.trim() || null,
    city: row.city?.trim() || null,
    form_of_address: row.form_of_address?.trim() || '',
    first_name: row.first_name?.trim() || '',
    last_name: row.last_name?.trim() || '',
    full_title: fullTitle,
    designation_id: designationId,
    needs_review: designationId === null,
    institution: row.institution?.trim() || null,
    description: row.description?.trim() || null,
    languages: row.languages?.trim() || null,
    gender: row.gender?.trim() || detectedGender
  }
}
```
(Note: an explicit `gender` CSV column wins over keyword detection.)
7. `processTherapists` gains a `designations` parameter and passes it through (the `await` before `parseTherapist` goes away):
```ts
async processTherapists(data: any[], designations: Designation[]): Promise<{ therapists: ParsedTherapist[]; errors: ImportError[] }> {
  ...
  const therapist = this.parseTherapist(row, designations)
  ...
}
```
8. In `importFromCSV`, replace the cache pre-load/clear block:
```ts
// Load the curated designations once for keyword classification
const designations = await new DesignationsService().getActiveDesignations()
const { therapists, errors } = await this.processTherapists(parseResult.data, designations)
```
(Delete both `this.designationMatchingService.loadDesignations()` and `.clearCache()` calls.)
9. Extend `ImportResult` with `needsReview: number` and set it in the success return:
```ts
return {
  success: true,
  imported: importedTherapists.length,
  needsReview: importedTherapists.filter(t => t.needs_review).length,
  skipped: skippedDuplicates,
  errors,
  importedTherapists
}
```
Set `needsReview: 0` in the three failure-path returns.

- [ ] **Step 2: Update `bulkImportTherapists` in `therapists.service.ts`**

Replace the parameter type and `insertData` mapping:
```ts
async bulkImportTherapists(therapists: Array<{
  canton: string | null
  city: string | null
  form_of_address: string
  first_name: string
  last_name: string
  full_title: string
  designation_id: number | null
  needs_review: boolean
  institution: string | null
  description?: string | null
  languages?: string | null
  gender?: string | null
}>): Promise<Therapist[]> {
```
```ts
const insertData = therapists.map(t => ({
  form_of_address: t.form_of_address,
  first_name: t.first_name.trim(),
  last_name: t.last_name.trim(),
  institution: t.institution?.trim() || null,
  full_title: t.full_title || null,
  designation_id: t.designation_id,
  description: t.description?.trim() || null,
  languages: t.languages?.trim() || null,
  city: t.city?.trim() || null,
  canton: t.canton || null,
  gender: t.gender || null,
  needs_review: t.needs_review, // unmatched rows go to the review queue
  created_by: user.id
}))
```

- [ ] **Step 3: Show the review count in the import result UI**

In `TherapistCreateModal.tsx`, inside the import-results block (after `<div>Duplikate übersprungen: {importResult.skipped}</div>`), add:
```tsx
{importResult.needsReview > 0 && (
  <div>Zur Prüfung (keine Bezeichnung zugeordnet): {importResult.needsReview}</div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/services/therapist-import.service.ts src/services/therapists.service.ts src/components/therapist/TherapistCreateModal.tsx
git commit -m "feat: CSV import classifies designations via keyword rules, flags unmatched for review"
```

---

### Task 6: TherapistsService — full_title, embedded designations

**Files:**
- Modify: `src/services/therapists.service.ts`

- [ ] **Step 1: Embed the designation relation in all reads**

Define once at the top of the class:
```ts
private static readonly SELECT_WITH_DESIGNATION = '*, designations(id, slug, label_de, label_fr, label_it)'
```
Replace `.select('*')` with `.select(TherapistsService.SELECT_WITH_DESIGNATION)` in `getTherapists`, `searchTherapists`, `getTherapistsByCanton`, and `getTherapist`. Change those methods' return types from `Therapist[]`/`Therapist | null` to `TherapistWithDesignation[]`/`TherapistWithDesignation | null` (import the type).

- [ ] **Step 2: Update the search columns**

In `searchTherapists`, replace the `.or(...)` string with:
```ts
.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,institution.ilike.%${searchTerm}%,full_title.ilike.%${searchTerm}%`)
```

- [ ] **Step 3: Rework `createTherapist`**

New signature and a single clean insert (the migration-012 retry fallback is dead code — the migration has long been applied — delete it):
```ts
async createTherapist(therapistData: {
  form_of_address: string
  first_name: string
  last_name: string
  designation_id: number
  full_title?: string
  institution?: string
  description?: string
  languages?: string
  city?: string
  canton?: string
  gender?: string
}): Promise<TherapistWithDesignation> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw new Error('Authentication failed: ' + authError.message)
  if (!user) throw new Error('User not authenticated')

  const insertData = {
    form_of_address: therapistData.form_of_address,
    first_name: therapistData.first_name.trim(),
    last_name: therapistData.last_name.trim(),
    institution: therapistData.institution?.trim() || null,
    designation_id: therapistData.designation_id,
    full_title: therapistData.full_title?.trim() || null,
    description: therapistData.description?.trim() || null,
    languages: therapistData.languages?.trim() || null,
    city: therapistData.city?.trim() || null,
    canton: therapistData.canton || null,
    gender: therapistData.gender || null,
    needs_review: true,
    created_by: user.id
  }

  const { data, error } = await supabase
    .from('therapists')
    .insert([insertData])
    .select(TherapistsService.SELECT_WITH_DESIGNATION)
    .single()

  if (error) {
    console.error('❌ TherapistsService: Database error:', error)
    throw new Error('Database error: ' + error.message)
  }
  return data
}
```

- [ ] **Step 4: Label-aware display formatting**

In `formatTherapistDisplay`, replace the designation push:
```ts
// old
if (therapist.designation) { details.push(therapist.designation) }
// new
const label = therapistDesignationLabel(therapist)
if (label) { details.push(label) }
```
Change both formatter signatures to accept `TherapistWithDesignation` and add the import:
```ts
import { therapistDesignationLabel } from '../utils/designationHelpers'
import type { Therapist, TherapistWithDesignation } from '../types/database.types'
```

- [ ] **Step 5: Commit**

```bash
git add src/services/therapists.service.ts
git commit -m "refactor: TherapistsService reads embed designations, create uses designation_id + full_title"
```

---

### Task 7: TherapistCreateModal rework

**Files:**
- Modify: `src/components/therapist/TherapistCreateModal.tsx`

- [ ] **Step 1: Form state**

Replace the `formData` shape (both `useState` initializer and the reset after submit):
```ts
const [formData, setFormData] = useState({
  canton: preselectedCanton,
  form_of_address: '',
  first_name: '',
  last_name: '',
  designation_id: null as number | null,
  full_title: '',
  institution: '',
  languages: '',
  city: '',
  gender: ''
})
```
In the edit-mode `useEffect`, map `full_title: therapist.full_title || ''` and drop `designation`/`short_designation`.

- [ ] **Step 2: Replace the `filteredDesignations` memo**

The lean table needs no per-gender expansion — one option per designation:
```ts
import { getDesignationLabel } from '../../utils/designationHelpers'
```
```ts
const lang = userProfile?.language_preference
const designationOptions = useMemo(
  () => designations.map(d => ({ id: d.id, label: getDesignationLabel(d, lang) })),
  [designations, lang]
)
```
(`getActiveDesignations()` already returns them in `sort_order`.)

- [ ] **Step 3: Replace the Berufsbezeichnung dropdown**

```tsx
<select
  value={formData.designation_id ?? ''}
  onChange={(e) => {
    const designationId = e.target.value ? parseInt(e.target.value) : null
    setFormData(prev => ({ ...prev, designation_id: designationId }))
    if (error) setError('')
  }}
  className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
  style={{ borderColor: '#ebebeb' }}
  disabled={isSubmitting || loadingDesignations}
  required
>
  <option value="" className="bg-white">
    {loadingDesignations ? 'Lade Bezeichnungen...' : 'Berufsbezeichnung auswählen'}
  </option>
  {designationOptions.map(option => (
    <option key={option.id} value={option.id} className="bg-white">
      {option.label}
    </option>
  ))}
</select>
```

- [ ] **Step 4: Add optional full_title and gender fields**

Directly below the Berufsbezeichnung field:
```tsx
{/* Offizielle Berufsbezeichnung (verbatim, local language, profile-only) */}
<div>
  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
    Offizieller Titel (optional)
  </label>
  <input
    type="text"
    value={formData.full_title}
    onChange={(e) => handleInputChange('full_title', e.target.value)}
    placeholder="z.B. Fachärztin für Psychiatrie und Psychotherapie FMH"
    className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
    style={{ borderColor: '#ebebeb' }}
    disabled={isSubmitting}
    maxLength={255}
  />
</div>

{/* Geschlecht (feeds the m/f therapist filter) */}
<div>
  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
    Geschlecht (optional)
  </label>
  <select
    value={formData.gender}
    onChange={(e) => handleInputChange('gender', e.target.value)}
    className="w-full px-3 py-2 bg-white border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
    style={{ borderColor: '#ebebeb' }}
    disabled={isSubmitting}
  >
    <option value="" className="bg-white">Keine Angabe</option>
    <option value="f" className="bg-white">Weiblich</option>
    <option value="m" className="bg-white">Männlich</option>
  </select>
</div>
```

- [ ] **Step 5: Validation and submit**

In `validateForm`, replace the designation check:
```ts
if (!formData.designation_id) {
  setError('Bitte wählen Sie eine Berufsbezeichnung aus')
  return false
}
```
In `handleSubmit`, update both branches:
```ts
// edit mode
resultTherapist = await therapistsService.updateTherapist(therapist.id, {
  canton: formData.canton || null,
  form_of_address: formData.form_of_address,
  first_name: formData.first_name,
  last_name: formData.last_name,
  designation_id: formData.designation_id,
  full_title: formData.full_title.trim() || null,
  institution: formData.institution || null,
  languages: formData.languages || null,
  city: formData.city || null,
  gender: formData.gender || null
})
// create mode
resultTherapist = await therapistsService.createTherapist({
  canton: formData.canton,
  form_of_address: formData.form_of_address,
  first_name: formData.first_name,
  last_name: formData.last_name,
  designation_id: formData.designation_id!,
  full_title: formData.full_title || undefined,
  institution: formData.institution || undefined,
  languages: formData.languages || undefined,
  city: formData.city || undefined,
  gender: formData.gender || undefined
})
```

- [ ] **Step 6: Commit**

```bash
git add src/components/therapist/TherapistCreateModal.tsx
git commit -m "feat: therapist modal uses curated designation dropdown + optional full title/gender"
```

---

### Task 8: Post filters — service and state plumbing

**Files:**
- Modify: `src/services/posts.service.ts`
- Modify: `src/hooks/usePosts.ts`
- Modify: `src/stores/forum.store.ts`
- Modify: `src/services/user-content.service.ts`

- [ ] **Step 1: Filter shape**

In all three of `posts.service.ts`, `usePosts.ts`, `forum.store.ts`, replace in the local `PostFilters` interface:
```ts
designation?: string
```
with:
```ts
designations?: number[]
gender?: 'm' | 'f'
```

- [ ] **Step 2: New therapist embed in `posts.service.ts`**

Add near the top of the class:
```ts
private static therapistEmbed(inner: boolean): string {
  return `therapists${inner ? '!inner' : ''}(id, form_of_address, first_name, last_name, full_title, designation_id, gender, institution, canton, designations(id, slug, label_de, label_fr, label_it))`
}
```
In `getPostsPage`, the select must use an inner join when filtering on therapist columns:
```ts
const needsTherapistJoin = Boolean(
  (postFilters.designations && postFilters.designations.length > 0) || postFilters.gender
)
let query = supabase
  .from('posts')
  .select(`
    id, title, content, created_at, user_id, category_id, therapist_id, canton,
    users!posts_user_id_fkey(id, username, avatar_url, role),
    categories!inner(id, name_de, name_fr, name_it),
    ${PostsService.therapistEmbed(needsTherapistJoin)}
  `, { count: 'exact' })
```
(Note: the legacy `designation` column is removed from the posts column list.)

Replace the designation filter block:
```ts
// old
if (postFilters.designation) {
  query = query.eq('designation', postFilters.designation)
}
// new — filter via the post→therapist association
if (postFilters.designations && postFilters.designations.length > 0) {
  query = query.in('therapists.designation_id', postFilters.designations)
}
if (postFilters.gender) {
  query = query.eq('therapists.gender', postFilters.gender)
}
```

- [ ] **Step 3: Update every other therapist embed in `posts.service.ts`**

Replace every occurrence of
`therapists(id, form_of_address, first_name, last_name, designation, short_designation, institution, canton)`
with `${PostsService.therapistEmbed(false)}` (template literal in the select string), and
`therapists!inner(id, form_of_address, first_name, last_name, designation, short_designation, institution, canton)`
with `${PostsService.therapistEmbed(true)}` (occurrences at lines ~144–147, ~281–296, ~430–433). Also remove `designation,` from the posts column lists in those selects (lines ~144, ~281, ~287, ~293, ~430).

- [ ] **Step 4: Remove the createPost placeholder**

In `createPost`, delete the line:
```ts
designation: 'Allgemein' // Provide default designation since it's required by DB
```
(Migration 018 dropped the NOT NULL.)

- [ ] **Step 5: `user-content.service.ts` embeds**

Replace both occurrences of
`therapists(id, form_of_address, first_name, last_name, designation, short_designation, institution, canton)`
with:
`therapists(id, form_of_address, first_name, last_name, full_title, designation_id, gender, institution, canton, designations(id, slug, label_de, label_fr, label_it))`

- [ ] **Step 6: `forum.store.ts` passthrough**

In both `getPosts` call sites (lines ~92 and ~129), replace `designation: currentFilters.designation,` / `designation: filters.designation,` with:
```ts
designations: currentFilters.designations,
gender: currentFilters.gender,
```
(respectively `filters.designations` / `filters.gender`).

- [ ] **Step 7: Commit**

```bash
git add src/services/posts.service.ts src/hooks/usePosts.ts src/stores/forum.store.ts src/services/user-content.service.ts
git commit -m "feat: post filters use therapists.designation_id (multi) and therapists.gender"
```

---

### Task 9: Filter UI — ForumView sidebar and FilterModal

**Files:**
- Modify: `src/components/forum/ForumView.tsx`
- Modify: `src/components/forum/FilterModal.tsx`

- [ ] **Step 1: ForumView state and handlers**

1. Update the local `PostFilters` interface: `designation?: string` → `designations?: number[]; gender?: 'm' | 'f'`.
2. Add imports:
```ts
import { getDesignationLabel } from '../../utils/designationHelpers'
import { useAuthStore } from '../../stores/auth.store'
```
and inside the component: `const { userProfile } = useAuthStore()` plus `const lang = userProfile?.language_preference`.
3. Delete the `showAllDesignations` state (line 44).
4. Replace `handleDesignationFilter` with a multi-select toggle (canton pattern) and add a gender handler:
```ts
const handleDesignationToggle = useCallback((id: number) => {
  setSearchInput('')
  setSearchTerm('')
  setFiltersState(prev => {
    const current = prev.designations || []
    const updated = current.includes(id) ? current.filter(d => d !== id) : [...current, id]
    return { ...prev, designations: updated.length > 0 ? updated : undefined }
  })
}, [])

const handleGenderFilter = useCallback((gender: 'm' | 'f' | null) => {
  setSearchInput('')
  setSearchTerm('')
  setFiltersState(prev => ({ ...prev, gender: gender || undefined }))
}, [])
```
5. In `getActiveFilterCount`: replace `if (filters.designation) count++` with:
```ts
if (filters.designations && filters.designations.length > 0) count++
if (filters.gender) count++
```

- [ ] **Step 2: Replace the desktop sidebar designation block (lines ~431–502)**

The curated set is ~6 entries — no primary/“Mehr” split needed:
```tsx
{/* Designation Filter - sidebar on desktop */}
<div className="hidden md:flex designation-filters">
  {/* "Alle Bezeichnungen" reset */}
  <button
    onClick={() => setFiltersState(prev => ({ ...prev, designations: undefined }))}
    className={`inline-flex items-center px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
      !filters.designations || filters.designations.length === 0
        ? 'bg-[var(--primary)] text-white'
        : 'bg-[var(--bg-element)] text-gray-700 hover:bg-[var(--bg-element-hover)]'
    }`}
    style={{ fontSize: '0.65rem' }}
  >
    Alle Bezeichnungen
  </button>

  {designations.map(d => (
    <button
      key={d.id}
      onClick={() => handleDesignationToggle(d.id)}
      className={`inline-flex items-center px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
        filters.designations?.includes(d.id)
          ? 'bg-[var(--primary)] text-white'
          : 'bg-[var(--bg-element)] text-gray-700 hover:bg-[var(--bg-element-hover)]'
      }`}
      style={{ fontSize: '0.65rem' }}
    >
      {getDesignationLabel(d, lang)}
    </button>
  ))}

  {/* Gender filter — independent of designations */}
  <span className="mx-1 text-gray-400" style={{ fontSize: '0.65rem' }}>|</span>
  {([
    { value: null, label: 'Alle' },
    { value: 'f' as const, label: 'Frauen' },
    { value: 'm' as const, label: 'Männer' }
  ]).map(g => (
    <button
      key={g.label}
      onClick={() => handleGenderFilter(g.value)}
      className={`inline-flex items-center px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
        (filters.gender ?? null) === g.value
          ? 'bg-[var(--primary)] text-white'
          : 'bg-[var(--bg-element)] text-gray-700 hover:bg-[var(--bg-element-hover)]'
      }`}
      style={{ fontSize: '0.65rem' }}
    >
      {g.label}
    </button>
  ))}
</div>
```
Delete the old IIFE (`primaryNames`, `restItems`, `showAllDesignations` rendering) entirely.

- [ ] **Step 3: FilterModal (mobile)**

1. Update its `PostFilters`/`FilterState` interfaces the same way (`designations?: number[]; gender?: 'm' | 'f'`).
2. Add imports `getDesignationLabel` (from `../../utils/designationHelpers`) and `useAuthStore`; get `lang` as in ForumView.
3. `hasActiveFilters`: replace `filters.designation` with `(filters.designations && filters.designations.length > 0) || filters.gender`.
4. Replace the Berufsbezeichnung select options/value:
```tsx
<select
  value={filters.designations?.[0] || ''}
  onChange={(e) => {
    const val = e.target.value
    onFiltersChange({ ...filters, designations: val ? [parseInt(val)] : undefined })
  }}
  className="w-full appearance-none bg-[#ff6467] hover:bg-[#e85a4f] text-white px-3 py-2 rounded-lg font-medium text-center focus:outline-none cursor-pointer text-sm"
>
  <option value="">Alle Bezeichnungen</option>
  {designations.map(designation => (
    <option key={designation.id} value={designation.id}>
      {getDesignationLabel(designation, lang)}
    </option>
  ))}
</select>
```
5. Add a gender select in the grid (same styling), e.g. after the designation select:
```tsx
{/* Geschlecht */}
<div className="relative">
  <select
    value={filters.gender || ''}
    onChange={(e) => onFiltersChange({ ...filters, gender: (e.target.value || undefined) as 'm' | 'f' | undefined })}
    className="w-full appearance-none bg-[#ff6467] hover:bg-[#e85a4f] text-white px-3 py-2 rounded-lg font-medium text-center focus:outline-none cursor-pointer text-sm"
  >
    <option value="">Alle Geschlechter</option>
    <option value="f">Frauen</option>
    <option value="m">Männer</option>
  </select>
</div>
```
6. Therapist suggestion row (line ~321): replace `{therapist.short_designation || therapist.designation}` with `{therapistDesignationLabel(therapist)}` (add to the helpers import).

- [ ] **Step 4: Commit**

```bash
git add src/components/forum/ForumView.tsx src/components/forum/FilterModal.tsx
git commit -m "feat: sidebar/modal designation multi-filter + independent gender filter"
```

---

### Task 10: Display sites — curated label everywhere, full_title on profile

**Files:**
- Modify: `src/components/forum/PostCard.tsx` (line ~166)
- Modify: `src/components/forum/PostView.tsx` (line ~301)
- Modify: `src/components/user/UserContent.tsx` (lines ~368, ~562)
- Modify: `src/components/therapist/TherapistSelector.tsx`
- Modify: `src/utils/therapistHelpers.ts`
- Modify: `src/components/therapist/TherapistDirectoryPage.tsx`
- Modify: `src/services/moderation-queue.service.ts`

- [ ] **Step 1: Post therapist lines**

In `PostCard.tsx`, `PostView.tsx`, and both spots in `UserContent.tsx`, replace
```tsx
{post.therapists.short_designation || post.therapists.designation}
```
with
```tsx
{therapistDesignationLabel(post.therapists)}
```
(in `UserContent.tsx` the second occurrence uses `draft.therapists`). Add to each file:
```ts
import { therapistDesignationLabel } from '../../utils/designationHelpers'
```

- [ ] **Step 2: TherapistSelector**

Search predicate (lines ~58–60): replace the two designation terms with
```ts
(therapist.full_title && therapist.full_title.toLowerCase().includes(term))
```
Display row (line ~292): replace `{therapist.short_designation || therapist.designation}` with `{therapistDesignationLabel(therapist)}`. Add the helper import.

- [ ] **Step 3: therapistHelpers**

In `formatTherapistForTitle`, replace:
```ts
const designation = therapist.short_designation || therapist.designation
```
with:
```ts
const designation = therapistDesignationLabel(therapist)
```
Change the parameter types of `formatTherapistForTitle` and `getExperiencePostTitle` from `Therapist` to `TherapistWithDesignation` and add imports:
```ts
import type { TherapistWithDesignation } from '../types/database.types'
import { therapistDesignationLabel } from './designationHelpers'
```

- [ ] **Step 4: Therapist profile (TherapistDirectoryPage)**

Add imports (`getDesignationLabel`, `useAuthStore` if not present) and `const { userProfile } = useAuthStore()`. Replace the designation paragraph (lines ~203–207):
```tsx
{/* Curated designation (UI language) + verbatim professional title */}
{selectedTherapist.designations && (
  <p className="text-gray-700 font-medium">
    {getDesignationLabel(selectedTherapist.designations, userProfile?.language_preference)}
  </p>
)}
{selectedTherapist.full_title && (
  <p className="text-gray-600 text-sm">
    {selectedTherapist.full_title}
  </p>
)}
```
(The state holding `selectedTherapist` must be typed `TherapistWithDesignation` — update the `useState` generic if it names `Therapist`.)

- [ ] **Step 5: moderation-queue.service mapping**

In the therapist→item mapping (line ~119), replace `designation: therapist.designation,` with:
```ts
designation: therapist.full_title, // verbatim scraped title — useful when classifying
designation_id: therapist.designation_id,
```

- [ ] **Step 6: Commit**

```bash
git add src/components/forum/PostCard.tsx src/components/forum/PostView.tsx src/components/user/UserContent.tsx src/components/therapist/TherapistSelector.tsx src/utils/therapistHelpers.ts src/components/therapist/TherapistDirectoryPage.tsx src/services/moderation-queue.service.ts
git commit -m "feat: curated designation label across cards/selector/profile, full_title on profile"
```

---

### Task 11: Admin panel — lean designation editor

**Files:**
- Rewrite: `src/components/admin/DesignationsTab.tsx`
- Rewrite: `src/components/admin/DesignationRow.tsx`

- [ ] **Step 1: Replace `DesignationRow.tsx` entirely**

```tsx
import React, { useState } from 'react'
import type { Designation } from '../../types/database.types'
import InlineEditCell from '../ui/InlineEditCell'
import { DesignationsService } from '../../services/designations.service'

interface DesignationRowProps {
  designation: Designation
  onUpdate: () => void
  onDelete: (id: number) => void
}

/**
 * One curated designation: slug, pair-form labels (DE/FR/IT), import keywords,
 * sort order (also the keyword-match priority — most specific first), active flag.
 */
const DesignationRow: React.FC<DesignationRowProps> = ({ designation, onUpdate, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const designationsService = new DesignationsService()

  const handleUpdate = async (field: keyof Designation, newValue: string | number | boolean) => {
    try {
      await designationsService.updateDesignation(designation.id, { [field]: newValue })
      onUpdate()
    } catch (error) {
      console.error('Error updating designation:', error)
      throw error
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Möchten Sie die Bezeichnung "${designation.label_de}" wirklich löschen?`)) return
    setIsDeleting(true)
    try {
      await designationsService.deleteDesignation(designation.id)
      onDelete(designation.id)
    } catch (error) {
      console.error('Error deleting designation:', error)
      alert('Fehler beim Löschen der Bezeichnung (wird sie noch von Therapeuten verwendet?)')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="border-b border-[#f1ece3] last:border-b-0">
      <div className="flex items-center gap-2 hover:bg-[#faf8f4] transition-colors px-2">
        <div className="w-32">
          <InlineEditCell
            value={designation.slug}
            onSave={(v) => handleUpdate('slug', v)}
            placeholder="slug"
            displayClassName="text-left"
          />
        </div>
        <div className="w-40">
          <InlineEditCell
            value={designation.label_de}
            onSave={(v) => handleUpdate('label_de', v)}
            placeholder="Label DE"
            displayClassName="text-left"
          />
        </div>
        <div className="w-40">
          <InlineEditCell
            value={designation.label_fr}
            onSave={(v) => handleUpdate('label_fr', v)}
            placeholder="Label FR"
            displayClassName="text-left"
          />
        </div>
        <div className="w-40">
          <InlineEditCell
            value={designation.label_it}
            onSave={(v) => handleUpdate('label_it', v)}
            placeholder="Label IT"
            displayClassName="text-left"
          />
        </div>
        <div className="flex-1">
          <InlineEditCell
            value={designation.keywords || ''}
            onSave={(v) => handleUpdate('keywords', v)}
            placeholder="Keywords (kommagetrennt, z.B. FMH, Psychiat)"
            displayClassName="text-left"
          />
        </div>
        <div className="w-16">
          <InlineEditCell
            value={String(designation.sort_order)}
            onSave={(v) => handleUpdate('sort_order', parseInt(v) || 100)}
            placeholder="Sort"
            displayClassName="text-center"
          />
        </div>
        <div className="w-16 flex justify-center">
          <input
            type="checkbox"
            checked={designation.is_active}
            onChange={(e) => handleUpdate('is_active', e.target.checked)}
            className="h-5 w-5 cursor-pointer rounded border-gray-300 accent-[var(--primary)] focus:ring-[var(--primary)]"
            title={designation.is_active ? 'Aktiv' : 'Inaktiv'}
          />
        </div>
        <div className="w-20 flex justify-end">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
          >
            {isDeleting ? '...' : 'Löschen'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DesignationRow
```

- [ ] **Step 2: Update `DesignationsTab.tsx`**

1. Replace `handleCreateNew`'s `createDesignation` payload:
```ts
await designationsService.createDesignation({
  slug: `neu-${Date.now()}`,
  label_de: 'Neue Bezeichnung',
  label_fr: '',
  label_it: '',
  keywords: null,
  sort_order: 100,
  is_active: true
})
```
2. Replace the table header columns (the inner div of the header block) with:
```tsx
<div className="flex items-center gap-2 px-2 py-3">
  <div className="w-32 text-xs font-semibold text-slate-500 uppercase text-left">Slug</div>
  <div className="w-40 text-xs font-semibold text-slate-500 uppercase text-left">DE</div>
  <div className="w-40 text-xs font-semibold text-slate-500 uppercase text-left">FR</div>
  <div className="w-40 text-xs font-semibold text-slate-500 uppercase text-left">IT</div>
  <div className="flex-1 text-xs font-semibold text-slate-500 uppercase text-left">Keywords (Import-Zuordnung)</div>
  <div className="w-16 text-xs font-semibold text-slate-500 uppercase text-center">Sort</div>
  <div className="w-16 text-xs font-semibold text-slate-500 uppercase flex justify-center">Aktiv</div>
  <div className="w-20 text-xs font-semibold text-slate-500 uppercase flex justify-end">Aktionen</div>
</div>
```
3. Reduce both `min-w-[1200px]` to `min-w-[900px]`. Everything else (loading/error states, footer stats) stays.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/DesignationsTab.tsx src/components/admin/DesignationRow.tsx
git commit -m "feat: lean admin designation editor (labels, keywords, sort, active)"
```

---

### Task 12: Review queue — one-click designation assignment

**Files:**
- Modify: `src/components/admin/ModerationQueue.tsx`

- [ ] **Step 1: Load designations**

Add imports:
```ts
import { DesignationsService } from '../../services/designations.service'
import { TherapistsService } from '../../services/therapists.service'
import { getDesignationLabel } from '../../utils/designationHelpers'
import type { Designation } from '../../types/database.types'
```
Add state `const [designations, setDesignations] = useState<Designation[]>([])` and load once:
```ts
useEffect(() => {
  if (permissions.canModerate) {
    new DesignationsService().getActiveDesignations().then(setDesignations).catch(console.error)
  }
}, [permissions.canModerate])
```

- [ ] **Step 2: Assignment dropdown on therapist items**

In the therapist branch of the content display (after the `{item.designation && (...)}` block around line 850), add:
```tsx
<select
  value={item.designation_id ?? ''}
  onClick={(e) => e.stopPropagation()}
  onChange={async (e) => {
    e.stopPropagation()
    const newId = e.target.value ? parseInt(e.target.value) : null
    try {
      await new TherapistsService().updateTherapist(item.id, { designation_id: newId })
      setQueueItems(prev => prev.map(q =>
        q.content_type === 'therapist' && q.id === item.id ? { ...q, designation_id: newId } : q
      ))
    } catch (error) {
      console.error('Error assigning designation:', error)
      alert('Fehler beim Zuweisen der Bezeichnung')
    }
  }}
  className="mt-2 text-sm border rounded px-2 py-1 bg-white text-gray-700"
  style={{ borderColor: '#ebebeb' }}
>
  <option value="">Bezeichnung zuweisen…</option>
  {designations.map(d => (
    <option key={d.id} value={d.id}>{getDesignationLabel(d)}</option>
  ))}
</select>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ModerationQueue.tsx
git commit -m "feat: assign curated designation directly from the review queue"
```

---

### Task 13: Compile checkpoint

- [ ] **Step 1: Typecheck**

Run: `npx tsc -b`
Expected: clean. Fix any straggler references to `short_designation` / `therapist.designation` / `DesignationMatchingService` / old designation name fields (`name_de_short_m` etc.) that the cascade missed — `grep -rn "short_designation\|name_de_short\|DesignationMatchingService" src/` must return nothing except `database.types.ts` (legacy optional field, removed in Task 16).

- [ ] **Step 2: Tests and lint**

Run: `npm test` — expected: all pass (incl. designationHelpers).
Run: `npm run lint` — expected: no new errors (pre-existing warnings unrelated to this change are acceptable).

- [ ] **Step 3: Manual smoke check (user assists)**

Dev server usually already runs on 5173; the app is login-gated and only the user has credentials. Ask the user (Felix) to check: forum loads, designation chips show the 6 pair labels, gender chips work, therapist modal dropdown shows 6 entries, admin Berufsbezeichnung tab edits labels/keywords, CSV import of a 2-row test file classifies/flags correctly.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix: designation redesign typecheck/lint stragglers"
```

---

### Task 14: USER CHECKPOINT — confirm curated set and keywords

- [ ] **Step 1: Ask the user to finalize the seed data**

Before the backfill runs, Felix must confirm (or edit in the admin panel): the designation list itself, the DE/FR/IT pair labels, and the keywords. Remind him: keyword matching is case-insensitive substring; `sort_order` is the match priority, so `psychiater` (10) must stay below `psychotherapeut` (30) numerically.

Do not proceed to Task 15 without explicit confirmation.

---

### Task 15: Backfill existing therapists

- [ ] **Step 1: Run the keyword backfill** (via `mcp__supabase__execute_sql`)

```sql
DO $$
DECLARE
  d RECORD;
  kw TEXT;
BEGIN
  FOR d IN SELECT id, keywords FROM designations WHERE is_active ORDER BY sort_order LOOP
    FOR kw IN
      SELECT trim(k) FROM unnest(string_to_array(coalesce(d.keywords, ''), ',')) AS k
      WHERE trim(k) <> ''
    LOOP
      UPDATE therapists
      SET designation_id = d.id
      WHERE designation_id IS NULL
        AND full_title ILIKE '%' || kw || '%';
    END LOOP;
  END LOOP;
  -- whatever the keywords didn't catch goes to the review queue
  UPDATE therapists SET needs_review = true WHERE designation_id IS NULL;
END $$;
```
(Note: iterating designations in `sort_order` and only updating rows still NULL reproduces exactly the first-match-wins semantics of `matchDesignation`.)

- [ ] **Step 2: Verify and report**

```sql
SELECT count(*) FILTER (WHERE designation_id IS NOT NULL) AS classified,
       count(*) FILTER (WHERE designation_id IS NULL)     AS needs_review
FROM therapists;

SELECT d.slug, count(t.id) AS therapists
FROM designations d
LEFT JOIN therapists t ON t.designation_id = d.id
GROUP BY d.slug ORDER BY therapists DESC;

SELECT full_title, count(*) FROM therapists
WHERE designation_id IS NULL GROUP BY full_title ORDER BY count(*) DESC LIMIT 20;
```
Report the numbers and the top unmatched titles to the user — recurring misses mean a keyword should be added (admin panel) and Step 1 re-run (it is idempotent: only NULL rows are touched). The remaining tail is classified by hand in the review queue.

---

### Task 16: Cleanup migration 019 + legacy code removal

**Run only after Task 15 is verified and the user has classified or accepted the review-queue remainder.**

**Files:**
- Create: `supabase/migrations/019_designations_cleanup.sql`
- Modify: `src/types/database.types.ts`
- Modify: `src/utils/therapist-csv-template.ts`

- [ ] **Step 1: Write and apply migration 019**

```sql
-- Designations redesign cleanup: remove legacy structures.
-- Prerequisite: backfill verified, new frontend deployed.
DROP TABLE IF EXISTS public.designations_old;
ALTER TABLE public.therapists DROP COLUMN IF EXISTS designation;
ALTER TABLE public.therapists DROP COLUMN IF EXISTS short_designation;
ALTER TABLE public.posts DROP COLUMN IF EXISTS designation;
```
Apply via `mcp__supabase__apply_migration` with `name: "designations_cleanup"`.

- [ ] **Step 2: Remove legacy type fields**

In `database.types.ts`, delete the `designation` and `short_designation` entries from the therapists `Row`/`Insert`/`Update` blocks, and the `designation` entries from the posts `Row`/`Insert`/`Update` blocks (posts block is at line ~386: `designation: string` in Row, optional in Insert/Update).

- [ ] **Step 3: Drop `short_designation` from the CSV template**

In `therapist-csv-template.ts`: remove `short_designation` from `TherapistCSVRow`, from the `headers` array, from `sampleRow` (delete the second `'Psychotherapeut'` entry), and from `optionalHeaders`. (Old CSVs that still contain the column keep importing fine — unknown columns are simply ignored by `parseTherapist`.)

- [ ] **Step 4: Verify**

Run: `npx tsc -b` — expected: clean (any code still touching the dropped fields now fails to compile; fix it).
Run: `npm test` — expected: pass.
Run: `grep -rn "short_designation\|designations_old" src/` — expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: migration 019 - drop legacy designation columns and old designations table"
```

---

## Deployment note

Push to `main-light` after Task 13 (CI builds and deploys automatically — never commit `dist/`). The window between migration 018 and that deploy degrades only the old frontend's designation dropdowns/filters; posts and therapist display keep working because 018 is additive. Task 16 (drops) must run **after** the new build is live.

## Out of scope (per spec)

- AI-assisted classification
- Translating `full_title`
- Per-gender label variants

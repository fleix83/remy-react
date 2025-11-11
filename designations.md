# Smart Multilingual Designation Matching System - Implementation Plan

## Overview
Implement hybrid designation system supporting CSV batch import AND independent designation management with **fuzzy matching across all 12 language fields**, auto-sync, and structured references.

---

## Current Database Schema

### `therapists` table (already exists)
```sql
- id (primary key)
- first_name
- last_name
- designation (TEXT) -- ← Display text, kept in sync
- designation_id (FK) -- ← Reference to designations table
- canton
- form_of_address
- institution
- description
- created_at
```

### `designations` table (already exists)
```sql
- id (primary key)
- name_de_short_m (German short masculine)
- name_de_short_f (German short feminine)
- name_de_long_m (German long masculine)
- name_de_long_f (German long feminine)
- name_fr_short_m (French short masculine)
- name_fr_short_f (French short feminine)
- name_fr_long_m (French long masculine)
- name_fr_long_f (French long feminine)
- name_it_short_m (Italian short masculine)
- name_it_short_f (Italian short feminine)
- name_it_long_m (Italian long masculine)
- name_it_long_f (Italian long feminine)
- parent_id (for grouping)
- is_active (boolean)
- created_at
```

**NOTE:** No database migrations needed - schema already supports this!

---

## How It Works - Detailed Scenarios

### Scenario 1A: Batch Importing Therapists via CSV

#### CSV Example:
```csv
first_name, last_name, designation, canton
Maria, Schmidt, Psychologin, ZH
Hans, Müller, Psychologe, BE
Jean, Dupont, Psychologue, GE
Anna, Weber, Fachpsychologin für Psychotherapie, ZH
```

#### Process Flow:

**For each CSV row:**

1. **Parse CSV row**
   - Read: `{ first_name: "Maria", last_name: "Schmidt", designation: "Psychologin", canton: "ZH" }`

2. **Call DesignationMatchingService.findOrCreateDesignation("Psychologin")**

   **Search Phase:**
   - Service searches ALL 12 fields of ALL designations
   - Uses fuzzy matching (tolerates typos, similar strings)
   - Example search:
     ```sql
     SELECT * FROM designations WHERE
       name_de_short_m SIMILAR TO 'Psychologin' OR
       name_de_short_f SIMILAR TO 'Psychologin' OR  -- MATCH FOUND!
       name_de_long_m SIMILAR TO 'Psychologin' OR
       ... (all 12 fields)
     ```

   **Match Found (Case 1):**
   - Found existing designation id=5 with `name_de_short_f = "Psychologin"`
   - Returns: `{ designation_id: 5, display_text: "Psychologin" }`
   - **Database Write:** None (designation already exists)

   **No Match (Case 2):**
   - No similar designation found
   - Creates new designation:
     ```sql
     INSERT INTO designations (
       name_de_short_m,
       is_active,
       created_at
     ) VALUES (
       'Fachpsychologin für Psychotherapie',
       true,
       NOW()
     )
     RETURNING id  -- Returns id=42
     ```
   - **Database Write:** 1 row to `designations` table
   - Returns: `{ designation_id: 42, display_text: "Fachpsychologin für Psychotherapie" }`

3. **Create therapist record**
   ```sql
   INSERT INTO therapists (
     first_name,
     last_name,
     designation,      -- Text copy for fast display
     designation_id,   -- FK for management & sync
     canton,
     created_at
   ) VALUES (
     'Maria',
     'Schmidt',
     'Psychologin',    -- ← Saved here (text)
     5,                -- ← Saved here (FK to designations table)
     'ZH',
     NOW()
   )
   ```
   - **Database Write:** 1 row to `therapists` table

#### Multilingual CSV Import:

```csv
Jean, Dupont, Psychologue, GE     → designation_id=5, text="Psychologue"
Maria, Schmidt, Psychologin, ZH   → designation_id=5, text="Psychologin"
Marco, Rossi, Psicologo, TI       → designation_id=5, text="Psicologo"
```

**Result:** All three therapists link to the **same designation record** (id=5) but store their original language text.

#### Data Saved:
- ✅ `designations` table (new entries only when no match found)
- ✅ `therapists` table (one row per CSV row)

---

### Scenario 1B: Manual Creation of New Therapist

#### Process Flow:

1. **Admin opens "Create Therapist" modal**
   - **Database Read:**
     ```sql
     SELECT * FROM designations
     WHERE is_active = true
     ORDER BY created_at DESC
     ```
   - Loads designations into dropdown

2. **Dropdown displays:**
   ```
   Select designation...
   ───────────────
   Psychologe              (from designation id=5, name_de_short_m)
   Psychiater              (from designation id=8, name_de_short_m)
   Sozialarbeiter          (from designation id=12, name_de_short_m)
   ```
   - Shows `name_de_short_m` field (or first available non-null field)

3. **Admin fills form:**
   - First Name: Peter
   - Last Name: Meier
   - Designation: Selects "Psychologe" (designation_id=5)
   - Canton: BS

4. **Admin clicks "Speichern"**
   - **Database Write:**
     ```sql
     INSERT INTO therapists (
       first_name,
       last_name,
       designation,
       designation_id,
       canton,
       form_of_address,
       institution,
       description,
       created_at
     ) VALUES (
       'Peter',
       'Meier',
       'Psychologe',     -- ← Text from name_de_short_m
       5,                -- ← FK
       'BS',
       'Herr',
       'Privatklinik Wyss',
       'Spezialist für Traumatherapie',
       NOW()
     )
     ```

#### Data Saved:
- ✅ `therapists` table (one new row)
- ❌ `designations` table (not touched, just referenced)

---

### Scenario 2: Editing Designation in Admin Interface

#### Process Flow:

1. **Admin goes to "Berufsbezeichnung" tab**
   - Sees designation row with id=5:
     ```
     DE: Psychologe | Psychologin | Fachpsychologe | Fachpsychologin
     FR: Psychologue | Psychologue | ...
     IT: Psicologo | Psicologa | ...
     ```

2. **Admin clicks on "Psychologe", changes to "Psychologe FSP"**
   - InlineEditCell holds new value in state

3. **Admin clicks away (onBlur triggered)**

   **Step A: Update Designation Record**
   - **Database Write:**
     ```sql
     UPDATE designations
     SET name_de_short_m = 'Psychologe FSP'
     WHERE id = 5
     ```
   - Designation record updated

   **Step B: Auto-Sync All Linked Therapists**
   - Service finds therapists using this designation:
     ```sql
     SELECT id FROM therapists
     WHERE designation_id = 5
     -- Returns: [123, 456, 789, ...] (23 therapist IDs)
     ```

   - **Database Write (bulk update):**
     ```sql
     UPDATE therapists
     SET designation = 'Psychologe FSP'
     WHERE designation_id = 5
     ```
   - Updates 23 therapist records automatically
   - Console logs: "✅ Synced 23 therapist records"

#### Data Saved:
- ✅ `designations` table (1 row updated - the designation itself)
- ✅ `therapists` table (23 rows updated - all therapists using that designation)

---

### Scenario 3: Displaying Therapist in Post Therapist Line

#### Process Flow:

1. **Post loads therapist data**
   - **Database Read:**
     ```sql
     SELECT * FROM therapists
     WHERE id = 123
     ```
   - Returns:
     ```javascript
     {
       id: 123,
       first_name: "Maria",
       last_name: "Schmidt",
       designation: "Psychologe FSP",  // ← This text is displayed
       designation_id: 5,
       canton: "ZH"
     }
     ```

2. **Display in UI:**
   ```jsx
   <div>{therapist.designation}</div>
   // Shows: "Psychologe FSP"
   ```

#### Data Accessed:
- ✅ Reads from: `therapists` table only
- ✅ No JOIN needed - fast display using cached text

---

### Scenario 4: Displaying Therapist in Therapist Profile

#### Simple Approach (Current, Recommended):

1. **Profile loads therapist**
   - **Database Read:**
     ```sql
     SELECT * FROM therapists WHERE id = 123
     ```

2. **Display profile:**
   ```jsx
   <h2>{therapist.first_name} {therapist.last_name}</h2>
   <p>{therapist.designation}</p>  {/* Shows: "Psychologe FSP" */}
   ```

#### Advanced Approach (Optional Future Enhancement):

1. **Profile loads therapist + full designation details**
   - **Database Reads:**
     ```sql
     SELECT * FROM therapists WHERE id = 123
     SELECT * FROM designations WHERE id = 5  -- Using therapist.designation_id
     ```

2. **Display all language variants:**
   ```jsx
   <h2>{therapist.first_name} {therapist.last_name}</h2>
   <div>
     <p>DE: {designation.name_de_short_m} / {designation.name_de_long_m}</p>
     <p>FR: {designation.name_fr_short_m} / {designation.name_fr_long_m}</p>
     <p>IT: {designation.name_it_short_m} / {designation.name_it_long_m}</p>
   </div>
   ```

#### Data Accessed:
- ✅ Reads from: `therapists` table (always)
- ✅ Reads from: `designations` table (optional, for enhanced display)

---

## The Two-Field Strategy

```javascript
therapist = {
  designation: "Psychologe FSP",        // ← TEXT: Fast display, auto-synced
  designation_id: 5                     // ← FK: Links to central designations
}
```

### Why Both Fields?

1. **Performance:** No JOIN needed for list displays (use text field)
2. **Auto-Sync:** Edit designation once → updates all therapists automatically
3. **Flexibility:** Use text (simple) or FK (advanced) depending on needs
4. **Multilingual:** Each therapist keeps original language, all link to same designation

---

## Implementation Plan

### Phase 1: Install Fuzzy Matching Library

```bash
npm install string-similarity
npm install -D @types/string-similarity
```

---

### Phase 2: Create DesignationMatchingService

**File:** `src/services/designation-matching.service.ts` (NEW)

#### Methods to implement:

**1. `findDesignationByText(text: string): Promise<Designation | null>`**

- Search ALL 12 designation fields using fuzzy matching
- Use `string-similarity` library with threshold > 0.8 (80% match)
- Return best match designation or null

**Implementation approach:**
```typescript
async findDesignationByText(text: string): Promise<Designation | null> {
  // 1. Get all active designations
  const designations = await getAllDesignations()

  // 2. For each designation, check all 12 fields
  const matches = []
  for (const designation of designations) {
    const fields = [
      designation.name_de_short_m,
      designation.name_de_short_f,
      designation.name_de_long_m,
      designation.name_de_long_f,
      designation.name_fr_short_m,
      designation.name_fr_short_f,
      designation.name_fr_long_m,
      designation.name_fr_long_f,
      designation.name_it_short_m,
      designation.name_it_short_f,
      designation.name_it_long_m,
      designation.name_it_long_f,
    ]

    // 3. Calculate similarity for each non-null field
    for (const field of fields) {
      if (field) {
        const similarity = stringSimilarity.compareTwoStrings(text, field)
        if (similarity > 0.8) {
          matches.push({ designation, similarity, matchedField: field })
        }
      }
    }
  }

  // 4. Return best match (highest similarity)
  if (matches.length > 0) {
    matches.sort((a, b) => b.similarity - a.similarity)
    return matches[0].designation
  }

  return null
}
```

**2. `findOrCreateDesignation(text: string): Promise<{ designation_id: number, display_text: string }>`**

- Try `findDesignationByText(text)` first
- If found: return existing designation_id and matched text
- If not found: create new designation with text in `name_de_short_m` field
- Return designation_id and display text

**Implementation approach:**
```typescript
async findOrCreateDesignation(text: string): Promise<{ designation_id: number, display_text: string }> {
  // 1. Try to find existing designation
  const existing = await this.findDesignationByText(text)

  if (existing) {
    console.log(`✅ Found existing designation id=${existing.id} for text="${text}"`)
    return {
      designation_id: existing.id,
      display_text: text  // Keep original text from CSV
    }
  }

  // 2. No match - create new designation
  console.log(`➕ Creating new designation for text="${text}"`)
  const newDesignation = await designationsService.createDesignation({
    name_de_short_m: text,  // Store in German short masculine by default
    name_de_short_f: null,
    name_de_long_m: null,
    name_de_long_f: null,
    name_fr_short_m: null,
    name_fr_short_f: null,
    name_fr_long_m: null,
    name_fr_long_f: null,
    name_it_short_m: null,
    name_it_short_f: null,
    name_it_long_m: null,
    name_it_long_f: null,
    parent_id: null,
    is_active: true
  })

  return {
    designation_id: newDesignation.id,
    display_text: text
  }
}
```

**3. `getDisplayText(designation: Designation): string`**

- Return first non-null field from priority order
- Priority: name_de_short_m → name_de_short_f → name_de_long_m → ... (all 12 fields)

**Implementation approach:**
```typescript
getDisplayText(designation: Designation): string {
  const fields = [
    designation.name_de_short_m,
    designation.name_de_short_f,
    designation.name_de_long_m,
    designation.name_de_long_f,
    designation.name_fr_short_m,
    designation.name_fr_short_f,
    designation.name_fr_long_m,
    designation.name_fr_long_f,
    designation.name_it_short_m,
    designation.name_it_short_f,
    designation.name_it_long_m,
    designation.name_it_long_f,
  ]

  for (const field of fields) {
    if (field) return field
  }

  return ''  // Fallback (shouldn't happen with valid data)
}
```

---

### Phase 3: Update CSV Import to Use Matching

**File:** `src/services/therapist-import.service.ts`

#### Changes:

**1. Add designation_id to ParsedTherapist interface:**
```typescript
interface ParsedTherapist {
  canton: string | null
  form_of_address: string
  first_name: string
  last_name: string
  designation: string
  designation_id: number          // ← ADD THIS
  short_designation: string | null
  institution: string | null
  description: string | null
}
```

**2. Modify parseTherapist() method:**
```typescript
async parseTherapist(row: any): Promise<ParsedTherapist> {
  // Add designation matching
  const designationMatch = await designationMatchingService.findOrCreateDesignation(
    row.designation?.trim() || ''
  )

  return {
    canton: row.canton?.trim() || null,
    form_of_address: row.form_of_address?.trim() || '',
    first_name: row.first_name?.trim() || '',
    last_name: row.last_name?.trim() || '',
    designation: designationMatch.display_text,     // Store matched text
    designation_id: designationMatch.designation_id, // Store FK
    short_designation: row.short_designation?.trim() || null,
    institution: row.institution?.trim() || null,
    description: row.description?.trim() || null
  }
}
```

**3. Update processTherapists() to be async:**
- Change method signature to `async processTherapists()`
- Use `await` when calling `parseTherapist()`

**File:** `src/services/therapists.service.ts`

#### Changes:

**Update `bulkImportTherapists()` to accept and store designation_id:**
```typescript
async bulkImportTherapists(therapists: ParsedTherapist[]): Promise<Therapist[]> {
  const { data, error } = await supabase
    .from('therapists')
    .insert(therapists.map(t => ({
      canton: t.canton,
      form_of_address: t.form_of_address,
      first_name: t.first_name,
      last_name: t.last_name,
      designation: t.designation,
      designation_id: t.designation_id,  // ← ADD THIS
      short_designation: t.short_designation,
      institution: t.institution,
      description: t.description
    })))
    .select()

  // ... error handling
}
```

---

### Phase 4: Fix Therapist Creation Modal

**File:** `src/components/therapist/TherapistCreateModal.tsx`

#### Bug Fixes:

**1. Lines 498 & 522 - Fix dropdown display:**

Current (broken):
```typescript
<option key={designation.id} value={designation.name_de}>
  {designation.name_de}
</option>
```

Fixed:
```typescript
<option key={designation.id} value={designation.id}>
  {designation.name_de_short_m || designation.name_de_short_f ||
   designation.name_de_long_m || designation.name_de_long_f ||
   'Unnamed Designation'}
</option>
```

**2. Form state - Store designation object, not just text:**

Current:
```typescript
const [formData, setFormData] = useState({
  // ...
  designation: '',
  short_designation: '',
})
```

Enhanced:
```typescript
const [formData, setFormData] = useState({
  // ...
  designation: '',
  designation_id: null as number | null,
  short_designation: '',
})
```

**3. Lines 219-235 - Update form submission:**

Current:
```typescript
resultTherapist = await therapistsService.updateTherapist(therapist.id, {
  // ...
  designation: formData.designation,
  // ...
})
```

Enhanced:
```typescript
// Find selected designation from dropdown
const selectedDesignation = designations.find(d => d.id === formData.designation_id)
const displayText = selectedDesignation
  ? designationMatchingService.getDisplayText(selectedDesignation)
  : formData.designation

resultTherapist = await therapistsService.updateTherapist(therapist.id, {
  // ...
  designation: displayText,
  designation_id: formData.designation_id,
  // ...
})
```

**4. Update dropdown onChange handler:**
```typescript
// When designation dropdown changes
onChange={(e) => {
  const designationId = parseInt(e.target.value)
  const selectedDesignation = designations.find(d => d.id === designationId)
  const displayText = selectedDesignation
    ? designationMatchingService.getDisplayText(selectedDesignation)
    : ''

  setFormData(prev => ({
    ...prev,
    designation: displayText,
    designation_id: designationId
  }))
}}
```

---

### Phase 5: Implement Auto-Sync on Designation Edit

**File:** `src/services/designations.service.ts`

#### New Method:

```typescript
/**
 * Update designation and sync all linked therapists
 * @param id - Designation ID
 * @param updates - Fields to update
 * @returns Updated designation and count of synced therapists
 */
async updateDesignationAndSyncTherapists(
  id: number,
  updates: Partial<Omit<Designation, 'id' | 'created_at'>>
): Promise<{ designation: Designation, therapistsSynced: number }> {
  console.log('🔧 DesignationsService: Updating designation and syncing therapists, ID:', id)

  // 1. Update designation record
  const { data: designation, error } = await supabase
    .from('designations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('❌ DesignationsService: Error updating designation:', error)
    throw error
  }

  // 2. Get display text from updated designation
  const displayText = this.getDisplayText(designation)

  // 3. Find all therapists using this designation
  const { data: therapists, error: fetchError } = await supabase
    .from('therapists')
    .select('id')
    .eq('designation_id', id)

  if (fetchError) {
    console.error('❌ DesignationsService: Error fetching therapists:', fetchError)
    throw fetchError
  }

  const therapistCount = therapists?.length || 0

  if (therapistCount > 0) {
    // 4. Bulk update therapist designation text
    const { error: updateError } = await supabase
      .from('therapists')
      .update({ designation: displayText })
      .eq('designation_id', id)

    if (updateError) {
      console.error('❌ DesignationsService: Error syncing therapists:', updateError)
      throw updateError
    }

    console.log(`✅ DesignationsService: Synced ${therapistCount} therapist records`)
  }

  return {
    designation,
    therapistsSynced: therapistCount
  }
}
```

#### Modify Existing Method:

Update `updateDesignation()` to use the new sync method:
```typescript
async updateDesignation(
  id: number,
  updates: Partial<Omit<Designation, 'id' | 'created_at'>>
): Promise<Designation> {
  // Use the new method that includes sync
  const result = await this.updateDesignationAndSyncTherapists(id, updates)
  return result.designation
}
```

**File:** `src/components/admin/DesignationRow.tsx`

- ✅ No changes needed (already calls `updateDesignation()` service method)

---

### Phase 6: Optional - Backfill Existing Therapists

**File:** `src/services/therapists.service.ts`

#### New Admin Utility Method (optional):

```typescript
/**
 * Backfill designation_id for existing therapists that have null designation_id
 * This is a one-time migration utility for existing data
 */
async backfillDesignationIds(): Promise<{
  updated: number,
  created: number,
  errors: number
}> {
  console.log('🔧 TherapistsService: Starting designation_id backfill...')

  // 1. Get all therapists with null designation_id
  const { data: therapists, error } = await supabase
    .from('therapists')
    .select('id, designation')
    .is('designation_id', null)

  if (error) {
    console.error('❌ Error fetching therapists for backfill:', error)
    throw error
  }

  let updated = 0
  let created = 0
  let errors = 0

  // 2. Process each therapist
  for (const therapist of therapists || []) {
    try {
      // Find or create designation
      const match = await designationMatchingService.findOrCreateDesignation(
        therapist.designation
      )

      if (match.designation_id) {
        // Update therapist with designation_id
        const { error: updateError } = await supabase
          .from('therapists')
          .update({ designation_id: match.designation_id })
          .eq('id', therapist.id)

        if (updateError) {
          console.error(`❌ Error updating therapist ${therapist.id}:`, updateError)
          errors++
        } else {
          updated++
          console.log(`✅ Updated therapist ${therapist.id} with designation_id ${match.designation_id}`)
        }
      }
    } catch (err) {
      console.error(`❌ Error processing therapist ${therapist.id}:`, err)
      errors++
    }
  }

  console.log(`✅ Backfill complete: ${updated} updated, ${created} created, ${errors} errors`)

  return { updated, created, errors }
}
```

**Usage:** Call this method once from admin interface or console to backfill existing data.

---

## Files Summary

### Files to Create:
1. `src/services/designation-matching.service.ts` (NEW)

### Files to Modify:
1. `src/services/therapist-import.service.ts` - Add designation matching to CSV import
2. `src/services/therapists.service.ts` - Support designation_id in bulk import, add backfill utility
3. `src/services/designations.service.ts` - Add auto-sync on edit
4. `src/components/therapist/TherapistCreateModal.tsx` - Fix dropdown display & save designation_id

### Database Schema:
- ✅ No migrations needed - schema already supports this!

---

## Testing Checklist After Implementation

### CSV Import Tests:
1. ✅ Import CSV with German designation (e.g., "Psychologe") - should match existing
2. ✅ Import CSV with French designation (e.g., "Psychologue") - should match existing
3. ✅ Import CSV with Italian designation (e.g., "Psicologo") - should match existing
4. ✅ Import CSV with typo (e.g., "Psycholog") - should fuzzy match to "Psychologe"
5. ✅ Import CSV with completely new designation - should create new designation entry
6. ✅ Import CSV with mixed languages - all should work correctly
7. ✅ Verify designation_id is saved for all imported therapists

### Manual Creation Tests:
8. ✅ Create therapist manually - dropdown shows correct designations
9. ✅ Save therapist - both designation text AND designation_id are saved
10. ✅ Edit existing therapist - designation_id is preserved

### Auto-Sync Tests:
11. ✅ Edit designation in admin panel - designation record updates
12. ✅ Verify all linked therapists' designation text updated automatically
13. ✅ Console shows "Synced X therapist records"

### Display Tests:
14. ✅ Therapist list shows correct designation text
15. ✅ Therapist profile shows correct designation
16. ✅ Post therapist line shows correct designation
17. ✅ Multiple languages display correctly (German, French, Italian)

### Edge Cases:
18. ✅ Therapist with no designation_id (legacy data) still displays correctly
19. ✅ Inactive designations don't appear in dropdown
20. ✅ Deleting designation doesn't break therapist display (text field still works)

---

## Benefits of This Implementation

### 1. **Automatic CSV Import**
- ✅ No manual linking required
- ✅ Handles multilingual CSVs automatically
- ✅ Creates designations on-the-fly when needed
- ✅ Tolerates typos with fuzzy matching

### 2. **Central Management**
- ✅ Edit designation once, updates everywhere
- ✅ Manage all 12 language variants in one place
- ✅ Admin can add/edit/delete designations independently

### 3. **Performance**
- ✅ Fast display (uses cached text field, no JOINs needed)
- ✅ Bulk sync (updates multiple therapists at once)

### 4. **Flexibility**
- ✅ Supports multiple languages seamlessly
- ✅ Backward compatible (text field still works)
- ✅ Future-proof (can enhance with more features)

### 5. **Data Integrity**
- ✅ Structured data (FK relationship)
- ✅ Keeps historical text (original language preserved)
- ✅ Auto-sync ensures consistency

---

## Key Implementation Notes

### Fuzzy Matching Examples:
```
"Psychologue" → Exact match → designation with name_fr_short_m="Psychologue"
"Psycholog" → Fuzzy match (typo) → designation with name_de_short_m="Psychologe"
"Psych" → No match (too different) → Creates new designation
"Sozialarbeiter" → No match → Creates new designation
```

### Auto-Sync Example:
```
1. Admin edits designation id=5: "Psychologe" → "Psychologe FSP"
2. System finds 23 therapists with designation_id=5
3. System updates all 23: designation field = "Psychologe FSP"
4. Console: "✅ Synced 23 therapist records"
```

### Display Text Priority:
```
1. name_de_short_m (first choice - most common)
2. name_de_short_f
3. name_de_long_m
4. name_de_long_f
5. name_fr_short_m
6. name_fr_short_f
7. name_fr_long_m
8. name_fr_long_f
9. name_it_short_m
10. name_it_short_f
11. name_it_long_m
12. name_it_long_f
→ Return first non-null value found
```

### Multilingual Linking:
```javascript
// Same designation, different languages = same designation_id

Designation id=5:
{
  name_de_short_m: "Psychologe",
  name_de_short_f: "Psychologin",
  name_fr_short_m: "Psychologue",
  name_it_short_m: "Psicologo"
}

Therapist A: designation="Psychologe",   designation_id=5  (German)
Therapist B: designation="Psychologue",  designation_id=5  (French)
Therapist C: designation="Psicologo",    designation_id=5  (Italian)

→ All three link to same designation!
→ Edit designation once, all three update!
```

---

## Migration Path for Existing Data

### Current State:
- Existing therapists have `designation` (text) but `designation_id = null`

### Migration Options:

**Option 1: Immediate Backfill (Recommended)**
- Run `backfillDesignationIds()` once after implementation
- Links all existing therapists to designations automatically
- Takes ~5 seconds for 1000 therapists

**Option 2: Gradual Migration**
- Leave existing therapists as-is
- Only new/edited therapists get designation_id
- Eventually all will be migrated through natural usage

**Option 3: No Migration**
- Leave existing therapists with null designation_id
- System works fine (text field is always available)
- Can migrate later if needed

**Recommendation:** Use Option 1 for clean data from day one.

---

## Future Enhancements (Not in Current Plan)

### Possible Future Features:
1. **Language detection from canton** - Auto-detect therapist language based on canton
2. **Designation categories** - Group related designations (e.g., all psychologist types)
3. **Designation hierarchy** - Use parent_id for specialty relationships
4. **Search by designation** - Filter therapists by designation type
5. **Designation statistics** - Show how many therapists use each designation
6. **Merge designations** - Admin tool to combine duplicate designations
7. **Multilingual profiles** - Display therapist in user's language preference

---

## Conclusion

This implementation provides:
- ✅ **Simple CSV import** with automatic designation matching
- ✅ **Central designation management** with auto-sync
- ✅ **Fast performance** using cached text fields
- ✅ **Multilingual support** across German, French, Italian
- ✅ **No database migrations** required
- ✅ **Backward compatible** with existing code

The two-field strategy (text + FK) gives you the best of both worlds: simple display and powerful management.

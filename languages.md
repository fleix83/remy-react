# Internationalization (i18n) Implementation Plan

## Current State Analysis

### Existing Infrastructure
- ✅ **i18next libraries installed** (i18next, react-i18next, i18next-browser-languagedetector)
- ✅ **Database ready** with `language_preference` field in users table
- ✅ **Multi-language schema** for categories and designations (name_de, name_fr, name_it)
- ✅ **~95 hardcoded German strings** across 26 components identified

### Languages Required
- 🇩🇪 German (DE) - Primary/default
- 🇫🇷 French (FR)
- 🇮🇹 Italian (IT)

---

## Recommended Solution: Option 1 - Standard i18next with JSON Files

### Architecture
```
/public/locales/
  ├── de/
  │   └── translation.json
  ├── fr/
  │   └── translation.json
  └── it/
      └── translation.json

/src/
  ├── i18n.ts (configuration)
  └── components/
      └── admin/
          └── TranslationManager.tsx (admin UI)
```

### Why This Approach?

#### ✅ **Advantages**
1. **Minimal code changes** - just wrap strings with `t('key')`
2. **Industry standard** - i18next is battle-tested with 10M+ downloads/month
3. **Zero additional dependencies** - already installed
4. **Fast implementation** - 2-3 days of work
5. **Offline-first** - no database queries for every string
6. **Version control** - translations tracked in git
7. **Type safety** - can generate TypeScript types from JSON
8. **Developer experience** - clear structure, good tooling

#### ⚠️ **Trade-offs**
1. Requires app rebuild to deploy translation changes
2. Admin UI needs API endpoint to write JSON files (or manual git workflow)

---

## Alternative: Option 2 - Database-Driven Translations

### Architecture
```sql
CREATE TABLE translations (
  key TEXT PRIMARY KEY,
  de TEXT NOT NULL,
  fr TEXT NOT NULL,
  it TEXT NOT NULL,
  category TEXT,
  updated_at TIMESTAMP,
  updated_by UUID REFERENCES users(id)
);
```

### Why Consider This?

#### ✅ **Advantages**
1. **Real-time updates** - change translations without app rebuild
2. **Better admin UX** - direct editing with instant preview
3. **Centralized** - everything in Supabase
4. **Searchable** - easy to find/filter translations
5. **Audit trail** - track changes with updated_by/updated_at
6. **Dynamic** - add new keys without code deployment

#### ⚠️ **Trade-offs**
1. More upfront development (3-4 days)
2. Additional database queries (mitigated with caching)
3. Custom implementation (less community support)

---

## Implementation Plan (Option 1 - Recommended)

### Phase 1: i18next Configuration (2 hours)

**File: `/src/i18n.ts`**
```typescript
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: require('../public/locales/de/translation.json') },
      fr: { translation: require('../public/locales/fr/translation.json') },
      it: { translation: require('../public/locales/it/translation.json') }
    },
    fallbackLng: 'de',
    supportedLngs: ['de', 'fr', 'it'],
    interpolation: { escapeValue: false }
  })
```

**Update: `/src/main.tsx`**
```typescript
import './i18n'
```

### Phase 2: Translation Files Structure (4 hours)

**Categories (~150-200 keys total):**
```json
{
  "navigation": {
    "forum": "Forum",
    "therapists": "Therapeuten",
    "messages": "Nachrichten",
    "moderation": "Moderation",
    "admin": "Admin",
    "profile": "Profil",
    "logout": "Abmelden",
    "login": "Anmelden",
    "register": "Registrieren"
  },
  "post": {
    "create": "Beitrag erstellen",
    "edit": "Beitrag bearbeiten",
    "delete": "Löschen",
    "save": "Speichern",
    "cancel": "Abbrechen",
    "title": "Titel",
    "content": "Inhalt",
    "category": "Kategorie",
    "canton": "Kanton"
  },
  "comment": {
    "add": "Kommentar hinzufügen",
    "edit": "Bearbeiten",
    "delete": "Löschen",
    "reply": "Antworten",
    "quote": "Zitieren"
  },
  "auth": {
    "email": "E-Mail",
    "password": "Passwort",
    "username": "Benutzername",
    "login": "Anmelden",
    "register": "Registrieren",
    "logout": "Abmelden",
    "forgotPassword": "Passwort vergessen?"
  },
  "therapist": {
    "directory": "Therapeutenverzeichnis",
    "search": "Therapeut suchen",
    "formOfAddress": "Anrede",
    "firstName": "Vorname",
    "lastName": "Nachname",
    "designation": "Bezeichnung",
    "canton": "Kanton"
  },
  "errors": {
    "generic": "Ein Fehler ist aufgetreten",
    "notFound": "Nicht gefunden",
    "unauthorized": "Nicht autorisiert",
    "serverError": "Serverfehler"
  }
}
```

### Phase 3: Component Updates (8 hours)

**Before:**
```tsx
<span>Beitrag erstellen</span>
```

**After:**
```tsx
import { useTranslation } from 'react-i18next'

const Component = () => {
  const { t } = useTranslation()
  return <span>{t('post.create')}</span>
}
```

**Components to update (26 files):**
- Navigation.tsx
- PostCard.tsx
- PostEditor.tsx
- CommentForm.tsx
- TherapistSelector.tsx
- ProfileSettings.tsx
- AdminDashboard.tsx
- ModerationQueue.tsx
- (and 18 more...)

### Phase 4: User Language Preference (3 hours)

**Hook: `/src/hooks/useUserLanguage.ts`**
```typescript
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/auth.store'

export const useUserLanguage = () => {
  const { i18n } = useTranslation()
  const { userProfile } = useAuthStore()

  useEffect(() => {
    if (userProfile?.language_preference) {
      i18n.changeLanguage(userProfile.language_preference)
    }
  }, [userProfile, i18n])
}
```

**Language Selector Component:**
```tsx
const LanguageSelector = () => {
  const { i18n } = useTranslation()
  const { updateProfile } = useAuthStore()

  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang)
    await updateProfile({ language_preference: lang })
  }

  return (
    <select onChange={(e) => changeLanguage(e.target.value)} value={i18n.language}>
      <option value="de">🇩🇪 Deutsch</option>
      <option value="fr">🇫🇷 Français</option>
      <option value="it">🇮🇹 Italiano</option>
    </select>
  )
}
```

### Phase 5: Admin Translation Interface (6 hours)

**Component: `/src/components/admin/TranslationManager.tsx`**

Features:
- ✅ Display all translation keys in table format
- ✅ Edit DE/FR/IT values inline
- ✅ Search and filter keys
- ✅ Export/import JSON files
- ✅ Validate missing translations
- ✅ Preview changes before save

Two implementation options:

**5A: File-based (Simple)**
- Admin edits JSON in browser
- Download button to save locally
- Manual git commit/deploy

**5B: API-based (Advanced)**
- Create Node.js API endpoint to write JSON files
- Instant save with automatic git commit
- Requires server-side file system access

### Phase 6: Initial Translations (4 hours)

**Workflow:**
1. Extract all German strings to DE translation file
2. Use AI to translate DE → FR, DE → IT
3. Manual review by native speakers
4. Testing across all pages

---

## Hybrid Approach (Best of Both Worlds)

### Architecture
1. **Runtime**: Use i18next with JSON files (fast, offline)
2. **Admin UI**: Store translations in Supabase (easy editing)
3. **Sync**: Export button in admin UI writes to JSON files

### Benefits
- ⚡ Fast runtime performance (no DB queries)
- 🎨 Easy admin interface (database CRUD)
- 🔄 Version control (JSON files in git)
- 📦 Deploy flexibility (update via admin or git)

### Implementation
```sql
-- Admin-only table for translation management
CREATE TABLE translation_admin (
  key TEXT PRIMARY KEY,
  de TEXT NOT NULL,
  fr TEXT NOT NULL,
  it TEXT NOT NULL,
  category TEXT,
  notes TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- RLS: Only admins can access
CREATE POLICY "Admins only" ON translation_admin
  FOR ALL TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  ));
```

---

## Timeline & Effort Estimate

### Option 1 (Standard i18next): **2-3 days**
- ✅ Day 1: Configuration + JSON structure + 50% components
- ✅ Day 2: Remaining components + user preference integration
- ✅ Day 3: Admin UI + initial translations + testing

### Option 2 (Database-driven): **3-4 days**
- Day 1: Database schema + Zustand store + custom hook
- Day 2: Component updates
- Day 3: Admin CRUD interface
- Day 4: User preference + translations + testing

### Hybrid Approach: **3 days**
- Day 1: i18next setup + JSON files + components
- Day 2: Database admin table + sync logic
- Day 3: Admin UI + translations + testing

---

## Recommendation: **Start with Option 1, Add Hybrid Features Later**

### Immediate (Week 1)
1. Implement standard i18next with JSON files
2. Update all components to use `t()` hook
3. Add language selector to user profile
4. Create basic admin UI for JSON editing (in-browser)

### Future Enhancement (Week 2+)
1. Add `translation_admin` table to Supabase
2. Build full-featured translation manager with:
   - Inline editing
   - Search/filter
   - Missing translation detection
   - Export to JSON for deployment

### Why This Approach?
- ✅ Get i18n working quickly (2-3 days)
- ✅ Improve admin experience later without breaking anything
- ✅ Flexible: can pivot to full database approach if needed
- ✅ Low risk: i18next is proven, reliable technology

---

## Key Files to Create/Modify

### New Files
- [ ] `/src/i18n.ts` - i18next configuration
- [ ] `/public/locales/de/translation.json` - German translations
- [ ] `/public/locales/fr/translation.json` - French translations
- [ ] `/public/locales/it/translation.json` - Italian translations
- [ ] `/src/hooks/useUserLanguage.ts` - Language preference hook
- [ ] `/src/components/admin/TranslationManager.tsx` - Admin UI
- [ ] `/src/components/ui/LanguageSelector.tsx` - Language picker

### Modified Files (26 components)
- Navigation.tsx
- PostCard.tsx
- PostEditor.tsx
- CommentForm.tsx
- TherapistSelector.tsx
- ProfileSettings.tsx
- (+ 20 more components with hardcoded text)

---

## Success Criteria

### Functional
- ✅ All UI text translatable to DE/FR/IT
- ✅ User can select language in profile
- ✅ Language persists across sessions
- ✅ Admin can edit translations easily
- ✅ No hardcoded German strings remain

### Technical
- ✅ No performance degradation
- ✅ TypeScript types for translation keys
- ✅ Fallback to German if translation missing
- ✅ All 3 languages have 100% coverage

### User Experience
- ✅ Instant language switching (no reload)
- ✅ Consistent terminology across app
- ✅ Professional translations (not machine-translated)

---

## Next Steps

1. **Decision**: Approve Option 1 (Standard i18next)
2. **Kickoff**: Begin Phase 1 (i18next configuration)
3. **Translation**: Identify volunteer translators or translation service
4. **Testing**: QA with native FR/IT speakers
5. **Launch**: Deploy with all 3 languages ready

---

**Status**: Ready for implementation
**Recommendation**: Option 1 (Standard i18next)
**Estimated Effort**: 2-3 days development + translation time
**Priority**: High (required for Swiss market - DE/FR/IT)

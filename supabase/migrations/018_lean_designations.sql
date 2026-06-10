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

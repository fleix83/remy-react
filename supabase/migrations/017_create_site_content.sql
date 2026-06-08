-- 017_create_site_content.sql
-- Named CMS content documents (e.g. 'landing', 'footer') editable from the admin panel.
-- Each row is one document whose `value` JSONB holds a structured content object.
-- Code defaults remain the canonical fallback; a row only stores admin overrides.

CREATE TABLE IF NOT EXISTS public.site_content (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_content TO authenticated;

-- Public read: landing/footer content is shown to anonymous visitors.
DROP POLICY IF EXISTS "Anyone can read site content" ON public.site_content;
CREATE POLICY "Anyone can read site content" ON public.site_content
  FOR SELECT
  USING (true);

-- Only admins may create content documents.
DROP POLICY IF EXISTS "Admins can insert site content" ON public.site_content;
CREATE POLICY "Admins can insert site content" ON public.site_content
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins may update content documents.
DROP POLICY IF EXISTS "Admins can update site content" ON public.site_content;
CREATE POLICY "Admins can update site content" ON public.site_content
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

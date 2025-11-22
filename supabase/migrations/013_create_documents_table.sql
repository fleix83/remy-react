-- Create documents table for storing static content like community guidelines
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  lead_text TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN DEFAULT false,
  locale TEXT DEFAULT 'de',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_slug ON documents(slug);

-- Create index on published status
CREATE INDEX IF NOT EXISTS idx_documents_published ON documents(published);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read published documents
CREATE POLICY "Anyone can read published documents" ON documents
  FOR SELECT
  USING (published = true);

-- Policy: Only admins can insert documents
CREATE POLICY "Only admins can insert documents" ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can update documents
CREATE POLICY "Only admins can update documents" ON documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can delete documents
CREATE POLICY "Only admins can delete documents" ON documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at_trigger
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- Insert Community Guidelines document
INSERT INTO documents (slug, title, lead_text, sections, published) VALUES (
  'community-guidelines',
  'Community Guidelines',
  'Danke dass Du Dir dafür Zeit nimmst. Psychotherapie ist ein äusserst sensibles Thema, dementsprechend braucht es für das Funktionieren von Remy ein paar zentrale Spielregeln. Hier die wichtigsten Punkte:',
  '[{"number": 1, "title": "Persönliche Informationen über Therapeutinnen sind tabu", "content": "Was Therapeut:innen in der Therapie über ihr Privatleben erzählen, darf hier nicht veröffentlicht werden. 1) Aus rechtlichen Gründen (Persönlichkeitsschutz ZGB Art.28 und Datenschutzgesetz DSG) 2) Wir halten die Offenheit von Therapeut:innen gegenüber ihren Patienten für sehr wertvoll und möchten diese schützen.", "examples": [{"type": "negative", "text": "„Herr Siegmund Freud hat mir erzählt, dass er selbst Antidepressiva nimmt.""}, {"type": "negative", "text": "„Frau Serata hatte vor vier Jahren eine Operation wegen Brustkrebs.""}]}, {"number": 2, "title": "Kritik ist erlaubt – aber respektvoll", "content": "Bitte kritisiere konstruktiv und wertschätzend. Respektiere den Menschen hinter dem Therapeuten und dem User. Beschimpfungen, Beleidigungen, Sexismus, Gewaltandrohungen, das absichtliche Posten falscher Tatsachen führt zur Sperrung. Genauso wichtig wie Kritik, sind auf Remy Lob und positive Rückmeldungen!", "examples": []}, {"number": 3, "title": "Namen von Therapeut:innen sind erwünscht", "content": "Therapeut:innen sollen in der Kategorie Erfahrung namentlich genannt werden. Das ist erwünscht und rechtlich abgeklärt. Das Konzept von Remy ist, Erfahrungen von Patient:innen mit Therapeut:innen zu sammeln und damit über die Zeit die Psychotherapie-Landschaft für Patient:innen transparenter zu machen. Dazu mehr im Remy|Forum Konzept.", "examples": []}, {"number": 4, "title": "User sind anonym", "content": "Du schreibst anonym unter Pseudonym/Nickname), deine Identität als Patient:in ist geschützt. Wir speichern nur: Username, E-Mail, IP-Adresse (temporär) und deine öffentlichen Profilinformationen. Wir geben diese Daten nicht an Dritte weiter und werten sie auch selber nicht aus. Du kannst alle Daten jederzeit selbst löschen. Wir empfehlen eine anonyme E-Mail-Adresse zu verwenden, also eine Adresse die nicht deinen Namen beinhaltet.", "examples": []}, {"number": 5, "title": "Schreibe aus der Ich-Perspektive", "content": "Gerade in der Psychotherapie ist Wahrnehmung extrem subjektiv. Die grösste Herausforderung auf Remy ist: Wie kann ich meine subjektive Erfahrung nützlich für andere beschreiben? Dafür eine einfache Empfehlung: Schreibe immer aus der Ich-Perspektive. Die letzen beiden Beispiele sind hilfreich für andere. Vermeide auch Pauschalisierenden und Verallgemeinerungen und Bewertungen.", "examples": [{"type": "negative", "text": "\"Er ist einfach inkompetent!\""}, {"type": "negative", "text": "\"Sie ist super\""}, {"type": "positive", "text": "„Er redet immer und hört mir gar nicht zu\""}, {"type": "positive", "text": "\"Sie hört mir sehr gut zu und ich habe das Gefühl, sie versteht wirklich was ich erzähle.\""}, {"type": "negative", "text": "„Er ist halt typisch Psychologe!\""}, {"type": "negative", "text": "„Frau Meier ist irgendwie doof.\""}, {"type": "positive", "text": "„Ich fühle mich durch seine persönlichen Fragen ausgehorcht!\""}, {"type": "positive", "text": "„Frau Meier macht oft Witze, die für mich unpassend sind und sie merkt es nicht.""}]}]'::jsonb,
  true
);

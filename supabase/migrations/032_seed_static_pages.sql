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

-- Migrate some key posts from PHP application to Supabase
-- We need to map the old integer user_ids to new UUIDs

-- Create a temporary mapping table for user IDs
CREATE TEMP TABLE user_id_mapping AS
SELECT 
  3 as old_id, u.id as new_id, 'Klaus & Klaus' as username FROM public.users u WHERE email = 'fleix@gmx.ch'
UNION ALL
SELECT 
  4 as old_id, u.id as new_id, 'Flux' as username FROM public.users u WHERE email = 'flux@gmx.ch'
UNION ALL
SELECT 
  6 as old_id, u.id as new_id, 'Admina' as username FROM public.users u WHERE email = 'admina@admin.ch'
UNION ALL
SELECT 
  58 as old_id, u.id as new_id, 'Lina' as username FROM public.users u WHERE email = 'asdfa@asfa.com';

-- Insert a few sample posts
INSERT INTO posts (user_id, category_id, title, content, canton, designation, is_published, is_active, created_at, updated_at) 
SELECT 
  m.new_id,
  1, -- Erfahrung category
  'Meine erste Therapieerfahrung',
  'Ich möchte meine Erfahrungen mit der Psychotherapie teilen. Nach langem Zögern habe ich endlich den Mut gefasst und einen Termin vereinbart...',
  'ZH',
  'Psychotherapeut',
  true,
  true,
  '2024-08-15 10:00:00',
  '2024-08-15 10:00:00'
FROM user_id_mapping m WHERE m.username = 'Klaus & Klaus';

INSERT INTO posts (user_id, category_id, title, content, canton, designation, is_published, is_active, created_at, updated_at) 
SELECT 
  m.new_id,
  2, -- Suche TherapeutIn category
  'Suche Therapeutin im Raum Basel',
  'Hallo zusammen, ich suche eine einfühlsame Therapeutin im Raum Basel. Hat jemand Empfehlungen? Besonders wichtig ist mir eine Person, die Erfahrung mit Angststörungen hat.',
  'BS',
  'Psychotherapeut',
  true,
  true,
  '2024-08-14 15:30:00',
  '2024-08-14 15:30:00'
FROM user_id_mapping m WHERE m.username = 'Flux';

INSERT INTO posts (user_id, category_id, title, content, canton, designation, is_published, is_active, created_at, updated_at) 
SELECT 
  m.new_id,
  3, -- Gedanken category
  'Gedanken zum Therapieprozess',
  'Manchmal denke ich darüber nach, wie sehr sich mein Leben durch die Therapie verändert hat. Es ist ein langer Weg, aber die kleinen Fortschritte machen Mut...',
  'GE',
  'Psychologe',
  true,
  true,
  '2024-08-13 09:15:00',
  '2024-08-13 09:15:00'
FROM user_id_mapping m WHERE m.username = 'Admina';

INSERT INTO posts (user_id, category_id, title, content, canton, designation, is_published, is_active, created_at, updated_at) 
SELECT 
  m.new_id,
  5, -- Ressourcen category
  'Hilfreiche Apps für den Alltag',
  'Ich habe einige Apps entdeckt, die mir zwischen den Therapiesitzungen helfen. Besonders "Mindfulness" und "Mood Tracker" kann ich empfehlen...',
  'BE',
  'Coach',
  true,
  true,
  '2024-08-12 14:45:00',
  '2024-08-12 14:45:00'
FROM user_id_mapping m WHERE m.username = 'Lina';

-- Drop the temporary table
DROP TABLE user_id_mapping;
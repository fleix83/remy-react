-- Migration 022: per-category badge color, editable from the admin panel
-- Replaces the colors hardcoded as CSS variables in src/index.css
-- (--bg-erfahrung etc.). The frontend falls back to those defaults while
-- color is NULL, so this migration is safe to apply before or after deploy.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS color VARCHAR(7);

UPDATE categories SET color = '#ffeb99' WHERE id = 1 AND color IS NULL; -- Erfahrung
UPDATE categories SET color = '#FFC8C8' WHERE id = 2 AND color IS NULL; -- Suche
UPDATE categories SET color = '#C5D0FF' WHERE id = 3 AND color IS NULL; -- Austausch
UPDATE categories SET color = '#edd3ff' WHERE id = 4 AND color IS NULL; -- Rant
UPDATE categories SET color = '#98FFC7' WHERE id = 5 AND color IS NULL; -- Ressourcen

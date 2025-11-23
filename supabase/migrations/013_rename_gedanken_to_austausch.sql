-- Migration: Rename category "Gedanken" to "Austausch"
-- This updates the category name across all language variants

UPDATE categories
SET
  name_de = 'Austausch',
  name_fr = 'Échange',
  name_it = 'Scambio'
WHERE name_de = 'Gedanken';

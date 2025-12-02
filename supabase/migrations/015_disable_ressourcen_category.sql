-- Migration: Disable Ressourcen category
-- Removes the "Ressourcen" (Resources) category from the forum
-- The category is marked as inactive rather than deleted to preserve data integrity
-- Created: 2025-12-02

-- Disable the Ressourcen category (id = 5)
UPDATE public.categories
SET is_active = false
WHERE id = 5;

-- Note: This change automatically removes the category from all UI dropdowns
-- and filters since the app uses the is_active flag to determine which
-- categories to display. No code changes are required.

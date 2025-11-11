-- Add designation variant support (gender, form, parent relationships)
-- This allows multiple variants of the same designation:
-- - Gender: masculine, feminine, neutral
-- - Form: long, short
-- - Language: already supported via name_de/fr/it

-- Add gender column
ALTER TABLE designations
ADD COLUMN gender VARCHAR(10) DEFAULT 'neutral';

-- Add form column (long/short)
ALTER TABLE designations
ADD COLUMN form VARCHAR(10) DEFAULT 'long';

-- Add parent_id for grouping variants
-- Base designation has parent_id = NULL
-- Variants reference the base designation
ALTER TABLE designations
ADD COLUMN parent_id INTEGER REFERENCES designations(id) ON DELETE CASCADE;

-- Add comments to document the columns
COMMENT ON COLUMN designations.gender IS 'Gender variant: masculine, feminine, or neutral';
COMMENT ON COLUMN designations.form IS 'Form variant: long or short';
COMMENT ON COLUMN designations.parent_id IS 'Reference to parent designation for grouping variants (NULL for base designation)';

-- Create index for parent_id lookups (to find all variants of a designation)
CREATE INDEX idx_designations_parent_id ON designations(parent_id);

-- Create index for active designations queries
CREATE INDEX idx_designations_is_active ON designations(is_active);

-- Create composite index for common queries
CREATE INDEX idx_designations_active_parent ON designations(is_active, parent_id);

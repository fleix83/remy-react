-- Restructure designations table to support 4 variants per language
-- Each designation now has: short masculine, short feminine, long masculine, long feminine
-- for each of 3 languages (DE/FR/IT) = 12 name columns total

-- Step 1: Add new columns for all variants
ALTER TABLE designations
ADD COLUMN name_de_short_m VARCHAR(255),
ADD COLUMN name_de_short_f VARCHAR(255),
ADD COLUMN name_de_long_m VARCHAR(255),
ADD COLUMN name_de_long_f VARCHAR(255),
ADD COLUMN name_fr_short_m VARCHAR(255),
ADD COLUMN name_fr_short_f VARCHAR(255),
ADD COLUMN name_fr_long_m VARCHAR(255),
ADD COLUMN name_fr_long_f VARCHAR(255),
ADD COLUMN name_it_short_m VARCHAR(255),
ADD COLUMN name_it_short_f VARCHAR(255),
ADD COLUMN name_it_long_m VARCHAR(255),
ADD COLUMN name_it_long_f VARCHAR(255),
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Migrate existing data based on gender and form columns
-- Default to short form, assign to masculine or feminine based on gender

-- Migrate German names
UPDATE designations
SET name_de_short_m = name_de
WHERE gender = 'masculine' OR gender = 'neutral';

UPDATE designations
SET name_de_short_f = name_de
WHERE gender = 'feminine';

-- Migrate French names
UPDATE designations
SET name_fr_short_m = name_fr
WHERE (gender = 'masculine' OR gender = 'neutral') AND name_fr IS NOT NULL;

UPDATE designations
SET name_fr_short_f = name_fr
WHERE gender = 'feminine' AND name_fr IS NOT NULL;

-- Migrate Italian names
UPDATE designations
SET name_it_short_m = name_it
WHERE (gender = 'masculine' OR gender = 'neutral') AND name_it IS NOT NULL;

UPDATE designations
SET name_it_short_f = name_it
WHERE gender = 'feminine' AND name_it IS NOT NULL;

-- Step 3: Drop old columns that are now obsolete
ALTER TABLE designations
DROP COLUMN IF EXISTS name_de,
DROP COLUMN IF EXISTS name_fr,
DROP COLUMN IF EXISTS name_it,
DROP COLUMN IF EXISTS gender,
DROP COLUMN IF EXISTS form;

-- Step 4: Add comments to document the new structure
COMMENT ON COLUMN designations.name_de_short_m IS 'German short form, masculine';
COMMENT ON COLUMN designations.name_de_short_f IS 'German short form, feminine';
COMMENT ON COLUMN designations.name_de_long_m IS 'German long form, masculine';
COMMENT ON COLUMN designations.name_de_long_f IS 'German long form, feminine';
COMMENT ON COLUMN designations.name_fr_short_m IS 'French short form, masculine';
COMMENT ON COLUMN designations.name_fr_short_f IS 'French short form, feminine';
COMMENT ON COLUMN designations.name_fr_long_m IS 'French long form, masculine';
COMMENT ON COLUMN designations.name_fr_long_f IS 'French long form, feminine';
COMMENT ON COLUMN designations.name_it_short_m IS 'Italian short form, masculine';
COMMENT ON COLUMN designations.name_it_short_f IS 'Italian short form, feminine';
COMMENT ON COLUMN designations.name_it_long_m IS 'Italian long form, masculine';
COMMENT ON COLUMN designations.name_it_long_f IS 'Italian long form, feminine';

-- Step 5: Update indexes (remove old ones, keep useful ones)
-- The existing indexes on is_active and parent_id are still useful, keep them

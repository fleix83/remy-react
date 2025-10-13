-- Increase form_of_address field length to accommodate longer titles
-- like "Prof. Dr. med." (15 characters)
-- Previous limit was VARCHAR(10), now increasing to VARCHAR(50)

ALTER TABLE therapists
ALTER COLUMN form_of_address TYPE VARCHAR(50);

-- Comment to document the change
COMMENT ON COLUMN therapists.form_of_address IS 'Form of address (e.g., Frau, Herr, Dr., Prof. Dr. med.) - max 50 characters';

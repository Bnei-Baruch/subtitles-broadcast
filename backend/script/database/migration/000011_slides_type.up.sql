-- 1. Add a new type column to store slide type (subtitle or question)
ALTER TABLE slides ADD COLUMN slide_type VARCHAR(20);
UPDATE slides SET slide_type = 'subtitle';

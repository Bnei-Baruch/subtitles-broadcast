-- 1. Add a new column to store the array of languages
ALTER TABLE files ADD COLUMN languages VARCHAR(2)[];

-- 2. Populate the new column with the updated data
UPDATE files SET languages = ARRAY[language];

-- 3. Drop the old language column
ALTER TABLE files DROP COLUMN language;
-- 1. Add the language column back as VARCHAR(2)
ALTER TABLE files ADD COLUMN language VARCHAR(2);

-- 2. Populate the language column with the values from the languages array
UPDATE files SET language = (SELECT languages[1] FROM files);

-- 3. Drop the languages column
ALTER TABLE files DROP COLUMN languages;
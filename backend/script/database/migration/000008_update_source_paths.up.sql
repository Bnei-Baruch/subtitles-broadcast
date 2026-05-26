ALTER TABLE source_paths DROP CONSTRAINT source_paths_language_source_uid_key;
-- 1. Add a new column to store the array of languages
ALTER TABLE source_paths ADD COLUMN languages VARCHAR(2)[];

-- 2. Populate the new column with the updated data
UPDATE source_paths SET languages = ARRAY[language];

-- 3. Drop the old language column
ALTER TABLE source_paths DROP COLUMN language;

ALTER TABLE source_paths ADD CONSTRAINT unique_languages_source_uid UNIQUE (languages, source_uid);
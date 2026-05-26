ALTER TABLE source_paths DROP CONSTRAINT unique_languages_source_uid;
-- 1. Add the language column back as VARCHAR(2)
ALTER TABLE source_paths ADD COLUMN language VARCHAR(2);

-- 2. Populate the language column with the values from the languages array
UPDATE source_paths SET language = (SELECT languages[1] FROM files);

-- 3. Drop the languages column
ALTER TABLE source_paths DROP COLUMN languages;

ALTER TABLE source_paths ADD CONSTRAINT source_paths_language_source_uid_key UNIQUE (language, source_uid);
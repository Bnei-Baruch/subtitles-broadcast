-- bookmark_presets
DROP INDEX IF EXISTS idx_bookmark_presets_type;
DROP TABLE IF EXISTS bookmark_presets;

-- bookmarks: restore previous unique constraint, drop preset and type columns
DROP INDEX IF EXISTS bookmarks_karaoke_unique;
DROP INDEX IF EXISTS bookmarks_subtitles_unique;
ALTER TABLE bookmarks ADD CONSTRAINT bookmarks_file_uid_language_channel UNIQUE (file_uid, language, channel);
ALTER TABLE bookmarks DROP COLUMN type;
ALTER TABLE bookmarks DROP COLUMN preset;

-- files: restore column name
ALTER TABLE files RENAME COLUMN upload_type TO type;

-- source_paths: drop added columns
DROP INDEX IF EXISTS idx_source_paths_source_type;
ALTER TABLE source_paths DROP COLUMN source_group;
ALTER TABLE source_paths DROP COLUMN source_type;

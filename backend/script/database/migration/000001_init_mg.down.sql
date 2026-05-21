DELETE FROM source_paths
WHERE source_uid IN (SELECT file_uid FROM files WHERE type = 'karaoke')
  AND source_type = 'general';

DROP INDEX IF EXISTS idx_bookmark_events_type;
DROP TABLE IF EXISTS bookmark_events;

DROP TABLE IF EXISTS user_settings;

DROP INDEX IF EXISTS bookmarks_karaoke_unique;
DROP INDEX IF EXISTS bookmarks_subtitles_unique;
DROP TABLE IF EXISTS bookmarks;

DROP INDEX IF EXISTS idx_slide;
DROP TABLE IF EXISTS slides;

DROP TABLE IF EXISTS files;

DROP INDEX IF EXISTS idx_source_paths_source_type;
DROP INDEX IF EXISTS idx_path;
DROP TABLE IF EXISTS source_paths;

DROP EXTENSION IF EXISTS pg_trgm;

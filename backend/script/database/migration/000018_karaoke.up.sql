-- source_paths: add source_type and source_group columns
ALTER TABLE source_paths ADD COLUMN source_type  VARCHAR(50);
ALTER TABLE source_paths ADD COLUMN source_group VARCHAR(50);
CREATE INDEX idx_source_paths_source_type ON source_paths (source_type);

-- Backfill: all existing source_paths are subtitle sources (karaoke is new)
UPDATE source_paths SET source_type = 'subtitles' WHERE source_type IS NULL;

-- files: rename type -> upload_type (semantic: how it was loaded, not what it contains)
ALTER TABLE files RENAME COLUMN type TO upload_type;

-- bookmarks: add preset (event name) and type (subtitles vs karaoke)
ALTER TABLE bookmarks ADD COLUMN preset VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE bookmarks ADD COLUMN type   VARCHAR(20)  NOT NULL DEFAULT 'subtitles';
ALTER TABLE bookmarks DROP CONSTRAINT bookmarks_file_uid_language_channel;
CREATE UNIQUE INDEX bookmarks_subtitles_unique ON bookmarks (file_uid, language, channel, preset) WHERE type = 'subtitles';
CREATE UNIQUE INDEX bookmarks_karaoke_unique   ON bookmarks (file_uid, channel, preset)           WHERE type = 'karaoke';

-- bookmark_presets: named presets per channel (replaces karaoke_events / bookmark_events)
CREATE TABLE IF NOT EXISTS bookmark_presets (
  id         SERIAL PRIMARY KEY,
  channel    VARCHAR(50)  NOT NULL,
  preset     VARCHAR(100) NOT NULL,
  type       VARCHAR(20)  NOT NULL DEFAULT 'karaoke',
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE (channel, preset)
);
CREATE INDEX idx_bookmark_presets_type ON bookmark_presets (channel, type);


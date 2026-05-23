-- Combined schema (migrations 000001 – 000026)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS source_paths (
  id          SERIAL PRIMARY KEY,
  source_uid  VARCHAR(50),
  path        VARCHAR,
  languages   VARCHAR(2)[],
  source_type VARCHAR(50),
  created_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by  VARCHAR(50),
  updated_by  VARCHAR(50),
  UNIQUE (languages, source_uid)
);
CREATE INDEX idx_path ON source_paths (path);
CREATE INDEX idx_source_paths_source_type ON source_paths (source_type);

CREATE TABLE IF NOT EXISTS files (
  id         SERIAL PRIMARY KEY,
  type       VARCHAR(10),
  filename   VARCHAR(200),
  content    BYTEA,
  source_uid VARCHAR(50),
  file_uid   VARCHAR(50) UNIQUE,
  languages  VARCHAR(2)[],
  hidden     BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(50),
  updated_by VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS slides (
  id            SERIAL PRIMARY KEY,
  file_uid      VARCHAR(50) REFERENCES files(file_uid),
  slide         TEXT,
  order_number  INT,
  left_to_right BOOLEAN,
  slide_type    VARCHAR(20),
  hidden        BOOLEAN DEFAULT false,
  renderer      VARCHAR(20),
  created_at    TIMESTAMP WITHOUT TIME ZONE,
  updated_at    TIMESTAMP WITHOUT TIME ZONE,
  created_by    VARCHAR(50),
  updated_by    VARCHAR(50)
);
CREATE INDEX idx_slide ON slides USING GIST (slide gist_trgm_ops);

CREATE TABLE IF NOT EXISTS bookmarks (
  id           SERIAL PRIMARY KEY,
  slide_id     INT REFERENCES slides(id) ON DELETE CASCADE,
  file_uid     VARCHAR(50) REFERENCES files(file_uid),
  order_number INT,
  language     VARCHAR(2),
  channel      VARCHAR(50),
  preset       VARCHAR(100) NOT NULL DEFAULT '',
  type         VARCHAR(20)  NOT NULL DEFAULT 'subtitles',
  created_at   TIMESTAMP WITHOUT TIME ZONE,
  updated_at   TIMESTAMP WITHOUT TIME ZONE,
  created_by   VARCHAR(50),
  updated_by   VARCHAR(50)
);
CREATE UNIQUE INDEX bookmarks_subtitles_unique ON bookmarks (file_uid, language, channel, preset) WHERE type = 'subtitles';
CREATE UNIQUE INDEX bookmarks_karaoke_unique   ON bookmarks (file_uid, channel, preset)           WHERE type = 'karaoke';

CREATE TABLE IF NOT EXISTS user_settings (
  user_id      VARCHAR(50) PRIMARY KEY,
  app_settings JSONB       DEFAULT '{}',
  created_at   TIMESTAMP   DEFAULT NOW(),
  updated_at   TIMESTAMP   DEFAULT NOW(),
  created_by   VARCHAR(50) NOT NULL,
  updated_by   VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS bookmark_presets (
  id         SERIAL PRIMARY KEY,
  channel    VARCHAR(50)  NOT NULL,
  preset     VARCHAR(100) NOT NULL,
  type       VARCHAR(20)  NOT NULL DEFAULT 'karaoke',
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE (channel, preset)
);
CREATE INDEX idx_bookmark_presets_type ON bookmark_presets (channel, type);

-- Backfill source_paths for any karaoke files imported before this migration
INSERT INTO source_paths (source_uid, path, source_type, languages, created_at, updated_at, created_by, updated_by)
SELECT f.file_uid, f.filename, 'general', '{}', f.created_at, f.updated_at, f.created_by, f.updated_by
FROM files f
WHERE f.type = 'karaoke'
  AND NOT EXISTS (SELECT 1 FROM source_paths sp WHERE sp.source_uid = f.file_uid);

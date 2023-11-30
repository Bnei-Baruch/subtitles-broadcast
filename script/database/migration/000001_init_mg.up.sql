CREATE TABLE IF NOT EXISTS source_paths (
  id SERIAL PRIMARY KEY,
  source_uid VARCHAR(50) UNIQUE,
  path VARCHAR
);

CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10),                                                    -- Either "archive" or "upload"
  language VARCHAR(2),
  filename VARCHAR(50),                                                -- Filled only for "upload" file type
  content BYTEA,                                                       -- Filled only for "upload" file type
  source_uid VARCHAR(50) REFERENCES source_paths (source_uid),    -- Filled only for "archive" file type
  file_uid VARCHAR(50)                                                 -- Filled only for "archive" file type
);

CREATE TABLE IF NOT EXISTS slides (
    id SERIAL PRIMARY KEY,
    file_id INT REFERENCES files (id),
    slide TEXT,
	order_number INT,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);

CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    slide_id INT REFERENCES slides (id),
    user_id VARCHAR(50),
    UNIQUE (slide_id, user_id)
);
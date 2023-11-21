CREATE TABLE IF NOT EXISTS file_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE
);

INSERT INTO file_sources (name) VALUES ('archive');
INSERT INTO file_sources (name) VALUES ('upload');

CREATE TABLE IF NOT EXISTS language_codes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE
);

CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50),
    content BYTEA
);

CREATE TABLE IF NOT EXISTS slides (
    id SERIAL PRIMARY KEY,
    source_uid VARCHAR(50),
    file_uid VARCHAR(50),
    file_source_type INT REFERENCES file_sources (id),
    slide TEXT,
	order_number INT,
    language INT,
    
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);

CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    slide_id INT REFERENCES slides (id),
    user_id VARCHAR(50)
);
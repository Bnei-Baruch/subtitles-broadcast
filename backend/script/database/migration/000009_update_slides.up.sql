DROP INDEX idx_slide;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_slide ON slides USING GIST (slide gist_trgm_ops);

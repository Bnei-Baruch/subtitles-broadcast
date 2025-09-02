DROP INDEX idx_slide;

DROP EXTENSION IF EXISTS pg_trgm;

CREATE INDEX idx_slide ON slides (slide);
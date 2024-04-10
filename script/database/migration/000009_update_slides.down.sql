DROP INDEX idx_slide;

CREATE INDEX idx_slide ON slides USING GIST (slide);
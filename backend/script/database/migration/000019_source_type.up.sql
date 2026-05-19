ALTER TABLE source_paths ADD COLUMN source_type VARCHAR(50);
CREATE INDEX idx_source_paths_source_type ON source_paths (source_type);

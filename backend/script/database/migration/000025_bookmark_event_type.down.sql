DROP INDEX IF EXISTS idx_bookmark_events_type;
ALTER TABLE bookmark_events DROP COLUMN type;

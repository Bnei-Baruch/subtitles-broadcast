ALTER TABLE bookmark_events ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'karaoke';
CREATE INDEX IF NOT EXISTS idx_bookmark_events_type ON bookmark_events (channel, type);

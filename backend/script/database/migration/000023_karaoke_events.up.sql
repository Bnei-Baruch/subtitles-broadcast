CREATE TABLE IF NOT EXISTS karaoke_events (
  id         SERIAL PRIMARY KEY,
  channel    VARCHAR(50)  NOT NULL,
  event      VARCHAR(100) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE (channel, event)
);

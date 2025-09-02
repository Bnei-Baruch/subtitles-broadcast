-- Add a created_at, updated_at, created_by and updated_by
ALTER TABLE files ADD COLUMN created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE files ADD COLUMN updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE files ADD COLUMN created_by VARCHAR(50);
ALTER TABLE files ADD COLUMN updated_by VARCHAR(50);

ALTER TABLE source_paths ADD COLUMN created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE source_paths ADD COLUMN updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE source_paths ADD COLUMN created_by VARCHAR(50);
ALTER TABLE source_paths ADD COLUMN updated_by VARCHAR(50);

-- created_at and updated_at already exist for slides.
ALTER TABLE slides ADD COLUMN created_by VARCHAR(50);
ALTER TABLE slides ADD COLUMN updated_by VARCHAR(50);

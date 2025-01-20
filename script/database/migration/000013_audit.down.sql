ALTER TABLE files DROP COLUMN created_at;
ALTER TABLE files DROP COLUMN updated_at;
ALTER TABLE files DROP COLUMN created_by;
ALTER TABLE files DROP COLUMN updated_by;

ALTER TABLE source_paths DROP COLUMN created_at;
ALTER TABLE source_paths DROP COLUMN updated_at;
ALTER TABLE source_paths DROP COLUMN created_by;
ALTER TABLE source_paths DROP COLUMN updated_by;

ALTER TABLE slides DROP COLUMN created_by;
ALTER TABLE slides DROP COLUMN updated_by;

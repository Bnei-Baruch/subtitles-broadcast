-- 1. Remove the hidden column.
ALTER TABLE files DROP COLUMN hidden;
ALTER TABLE slides DROP COLUMN hidden;

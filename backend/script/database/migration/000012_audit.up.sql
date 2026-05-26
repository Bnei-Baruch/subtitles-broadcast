-- 1. Add a new hidden column so that we don't delete files any more.
ALTER TABLE files ADD COLUMN hidden BOOLEAN DEFAULT false;
UPDATE files SET hidden = false;

ALTER TABLE slides ADD COLUMN hidden BOOLEAN DEFAULT false;
UPDATE slides SET hidden = false;

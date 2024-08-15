-- 1. drop a new column to store slide type (subtitle / question).
ALTER TABLE slides DROP COLUMN slide_type VARCHAR(20);

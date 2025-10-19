-- 1. Add a new renderer column to allow different rendering per slide.
ALTER TABLE slides ADD COLUMN renderer VARCHAR(20);
UPDATE slides SET renderer = 'default';
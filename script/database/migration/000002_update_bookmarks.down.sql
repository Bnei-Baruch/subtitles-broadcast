-- Remove the 'order' column from the 'bookmarks' table
ALTER TABLE bookmarks
DROP COLUMN order_number,
DROP COLUMN created_at,
DROP COLUMN updated_at;
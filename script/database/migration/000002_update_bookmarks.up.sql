-- Add the 'order' column to the 'bookmarks' table
ALTER TABLE bookmarks
ADD COLUMN order_number INT,
ADD COLUMN created_at timestamp without time zone,
ADD COLUMN updated_at timestamp without time zone;
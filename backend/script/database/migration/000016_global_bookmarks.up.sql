ALTER TABLE bookmarks
DROP CONSTRAINT bookmarks_file_uid_user_id_key,
DROP COLUMN user_id,
ADD COLUMN created_by VARCHAR(50),
ADD COLUMN updated_by VARCHAR(50),
ADD COLUMN language VARCHAR(2),
ADD COLUMN channel VARCHAR(50),
ADD CONSTRAINT bookmarks_file_uid_language_channel UNIQUE (file_uid, language, channel);


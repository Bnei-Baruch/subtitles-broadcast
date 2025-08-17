ALTER TABLE bookmarks
ADD COLUMN user_id VARCHAR(50),
ADD CONSTRAINT bookmarks_file_uid_user_id_key UNIQUE (file_uid, user_id),
DROP COLUMN create_by,
DROP COLUMN updated_by,
DROP CONSTRAINT bookmarks_file_uid_language_channel,
DROP COLUMN language,
DROP COLUMN channel;


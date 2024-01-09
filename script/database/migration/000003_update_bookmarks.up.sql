ALTER TABLE bookmarks
DROP CONSTRAINT bookmarks_slide_id_user_id_key,
ADD COLUMN file_uid VARCHAR(50) REFERENCES files (file_uid),
ADD CONSTRAINT bookmarks_file_uid_user_id_key UNIQUE (file_uid, user_id);
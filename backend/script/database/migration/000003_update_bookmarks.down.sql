ALTER TABLE bookmarks
DROP CONSTRAINT bookmarks_file_uid_user_id_key,
DROP COLUMN file_uid,
ADD CONSTRAINT bookmarks_slide_id_user_id_key UNIQUE (slide_id, user_id);
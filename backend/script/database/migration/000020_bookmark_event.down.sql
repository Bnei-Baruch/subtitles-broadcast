ALTER TABLE bookmarks DROP CONSTRAINT bookmarks_file_uid_language_channel_event;
ALTER TABLE bookmarks ADD CONSTRAINT bookmarks_file_uid_language_channel UNIQUE (file_uid, language, channel);
ALTER TABLE bookmarks DROP COLUMN event;

ALTER TABLE bookmarks ADD COLUMN event VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE bookmarks DROP CONSTRAINT bookmarks_file_uid_language_channel;
ALTER TABLE bookmarks ADD CONSTRAINT bookmarks_file_uid_language_channel_event UNIQUE (file_uid, language, channel, event);

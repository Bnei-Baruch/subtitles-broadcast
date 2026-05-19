DROP INDEX IF EXISTS bookmarks_subtitles_unique;
DROP INDEX IF EXISTS bookmarks_karaoke_unique;

ALTER TABLE bookmarks ADD CONSTRAINT bookmarks_file_uid_language_channel_event UNIQUE (file_uid, language, channel, event);

ALTER TABLE bookmarks DROP COLUMN type;

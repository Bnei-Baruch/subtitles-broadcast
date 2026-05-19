ALTER TABLE bookmarks ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'subtitles';

ALTER TABLE bookmarks DROP CONSTRAINT bookmarks_file_uid_language_channel_event;
CREATE UNIQUE INDEX bookmarks_subtitles_unique ON bookmarks (file_uid, language, channel, event) WHERE type = 'subtitles';
CREATE UNIQUE INDEX bookmarks_karaoke_unique   ON bookmarks (file_uid, channel)                 WHERE type = 'karaoke';

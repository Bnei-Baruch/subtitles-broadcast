DROP INDEX IF EXISTS bookmarks_karaoke_unique;
CREATE UNIQUE INDEX bookmarks_karaoke_unique ON bookmarks (file_uid, channel, event) WHERE type = 'karaoke';

DROP TABLE IF EXISTS users_selected_contents;

DROP TABLE IF EXISTS users_last_activated_contents;

DROP TABLE IF EXISTS bookmarks;

DROP TABLE IF EXISTS contents;

DROP TABLE IF EXISTS books;

ALTER TABLE old_books RENAME TO books;

ALTER TABLE books DROP COLUMN slides_jsonb CASCADE;

ALTER TABLE old_bookmarks RENAME TO bookmarks;


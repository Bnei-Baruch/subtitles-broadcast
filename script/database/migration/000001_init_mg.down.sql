DROP TABLE IF EXISTS bookmarks;

DROP TABLE IF EXISTS contents;

DROP TABLE IF EXISTS books;

ALTER TABLE old_books RENAME TO books;

ALTER TABLE old_bookmarks RENAME TO bookmarks;
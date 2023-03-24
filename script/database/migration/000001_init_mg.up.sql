ALTER TABLE books RENAME TO old_books;

ALTER TABLE bookmarks RENAME TO old_bookmarks;

CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    author VARCHAR(50),
    title VARCHAR(150),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);

CREATE TABLE IF NOT EXISTS contents (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES books (id),
    content VARCHAR,
    page INT,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);

CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES books (id),
    content_id INT REFERENCES contents (id),
    path VARCHAR(50),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);

INSERT INTO books (id, author, title, created_at, updated_at)
SELECT id, author, title, created_at, updated_at
FROM old_books;

INSERT INTO contents (book_id, content, created_at, updated_at)
SELECT id, content, created_at, updated_at
FROM old_books;

INSERT INTO bookmarks (book_id, path, created_at, updated_at)
SELECT DISTINCT id, book, created_at, updated_at
FROM 
(SELECT DISTINCT old_books.id, old_bookmarks.book, old_bookmarks.created_at, old_bookmarks.updated_at
FROM old_bookmarks
RIGHT JOIN old_books ON old_books.author = old_bookmarks.author) AS bm
WHERE bm.book IS NOT NULL;

UPDATE bookmarks as bm SET content_id = c.id
FROM contents c 
WHERE bm.book_id = c.book_id;

UPDATE contents as c SET page = bp.page
FROM 
(select id, page::int
from
(select id, slides::json->0->>'page'::text as page
FROM old_books) as obp) as bp 
WHERE c.book_id = bp.id;
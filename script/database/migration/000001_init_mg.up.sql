
ALTER TABLE books RENAME TO old_books;

ALTER TABLE bookmarks RENAME TO old_bookmarks;

CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    author VARCHAR(50),
    title VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS contents (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES books (id),
    content VARCHAR,
    page INT
);

CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES books (id),
    content_id INT REFERENCES contents (id),
    path VARCHAR(50) 
);

INSERT INTO books (id, author, title)
SELECT id, author, title
FROM old_books;

INSERT INTO contents (book_id, content)
SELECT id, content
FROM old_books;

INSERT INTO bookmarks (book_id, path)
SELECT DISTINCT id, book
FROM 
(SELECT DISTINCT old_books.id, old_bookmarks.book
FROM old_bookmarks
RIGHT JOIN old_books ON old_books.author = old_bookmarks.author) AS bm
WHERE bm.book IS NOT NULL;

UPDATE bookmarks as bm SET content_id = c.id
FROM contents c 
WHERE bm.book_id = c.book_id;
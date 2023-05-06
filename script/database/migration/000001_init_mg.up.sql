ALTER TABLE books RENAME TO old_books;
alter table old_books add column slides_jsonb JSONB default '{}';

UPDATE old_books 
SET slides_jsonb = slides::jsonb
WHERE slides_jsonb = '{}';

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
    page VARCHAR(20),
	letter VARCHAR(20),
	subletter VARCHAR(20),
    revert VARCHAR(20),
    content VARCHAR,
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

INSERT INTO bookmarks (book_id, path, created_at, updated_at, content_id)
SELECT old_books.id, old_bookmarks.book, old_bookmarks.created_at, old_bookmarks.updated_at, c.id
FROM old_books
INNER JOIN old_bookmarks ON old_books.author = old_bookmarks.author AND old_bookmarks.book IS NOT NULL
LEFT JOIN contents c ON old_books.id = c.book_id;

CREATE OR REPLACE FUNCTION parse_slides() RETURNS VOID AS $$
BEGIN
    INSERT INTO contents (book_id, page, letter, subletter, revert, content, created_at, updated_at)
    SELECT
        old_books.id,
        elem->>'page'::text as page,
        elem->>'letter'::text as letter,
        elem->>'subletter'::text as subletter,
        elem->>'revert'::text as revert,
        elem->>'content'::text as content,
        created_at,
        updated_at
    FROM
        old_books,
        jsonb_array_elements(slides_jsonb) AS elem;
END $$ LANGUAGE plpgsql;
SELECT parse_slides();
DROP FUNCTION parse_slides;
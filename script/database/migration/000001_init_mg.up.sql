
ALTER TABLE books RENAME TO old_books;

ALTER TABLE bookmarks RENAME TO old_bookmarks;

CREATE TABLE IF NOT EXISTS books (
    id INT PRIMARY KEY,
    author VARCHAR(50),
    title VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS contents (
    id INT PRIMARY KEY,
    book_id INT REFERENCES books (id),
    content VARCHAR(500),
    page INT
);

CREATE TABLE IF NOT EXISTS bookmarks (
    id INT PRIMARY KEY,
    book_id INT REFERENCES books (id),
    content_id INT REFERENCES contents (id),
    path VARCHAR(50) 
);




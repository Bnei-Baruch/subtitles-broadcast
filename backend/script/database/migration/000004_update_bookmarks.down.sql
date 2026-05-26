ALTER TABLE bookmarks
   DROP CONSTRAINT bookmarks_slide_id_fkey,
   ADD CONSTRAINT bookmarks_slide_id_fkey
   FOREIGN KEY (slide_id) REFERENCES slides (id);

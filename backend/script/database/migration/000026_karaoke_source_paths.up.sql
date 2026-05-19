INSERT INTO source_paths (source_uid, path, source_type, languages, created_at, updated_at, created_by, updated_by)
SELECT f.file_uid, f.filename, 'general', '{}', f.created_at, f.updated_at, f.created_by, f.updated_by
FROM files f
WHERE f.type = 'karaoke'
  AND NOT EXISTS (SELECT 1 FROM source_paths sp WHERE sp.source_uid = f.file_uid);

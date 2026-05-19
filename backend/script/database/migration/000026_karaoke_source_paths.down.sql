DELETE FROM source_paths
WHERE source_uid IN (SELECT file_uid FROM files WHERE type = 'karaoke')
  AND source_type = 'general';

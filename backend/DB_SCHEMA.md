# Database Schema

PostgreSQL. Managed by [golang-migrate](https://github.com/golang-migrate/migrate).  
Migration files: `backend/script/database/migration/`  
Current version: **23**

> **Legend:** `[NEW]` = added as part of the karaoke feature (migrations 018–023)

---

## Tables

### `files`

Stores imported content files. Each file maps to one or more slides.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `file_uid` | VARCHAR(50) UNIQUE | Stable external identifier used across tables |
| `type` | VARCHAR(10) | `"archive"` · `"upload"` · `"karaoke"` ← `[NEW]` value |
| `languages` | VARCHAR(2)[] | e.g. `{"he","en"}` — empty array for karaoke |
| `filename` | VARCHAR(200) | Original filename (upload/karaoke); empty for archive |
| `content` | BYTEA | Raw file bytes (upload/karaoke); null for archive |
| `source_uid` | VARCHAR(50) | Links to `source_paths.source_uid` (archive only) |
| `hidden` | BOOLEAN | Soft-delete flag |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |
| `created_by` | VARCHAR(50) | Keycloak user ID |
| `updated_by` | VARCHAR(50) | |

---

### `slides`

Individual text blocks belonging to a file.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `file_uid` | VARCHAR(50) | FK → `files.file_uid` |
| `slide` | TEXT | Slide text content |
| `order_number` | INT | Zero-based position within file |
| `slide_type` | VARCHAR(20) | `"subtitle"` · `"question"` · `"karaoke"` · `"karaoke_separator"` ← `[NEW]` values |
| `left_to_right` | BOOLEAN | Text direction hint |
| `renderer` | VARCHAR(20) | `"default"` or custom renderer key |
| `hidden` | BOOLEAN | Soft-delete flag |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |
| `created_by` | VARCHAR(50) | |
| `updated_by` | VARCHAR(50) | |

**Indexes**
- `idx_slide` — trigram GIN index on `slide` (full-text search via `pg_trgm`)

---

### `source_paths`

Canonical "document" records from the Kabbalah Media archive. One `source_path` per imported document/song.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `source_uid` | VARCHAR(50) | Matches `files.source_uid` |
| `path` | VARCHAR | Human-readable title / path string |
| `languages` | VARCHAR(2)[] | Languages this source supports |
| `source_type` | VARCHAR(50) | `[NEW]` Karaoke group: `"songbook"` · `"shabat"` · `"origin"` · `"general"` · null for subtitles |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |
| `created_by` | VARCHAR(50) | |
| `updated_by` | VARCHAR(50) | |

**Constraints & Indexes**
- UNIQUE `(languages, source_uid)`
- `idx_path` on `path`
- `[NEW]` `idx_source_paths_source_type` on `source_type`

---

### `bookmarks`

Operator-curated ordered lists. Serves two modes via the `type` column:

- **`subtitles`** — per-language bookmark sets for subtitle broadcasts
- **`karaoke`** — `[NEW]` setlists of songs per channel/event

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `type` | VARCHAR(20) | `[NEW]` `"subtitles"` (default) · `"karaoke"` |
| `file_uid` | VARCHAR(50) | FK → `files.file_uid` |
| `slide_id` | INT | FK → `slides.id` ON DELETE CASCADE. For karaoke: first slide of the song |
| `order_number` | INT | Position in the list |
| `language` | VARCHAR(2) | Language code (subtitles); `""` for karaoke |
| `channel` | VARCHAR(50) | Broadcast channel (e.g. `"morning_lesson"`) |
| `event` | VARCHAR(100) | `[NEW]` Named event set; `""` = default set |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |
| `created_by` | VARCHAR(50) | |
| `updated_by` | VARCHAR(50) | |

**Unique constraints (partial indexes)**

```sql
-- Subtitles: one bookmark per file+language+channel+event  [NEW: event dimension added]
CREATE UNIQUE INDEX bookmarks_subtitles_unique
  ON bookmarks (file_uid, language, channel, event)
  WHERE type = 'subtitles';

-- [NEW] Karaoke: one entry per song+channel+event
CREATE UNIQUE INDEX bookmarks_karaoke_unique
  ON bookmarks (file_uid, channel, event)
  WHERE type = 'karaoke';
```

---

### `karaoke_events` `[NEW]`

Persists karaoke event names per channel independently of whether the event has any songs yet. Prevents empty events from disappearing across sessions.

| Column | Type | Notes |
|--------|------|-------|
| `id` | SERIAL PK | |
| `channel` | VARCHAR(50) NOT NULL | |
| `event` | VARCHAR(100) NOT NULL | |
| `created_at` | TIMESTAMP | |

**Constraints**
- UNIQUE `(channel, event)`

> `GET /bookmark/events?type=karaoke` UNIONs this table with distinct event values from `bookmarks` to return the full list.

---

### `user_settings`

Per-user application preferences stored as a JSON blob.

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | VARCHAR(50) PK | Keycloak user ID |
| `app_settings` | JSONB | Arbitrary settings object (channel, language, display prefs, …) |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |
| `created_by` | VARCHAR(50) | |
| `updated_by` | VARCHAR(50) | |

---

## Relationships

```
source_paths ──< files >──< slides
                  │               │
                  └──< bookmarks >┘
                         │
                  karaoke_events  [NEW] (event name registry for karaoke)

user_settings  (standalone, keyed by user_id)
```

- `files.source_uid` → `source_paths.source_uid` (soft link, no FK constraint)
- `slides.file_uid` → `files.file_uid`
- `bookmarks.file_uid` → `files.file_uid`
- `bookmarks.slide_id` → `slides.id` ON DELETE CASCADE

---

## slide_type values

| Value | Added | Used in | Meaning |
|-------|-------|---------|---------|
| `subtitle` | original | Subtitle mode | Regular subtitle text block |
| `question` | original | Question module | Question submitted during live session |
| `karaoke` | `[NEW]` | Karaoke mode | Lyric block (two lines: primary + transliteration/second lyric) |
| `karaoke_separator` | `[NEW]` | Karaoke mode | Blank divider slide between song sections; not broadcast |

---



## Karaoke migrations summary

| Migration | Change |
|-----------|--------|
| 019 | Added `source_paths.source_type` for song groups |
| 020 | Added `bookmarks.event` column; updated unique constraint |
| 021 | Added `bookmarks.type`; replaced unique constraint with two partial indexes (`subtitles` / `karaoke`) |
| 022 | Expanded `bookmarks_karaoke_unique` index to include `event` |
| 023 | Created `bookmark_events` table for persistent empty event names |
| 024 | Renamed `karaoke_events` → `bookmark_events` |

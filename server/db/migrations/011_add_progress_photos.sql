-- 011_add_progress_photos.sql
CREATE TABLE progress_photos (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  photo_url   TEXT NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX progress_photos_user_date ON progress_photos(user_id, date DESC);

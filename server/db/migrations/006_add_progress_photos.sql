CREATE TABLE IF NOT EXISTS progress_photos (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  label       TEXT,
  data_url    TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_id ON progress_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_date    ON progress_photos(date);

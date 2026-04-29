ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS utc_offset INTEGER DEFAULT 0;

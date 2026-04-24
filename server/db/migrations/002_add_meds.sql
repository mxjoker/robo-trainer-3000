ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS meds_taken TEXT[] DEFAULT '{}';

-- Migration 009: Add default_weight_lbs to routine_exercises
ALTER TABLE routine_exercises
  ADD COLUMN IF NOT EXISTS default_weight_lbs NUMERIC DEFAULT 0;

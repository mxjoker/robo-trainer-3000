CREATE TABLE IF NOT EXISTS mobility_sets (
  id               SERIAL PRIMARY KEY,
  workout_id       INTEGER REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  exercise_id      INTEGER REFERENCES exercises(id) ON DELETE RESTRICT NOT NULL,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mobility_sets_workout_id ON mobility_sets(workout_id);

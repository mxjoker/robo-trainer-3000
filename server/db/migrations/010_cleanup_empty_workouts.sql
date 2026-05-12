DELETE FROM workouts
WHERE id IN (
  SELECT w.id FROM workouts w
  LEFT JOIN sets s ON s.workout_id = w.id
  LEFT JOIN mobility_sets ms ON ms.workout_id = w.id
  WHERE s.id IS NULL AND ms.id IS NULL
);

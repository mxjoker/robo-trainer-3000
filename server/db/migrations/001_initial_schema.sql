CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  partner_id INTEGER REFERENCES users(id),
  invite_token VARCHAR(64) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  muscle_group VARCHAR(100),
  is_pt_exercise BOOLEAN DEFAULT FALSE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routines (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routine_exercises (
  id SERIAL PRIMARY KEY,
  routine_id INTEGER REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  routine_id INTEGER REFERENCES routines(id),
  notes TEXT,
  duration_minutes INTEGER,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sets (
  id SERIAL PRIMARY KEY,
  workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  weight_lbs NUMERIC(6,2),
  reps INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wellness_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  pain_level INTEGER CHECK (pain_level BETWEEN 1 AND 10),
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  mood INTEGER CHECK (mood BETWEEN 1 AND 10),
  sleep_hours NUMERIC(4,2),
  water_oz INTEGER,
  creatine_taken BOOLEAN DEFAULT FALSE,
  pain_areas TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS body_metrics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_lbs NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- Seed global exercises
INSERT INTO exercises (name, muscle_group, is_pt_exercise) VALUES
  ('Bench Press', 'chest', false),
  ('Squat', 'legs', false),
  ('Deadlift', 'back', false),
  ('Overhead Press', 'shoulders', false),
  ('Barbell Row', 'back', false),
  ('Pull-Up', 'back', false),
  ('Dumbbell Curl', 'biceps', false),
  ('Tricep Pushdown', 'triceps', false),
  ('Leg Press', 'legs', false),
  ('Romanian Deadlift', 'hamstrings', false),
  ('Hip Thrust', 'glutes', false),
  ('Lat Pulldown', 'back', false),
  ('Cable Row', 'back', false),
  ('Dumbbell Lateral Raise', 'shoulders', false),
  ('Clamshell', 'glutes', true),
  ('Bird Dog', 'core', true),
  ('Dead Bug', 'core', true),
  ('Monster Walk', 'glutes', true),
  ('Glute Bridge', 'glutes', true),
  ('Pallof Press', 'core', true)
ON CONFLICT DO NOTHING;

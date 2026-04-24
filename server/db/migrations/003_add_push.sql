CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  water_enabled BOOLEAN DEFAULT FALSE,
  water_interval_hours INTEGER DEFAULT 2,
  water_start_hour INTEGER DEFAULT 8,
  water_end_hour INTEGER DEFAULT 20,
  creatine_enabled BOOLEAN DEFAULT FALSE,
  creatine_hour INTEGER DEFAULT 8,
  workout_enabled BOOLEAN DEFAULT FALSE,
  workout_hour INTEGER DEFAULT 18,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

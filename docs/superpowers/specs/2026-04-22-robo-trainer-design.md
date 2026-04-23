# Robo Trainer 3000 — Design Spec
**Date:** 2026-04-22
**Status:** Approved

---

## Overview

A phone-first PWA fitness tracker built for two users (Joe and Sydney) managing chronic pain alongside serious training. The core differentiator is adaptive wellness + training tracking in a clean, minimal UI — not generic gym-bro software. Phase 1 builds the foundation; Phase 2 adds intelligence once real data exists.

---

## Architecture

**Stack:**
- Frontend: React PWA (Vite + React Router), installable on iOS/Android home screen
- Backend: Node.js + Express REST API
- Database: PostgreSQL
- Auth: JWT-based, one account per user
- Offline: IndexedDB queue for workout and wellness logs when no connection; auto-syncs on reconnect
- Hosting: Railway, Render, or Fly.io (free tier sufficient for 2 users)

**Users:**
- Joe and Sydney each have separate accounts, log in from their own devices
- Accounts are linked as partners — each can view the other's full data (workouts, wellness, stats)
- Partner linking is established during onboarding: the first user registers, then enters the partner's email to send an invite link. The second user registers via that link and the accounts are automatically connected. No further account management needed.
- No public profiles, no following system, no org hierarchy

---

## Data Model

**users**
- id, name, email, password_hash, partner_id

**routines**
- id, user_id, name (e.g. "Push Day", "PT Day")
- routine_exercises: routine_id, exercise_id, order

**exercises**
- id, name, muscle_group, is_pt_exercise (bool)

**workouts**
- id, user_id, date, routine_id (nullable), notes, duration_minutes, is_shared (bool)

**sets**
- id, workout_id, exercise_id, set_number, weight_lbs, reps

**personal_records**
- Computed from sets — max weight lifted per exercise per user, never manually entered. A new PR is flagged when a set's weight exceeds all previous sets for that exercise.

**wellness_logs**
- id, user_id, date, pain_level (1–10), energy_level (1–10), mood (1–10), sleep_hours, water_oz, creatine_taken (bool), notes
- Optional: pain_areas (array of tags: knee, back, shoulder, hip, etc.)

**body_metrics**
- id, user_id, date, weight_lbs, notes

---

## Core Screens

Four tabs in the bottom nav plus a FAB for logging:

1. **Home (Dashboard)** — default landing screen
2. **Stats** — full chart views for strength, health trends, consistency
3. **Partner** — the other user's full data view (bidirectional)
4. **Settings** — profile, routines management, export
5. **Log (FAB +)** — floating action button on Home, not a tab; opens the logging bottom sheet

### Navigation
Bottom tab bar with 4 items (Home, Stats, Partner, Settings) plus a floating + button on the Home screen as the primary logging action.

---

## Dashboard

Clean, minimal design — no emojis. All-caps small labels, dark theme.

Scrollable cards, top to bottom:

1. **Header** — greeting with day/date + streak count (right aligned)
2. **Today's status** — 3-column row: today's workout (logged / not logged), pain level, energy level
3. **Strength card** — sparkline bar chart for most-tracked lift, PR callout
4. **Health Trends card** — dual line chart (pain + energy) over last 30 days with trend direction
5. **Consistency card** — mini calendar grid of the current month (green = workout, orange = rest day, faded = upcoming)
6. **Partner card** — the other user's most recent workout summary + pain/energy for the day; shows "No recent activity" if they haven't logged yet

---

## Workout Logging Flow

### Starting a log (FAB +)

Tapping + opens a bottom sheet with:
- **Type:** Workout | Wellness (toggle)
- **For who:** Joe (toggle) | Sydney (toggle) — both can be selected for shared workouts
- Multi-select is only available for Workout type; Wellness is always per-person
- CTA button: "Start Workout" / "Start Shared Workout" / "Log Wellness"

### Shared workout logging

When both users are selected:
- A single logging session creates workout records for both Joe and Sydney
- Logging screen shows exercises with **side-by-side columns** — one column per person
- Each row is a set: `[Set #] [Joe: weight×reps] [Sydney: weight×reps] [✓]`
- New sets **auto-populate** from the previous set's values for both people
- Tap ✓ to confirm the set as-is, or tap either person's value to edit before confirming
- After the session, each person has an independent copy of the workout they can edit individually

### Solo workout logging

Same flow, single column — no side-by-side.

### Routine selection

At the start of a workout, optionally select a saved routine to pre-load the exercise list. Exercises can be added, reordered, or removed mid-session.

---

## Wellness Check-in Flow

Accessed via FAB + → Wellness → select person (always single person).

Single scrollable screen:
- Pain level: 1–10 slider
- Pain area tags: optional multi-select (knee, back, shoulder, hip, neck, general fatigue)
- Energy level: 1–10 slider
- Mood: 1–10 slider
- Sleep: numeric input (hours, e.g. 7.5)
- Water: numeric input (oz)
- Creatine taken: yes/no toggle
- Notes: free text

One submission per person per day. Editable after submission.

---

## Stats

Three dedicated chart views accessible from the Stats tab:

**Strength Progress**
- Select exercise from list
- Line chart of max weight over time
- PR history table
- Volume chart (sets × reps × weight) over time

**Health Trends**
- Pain level over time (line chart)
- Energy level over time (line chart)
- Mood + sleep overlaid optionally
- Filter by date range (7d / 30d / 90d / all)

**Consistency**
- Full calendar heatmap view
- Streak stats: current streak, longest streak, total workouts
- Volume per week bar chart

---

## Data Export

Accessible from Settings. Generates a copy-paste friendly plain text or CSV summary of:
- Workout history (date, routine, exercises, sets, weight, reps)
- Wellness logs (date, pain, energy, mood, sleep, water, creatine)
- Body metrics

User can select date range before exporting.

---

## MVP Feature List

### Phase 1 (build now)
- User auth (Joe + Sydney, linked partner accounts)
- Routine creation and management
- Solo workout logging
- Shared workout logging (side-by-side, auto-populate sets)
- Daily wellness check-in
- Body weight logging
- PR tracking (auto-calculated)
- Dashboard with streak, today's status, strength sparkline, health trends, consistency calendar, partner card
- Full Stats views (strength, health trends, consistency)
- Partner view (see each other's full data)
- Data export (plain text + CSV)
- PWA install + offline logging with auto-sync

### Phase 2 (after real data exists)
- Adaptive workout suggestions (pain high + energy low → recommend modified workout)
- Deload week recommendations based on fatigue trends
- Progress photos
- Full calendar view
- Mobility / stretching logs
- Push notification reminders (water, creatine, workout)
- Supplement tracker expansion

---

## Design Principles

- **Phone-first**: designed for one-handed use mid-workout, large tap targets, minimal text input
- **Speed over features**: logging a set should take 2–3 taps maximum in the common case
- **Clean, not generic**: dark theme, no emojis in UI, all-caps labels, data-forward
- **Chronic pain aware**: pain and energy are first-class metrics, not afterthoughts
- **Two-person household**: one device can log for both people without switching accounts

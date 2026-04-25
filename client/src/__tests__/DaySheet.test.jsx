import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DaySheet from '../components/DaySheet'

const workout = {
  id: 1,
  notes: 'Push Day',
  duration_minutes: 45,
  sets: [
    { exercise_name: 'Bench Press' },
    { exercise_name: 'OHP' },
    { exercise_name: 'Bench Press' }, // duplicate — should be deduplicated
  ]
}

const wellness = {
  id: 1,
  energy_level: 8,
  mood: 7,
  pain_level: 2,
  sleep_hours: 7.5,
  water_oz: 80,
  creatine_taken: true,
}

describe('DaySheet', () => {
  it('renders nothing when date is null', () => {
    const { container } = render(
      <DaySheet date={null} data={undefined} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the formatted date', () => {
    render(
      <DaySheet date="2026-04-21" data={undefined} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    expect(screen.getByText('Tue, Apr 21')).toBeInTheDocument()
  })

  it('shows empty state message and log buttons when data is undefined', () => {
    render(
      <DaySheet date="2026-04-21" data={undefined} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    expect(screen.getByText('Nothing logged for this day')).toBeInTheDocument()
    expect(screen.getByText('Log Workout')).toBeInTheDocument()
    expect(screen.getByText('Log Wellness')).toBeInTheDocument()
  })

  it('shows empty state when data has no workout and no wellness', () => {
    render(
      <DaySheet date="2026-04-21" data={{}} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    expect(screen.getByText('Nothing logged for this day')).toBeInTheDocument()
  })

  it('calls onLogWorkout when Log Workout button is clicked', () => {
    const onLogWorkout = vi.fn()
    render(
      <DaySheet date="2026-04-21" data={undefined} onClose={() => {}} onLogWorkout={onLogWorkout} onLogWellness={() => {}} />
    )
    fireEvent.click(screen.getByText('Log Workout'))
    expect(onLogWorkout).toHaveBeenCalledTimes(1)
  })

  it('calls onLogWellness when Log Wellness button is clicked', () => {
    const onLogWellness = vi.fn()
    render(
      <DaySheet date="2026-04-21" data={undefined} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={onLogWellness} />
    )
    fireEvent.click(screen.getByText('Log Wellness'))
    expect(onLogWellness).toHaveBeenCalledTimes(1)
  })

  it('shows workout name and deduplicated exercise names when workout is present', () => {
    render(
      <DaySheet date="2026-04-21" data={{ workout }} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    expect(screen.getByText(/Push Day/)).toBeInTheDocument()
    expect(screen.getByText(/45 min/)).toBeInTheDocument()
    // Bench Press appears once despite being in sets twice
    const bpMatches = screen.getAllByText(/Bench Press/)
    expect(bpMatches.length).toBe(1)
    expect(screen.getByText(/OHP/)).toBeInTheDocument()
  })

  it('shows wellness stats when wellness is present', () => {
    render(
      <DaySheet date="2026-04-21" data={{ wellness }} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    expect(screen.getByText('8')).toBeInTheDocument()  // energy
    expect(screen.getByText('7')).toBeInTheDocument()  // mood
    expect(screen.getByText('2')).toBeInTheDocument()  // pain
    expect(screen.getByText(/7.5h/)).toBeInTheDocument()
    expect(screen.getByText(/Creatine ✓/)).toBeInTheDocument()
    expect(screen.getByText(/Water ✓/)).toBeInTheDocument()
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    render(
      <DaySheet date="2026-04-21" data={undefined} onClose={onClose} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    fireEvent.click(screen.getByTestId('day-sheet-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows mobility exercises in workout card when present', () => {
    const workoutWithMobility = {
      id: 1,
      notes: 'Push Day',
      duration_minutes: 45,
      sets: [{ exercise_name: 'Bench Press' }],
      mobility_sets: [
        { id: 1, exercise_name: 'Hip Flexor Stretch', duration_seconds: 45 },
        { id: 2, exercise_name: 'Pigeon Pose', duration_seconds: 60 },
      ]
    }
    render(
      <DaySheet date="2026-04-21" data={{ workout: workoutWithMobility }} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    expect(screen.getByText(/Hip Flexor Stretch/)).toBeInTheDocument()
    expect(screen.getByText(/Pigeon Pose/)).toBeInTheDocument()
  })

  it('does not show mobility line when mobility_sets is empty', () => {
    const workoutNoMobility = {
      id: 1,
      notes: 'Push Day',
      duration_minutes: 45,
      sets: [{ exercise_name: 'Bench Press' }],
      mobility_sets: []
    }
    render(
      <DaySheet date="2026-04-21" data={{ workout: workoutNoMobility }} onClose={() => {}} onLogWorkout={() => {}} onLogWellness={() => {}} />
    )
    expect(screen.queryByText(/Mobility:/)).not.toBeInTheDocument()
  })
})

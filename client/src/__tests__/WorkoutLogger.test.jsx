import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WorkoutLogger from '../screens/WorkoutLogger'

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: null }),
}))

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  }
}))

import { api } from '../api/client'

const exercises = [
  { id: 1, name: 'Clamshell', muscle_group: 'glutes' },
  { id: 2, name: 'Bird Dog', muscle_group: 'core' },
]

beforeEach(() => {
  vi.clearAllMocks()
  api.get.mockResolvedValue(exercises)
  api.post.mockResolvedValue({ id: 5, sets: [], mobility_sets: [] })
})

describe('WorkoutLogger — mobility section', () => {
  it('shows collapsed mobility button by default', async () => {
    render(<WorkoutLogger />)
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/workouts', expect.any(Object)))
    expect(screen.getByTestId('mobility-expand-btn')).toBeInTheDocument()
    expect(screen.queryByText('Mobility & Stretching')).not.toBeInTheDocument()
  })

  it('expands mobility section when button is clicked', async () => {
    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('mobility-expand-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('mobility-expand-btn'))
    expect(screen.getByText('Mobility & Stretching')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Mobility exercise' })).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Duration in seconds' })).toBeInTheDocument()
  })

  it('adds a mobility exercise and shows it in the list', async () => {
    api.post
      .mockResolvedValueOnce({ id: 5, sets: [], mobility_sets: [] })
      .mockResolvedValueOnce({ id: 10, exercise_id: 1, exercise_name: 'Clamshell', duration_seconds: 30 })

    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('mobility-expand-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('mobility-expand-btn'))

    fireEvent.change(screen.getByRole('combobox', { name: 'Mobility exercise' }), { target: { value: '1' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Duration in seconds' }), { target: { value: '30' } })
    fireEvent.click(screen.getByTestId('add-mobility-btn'))

    await waitFor(() => expect(screen.getAllByText('Clamshell').length).toBeGreaterThan(0))
    expect(screen.getByText(/30s/)).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith('/workouts/5/mobility', {
      exercise_id: 1,
      duration_seconds: 30,
      sort_order: 0,
    })
  })

  it('removes a mobility exercise when × is clicked', async () => {
    api.post
      .mockResolvedValueOnce({ id: 5, sets: [], mobility_sets: [] })
      .mockResolvedValueOnce({ id: 10, exercise_id: 1, exercise_name: 'Clamshell', duration_seconds: 30 })
    api.delete.mockResolvedValue(null)

    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('mobility-expand-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('mobility-expand-btn'))

    fireEvent.change(screen.getByRole('combobox', { name: 'Mobility exercise' }), { target: { value: '1' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Duration in seconds' }), { target: { value: '30' } })
    fireEvent.click(screen.getByTestId('add-mobility-btn'))
    await waitFor(() => expect(screen.getAllByText('Clamshell').length).toBeGreaterThan(0))

    fireEvent.click(screen.getByRole('button', { name: 'Remove Clamshell' }))
    // Check the remove button is gone (the name "Clamshell" still appears in the picker <select>)
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove Clamshell' })).not.toBeInTheDocument())
    expect(api.delete).toHaveBeenCalledWith('/workouts/5/mobility/10')
  })

  it('shows notes textarea when mobility section is expanded', async () => {
    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('mobility-expand-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('mobility-expand-btn'))
    expect(screen.getByRole('textbox', { name: 'Workout notes' })).toBeInTheDocument()
  })
})

describe('WorkoutLogger — import banner & modal', () => {
  it('shows import banner when no exercises have been added', async () => {
    render(<WorkoutLogger />)
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/workouts', expect.any(Object)))
    expect(screen.getByTestId('import-banner-btn')).toBeInTheDocument()
  })

  it('opens the import modal when the banner is clicked', async () => {
    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('import-banner-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('import-banner-btn'))
    await waitFor(() => expect(screen.getByTestId('import-modal')).toBeInTheDocument())
    expect(screen.getByRole('textbox', { name: 'Paste Claude template' })).toBeInTheDocument()
  })

  it('closes the modal when cancel is clicked', async () => {
    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('import-banner-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('import-banner-btn'))
    fireEvent.click(screen.getByTestId('import-cancel-btn'))
    expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument()
  })

  it('creates a new exercise and pre-fills the logger when importing an unknown exercise', async () => {
    api.post
      .mockResolvedValueOnce({ id: 5, sets: [], mobility_sets: [] })   // POST /workouts
      .mockResolvedValueOnce({ id: 99, name: 'Romanian Deadlift', muscle_group: 'other' }) // POST /exercises

    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('import-banner-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('import-banner-btn'))

    fireEvent.change(screen.getByRole('textbox', { name: 'Paste Claude template' }), {
      target: { value: 'Romanian Deadlift: 3x8 @ 135' },
    })
    fireEvent.click(screen.getByTestId('import-submit-btn'))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/exercises', {
        name: 'Romanian Deadlift',
        muscle_group: 'other',
      })
    )
    await waitFor(() => expect(screen.getByText('Romanian Deadlift')).toBeInTheDocument())
    expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument()
  })

  it('pre-fills a known exercise without creating a new one', async () => {
    api.post.mockResolvedValueOnce({ id: 5, sets: [], mobility_sets: [] }) // POST /workouts only

    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('import-banner-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('import-banner-btn'))

    fireEvent.change(screen.getByRole('textbox', { name: 'Paste Claude template' }), {
      target: { value: 'Clamshell: 3x15' }, // 'Clamshell' is in the mock exercises list (id: 1)
    })
    fireEvent.click(screen.getByTestId('import-submit-btn'))

    await waitFor(() => expect(screen.getByText('Clamshell')).toBeInTheDocument())
    // POST /exercises should NOT have been called for a known exercise
    expect(api.post).not.toHaveBeenCalledWith('/exercises', expect.any(Object))
    expect(api.post).toHaveBeenCalledTimes(1) // only the initial POST /workouts
  })

  it('does not add duplicate exercises when the same exercise appears twice in the template', async () => {
    api.post.mockResolvedValueOnce({ id: 5, sets: [], mobility_sets: [] }) // POST /workouts only

    render(<WorkoutLogger />)
    await waitFor(() => expect(screen.getByTestId('import-banner-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('import-banner-btn'))

    // Same exercise (Clamshell) appears twice in the template
    fireEvent.change(screen.getByRole('textbox', { name: 'Paste Claude template' }), {
      target: { value: 'Clamshell: 3x15\nClamshell: 3x12' },
    })
    fireEvent.click(screen.getByTestId('import-submit-btn'))

    await waitFor(() => expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument())

    // Only one exercise card for Clamshell should exist (deduplication guard works)
    const clamshellElements = screen.getAllByText('Clamshell')
    const exerciseCardHeaders = clamshellElements.filter(el => el.tagName !== 'OPTION')
    expect(exerciseCardHeaders).toHaveLength(1)

    // api.post should only have been called once (POST /workouts — no POST /exercises for known exercise)
    expect(api.post).toHaveBeenCalledTimes(1)
  })
})

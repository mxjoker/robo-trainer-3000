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

    await waitFor(() => expect(screen.getByText('Clamshell')).toBeInTheDocument())
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
    await waitFor(() => expect(screen.getByText('Clamshell')).toBeInTheDocument())

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

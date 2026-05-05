import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SharedWorkoutLogger from '../screens/SharedWorkoutLogger'
import * as AuthContextModule from '../context/AuthContext'

// Mock api
vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  }
}))

// Mock react-router-dom hooks
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})

import { api } from '../api/client'

const MOCK_USER = { id: 1, name: 'Joe', partner_id: 2, partner_name: 'Sydney' }
const EXERCISES = [{ id: 1, name: 'Bench Press', muscle_group: 'chest' }]

function renderLogger() {
  AuthContextModule.useAuth.mockReturnValue({ currentUser: MOCK_USER })
  return render(
    <MemoryRouter>
      <SharedWorkoutLogger />
    </MemoryRouter>
  )
}

describe('SharedWorkoutLogger', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    api.get.mockResolvedValue(EXERCISES)
    api.post.mockImplementation((url) => {
      if (url === '/workouts') return Promise.resolve({ id: 10 })
      if (url === '/partner/workouts') return Promise.resolve({ id: 20 })
      return Promise.resolve({ id: 1 })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders "Shared Workout" header and "Cancel" button', async () => {
    renderLogger()
    expect(screen.getByText('Shared Workout')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('shows exercise picker after clicking "+ Add Exercise"', async () => {
    renderLogger()
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/exercises'))

    fireEvent.click(screen.getByText('+ Add Exercise'))

    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
  })

  it('confirms a set with different values for Joe and partner; auto-adds next set', async () => {
    renderLogger()
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/exercises'))

    // Open picker and select exercise
    fireEvent.click(screen.getByText('+ Add Exercise'))
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeInTheDocument())

    // There are 4 inputs per row (2 for Joe: lbs, reps; 2 for Partner: lbs, reps)
    const lbsInputs = screen.getAllByPlaceholderText('lbs')
    const repsInputs = screen.getAllByPlaceholderText('reps')

    // Joe's weight and reps (first pair)
    fireEvent.change(lbsInputs[0], { target: { value: '135' } })
    fireEvent.change(repsInputs[0], { target: { value: '10' } })

    // Partner's weight and reps (second pair)
    fireEvent.change(lbsInputs[1], { target: { value: '95' } })
    fireEvent.change(repsInputs[1], { target: { value: '8' } })

    // Confirm the set
    fireEvent.click(screen.getByText('✓'))

    // A second set row should appear (now 4 lbs inputs instead of 2)
    await waitFor(() => {
      const allLbs = screen.getAllByPlaceholderText('lbs')
      expect(allLbs.length).toBe(4)
    })
  })

  it('finish() calls api.post for both Joe and partner workout IDs for each confirmed set', async () => {
    renderLogger()
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/workouts', expect.any(Object)))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/partner/workouts', expect.any(Object)))

    // Add exercise
    fireEvent.click(screen.getByText('+ Add Exercise'))
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeInTheDocument())

    // Fill in values
    const lbsInputs = screen.getAllByPlaceholderText('lbs')
    const repsInputs = screen.getAllByPlaceholderText('reps')
    fireEvent.change(lbsInputs[0], { target: { value: '200' } })
    fireEvent.change(repsInputs[0], { target: { value: '5' } })
    fireEvent.change(lbsInputs[1], { target: { value: '150' } })
    fireEvent.change(repsInputs[1], { target: { value: '6' } })

    // Confirm and finish
    fireEvent.click(screen.getByText('✓'))
    fireEvent.click(screen.getByText('Finish Shared Workout'))

    await waitFor(() => {
      // Joe's set posted to his workout (id: 10)
      expect(api.post).toHaveBeenCalledWith('/workouts/10/sets', expect.objectContaining({
        exercise_id: 1,
        set_number: 1,
        weight_lbs: 200,
        reps: 5,
      }))
      // Partner's set posted to partner's workout (id: 20)
      expect(api.post).toHaveBeenCalledWith('/partner/workouts/20/sets', expect.objectContaining({
        exercise_id: 1,
        set_number: 1,
        weight_lbs: 150,
        reps: 6,
      }))
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('"Finish Shared Workout" is disabled while saving', async () => {
    let resolveSet
    api.post.mockImplementation((url) => {
      if (url === '/workouts') return Promise.resolve({ id: 10 })
      if (url === '/partner/workouts') return Promise.resolve({ id: 20 })
      // Set saves hang
      return new Promise(res => { resolveSet = res })
    })

    renderLogger()
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/workouts', expect.any(Object)))

    // Add exercise and confirm a set
    fireEvent.click(screen.getByText('+ Add Exercise'))
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeInTheDocument())

    fireEvent.change(screen.getAllByPlaceholderText('lbs')[0], { target: { value: '100' } })
    fireEvent.change(screen.getAllByPlaceholderText('reps')[0], { target: { value: '8' } })
    fireEvent.click(screen.getByText('✓'))

    // Click Finish
    fireEvent.click(screen.getByText('Finish Shared Workout'))

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument()
      expect(screen.getByText('Saving...').closest('button')).toBeDisabled()
    })

    // Resolve the hanging set save
    resolveSet({ id: 1 })
  })
})

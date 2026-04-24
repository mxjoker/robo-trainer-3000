import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WorkoutLogger from '../screens/WorkoutLogger'

// Mock api
vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  }
}))

// Mock react-router-dom hooks
const mockNavigate = vi.fn()
const mockLocation = { state: null }

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  }
})

import { api } from '../api/client'

const EXERCISES = [{ id: 1, name: 'Bench Press', muscle_group: 'chest' }]

function renderLogger() {
  return render(
    <MemoryRouter>
      <WorkoutLogger />
    </MemoryRouter>
  )
}

describe('WorkoutLogger', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockLocation.state = null
    api.get.mockResolvedValue(EXERCISES)
    api.post.mockResolvedValue({ id: 42 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders header "Log Workout" and "Cancel" button', async () => {
    renderLogger()
    expect(screen.getByText('Log Workout')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('shows "Logging for partner" pill when location.state.forPartner is true', async () => {
    mockLocation.state = { forPartner: true }
    renderLogger()
    expect(screen.getByText('Logging for partner')).toBeInTheDocument()
  })

  it('does not show "Logging for partner" pill when forPartner is false', async () => {
    mockLocation.state = { forPartner: false }
    renderLogger()
    expect(screen.queryByText('Logging for partner')).not.toBeInTheDocument()
  })

  it('"+ Add Exercise" button shows the exercise picker (select element)', async () => {
    renderLogger()
    // Wait for exercises to load
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/exercises')
    })

    const addBtn = screen.getByText('+ Add Exercise')
    expect(addBtn).toBeInTheDocument()
    fireEvent.click(addBtn)

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByText('Bench Press')).toBeInTheDocument()
    })
  })

  it('confirming a set auto-adds next set with same weight/reps pre-filled', async () => {
    renderLogger()
    await waitFor(() => expect(api.get).toHaveBeenCalled())

    // Open picker and select exercise
    fireEvent.click(screen.getByText('+ Add Exercise'))
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeInTheDocument())

    // Fill in weight and reps for set 1
    const weightInputs = screen.getAllByPlaceholderText('lbs')
    const repsInputs = screen.getAllByPlaceholderText('reps')

    fireEvent.change(weightInputs[0], { target: { value: '135' } })
    fireEvent.change(repsInputs[0], { target: { value: '10' } })

    // Confirm the set
    const confirmBtns = screen.getAllByText('✓')
    fireEvent.click(confirmBtns[0])

    // A second set row should appear with the same pre-filled values
    await waitFor(() => {
      const allWeightInputs = screen.getAllByPlaceholderText('lbs')
      expect(allWeightInputs.length).toBe(2)
      expect(allWeightInputs[1].value).toBe('135')
    })

    await waitFor(() => {
      const allRepsInputs = screen.getAllByPlaceholderText('reps')
      expect(allRepsInputs[1].value).toBe('10')
    })
  })

  it('"Finish Workout" is disabled while saving', async () => {
    // Make the post for sets hang so we can observe the disabled state
    let resolveSet
    api.post
      .mockResolvedValueOnce({ id: 42 }) // workout creation
      .mockImplementationOnce(() => new Promise(res => { resolveSet = res })) // set save hangs

    renderLogger()
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/workouts', expect.any(Object)))

    // Add an exercise and confirm a set
    fireEvent.click(screen.getByText('+ Add Exercise'))
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeInTheDocument())

    fireEvent.change(screen.getAllByPlaceholderText('lbs')[0], { target: { value: '100' } })
    fireEvent.change(screen.getAllByPlaceholderText('reps')[0], { target: { value: '8' } })
    fireEvent.click(screen.getAllByText('✓')[0])

    // Click Finish Workout
    const finishBtn = screen.getByText('Finish Workout')
    fireEvent.click(finishBtn)

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument()
      expect(screen.getByText('Saving...').closest('button')).toBeDisabled()
    })

    // Resolve the hanging set save
    resolveSet({ id: 1 })
  })

  it('finish() calls api.post for each confirmed set then navigates to "/"', async () => {
    api.post
      .mockResolvedValueOnce({ id: 42 })  // workout creation
      .mockResolvedValue({ id: 1 })        // set creation

    renderLogger()
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/workouts', expect.any(Object)))

    // Add exercise and confirm a set
    fireEvent.click(screen.getByText('+ Add Exercise'))
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } })
    await waitFor(() => expect(screen.getByText('Bench Press')).toBeInTheDocument())

    fireEvent.change(screen.getAllByPlaceholderText('lbs')[0], { target: { value: '225' } })
    fireEvent.change(screen.getAllByPlaceholderText('reps')[0], { target: { value: '5' } })
    fireEvent.click(screen.getAllByText('✓')[0])

    fireEvent.click(screen.getByText('Finish Workout'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/workouts/42/sets', {
        exercise_id: 1,
        set_number: 1,
        weight_lbs: 225,
        reps: 5,
      })
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('clicking "Can\'t find it? Add new" shows the mini-form', async () => {
    renderLogger()
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/exercises'))

    // Open picker
    fireEvent.click(screen.getByText('+ Add Exercise'))
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())

    // Click the "Can't find it?" link
    fireEvent.click(screen.getByText("+ Can't find it? Add new"))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Exercise name (required)')).toBeInTheDocument()
      expect(screen.getByText('Add & Log')).toBeInTheDocument()
    })
  })

  it('filling name and clicking "Add & Log" adds the exercise to the logged list', async () => {
    const newExercise = { id: 99, name: 'Face Pull', muscle_group: 'shoulders', is_pt_exercise: false }
    api.post
      .mockResolvedValueOnce({ id: 42 })    // workout creation
      .mockResolvedValueOnce(newExercise)    // POST /exercises

    renderLogger()
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/exercises'))

    // Open picker then new form
    fireEvent.click(screen.getByText('+ Add Exercise'))
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    fireEvent.click(screen.getByText("+ Can't find it? Add new"))
    await waitFor(() => expect(screen.getByPlaceholderText('Exercise name (required)')).toBeInTheDocument())

    // Fill in name
    fireEvent.change(screen.getByPlaceholderText('Exercise name (required)'), { target: { value: 'Face Pull' } })

    // Click Add & Log
    fireEvent.click(screen.getByText('Add & Log'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/exercises', expect.objectContaining({ name: 'Face Pull' }))
      // Exercise card should now appear in the logged list
      expect(screen.getByText('Face Pull')).toBeInTheDocument()
    })
  })
})

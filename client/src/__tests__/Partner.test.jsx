import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Mock api
vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  }
}))

import { api } from '../api/client'
import Partner from '../pages/Partner'

const PROFILE = { id: 2, name: 'Alice' }

const WORKOUTS = [
  {
    id: 10,
    date: '2026-04-20',
    notes: 'Leg day',
    sets: [
      { exercise_id: 1, exercise_name: 'Squat', set_number: 1, weight_lbs: 225, reps: 5 },
      { exercise_id: 1, exercise_name: 'Squat', set_number: 2, weight_lbs: 225, reps: 5 },
    ]
  }
]

const WELLNESS = [
  { pain_level: 3, energy_level: 8, mood: 7 }
]

function renderPartner() {
  return render(<Partner />)
}

describe('Partner', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows "No partner linked yet" message when API returns error', async () => {
    api.get.mockRejectedValue(new Error('not found'))

    renderPartner()

    await waitFor(() => {
      expect(screen.getByText(/No partner linked yet/)).toBeInTheDocument()
    })
  })

  it('shows partner name when data loads', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/partner/profile') return Promise.resolve(PROFILE)
      if (path === '/partner/workouts') return Promise.resolve(WORKOUTS)
      if (path === '/partner/wellness') return Promise.resolve(WELLNESS)
      return Promise.reject(new Error('not found'))
    })

    renderPartner()

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
  })

  it('shows latest wellness stats (pain, energy, mood)', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/partner/profile') return Promise.resolve(PROFILE)
      if (path === '/partner/workouts') return Promise.resolve([])
      if (path === '/partner/wellness') return Promise.resolve(WELLNESS)
      return Promise.reject(new Error('not found'))
    })

    renderPartner()

    await waitFor(() => {
      expect(screen.getByText('Pain')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('Energy')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('Mood')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
    })
  })

  it('shows workout cards for recent workouts', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/partner/profile') return Promise.resolve(PROFILE)
      if (path === '/partner/workouts') return Promise.resolve(WORKOUTS)
      if (path === '/partner/wellness') return Promise.resolve([])
      return Promise.reject(new Error('not found'))
    })

    renderPartner()

    await waitFor(() => {
      expect(screen.getByText('Leg day')).toBeInTheDocument()
      expect(screen.getByText('Squat')).toBeInTheDocument()
      expect(screen.getByText('Set 1: 225 lbs × 5')).toBeInTheDocument()
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Photos from '../pages/Photos'

vi.mock('../api/client', () => ({
  api: { get: vi.fn() }
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 1, name: 'Joe', partner_id: 2 } })
}))

import { api } from '../api/client'

const workoutWithPhoto = {
  id: 10,
  date: '2026-04-28',
  notes: 'Push Day',
  photo_url: 'https://res.cloudinary.com/test/image/upload/v1/photo.jpg',
  sets: [],
}

const workoutNoPhoto = {
  id: 11,
  date: '2026-04-25',
  notes: 'Pull Day',
  photo_url: null,
  sets: [],
}

function renderPhotos() {
  return render(
    <MemoryRouter>
      <Photos />
    </MemoryRouter>
  )
}

describe('Photos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when no workouts have photos', async () => {
    api.get.mockResolvedValue([])
    renderPhotos()
    await waitFor(() => {
      expect(screen.getByText(/No progress photos yet/i)).toBeInTheDocument()
    })
  })

  it('renders a photo tile for each workout with a photo_url', async () => {
    api.get.mockResolvedValueOnce([workoutWithPhoto, workoutNoPhoto]).mockResolvedValueOnce([])
    renderPhotos()
    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Push Day/i })).toBeInTheDocument()
      expect(screen.queryByRole('img', { name: /Pull Day/i })).not.toBeInTheDocument()
    })
  })

  it('groups photos by month', async () => {
    const marchWorkout = {
      id: 12,
      date: '2026-03-15',
      notes: 'Leg Day',
      photo_url: 'https://res.cloudinary.com/test/image/upload/v1/leg.jpg',
      sets: [],
    }
    api.get.mockResolvedValue([workoutWithPhoto, marchWorkout])
    renderPhotos()
    await waitFor(() => {
      expect(screen.getByText('April 2026')).toBeInTheDocument()
      expect(screen.getByText('March 2026')).toBeInTheDocument()
    })
  })
})

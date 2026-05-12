import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Photos from '../pages/Photos'

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), put: vi.fn() }
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 1, name: 'Joe', partner_id: 2 } })
}))

vi.mock('../services/cloudinaryService', () => ({
  uploadToCloudinary: vi.fn().mockResolvedValue('https://res.cloudinary.com/test/new.jpg')
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

  it('shows Change photo button for partner workouts in lightbox and calls partner endpoint', async () => {
    const partnerWorkout = {
      id: 7,
      date: '2026-05-01T00:00:00',
      photo_url: 'https://res.cloudinary.com/test/old.jpg',
      notes: 'Partner workout',
      isPartner: true,
    }
    api.get
      .mockResolvedValueOnce([])                  // /workouts
      .mockResolvedValueOnce([partnerWorkout])     // /partner/workouts
    api.put.mockResolvedValue({ photo_url: 'https://res.cloudinary.com/test/new.jpg' })

    renderPhotos()
    await waitFor(() => expect(screen.getByAltText('Partner workout')).toBeInTheDocument())
    fireEvent.click(screen.getByAltText('Partner workout'))

    expect(screen.getByRole('button', { name: /change photo/i })).toBeInTheDocument()

    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    const input = screen.getByTestId('partner-photo-input')
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('/partner/workouts/7/photo', expect.objectContaining({ photo_url: 'https://res.cloudinary.com/test/new.jpg' }))
    )
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

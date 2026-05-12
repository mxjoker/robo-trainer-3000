import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Photos from '../pages/Photos'

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), put: vi.fn(), post: vi.fn() }
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

const standalonePhoto = {
  id: 50,
  date: '2026-04-20',
  photo_url: 'https://res.cloudinary.com/test/image/upload/v1/standalone.jpg',
  notes: 'Week 8 check-in',
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
    api.get
      .mockResolvedValueOnce([workoutWithPhoto, workoutNoPhoto])  // /workouts
      .mockResolvedValueOnce([])   // /photos
      .mockResolvedValueOnce([])   // /partner/workouts
      .mockResolvedValueOnce([])   // /partner/photos
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
      .mockResolvedValueOnce([])                 // /workouts
      .mockResolvedValueOnce([])                 // /photos
      .mockResolvedValueOnce([partnerWorkout])   // /partner/workouts
      .mockResolvedValueOnce([])                 // /partner/photos
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
    api.get
      .mockResolvedValueOnce([workoutWithPhoto, marchWorkout])  // /workouts
      .mockResolvedValueOnce([])   // /photos
      .mockResolvedValueOnce([])   // /partner/workouts
      .mockResolvedValueOnce([])   // /partner/photos
    renderPhotos()
    await waitFor(() => {
      expect(screen.getByText('April 2026')).toBeInTheDocument()
      expect(screen.getByText('March 2026')).toBeInTheDocument()
    })
  })

  it('renders standalone photo tile with camera badge', async () => {
    api.get
      .mockResolvedValueOnce([])                // /workouts
      .mockResolvedValueOnce([standalonePhoto]) // /photos
      .mockResolvedValueOnce([])                // /partner/workouts
      .mockResolvedValueOnce([])                // /partner/photos

    renderPhotos()
    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Week 8 check-in/i })).toBeInTheDocument()
    })
    // Camera badge rendered for standalone
    expect(screen.getByTestId('standalone-badge-50')).toBeInTheDocument()
  })

  it('merges workout and standalone photos in same month group', async () => {
    const sameMonthWorkout = { ...workoutWithPhoto, id: 20, date: '2026-04-15', notes: 'Leg Day' }
    api.get
      .mockResolvedValueOnce([sameMonthWorkout])  // /workouts
      .mockResolvedValueOnce([standalonePhoto])   // /photos
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    renderPhotos()
    await waitFor(() => expect(screen.getByText('April 2026')).toBeInTheDocument())
    expect(screen.getByRole('img', { name: /Leg Day/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Week 8 check-in/i })).toBeInTheDocument()
  })

  it('shows upload button on the Photos page', async () => {
    api.get.mockResolvedValue([])
    renderPhotos()
    await waitFor(() => expect(screen.getByRole('button', { name: /add photo/i })).toBeInTheDocument())
  })

  it('opens upload modal when the add photo button is clicked', async () => {
    api.get.mockResolvedValue([])
    renderPhotos()
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /add photo/i })))
    expect(screen.getByPlaceholderText(/caption/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
  })

  it('posts to /photos for own photo and adds to grid', async () => {
    const { uploadToCloudinary } = await import('../services/cloudinaryService')
    api.get.mockResolvedValue([])
    api.post.mockResolvedValue({
      id: 99,
      date: '2026-05-12',
      photo_url: 'https://res.cloudinary.com/test/new.jpg',
      notes: 'Test upload',
    })

    renderPhotos()
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /add photo/i })))

    fireEvent.change(screen.getByPlaceholderText(/caption/i), { target: { value: 'Test upload' } })

    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    const fileInput = screen.getByTestId('photo-upload-input')
    fireEvent.change(fileInput, { target: { files: [file] } })

    fireEvent.click(screen.getByRole('button', { name: /upload/i }))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/photos', expect.objectContaining({
        notes: 'Test upload',
        photo_url: 'https://res.cloudinary.com/test/new.jpg',
      }))
    )
  })
})

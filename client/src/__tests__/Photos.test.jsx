import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  }
}))

import { api } from '../api/client'
import Photos from '../pages/Photos'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Photos page', () => {
  it('renders empty state when no photos', async () => {
    api.get.mockResolvedValue({ data: [] })
    render(<Photos />)
    await waitFor(() => {
      expect(screen.getByText(/no photos yet/i)).toBeTruthy()
    })
  })

  it('renders thumbnail grid when photos are returned', async () => {
    const photos = [
      { id: 1, date: '2026-04-26', label: 'Front' },
      { id: 2, date: '2026-04-20', label: null },
    ]
    api.get.mockImplementation((url) => {
      if (url === '/photos') return Promise.resolve({ data: photos })
      // single-photo fetches for thumbnails
      const id = parseInt(url.split('/').pop(), 10)
      const photo = photos.find(p => p.id === id)
      return Promise.resolve({ data: { ...photo, data_url: 'data:image/jpeg;base64,abc' } })
    })
    render(<Photos />)
    await waitFor(() => {
      expect(screen.getByText('2026-04-26')).toBeTruthy()
    })
  })

  it('renders the add button', async () => {
    api.get.mockResolvedValue({ data: [] })
    render(<Photos />)
    await waitFor(() => {
      expect(screen.getByText('+ Add')).toBeTruthy()
    })
  })
})

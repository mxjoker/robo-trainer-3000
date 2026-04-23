import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import * as AuthContextModule from '../context/AuthContext'

vi.mock('../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn().mockRejectedValue(new Error('not mocked')),
    post: vi.fn(),
  }
}))

import { api } from '../api/client'

describe('App routing', () => {
  beforeEach(() => {
    api.get.mockRejectedValue(new Error('not mocked'))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('unauthenticated user is redirected to /login', async () => {
    AuthContextModule.useAuth.mockReturnValue({ currentUser: null, loading: false })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Robo Trainer')).toBeInTheDocument()
    })
  })

  it('unauthenticated user at /stats is redirected to /login', async () => {
    AuthContextModule.useAuth.mockReturnValue({ currentUser: null, loading: false })

    render(
      <MemoryRouter initialEntries={['/stats']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Robo Trainer')).toBeInTheDocument()
    })
  })

  it('shows loading state when loading is true', () => {
    AuthContextModule.useAuth.mockReturnValue({ currentUser: null, loading: true })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('authenticated user sees dashboard at /', async () => {
    const mockUser = { id: 1, email: 'a@b.com', name: 'Alice', partner_id: null }
    AuthContextModule.useAuth.mockReturnValue({ currentUser: mockUser, loading: false })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Day streak')).toBeInTheDocument()
    })
  })

  it('authenticated user sees BottomNav', async () => {
    const mockUser = { id: 1, email: 'a@b.com', name: 'Alice', partner_id: null }
    AuthContextModule.useAuth.mockReturnValue({ currentUser: mockUser, loading: false })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Stats')).toBeInTheDocument()
    })
  })

  it('authenticated user at /login is redirected to dashboard', async () => {
    const mockUser = { id: 1, email: 'a@b.com', name: 'Alice', partner_id: null }
    AuthContextModule.useAuth.mockReturnValue({ currentUser: mockUser, loading: false })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Day streak')).toBeInTheDocument()
    })
  })
})

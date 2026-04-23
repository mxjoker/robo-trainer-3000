import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../context/AuthContext'

// Helper consumer component
function AuthConsumer() {
  const { currentUser, loading, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'ready'}</span>
      <span data-testid="user">{currentUser ? currentUser.email : 'none'}</span>
      <button onClick={() => login('a@b.com', 'pass')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

function makeFetchResponse({ status = 200, body = null, ok = true }) {
  return {
    ok,
    status,
    statusText: 'Error',
    json: () => Promise.resolve(body),
  }
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loading starts true and becomes false after initialization (no token)', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    // loading should resolve quickly since there's no token
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready')
    })
  })

  it('if no token in localStorage, currentUser stays null', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready')
    })

    expect(screen.getByTestId('user').textContent).toBe('none')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('login() calls POST /auth/login, sets localStorage, sets currentUser', async () => {
    const mockUser = { id: 1, email: 'a@b.com', name: 'Alice' }
    fetch.mockResolvedValueOnce(makeFetchResponse({ status: 200, body: { token: 'tok123', user: mockUser } }))

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready')
    })

    await act(async () => {
      screen.getByText('login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('a@b.com')
    })

    expect(localStorage.getItem('rt_token')).toBe('tok123')
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('logout() removes token and clears currentUser', async () => {
    // Set up initial state with a logged-in user
    const mockUser = { id: 1, email: 'a@b.com', name: 'Alice' }
    // First call: POST /auth/login
    fetch.mockResolvedValueOnce(makeFetchResponse({ status: 200, body: { token: 'tok123', user: mockUser } }))

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready')
    })

    // Login first
    await act(async () => {
      screen.getByText('login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('a@b.com')
    })

    // Now logout
    await act(async () => {
      screen.getByText('logout').click()
    })

    expect(screen.getByTestId('user').textContent).toBe('none')
    expect(localStorage.getItem('rt_token')).toBeNull()
  })

  it('initializes user from token via /auth/me when token exists', async () => {
    localStorage.setItem('rt_token', 'existing-token')
    const mockUser = { id: 2, email: 'existing@user.com', name: 'Existing' }
    fetch.mockResolvedValueOnce(makeFetchResponse({ status: 200, body: mockUser }))

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready')
    })

    expect(screen.getByTestId('user').textContent).toBe('existing@user.com')
    expect(fetch).toHaveBeenCalledWith('/api/auth/me', expect.any(Object))
  })
})

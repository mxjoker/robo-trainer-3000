import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// Mock api
vi.mock('../api/client', () => ({
  api: {
    post: vi.fn(),
  }
}))

import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import Settings from '../pages/Settings'

const BASE_USER = { id: 1, name: 'Joe', email: 'joe@test.com', partner_id: null }
const MOCK_LOGOUT = vi.fn()

function renderSettings(userOverrides = {}) {
  useAuth.mockReturnValue({
    currentUser: { ...BASE_USER, ...userOverrides },
    logout: MOCK_LOGOUT,
  })
  return render(<Settings />)
}

describe('Settings', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows user name and email', () => {
    renderSettings()
    expect(screen.getByText('Joe')).toBeInTheDocument()
    expect(screen.getByText('joe@test.com')).toBeInTheDocument()
  })

  it('shows "Generate Invite Link" button when no partner_id', () => {
    renderSettings({ partner_id: null })
    expect(screen.getByText('Generate Invite Link')).toBeInTheDocument()
  })

  it('does NOT show invite section when partner_id is set', () => {
    renderSettings({ partner_id: 2 })
    expect(screen.queryByText('Generate Invite Link')).not.toBeInTheDocument()
    expect(screen.queryByText('Invite Partner')).not.toBeInTheDocument()
  })

  it('shows invite URL after clicking "Generate Invite Link"', async () => {
    api.post.mockResolvedValue({ inviteUrl: 'https://app.robotrainer.com/invite/abc123' })

    renderSettings({ partner_id: null })

    const btn = screen.getByText('Generate Invite Link')
    await userEvent.click(btn)

    await waitFor(() => {
      expect(screen.getByText('https://app.robotrainer.com/invite/abc123')).toBeInTheDocument()
    })
  })

  it('Sign Out button calls logout()', async () => {
    renderSettings()
    const btn = screen.getByText('Sign Out')
    await userEvent.click(btn)
    expect(MOCK_LOGOUT).toHaveBeenCalledTimes(1)
  })
})

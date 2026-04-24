import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))
vi.mock('../api/client', () => ({
  api: { post: vi.fn(), get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))
vi.mock('../services/pushService', () => ({
  requestAndSubscribe: vi.fn(),
  unsubscribe: vi.fn(),
  isSupported: vi.fn(() => true),
  currentPermission: vi.fn(() => 'granted'),
}))

import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { requestAndSubscribe, isSupported, currentPermission } from '../services/pushService'
import Settings from '../pages/Settings'

const BASE_USER = { id: 1, name: 'Joe', email: 'joe@test.com', partner_id: 2 }

function renderSettings() {
  useAuth.mockReturnValue({ currentUser: BASE_USER, logout: vi.fn() })
  return render(<Settings />)
}

const DEFAULT_PREFS = {
  water_enabled: false, water_interval_hours: 2, water_start_hour: 8, water_end_hour: 20,
  creatine_enabled: false, creatine_hour: 8,
  workout_enabled: false, workout_hour: 18,
}

describe('Notifications section in Settings', () => {
  beforeEach(() => {
    api.get.mockResolvedValue(DEFAULT_PREFS)
    api.put.mockResolvedValue({ ...DEFAULT_PREFS, water_enabled: true })
    isSupported.mockReturnValue(true)
    currentPermission.mockReturnValue('granted')
  })
  afterEach(() => vi.clearAllMocks())

  it('shows the Notifications section heading', async () => {
    renderSettings()
    await waitFor(() => expect(screen.getByText(/notifications/i)).toBeInTheDocument())
  })

  it('loads and displays current preferences on mount', async () => {
    renderSettings()
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/notifications/preferences'))
  })

  it('calls requestAndSubscribe when enabling notifications', async () => {
    currentPermission.mockReturnValue('default')
    requestAndSubscribe.mockResolvedValue()
    renderSettings()
    await waitFor(() => screen.getByText(/enable notifications/i))
    await userEvent.click(screen.getByText(/enable notifications/i))
    await waitFor(() => expect(requestAndSubscribe).toHaveBeenCalled())
  })

  it('saves preferences when Save is clicked', async () => {
    api.put.mockResolvedValue(DEFAULT_PREFS)
    renderSettings()
    await waitFor(() => screen.getByText(/save reminders/i))
    await userEvent.click(screen.getByText(/save reminders/i))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/notifications/preferences', expect.any(Object)))
  })
})

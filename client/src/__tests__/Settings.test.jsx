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

  describe('handleExport', () => {
    let createObjectURLSpy
    let revokeObjectURLSpy

    beforeEach(() => {
      localStorage.setItem('rt_token', 'test-token-123')
      createObjectURLSpy = vi.fn(() => 'blob:fake-url')
      revokeObjectURLSpy = vi.fn()
      URL.createObjectURL = createObjectURLSpy
      URL.revokeObjectURL = revokeObjectURLSpy
    })

    afterEach(() => {
      localStorage.removeItem('rt_token')
      vi.unstubAllGlobals()
    })

    it('happy path: calls fetch with correct URL and Authorization header, triggers blob download', async () => {
      const fakeBlob = new Blob(['data'], { type: 'text/csv' })
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(fakeBlob),
        })
      )
      vi.stubGlobal('fetch', mockFetch)

      // Render first so React can use createElement normally
      renderSettings()

      // Then intercept createElement to capture anchor creation
      const clickSpy = vi.fn()
      const fakeAnchor = { href: '', download: '', click: clickSpy }
      const origCreateElement = document.createElement.bind(document)
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return fakeAnchor
        return origCreateElement(tag)
      })

      const btn = screen.getByText('Download Export')
      await userEvent.click(btn)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/export?format=csv',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token-123',
            }),
          })
        )
      })

      await waitFor(() => {
        expect(createObjectURLSpy).toHaveBeenCalledWith(fakeBlob)
        expect(clickSpy).toHaveBeenCalled()
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-url')
      })

      createElementSpy.mockRestore()
    })

    it('error path: shows alert when res.ok is false', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
        })
      )
      vi.stubGlobal('fetch', mockFetch)

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      renderSettings()

      const btn = screen.getByText('Download Export')
      await userEvent.click(btn)

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Export failed'))
      })

      alertSpy.mockRestore()
    })

    it('exporting state: button shows "Exporting..." while fetch is pending', async () => {
      let resolveFetch
      const pendingPromise = new Promise(resolve => { resolveFetch = resolve })
      const mockFetch = vi.fn(() => pendingPromise)
      vi.stubGlobal('fetch', mockFetch)

      renderSettings()

      const btn = screen.getByText('Download Export')
      await userEvent.click(btn)

      await waitFor(() => {
        expect(screen.getByText('Exporting...')).toBeInTheDocument()
      })

      // Resolve to avoid hanging
      resolveFetch({ ok: false })
    })
  })
})

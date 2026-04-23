import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LogSheet from '../components/LogSheet'
import * as AuthContextModule from '../context/AuthContext'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})

const mockUserWithPartner = {
  id: 1,
  email: 'alice@example.com',
  name: 'Alice Smith',
  partner_id: 2,
  partner_name: 'Bob Jones'
}

const mockUserWithoutPartner = {
  id: 1,
  email: 'alice@example.com',
  name: 'Alice Smith',
  partner_id: null,
  partner_name: null
}

function renderLogSheet(user = mockUserWithPartner, onClose = vi.fn()) {
  AuthContextModule.useAuth.mockReturnValue({ currentUser: user })
  return render(
    <MemoryRouter>
      <LogSheet onClose={onClose} />
    </MemoryRouter>
  )
}

describe('LogSheet', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders title and type buttons', () => {
    renderLogSheet()
    expect(screen.getByText('What are you logging?')).toBeInTheDocument()
    expect(screen.getByText('Workout')).toBeInTheDocument()
    expect(screen.getByText('Wellness')).toBeInTheDocument()
  })

  it('shows partner button when user has partner_id', () => {
    renderLogSheet(mockUserWithPartner)
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('does not show partner button when user has no partner_id', () => {
    renderLogSheet(mockUserWithoutPartner)
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
  })

  it('shows "Start Workout" by default (workout type, only self selected)', () => {
    renderLogSheet()
    expect(screen.getByText('Start Workout')).toBeInTheDocument()
  })

  it('shows "Start Shared Workout" when both users are selected', async () => {
    renderLogSheet()
    // Partner button is Bob - click it to select
    const partnerBtn = screen.getByText('Bob').closest('button')
    fireEvent.click(partnerBtn)
    await waitFor(() => {
      expect(screen.getByText('Start Shared Workout')).toBeInTheDocument()
    })
  })

  it('shows shared workout info banner when both selected', async () => {
    renderLogSheet()
    const partnerBtn = screen.getByText('Bob').closest('button')
    fireEvent.click(partnerBtn)
    await waitFor(() => {
      expect(screen.getByText(/Shared workout/)).toBeInTheDocument()
    })
  })

  it('shows "Log Wellness" when wellness type is selected', async () => {
    renderLogSheet()
    fireEvent.click(screen.getByText('Wellness'))
    await waitFor(() => {
      expect(screen.getByText('Log Wellness')).toBeInTheDocument()
    })
  })

  it('navigates to /log/workout for solo workout', async () => {
    const onClose = vi.fn()
    renderLogSheet(mockUserWithPartner, onClose)
    fireEvent.click(screen.getByText('Start Workout'))
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/log/workout', expect.objectContaining({ state: expect.any(Object) }))
    })
  })

  it('navigates to /log/workout/shared for shared workout', async () => {
    const onClose = vi.fn()
    renderLogSheet(mockUserWithPartner, onClose)
    const partnerBtn = screen.getByText('Bob').closest('button')
    fireEvent.click(partnerBtn)
    await waitFor(() => {
      expect(screen.getByText('Start Shared Workout')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Start Shared Workout'))
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/log/workout/shared', expect.objectContaining({ state: expect.any(Object) }))
    })
  })

  it('navigates to /log/wellness for wellness type', async () => {
    const onClose = vi.fn()
    renderLogSheet(mockUserWithPartner, onClose)
    fireEvent.click(screen.getByText('Wellness'))
    await waitFor(() => {
      expect(screen.getByText('Log Wellness')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Log Wellness'))
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/log/wellness', expect.objectContaining({ state: expect.any(Object) }))
    })
  })

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn()
    renderLogSheet(mockUserWithPartner, onClose)
    // Click the overlay (not the sheet)
    const overlay = screen.getByText('What are you logging?').closest('div').parentElement.parentElement
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../pages/Dashboard'

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ currentUser: { id: 1, name: 'Alice' } })),
}))

// Mock api
vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  }
}))

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Tooltip: () => null,
}))

import { api } from '../api/client'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    // Default: all API calls reject (no data)
    api.get.mockRejectedValue(new Error('not found'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the day name and current month name', async () => {
    renderDashboard()
    const now = new Date()
    const dayName = DAYS[now.getDay()]
    const monthName = MONTHS[now.getMonth()]

    await waitFor(() => {
      expect(screen.getByText(dayName)).toBeInTheDocument()
      // Month name appears in the consistency StatCard title
      expect(screen.getAllByText(monthName).length).toBeGreaterThan(0)
    })
  })

  it('shows streak count when GET /stats/consistency returns data', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/stats/consistency') {
        return Promise.resolve({ current_streak: 7, workout_dates: [] })
      }
      return Promise.reject(new Error('not found'))
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument()
    })
  })

  it("shows today's pain and energy when wellness data is loaded", async () => {
    api.get.mockImplementation((path) => {
      if (path === '/wellness/today') {
        return Promise.resolve({ pain_level: 3, energy_level: 8 })
      }
      return Promise.reject(new Error('not found'))
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
    })
  })

  it('renders SparkBar when strength history exists', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/stats/prs') {
        return Promise.resolve([
          { exercise_id: 42, exercise_name: 'Squat', max_weight_lbs: '225' }
        ])
      }
      if (path === '/stats/strength/42') {
        return Promise.resolve([
          { date: '2026-04-17', max_weight_lbs: '200' },
          { date: '2026-04-18', max_weight_lbs: '210' },
          { date: '2026-04-19', max_weight_lbs: '225' },
        ])
      }
      return Promise.reject(new Error('not found'))
    })

    renderDashboard()

    await waitFor(() => {
      // SparkBar renders bars as divs; the exercise name should appear
      expect(screen.getByText('Squat')).toBeInTheDocument()
      // PR callout
      expect(screen.getByText('225 lbs — PR')).toBeInTheDocument()
    })
  })

  it('shows partner card when partner data is available', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/partner/profile') {
        return Promise.resolve({ id: 2, name: 'Bob' })
      }
      if (path === '/partner/workouts') {
        return Promise.resolve([{ id: 10, notes: 'Leg day' }])
      }
      if (path === '/partner/wellness') {
        return Promise.resolve([{ pain_level: 2, energy_level: 9 }])
      }
      return Promise.reject(new Error('not found'))
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument()
      expect(screen.getByText('Leg day')).toBeInTheDocument()
      expect(screen.getByText('Pain 2 · Energy 9')).toBeInTheDocument()
    })
  })
})

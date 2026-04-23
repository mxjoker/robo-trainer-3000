import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock api
vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  }
}))

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Line: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}))

import { api } from '../api/client'
import Stats from '../pages/Stats'

const EXERCISES = [
  { id: 1, name: 'Squat' },
  { id: 2, name: 'Bench Press' },
]

const PRS = [
  { exercise_id: 1, exercise_name: 'Squat', max_weight_lbs: '225' },
  { exercise_id: 2, exercise_name: 'Bench Press', max_weight_lbs: '185' },
]

const CONSISTENCY = {
  current_streak: 5,
  longest_streak: 12,
  total_workouts: 48,
}

const STRENGTH_DATA = [
  { date: '2026-04-01', max_weight_lbs: '200' },
  { date: '2026-04-10', max_weight_lbs: '215' },
  { date: '2026-04-20', max_weight_lbs: '225' },
]

const HEALTH_DATA = [
  { date: '2026-04-01', pain_level: 3, energy_level: 7 },
  { date: '2026-04-10', pain_level: 2, energy_level: 8 },
]

function renderStats() {
  return render(<Stats />)
}

describe('Stats', () => {
  beforeEach(() => {
    api.get.mockImplementation((path) => {
      if (path === '/exercises') return Promise.resolve(EXERCISES)
      if (path === '/stats/prs') return Promise.resolve(PRS)
      if (path === '/stats/consistency') return Promise.resolve(CONSISTENCY)
      if (path.startsWith('/stats/strength/')) return Promise.resolve(STRENGTH_DATA)
      if (path.startsWith('/stats/health')) return Promise.resolve(HEALTH_DATA)
      return Promise.reject(new Error('not found'))
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders Stats heading and three tab buttons', async () => {
    renderStats()
    expect(screen.getByText('Stats')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Strength')).toBeInTheDocument()
      expect(screen.getByText('Health')).toBeInTheDocument()
      expect(screen.getByText('Consistency')).toBeInTheDocument()
    })
  })

  it('strength tab is active by default and shows exercise select dropdown', async () => {
    renderStats()
    await waitFor(() => {
      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
      // Exercise names appear in the select options
      expect(screen.getAllByText('Squat').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Bench Press').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('clicking Health tab shows filter buttons', async () => {
    renderStats()
    const healthTab = screen.getByText('Health')
    await userEvent.click(healthTab)
    await waitFor(() => {
      expect(screen.getByText('7d')).toBeInTheDocument()
      expect(screen.getByText('30d')).toBeInTheDocument()
      expect(screen.getByText('90d')).toBeInTheDocument()
      expect(screen.getByText('All')).toBeInTheDocument()
    })
  })

  it('clicking Consistency tab shows streak numbers', async () => {
    renderStats()
    const consistencyTab = screen.getByText('Consistency')
    await userEvent.click(consistencyTab)
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('48')).toBeInTheDocument()
      expect(screen.getByText('Current streak')).toBeInTheDocument()
      expect(screen.getByText('Longest streak')).toBeInTheDocument()
      expect(screen.getByText('Total workouts')).toBeInTheDocument()
    })
  })

  it('PRs list renders exercise names and weights in strength tab', async () => {
    renderStats()
    await waitFor(() => {
      // Exercise names appear in both the select dropdown and the PR rows
      expect(screen.getAllByText('Squat').length).toBeGreaterThanOrEqual(2)
      expect(screen.getAllByText('Bench Press').length).toBeGreaterThanOrEqual(2)
      // PR weight divs contain the weight number and " lbs" as adjacent text nodes
      // Use getAllByText with exact:false to find partial matches
      const weightEls = screen.getAllByText(/lbs/, { exact: false })
      const texts = weightEls.map(el => el.textContent)
      expect(texts.some(t => t.includes('225'))).toBe(true)
      expect(texts.some(t => t.includes('185'))).toBe(true)
    })
  })

  it('changing exercise dropdown triggers new strength fetch for the selected exercise', async () => {
    renderStats()
    // Wait for the select to be populated with exercises
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getAllByText('Bench Press').length).toBeGreaterThanOrEqual(1)
    })

    // Clear mock calls recorded during initial load
    api.get.mockClear()

    // Change the select to exercise id 2 (Bench Press)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '2' } })

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/stats/strength/2')
    })
  })

  it('clicking 7d filter on Health tab triggers health data fetch with start param', async () => {
    renderStats()

    // Switch to Health tab
    const healthTab = screen.getByText('Health')
    await userEvent.click(healthTab)

    await waitFor(() => {
      expect(screen.getByText('7d')).toBeInTheDocument()
    })

    // Clear mock calls recorded during tab switch
    api.get.mockClear()

    // Click the 7d filter button
    fireEvent.click(screen.getByText('7d'))

    await waitFor(() => {
      const calls = api.get.mock.calls.map(c => c[0])
      expect(calls.some(url => url.startsWith('/stats/health?start='))).toBe(true)
    })
  })
})

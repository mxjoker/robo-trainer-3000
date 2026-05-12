import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CalendarGrid from '../components/CalendarGrid'

const APRIL_2026 = { year: 2026, month: 3 } // month is 0-indexed

function makeMap(entries = {}) {
  return entries
}

describe('CalendarGrid', () => {
  it('renders the month name and year in the header', () => {
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={APRIL_2026}
        onDaySelect={() => {}}
        onMonthChange={() => {}}
        loading={false}
      />
    )
    expect(screen.getByText('April 2026')).toBeInTheDocument()
  })

  it('renders 30 day cells for April', () => {
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={APRIL_2026}
        onDaySelect={() => {}}
        onMonthChange={() => {}}
        loading={false}
      />
    )
    // Days 1–30
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.queryByText('31')).not.toBeInTheDocument()
  })

  it('shows a workout dot for a day with a workout entry', () => {
    const dayMap = { '2026-04-10': { workout: { id: 1 } } }
    render(
      <CalendarGrid
        dayMap={dayMap}
        currentMonth={APRIL_2026}
        onDaySelect={() => {}}
        onMonthChange={() => {}}
        loading={false}
      />
    )
    expect(screen.getByTestId('workout-dot-2026-04-10')).toBeInTheDocument()
  })

  it('shows a wellness dot for a day with a wellness entry', () => {
    const dayMap = { '2026-04-10': { wellness: { id: 1 } } }
    render(
      <CalendarGrid
        dayMap={dayMap}
        currentMonth={APRIL_2026}
        onDaySelect={() => {}}
        onMonthChange={() => {}}
        loading={false}
      />
    )
    expect(screen.getByTestId('wellness-dot-2026-04-10')).toBeInTheDocument()
  })

  it('calls onDaySelect with the YYYY-MM-DD string when a day cell is clicked', () => {
    const onDaySelect = vi.fn()
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={APRIL_2026}
        onDaySelect={onDaySelect}
        onMonthChange={() => {}}
        loading={false}
      />
    )
    fireEvent.click(screen.getByTestId('day-cell-2026-04-15'))
    expect(onDaySelect).toHaveBeenCalledWith('2026-04-15')
  })

  it('disables prev and next buttons while loading', () => {
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={APRIL_2026}
        onDaySelect={() => {}}
        onMonthChange={() => {}}
        loading={true}
      />
    )
    expect(screen.getByTestId('prev-month-btn')).toBeDisabled()
    expect(screen.getByTestId('next-month-btn')).toBeDisabled()
  })

  it('calls onMonthChange with the previous month when prev button clicked', () => {
    const onMonthChange = vi.fn()
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={APRIL_2026}
        onDaySelect={() => {}}
        onMonthChange={onMonthChange}
        loading={false}
      />
    )
    fireEvent.click(screen.getByTestId('prev-month-btn'))
    expect(onMonthChange).toHaveBeenCalledWith({ year: 2026, month: 2 })
  })

  it('calls onMonthChange with the next month when next button clicked', () => {
    const onMonthChange = vi.fn()
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={APRIL_2026}
        onDaySelect={() => {}}
        onMonthChange={onMonthChange}
        loading={false}
      />
    )
    fireEvent.click(screen.getByTestId('next-month-btn'))
    expect(onMonthChange).toHaveBeenCalledWith({ year: 2026, month: 4 })
  })

  it('wraps year correctly when going prev from January', () => {
    const onMonthChange = vi.fn()
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={{ year: 2026, month: 0 }}
        onDaySelect={() => {}}
        onMonthChange={onMonthChange}
        loading={false}
      />
    )
    fireEvent.click(screen.getByTestId('prev-month-btn'))
    expect(onMonthChange).toHaveBeenCalledWith({ year: 2025, month: 11 })
  })

  it('wraps year correctly when going next from December', () => {
    const onMonthChange = vi.fn()
    render(
      <CalendarGrid
        dayMap={makeMap()}
        currentMonth={{ year: 2026, month: 11 }}
        onDaySelect={() => {}}
        onMonthChange={onMonthChange}
        loading={false}
      />
    )
    fireEvent.click(screen.getByTestId('next-month-btn'))
    expect(onMonthChange).toHaveBeenCalledWith({ year: 2027, month: 0 })
  })

  it('applies accent ring to today\'s cell', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-15T12:00:00'))
    render(
      <CalendarGrid
        dayMap={{}}
        currentMonth={{ year: 2026, month: 3 }}
        onDaySelect={() => {}}
        onMonthChange={() => {}}
        loading={false}
      />
    )
    const cell = screen.getByTestId('day-cell-2026-04-15')
    expect(cell.style.border).toBe('1px solid var(--accent)')
    vi.useRealTimers()
  })

  it('renders future day cells at 40% opacity', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-15T12:00:00'))
    render(
      <CalendarGrid
        dayMap={{}}
        currentMonth={{ year: 2026, month: 3 }}
        onDaySelect={() => {}}
        onMonthChange={() => {}}
        loading={false}
      />
    )
    const futureCell = screen.getByTestId('day-cell-2026-04-20')
    expect(futureCell.style.opacity).toBe('0.4')
    vi.useRealTimers()
  })
})

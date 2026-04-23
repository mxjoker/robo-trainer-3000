import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StatCard from '../components/StatCard'

describe('StatCard', () => {
  it('renders title', () => {
    render(<StatCard title="Strength">content</StatCard>)
    expect(screen.getByText('Strength')).toBeInTheDocument()
  })

  it('renders link button when linkLabel provided', () => {
    render(<StatCard title="Strength" linkLabel="All lifts" onLink={() => {}}>content</StatCard>)
    expect(screen.getByText('All lifts')).toBeInTheDocument()
  })

  it('does not render link button when linkLabel not provided', () => {
    render(<StatCard title="Strength">content</StatCard>)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onLink when link button clicked', () => {
    const onLink = vi.fn()
    render(<StatCard title="Strength" linkLabel="All lifts" onLink={onLink}>content</StatCard>)
    fireEvent.click(screen.getByText('All lifts'))
    expect(onLink).toHaveBeenCalledTimes(1)
  })
})

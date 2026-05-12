import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../context/ThemeContext'

function Probe() {
  const { scheme, setScheme, accent } = useTheme()
  return (
    <>
      <div data-testid="scheme">{scheme}</div>
      <div data-testid="accent">{accent}</div>
      <button onClick={() => setScheme('blue')}>blue</button>
      <button onClick={() => setScheme('green')}>green</button>
    </>
  )
}

beforeEach(() => localStorage.clear())

describe('ThemeContext', () => {
  it('defaults to blue scheme', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('accent').textContent).toBe('#4db6f7')
  })

  it('switches scheme and persists to localStorage', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>)
    fireEvent.click(screen.getByText('blue'))
    expect(screen.getByTestId('accent').textContent).toBe('#4db6f7')
    expect(localStorage.getItem('rt_color_scheme')).toBe('blue')
  })

  it('reads persisted scheme from localStorage on mount', () => {
    localStorage.setItem('rt_color_scheme', 'green')
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByTestId('accent').textContent).toBe('#4caf8a')
  })
})

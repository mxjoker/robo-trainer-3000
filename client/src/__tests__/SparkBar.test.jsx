import { describe, it, expect } from 'vitest'
import { render, container } from '@testing-library/react'
import SparkBar from '../components/SparkBar'

describe('SparkBar', () => {
  it('renders empty placeholder when data is empty', () => {
    const { container } = render(<SparkBar data={[]} />)
    // Should render a single div (placeholder) with no children bars
    const divs = container.querySelectorAll('div')
    expect(divs.length).toBe(1)
  })

  it('renders bars with correct count when data is provided', () => {
    const data = [
      { value: 100, label: 'Mon' },
      { value: 150, label: 'Tue' },
      { value: 120, label: 'Wed' },
    ]
    const { container } = render(<SparkBar data={data} />)
    // Outer wrapper + 3 bars = 4 divs
    const divs = container.querySelectorAll('div')
    expect(divs.length).toBe(4)
  })

  it('last bar has full color (not the dimmer variant)', () => {
    const data = [
      { value: 100, label: 'Mon' },
      { value: 150, label: 'Tue' },
    ]
    const { container } = render(<SparkBar data={data} color="#7c6af7" />)
    const bars = container.querySelectorAll('div > div')
    // First bar has dimmer color (the color string with appended '55')
    // Last bar has the full color without the suffix
    // jsdom normalizes hex colors, so we check the last bar differs from first
    // by checking the last bar's background does not include '55' suffix
    const firstBg = bars[0].style.background
    const lastBg = bars[1].style.background
    // The last bar should use the plain color (no alpha suffix applied)
    // Both should contain some form of the color, but differ in alpha
    expect(firstBg).not.toBe(lastBg)
    // last bar background should equal the plain color value
    expect(lastBg).not.toContain('55')
  })
})

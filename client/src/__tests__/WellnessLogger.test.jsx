import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WellnessLogger from '../screens/WellnessLogger'

// Mock api
vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  }
}))

// Mock react-router-dom hooks
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import { api } from '../api/client'

function renderLogger() {
  return render(
    <MemoryRouter>
      <WellnessLogger />
    </MemoryRouter>
  )
}

describe('WellnessLogger', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    api.get.mockResolvedValue(null)
    api.post.mockResolvedValue({ id: 1 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders "Wellness Check-In" header and "Cancel" button', () => {
    renderLogger()
    expect(screen.getByText('Wellness Check-In')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('pain area tags toggle on/off — clicking "Knee" selects it, clicking again deselects', () => {
    renderLogger()
    const kneeBtn = screen.getByText('Knee')
    expect(kneeBtn).toBeInTheDocument()

    // Click once — should be selected (active style has background #7c6af7)
    fireEvent.click(kneeBtn)
    // After first click, the button is active — verify by clicking Save and checking payload later,
    // or verify the style changed. We check that a second click deselects it via the save payload test.
    // For a direct check, click twice and verify state returns to inactive.
    fireEvent.click(kneeBtn)
    // If we click save now, pain_areas should be empty again
    fireEvent.click(screen.getByText('Save Check-In'))
    return waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/wellness', expect.objectContaining({
        pain_areas: [],
      }))
    })
  })

  it('creatine toggle switches from "No" to "Yes — taken today"', () => {
    renderLogger()
    const toggleBtn = screen.getByText('No')
    expect(toggleBtn).toBeInTheDocument()

    fireEvent.click(toggleBtn)

    expect(screen.getByText('Yes \u2014 taken today')).toBeInTheDocument()
    expect(screen.queryByText('No')).not.toBeInTheDocument()
  })

  it('save() calls api.post("/wellness", ...) with correct payload and navigates to "/"', async () => {
    renderLogger()

    // Select Knee pain area
    fireEvent.click(screen.getByText('Knee'))

    // Toggle creatine on
    fireEvent.click(screen.getByText('No'))

    // Click save
    fireEvent.click(screen.getByText('Save Check-In'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/wellness', expect.objectContaining({
        pain_level: expect.any(Number),
        energy_level: expect.any(Number),
        mood: expect.any(Number),
        creatine_taken: true,
        pain_areas: ['knee'],
      }))
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('save button is disabled while saving', async () => {
    let resolveSave
    api.post.mockImplementationOnce(() => new Promise(res => { resolveSave = res }))

    renderLogger()

    fireEvent.click(screen.getByText('Save Check-In'))

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument()
      expect(screen.getByText('Saving...').closest('button')).toBeDisabled()
    })

    // Resolve to clean up
    resolveSave({ id: 1 })
  })

  // ── Meds & Supplements tests ──

  it('renders the Meds & Supplements section', () => {
    renderLogger()
    expect(screen.getByText('Meds & Supplements')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Type med name, press Enter to add...')).toBeInTheDocument()
  })

  it('pressing Enter after typing a med name adds it as a chip', async () => {
    renderLogger()
    const input = screen.getByPlaceholderText('Type med name, press Enter to add...')
    fireEvent.change(input, { target: { value: 'Creatine' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('Creatine')).toBeInTheDocument()
    })
    expect(input.value).toBe('')
  })

  it('clicking × on a chip removes it', async () => {
    renderLogger()
    const input = screen.getByPlaceholderText('Type med name, press Enter to add...')
    fireEvent.change(input, { target: { value: 'Fish Oil' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(screen.getByText('Fish Oil')).toBeInTheDocument())

    const removeBtn = screen.getByLabelText('Remove Fish Oil')
    fireEvent.click(removeBtn)

    await waitFor(() => {
      expect(screen.queryByText('Fish Oil')).not.toBeInTheDocument()
    })
  })

  it('pre-populates meds_taken from existing today\'s log on load', async () => {
    api.get.mockResolvedValue({
      pain_level: 3,
      energy_level: 7,
      mood: 6,
      sleep_hours: 8,
      water_oz: 80,
      creatine_taken: false,
      pain_areas: [],
      notes: '',
      meds_taken: ['Magnesium', 'Vitamin C']
    })

    renderLogger()

    await waitFor(() => {
      expect(screen.getByText('Magnesium')).toBeInTheDocument()
      expect(screen.getByText('Vitamin C')).toBeInTheDocument()
    })
  })

  it('includes meds_taken in the POST body when saving', async () => {
    renderLogger()
    const input = screen.getByPlaceholderText('Type med name, press Enter to add...')
    fireEvent.change(input, { target: { value: 'Zinc' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(screen.getByText('Zinc')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Save Check-In'))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/wellness', expect.objectContaining({
        meds_taken: ['Zinc']
      }))
    })
  })
})

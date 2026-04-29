import { describe, it, expect } from 'vitest'
import { parseClaudeTemplate } from '../utils/parseClaudeTemplate'

const exercises = [
  { id: 1, name: 'Bench Press' },
  { id: 2, name: 'Squat' },
  { id: 3, name: 'Pull-up' },
]

describe('parseClaudeTemplate', () => {
  it('parses a weighted line', () => {
    const { parsed, unrecognized } = parseClaudeTemplate('Bench Press: 3x8 @ 185', exercises)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toEqual({
      exerciseName: 'Bench Press',
      exerciseId: 1,
      sets: 3,
      reps: 8,
      weight: 185,
      partnerWeight: null,
    })
    expect(unrecognized).toHaveLength(0)
  })

  it('parses a bodyweight line with no weight', () => {
    const { parsed } = parseClaudeTemplate('Pull-up: 3x8', exercises)
    expect(parsed[0].weight).toBeNull()
    expect(parsed[0].sets).toBe(3)
    expect(parsed[0].reps).toBe(8)
    expect(parsed[0].exerciseId).toBe(3)
  })

  it('matches exercise names case-insensitively', () => {
    const { parsed } = parseClaudeTemplate('bench press: 3x8 @ 185', exercises)
    expect(parsed[0].exerciseId).toBe(1)
  })

  it('sets exerciseId to null when exercise is not in the list', () => {
    const { parsed } = parseClaudeTemplate('Romanian Deadlift: 3x10 @ 135', exercises)
    expect(parsed[0].exerciseId).toBeNull()
    expect(parsed[0].exerciseName).toBe('Romanian Deadlift')
    expect(parsed[0].sets).toBe(3)
    expect(parsed[0].reps).toBe(10)
    expect(parsed[0].weight).toBe(135)
  })

  it('collects unrecognized lines', () => {
    const { unrecognized } = parseClaudeTemplate('not a valid line', exercises)
    expect(unrecognized).toEqual(['not a valid line'])
  })

  it('skips blank lines without adding to unrecognized', () => {
    const { parsed, unrecognized } = parseClaudeTemplate('\nBench Press: 3x8 @ 185\n\nSquat: 3x5 @ 225\n', exercises)
    expect(parsed).toHaveLength(2)
    expect(unrecognized).toHaveLength(0)
  })

  it('parses multiple exercises in one block', () => {
    const text = 'Bench Press: 3x8 @ 185\nSquat: 3x5 @ 225\nPull-up: 3x8'
    const { parsed } = parseClaudeTemplate(text, exercises)
    expect(parsed).toHaveLength(3)
    expect(parsed[2].exerciseName).toBe('Pull-up')
  })

  it('handles the × unicode multiplication sign', () => {
    const { parsed } = parseClaudeTemplate('Bench Press: 3×8 @ 185', exercises)
    expect(parsed[0].sets).toBe(3)
    expect(parsed[0].reps).toBe(8)
  })

  it('handles decimal weights', () => {
    const { parsed } = parseClaudeTemplate('Bench Press: 3x8 @ 135.5', exercises)
    expect(parsed[0].weight).toBe(135.5)
  })

  it('parses dual-weight format for partner workouts', () => {
    const { parsed } = parseClaudeTemplate('Leg Press: 3x10 @ 150 / 40', exercises)
    expect(parsed[0].weight).toBe(150)
    expect(parsed[0].partnerWeight).toBe(40)
    expect(parsed[0].reps).toBe(10)
  })

  it('sets partnerWeight to null for single-weight lines', () => {
    const { parsed } = parseClaudeTemplate('Bench Press: 3x8 @ 185', exercises)
    expect(parsed[0].partnerWeight).toBeNull()
  })
})

/**
 * Supported formats:
 *   "Exercise Name: 3x8 @ 185"        — single weight (weight: 185, partnerWeight: null)
 *   "Exercise Name: 3x8 @ 150 / 40"   — dual weight (joe: 150, partner: 40)
 *   "Exercise Name: 3x8"              — bodyweight (weight: null, partnerWeight: null)
 */
export function parseClaudeTemplate(text, exercises) {
  const parsed = []
  const unrecognized = []

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Match "Name: NxN" with optional "@ W" or "@ W / P"
    const match = trimmed.match(/^(.+?):\s*(\d+)[xX×](\d+)(?:\s*@\s*([\d.]+)(?:\s*\/\s*([\d.]+))?)?/)
    if (!match) {
      unrecognized.push(trimmed)
      continue
    }

    const [, rawName, sets, reps, weight, partnerWeight] = match
    const name = rawName.trim()
    const exercise = exercises.find(e => e.name.toLowerCase() === name.toLowerCase())

    parsed.push({
      exerciseName: name,
      exerciseId: exercise?.id ?? null,
      sets: parseInt(sets, 10),
      reps: parseInt(reps, 10),
      weight: weight != null ? parseFloat(weight) : null,
      partnerWeight: partnerWeight != null ? parseFloat(partnerWeight) : null,
    })
  }

  return { parsed, unrecognized }
}

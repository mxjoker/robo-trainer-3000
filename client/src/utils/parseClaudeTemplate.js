/**
 * Parse a Claude-generated workout template into structured exercise data.
 *
 * Supported formats:
 *   "Exercise Name: 3x8 @ 185"  — weighted lift (weight in lbs)
 *   "Exercise Name: 3x8"        — bodyweight lift (weight: null)
 *   Blank lines are skipped. Unrecognized lines are collected.
 *
 * @param {string} text
 * @param {{ id: number, name: string }[]} exercises
 * @returns {{ parsed: Array<{exerciseName: string, exerciseId: number|null, sets: number, reps: number, weight: number|null}>, unrecognized: string[] }}
 */
export function parseClaudeTemplate(text, exercises) {
  const parsed = []
  const unrecognized = []

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Match "Name: NxN" or "Name: N×N" with optional "@ W"
    const match = trimmed.match(/^(.+?):\s*(\d+)[xX×](\d+)(?:\s*@\s*([\d.]+))?/)
    if (!match) {
      unrecognized.push(trimmed)
      continue
    }

    const [, rawName, sets, reps, weight] = match
    const name = rawName.trim()
    const exercise = exercises.find(e => e.name.toLowerCase() === name.toLowerCase())

    parsed.push({
      exerciseName: name,
      exerciseId: exercise?.id ?? null,
      sets: parseInt(sets, 10),
      reps: parseInt(reps, 10),
      weight: weight != null ? parseFloat(weight) : null,
    })
  }

  return { parsed, unrecognized }
}

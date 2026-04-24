function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  })
}

export default function DaySheet({ date, data, onClose, onLogWorkout, onLogWellness }) {
  if (!date) return null

  const workout = data?.workout
  const wellness = data?.wellness
  const isEmpty = !workout && !wellness

  const exerciseNames = [...new Set((workout?.sets ?? []).map(s => s.exercise_name))]

  return (
    <>
      <div
        data-testid="day-sheet-backdrop"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
        background: '#12121f', borderRadius: '16px 16px 0 0',
        padding: '12px 16px 40px', maxWidth: 480, margin: '0 auto',
      }}>
        <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 14 }}>
          {formatDate(date)}
        </div>

        {isEmpty ? (
          <div style={{ textAlign: 'center', paddingBottom: 8 }}>
            <div style={{ color: '#555', fontSize: 13, marginBottom: 20 }}>Nothing logged for this day</div>
            <button
              onClick={onLogWorkout}
              style={{ width: '100%', padding: 12, background: '#4caf5022', border: '1px solid #4caf50', borderRadius: 10, color: '#4caf50', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}
            >Log Workout</button>
            <button
              onClick={onLogWellness}
              style={{ width: '100%', padding: 12, background: '#7c6af722', border: '1px solid #7c6af7', borderRadius: 10, color: '#a090ff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >Log Wellness</button>
          </div>
        ) : (
          <>
            {workout && (
              <div style={{ background: '#1a1a2e', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ color: '#4caf50', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                  💪 {workout.notes || 'Workout'}
                  {workout.duration_minutes != null && (
                    <span style={{ color: '#555', fontWeight: 400, fontSize: 11 }}> · {workout.duration_minutes} min</span>
                  )}
                </div>
                {exerciseNames.length > 0 && (
                  <div style={{ color: '#888', fontSize: 12, lineHeight: 1.6 }}>
                    {exerciseNames.join(' · ')}
                  </div>
                )}
              </div>
            )}
            {wellness && (
              <div style={{ background: '#1a1a2e', borderRadius: 10, padding: 14 }}>
                <div style={{ color: '#a090ff', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>🌿 Wellness</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                  {[
                    ['Energy', wellness.energy_level, '#7c6af7'],
                    ['Mood', wellness.mood, '#4caf50'],
                    ['Pain', wellness.pain_level, '#f7a76c'],
                  ].map(([label, value, color]) => value != null && (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
                      <div style={{ fontSize: 10, color: '#555' }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                  {wellness.sleep_hours != null && <span>Sleep {wellness.sleep_hours}h · </span>}
                  {wellness.water_oz != null && <span>Water {wellness.water_oz > 0 ? '✓' : '✗'} · </span>}
                  <span>Creatine {wellness.creatine_taken ? '✓' : '✗'}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

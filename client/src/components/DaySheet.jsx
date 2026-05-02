import { useState, useRef } from 'react'
import { api } from '../api/client'
import { uploadToCloudinary } from '../services/cloudinaryService'

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  })
}

export default function DaySheet({ date, data, onClose, onLogWorkout, onLogWellness, onPhotoChange }) {
  const workout = data?.workout
  const wellness = data?.wellness

  const [photoUrl, setPhotoUrl] = useState(workout?.photo_url ?? null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const fileInputRef = useRef(null)

  if (!date) return null

  const isEmpty = !workout && !wellness
  const exerciseNames = [...new Set((workout?.sets ?? []).map(s => s.exercise_name))]

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoLoading(true)
    setPhotoError(null)
    try {
      const url = await uploadToCloudinary(file)
      const updated = await api.put(`/workouts/${workout.id}/photo`, { photo_url: url })
      setPhotoUrl(updated.photo_url)
      onPhotoChange?.(workout.id, updated.photo_url)
    } catch (err) {
      console.error('Photo upload error:', err)
      setPhotoError('Upload failed. Please try again.')
    } finally {
      setPhotoLoading(false)
      e.target.value = ''
    }
  }

  async function handleRemove() {
    setPhotoLoading(true)
    setPhotoError(null)
    try {
      await api.put(`/workouts/${workout.id}/photo`, { photo_url: null })
      setPhotoUrl(null)
      onPhotoChange?.(workout.id, null)
    } catch {
      setPhotoError('Could not remove photo. Please try again.')
    } finally {
      setPhotoLoading(false)
    }
  }

  return (
    <>
      <div
        data-testid="day-sheet-backdrop"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 110 }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 111,
        background: '#12121f', borderRadius: '16px 16px 0 0',
        padding: '12px 16px 48px', maxWidth: 480, margin: '0 auto',
        maxHeight: '90vh', overflowY: 'auto',
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
                {workout.mobility_sets?.length > 0 && (
                  <div style={{ color: '#4db6f7', fontSize: 12, marginTop: 4 }}>
                    Mobility: {workout.mobility_sets.map(ms => ms.exercise_name).join(' · ')}
                  </div>
                )}
              </div>
            )}

            {workout && (
              <div style={{ marginBottom: 10 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                {photoUrl ? (
                  <div style={{ borderRadius: 10, overflow: 'hidden' }}>
                    <img
                      src={photoUrl}
                      alt="progress photo"
                      style={{ width: '100%', display: 'block', maxHeight: 240, objectFit: 'cover' }}
                    />
                    <div style={{ display: 'flex', gap: 8, padding: 8, background: '#1a1a2e' }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={photoLoading}
                        style={{ flex: 1, padding: 7, background: '#252540', border: 'none', borderRadius: 7, color: '#a090ff', fontSize: 11, cursor: 'pointer' }}
                      >Change</button>
                      <button
                        onClick={handleRemove}
                        disabled={photoLoading}
                        style={{ flex: 1, padding: 7, background: '#252540', border: 'none', borderRadius: 7, color: '#e05555', fontSize: 11, cursor: 'pointer' }}
                      >Remove</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoLoading}
                    style={{ width: '100%', padding: 14, background: 'transparent', border: '1.5px dashed #333', borderRadius: 10, color: '#555', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}
                  >
                    📷 {photoLoading ? 'Uploading...' : 'Add progress photo'}
                  </button>
                )}
                {photoError && (
                  <div style={{ fontSize: 11, color: '#e05555', marginTop: 6 }}>{photoError}</div>
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

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import { uploadToCloudinary } from '../services/cloudinaryService'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function monthLabel(dateStr) {
  const [year, month] = dateStr.split('T')[0].split('-').map(Number)
  return `${MONTHS[month - 1]} ${year}`
}

function thumbnailUrl(url) {
  return url.replace('/upload/', '/upload/w_400,c_fill/')
}

const s = {
  page: { padding: '16px 8px 100px' },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 20 },
  monthLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#555', marginBottom: 10 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 },
  tile: { borderRadius: 10, overflow: 'hidden', position: 'relative', cursor: 'pointer' },
  photo: { width: '100%', height: 130, objectFit: 'cover', display: 'block' },
  caption: { padding: '5px 8px', background: '#1a1a2e', fontSize: 11, color: '#888' },
  partnerTag: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: '#f472b6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#12121f' },
  empty: { textAlign: 'center', color: '#555', fontSize: 13, paddingTop: 60 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 200 },
  modal: { background: '#1a1a2e', borderRadius: 14, width: '100%', maxWidth: 400, overflow: 'hidden', position: 'relative' },
  modalClose: { position: 'absolute', top: 10, right: 12, background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', zIndex: 1, lineHeight: 1 },
  modalPhoto: { width: '100%', maxHeight: 420, objectFit: 'contain', display: 'block', background: '#111' },
  modalInfo: { padding: '12px 16px' },
  modalDate: { fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 },
  modalNotes: { fontSize: 12, color: '#888' },
}

export default function Photos() {
  const { currentUser } = useAuth()
  const [groups, setGroups] = useState(null)
  const [selected, setSelected] = useState(null)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState(null)
  const fileInputRef = useRef(null)
  const [lightboxPhotoLoading, setLightboxPhotoLoading] = useState(false)
  const [lightboxPhotoError, setLightboxPhotoError] = useState(null)
  const lightboxFileRef = useRef(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFor, setUploadFor] = useState('mine')
  const [uploadDate, setUploadDate] = useState(() => new Date().toISOString().split('T')[0])
  const [uploadNotes, setUploadNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const uploadFileRef = useRef(null)

  async function handlePartnerPhotoUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !selected) return
    setPhotoLoading(true)
    setPhotoError(null)
    try {
      const url = await uploadToCloudinary(file)
      await api.put(`/partner/workouts/${selected.id}/photo`, { photo_url: url })
      setSelected(prev => ({ ...prev, photo_url: url }))
      setGroups(prev => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          next[key] = next[key].map(w => w.id === selected.id ? { ...w, photo_url: url } : w)
        }
        return next
      })
    } catch {
      setPhotoError('Upload failed. Please try again.')
    } finally {
      setPhotoLoading(false)
      e.target.value = ''
    }
  }

  async function handleDeleteStandalonePhoto(photo) {
    try {
      await api.delete(`/photos/${photo.id}`)
      setSelected(null)
      setGroups(prev => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          next[key] = next[key].filter(p => !(p.type === 'standalone' && p.id === photo.id && !p.isPartner))
        }
        return next
      })
    } catch {
      // silent — photo stays in grid
    }
  }

  async function handlePartnerStandalonePhotoUpload(e, photo) {
    const file = e.target.files?.[0]
    if (!file) return
    setLightboxPhotoLoading(true)
    setLightboxPhotoError(null)
    try {
      const url = await uploadToCloudinary(file)
      await api.delete(`/partner/photos/${photo.id}`)
      const saved = await api.post('/partner/photos', { photo_url: url, date: photo.date, notes: photo.notes })
      const newItem = { ...saved, type: 'standalone', isPartner: true }
      setSelected(newItem)
      setGroups(prev => {
        const next = { ...prev }
        for (const key of Object.keys(next)) {
          next[key] = next[key].map(p =>
            p.type === 'standalone' && p.isPartner && p.id === photo.id ? newItem : p
          )
        }
        return next
      })
    } catch {
      setLightboxPhotoError('Upload failed. Please try again.')
    } finally {
      setLightboxPhotoLoading(false)
      e.target.value = ''
    }
  }

  async function handleUploadSubmit() {
    const file = uploadFileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const url = await uploadToCloudinary(file)
      const endpoint = uploadFor === 'partner' ? '/partner/photos' : '/photos'
      const saved = await api.post(endpoint, {
        photo_url: url,
        date: uploadDate,
        notes: uploadNotes || null,
      })
      const newItem = { ...saved, type: 'standalone', isPartner: uploadFor === 'partner' }
      const key = monthLabel(newItem.date)
      setGroups(prev => {
        const next = { ...prev }
        next[key] = [newItem, ...(next[key] || [])].sort((a, b) => b.date.localeCompare(a.date))
        return next
      })
      setShowUpload(false)
      setUploadNotes('')
      setUploadDate(new Date().toISOString().split('T')[0])
      if (uploadFileRef.current) uploadFileRef.current.value = ''
    } catch (err) {
      const isConfig = err.message?.includes('not configured')
      setUploadError(isConfig ? 'Photo uploads not set up. See client/.env.example.' : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    async function load() {
      const hasPartner = !!currentUser.partner_id
      const [myWorkouts, myPhotos, partnerWorkouts, partnerPhotos] = await Promise.all([
        api.get('/workouts').catch(() => []),
        api.get('/photos').catch(() => []),
        hasPartner ? api.get('/partner/workouts').catch(() => []) : Promise.resolve([]),
        hasPartner ? api.get('/partner/photos').catch(() => []) : Promise.resolve([]),
      ])

      const all = [
        ...myWorkouts.filter(w => w.photo_url).map(w => ({ ...w, type: 'workout', isPartner: false })),
        ...myPhotos.map(p => ({ ...p, type: 'standalone', isPartner: false })),
        ...partnerWorkouts.filter(w => w.photo_url).map(w => ({ ...w, type: 'workout', isPartner: true })),
        ...partnerPhotos.map(p => ({ ...p, type: 'standalone', isPartner: true })),
      ].sort((a, b) => b.date.localeCompare(a.date))

      const map = {}
      for (const item of all) {
        const key = monthLabel(item.date)
        if (!map[key]) map[key] = []
        map[key].push(item)
      }
      setGroups(map)
    }
    load()
  }, [])

  if (groups === null) return null

  const keys = Object.keys(groups)

  return (
    <div style={s.page}>
      <div style={s.title}>Progress Photos</div>
      {keys.length === 0 ? (
        <div style={s.empty}>No progress photos yet. Add one from any workout day.</div>
      ) : (
        keys.map(month => (
          <div key={month}>
            <div style={s.monthLabel}>{month}</div>
            <div style={s.grid}>
              {groups[month].map(item => (
                <div key={`${item.type}-${item.id}`} style={s.tile} onClick={() => setSelected(item)}>
                  <img
                    src={thumbnailUrl(item.photo_url)}
                    alt={item.notes || (item.type === 'workout' ? 'Workout' : 'Progress photo')}
                    style={s.photo}
                  />
                  {item.isPartner && item.type === 'workout' && (
                    <div style={s.partnerTag}>P</div>
                  )}
                  {item.type === 'standalone' && item.isPartner && (
                    <>
                      <div style={s.partnerTag}>P</div>
                      <div style={{ position: 'absolute', bottom: 30, right: 6, fontSize: 12 }}>📷</div>
                    </>
                  )}
                  {item.type === 'standalone' && !item.isPartner && (
                    <div data-testid={`standalone-badge-${item.id}`} style={{ position: 'absolute', bottom: 30, right: 6, fontSize: 12 }}>📷</div>
                  )}
                  <div style={s.caption}>
                    {item.date.split('T')[0]} · {item.notes || (item.type === 'workout' ? 'Workout' : '')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <button
        aria-label="Add photo"
        onClick={() => setShowUpload(true)}
        style={{
          position: 'fixed', bottom: 74, right: 12, zIndex: 200,
          width: 52, height: 52, borderRadius: '50%', background: 'var(--accent)',
          border: 'none', color: '#fff', fontSize: 28, fontWeight: 300,
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >+</button>

      {showUpload && (
        <>
          <div onClick={() => setShowUpload(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 210 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 211,
            background: '#12121f', borderRadius: '16px 16px 0 0',
            padding: '12px 16px 48px', maxWidth: 480, margin: '0 auto',
          }}>
            <div style={{ width: 36, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Add Progress Photo</div>

            {currentUser.partner_id && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {['mine', 'partner'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setUploadFor(opt)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 20,
                      border: `1px solid ${uploadFor === opt ? 'var(--accent)' : '#333'}`,
                      background: uploadFor === opt ? 'var(--accent-bg)' : 'transparent',
                      color: uploadFor === opt ? 'var(--accent)' : '#666',
                      fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {opt === 'mine' ? 'Mine' : 'Partner'}
                  </button>
                ))}
              </div>
            )}

            <input
              type="date"
              value={uploadDate}
              onChange={e => setUploadDate(e.target.value)}
              style={{ background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, width: '100%', outline: 'none', marginBottom: 10 }}
            />
            <input
              type="text"
              placeholder="Caption (optional)"
              value={uploadNotes}
              onChange={e => setUploadNotes(e.target.value)}
              style={{ background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, width: '100%', outline: 'none', marginBottom: 10 }}
            />
            <input
              data-testid="photo-upload-input"
              ref={uploadFileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={() => {}}
            />
            <button
              onClick={() => uploadFileRef.current?.click()}
              style={{ width: '100%', padding: 12, background: 'transparent', border: '1.5px dashed #333', borderRadius: 10, color: '#555', fontSize: 13, cursor: 'pointer', marginBottom: 10 }}
            >
              📷 Choose photo
            </button>
            {uploadError && <div style={{ fontSize: 11, color: '#e05555', marginBottom: 8 }}>{uploadError}</div>}
            <button
              aria-label="Upload"
              onClick={handleUploadSubmit}
              disabled={uploading}
              style={{ width: '100%', padding: 13, background: 'var(--accent)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </>
      )}

      {selected && (
        <div style={s.overlay} onClick={() => { setSelected(null); setLightboxPhotoError(null) }}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <button style={s.modalClose} onClick={() => { setSelected(null); setLightboxPhotoError(null) }}>✕</button>
            <img
              src={selected.photo_url}
              alt={selected.notes || (selected.type === 'workout' ? 'Workout' : 'Progress photo')}
              style={s.modalPhoto}
            />
            <div style={s.modalInfo}>
              <div style={s.modalDate}>{selected.date?.split('T')[0]}</div>
              <div style={s.modalNotes}>{selected.notes || 'No notes'}</div>
            </div>

            {/* Partner workout photo — existing Change photo button */}
            {selected.type === 'workout' && selected.isPartner && (
              <div style={{ padding: '0 16px 16px' }}>
                <input
                  data-testid="partner-photo-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePartnerPhotoUpload}
                />
                <button
                  aria-label="change photo"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoLoading}
                  style={{ width: '100%', padding: 10, background: '#252540', border: 'none', borderRadius: 8, color: 'var(--accent-dim)', fontSize: 13, cursor: 'pointer' }}
                >
                  {photoLoading ? 'Uploading...' : '📷 Change photo'}
                </button>
                {photoError && <div style={{ fontSize: 11, color: '#e05555', marginTop: 6 }}>{photoError}</div>}
              </div>
            )}

            {/* Own standalone photo — delete button */}
            {selected.type === 'standalone' && !selected.isPartner && (
              <div style={{ padding: '0 16px 16px' }}>
                <button
                  aria-label="Delete photo"
                  onClick={() => handleDeleteStandalonePhoto(selected)}
                  style={{ width: '100%', padding: 10, background: 'transparent', border: '1px solid #e05555', borderRadius: 8, color: '#e05555', fontSize: 13, cursor: 'pointer' }}
                >
                  🗑 Delete photo
                </button>
              </div>
            )}

            {/* Partner standalone photo — change photo */}
            {selected.type === 'standalone' && selected.isPartner && (
              <div style={{ padding: '0 16px 16px' }}>
                <input
                  data-testid="partner-standalone-photo-input"
                  ref={lightboxFileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => handlePartnerStandalonePhotoUpload(e, selected)}
                />
                <button
                  aria-label="change photo"
                  onClick={() => lightboxFileRef.current?.click()}
                  disabled={lightboxPhotoLoading}
                  style={{ width: '100%', padding: 10, background: '#252540', border: 'none', borderRadius: 8, color: 'var(--accent-dim)', fontSize: 13, cursor: 'pointer' }}
                >
                  {lightboxPhotoLoading ? 'Uploading...' : '📷 Change photo'}
                </button>
                {lightboxPhotoError && <div style={{ fontSize: 11, color: '#e05555', marginTop: 6 }}>{lightboxPhotoError}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

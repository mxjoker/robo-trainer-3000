import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { resizeImage } from '../utils/resizeImage'

const s = {
  page: { padding: '20px 16px 100px', maxWidth: 480, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 },
  addBtn: { background: '#7c6af7', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 },
  thumb: { aspectRatio: '1', borderRadius: 6, overflow: 'hidden', cursor: 'pointer', background: '#1a1a2e', position: 'relative' },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  thumbDate: { position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: 9, color: '#ccc', background: 'rgba(0,0,0,0.55)', padding: '2px 0' },
  empty: { textAlign: 'center', color: '#555', marginTop: 60, fontSize: 14 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  overlayImg: { maxWidth: '95vw', maxHeight: '75vh', borderRadius: 10, objectFit: 'contain' },
  overlayMeta: { color: '#ccc', fontSize: 13, marginTop: 10 },
  overlayBtns: { display: 'flex', gap: 12, marginTop: 16 },
  closeBtn: { background: '#252540', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer' },
  deleteBtn: { background: '#c0392b', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer' },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 },
  sheet: { background: '#1a1a2e', borderRadius: '16px 16px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 480 },
  sheetTitle: { fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 },
  label: { fontSize: 12, color: '#888', marginBottom: 4, display: 'block' },
  input: { background: '#252540', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, width: '100%', boxSizing: 'border-box', outline: 'none', marginBottom: 12 },
  fileBtn: { background: '#252540', border: '1px dashed #555', borderRadius: 8, padding: 12, textAlign: 'center', color: '#888', fontSize: 13, cursor: 'pointer', marginBottom: 12 },
  preview: { width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, marginBottom: 12 },
  saveBtn: { background: '#7c6af7', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', marginTop: 4 },
  cancelBtn: { background: 'transparent', color: '#666', border: 'none', padding: '10px 0', fontSize: 14, cursor: 'pointer', width: '100%', marginTop: 4 },
}

export default function Photos() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)  // full photo data for overlay
  const [selectedMeta, setSelectedMeta] = useState(null)  // list-item for overlay
  const [showAdd, setShowAdd] = useState(false)
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0])
  const [addLabel, setAddLabel] = useState('')
  const [addDataUrl, setAddDataUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    api.get('/photos').then(r => { setPhotos(r.data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const dataUrl = await resizeImage(file)
      setAddDataUrl(dataUrl)
    } catch {
      alert('Could not read image')
    }
  }

  async function handleSave() {
    if (!addDataUrl) return alert('Please choose a photo')
    setSaving(true)
    try {
      const res = await api.post('/photos', { date: addDate, label: addLabel || undefined, data_url: addDataUrl })
      setPhotos(prev => [res.data, ...prev])
      setShowAdd(false)
      setAddDataUrl(null)
      setAddLabel('')
      setAddDate(new Date().toISOString().split('T')[0])
    } catch {
      alert('Failed to save photo')
    } finally {
      setSaving(false)
    }
  }

  async function handleThumbClick(meta) {
    setSelectedMeta(meta)
    try {
      const res = await api.get(`/photos/${meta.id}`)
      setSelected(res.data)
    } catch {
      alert('Could not load photo')
    }
  }

  async function handleDelete() {
    if (!selectedMeta) return
    if (!window.confirm('Delete this photo?')) return
    try {
      await api.delete(`/photos/${selectedMeta.id}`)
      setPhotos(prev => prev.filter(p => p.id !== selectedMeta.id))
      setSelected(null)
      setSelectedMeta(null)
    } catch {
      alert('Failed to delete photo')
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Progress Photos</h1>
        <button style={s.addBtn} onClick={() => setShowAdd(true)}>+ Add</button>
      </div>

      {loading && <p style={s.empty}>Loading...</p>}
      {!loading && photos.length === 0 && (
        <p style={s.empty}>No photos yet. Tap + Add to track your progress.</p>
      )}
      {!loading && photos.length > 0 && (
        <div style={s.grid}>
          {photos.map(p => (
            <PhotoThumb key={p.id} meta={p} onClick={() => handleThumbClick(p)} />
          ))}
        </div>
      )}

      {/* Full-screen overlay */}
      {selected && (
        <div style={s.overlay} onClick={() => { setSelected(null); setSelectedMeta(null) }}>
          <img src={selected.data_url} alt={selected.label || 'Progress photo'} style={s.overlayImg} onClick={e => e.stopPropagation()} />
          <p style={s.overlayMeta}>{selected.date}{selected.label ? ` — ${selected.label}` : ''}</p>
          <div style={s.overlayBtns} onClick={e => e.stopPropagation()}>
            <button style={s.closeBtn} onClick={() => { setSelected(null); setSelectedMeta(null) }}>Close</button>
            <button style={s.deleteBtn} onClick={handleDelete}>Delete</button>
          </div>
        </div>
      )}

      {/* Add photo sheet */}
      {showAdd && (
        <div style={s.modal} onClick={() => setShowAdd(false)}>
          <div style={s.sheet} onClick={e => e.stopPropagation()}>
            <p style={s.sheetTitle}>Add Progress Photo</p>
            <label style={s.label}>Date</label>
            <input type="date" style={s.input} value={addDate} onChange={e => setAddDate(e.target.value)} />
            <label style={s.label}>Label (optional)</label>
            <input type="text" style={s.input} placeholder="e.g. Front pose" value={addLabel} onChange={e => setAddLabel(e.target.value)} />
            {addDataUrl
              ? <img src={addDataUrl} alt="preview" style={s.preview} />
              : (
                <div style={s.fileBtn} onClick={() => fileRef.current?.click()}>
                  Tap to choose photo
                </div>
              )
            }
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            {addDataUrl && (
              <div style={{ ...s.fileBtn, marginBottom: 12 }} onClick={() => fileRef.current?.click()}>
                Change photo
              </div>
            )}
            <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Photo'}
            </button>
            <button style={s.cancelBtn} onClick={() => { setShowAdd(false); setAddDataUrl(null); setAddLabel('') }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PhotoThumb({ meta, onClick }) {
  const [dataUrl, setDataUrl] = useState(null)

  useEffect(() => {
    api.get(`/photos/${meta.id}`).then(r => setDataUrl(r.data.data_url)).catch(() => {})
  }, [meta.id])

  return (
    <div style={s.thumb} onClick={onClick}>
      {dataUrl
        ? <img src={dataUrl} alt={meta.label || meta.date} style={s.thumbImg} />
        : <div style={{ ...s.thumbImg, background: '#252540' }} />
      }
      <div style={s.thumbDate}>{meta.date}</div>
    </div>
  )
}

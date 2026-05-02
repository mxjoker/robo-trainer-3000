import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

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
  partnerTag: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: '#f7a76c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#12121f' },
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

  useEffect(() => {
    async function load() {
      const myWorkouts = await api.get('/workouts')
      let partnerWorkouts = []
      if (currentUser.partner_id) {
        partnerWorkouts = await api.get('/partner/workouts').catch(() => [])
      }
      const all = [
        ...myWorkouts.map(w => ({ ...w, isPartner: false })),
        ...partnerWorkouts.map(w => ({ ...w, isPartner: true })),
      ]
        .filter(w => w.photo_url)
        .sort((a, b) => b.date.localeCompare(a.date))

      const map = {}
      for (const w of all) {
        const key = monthLabel(w.date)
        if (!map[key]) map[key] = []
        map[key].push(w)
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
              {groups[month].map(w => (
                <div key={w.id} style={s.tile} onClick={() => setSelected(w)}>
                  <img src={thumbnailUrl(w.photo_url)} alt={w.notes || 'Workout'} style={s.photo} />
                  {w.isPartner && <div style={s.partnerTag}>P</div>}
                  <div style={s.caption}>
                    {w.date.split('T')[0]} · {w.notes || 'Workout'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <button style={s.modalClose} onClick={() => setSelected(null)}>✕</button>
            <img src={selected.photo_url} alt={selected.notes || 'Workout'} style={s.modalPhoto} />
            <div style={s.modalInfo}>
              <div style={s.modalDate}>{selected.date.split('T')[0]}</div>
              <div style={s.modalNotes}>{selected.notes || 'No notes'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

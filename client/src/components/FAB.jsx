import { useState } from 'react'
import LogSheet from './LogSheet'

const s = {
  btn: {
    position: 'fixed', bottom: 74, right: 12, zIndex: 200,
    width: 52, height: 52, borderRadius: '50%', background: 'var(--accent)',
    border: 'none', color: '#fff', fontSize: 28, fontWeight: 300,
    cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}

export default function FAB() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button style={s.btn} onClick={() => setOpen(true)} aria-label="Log workout or wellness">+</button>
      {open && <LogSheet onClose={() => setOpen(false)} />}
    </>
  )
}

import { useState } from 'react'
import LogSheet from './LogSheet'

const s = {
  btn: {
    width: 52, height: 52, borderRadius: '50%', background: '#7c6af7',
    border: 'none', color: '#fff', fontSize: 28, fontWeight: 300,
    cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,106,247,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, position: 'relative', zIndex: 101
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

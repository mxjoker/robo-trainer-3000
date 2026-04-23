const s = {
  card: { background: '#1a1a2e', borderRadius: 10, padding: 14 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  title: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#fff', fontWeight: 600 },
  link: { fontSize: 10, color: '#7c6af7', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }
}

export default function StatCard({ title, linkLabel, onLink, children }) {
  return (
    <div style={s.card}>
      <div style={s.header}>
        <span style={s.title}>{title}</span>
        {linkLabel && <button style={s.link} onClick={onLink}>{linkLabel}</button>}
      </div>
      {children}
    </div>
  )
}

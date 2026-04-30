import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', icon: '▣' },
  { to: '/stats', label: 'Stats', icon: '↗' },
  { to: '/photos', label: 'Photos', icon: '📷' },
  { to: '/partner', label: 'Partner', icon: '⊕' },
  { to: '/profile', label: 'Profile', icon: '◉' },
]

const s = {
  nav: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: 480,
    background: '#1a1a2e', borderTop: '1px solid #252540',
    display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    padding: '8px 0 12px', zIndex: 100
  },
  tab: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 12px', textDecoration: 'none', color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' },
  icon: { fontSize: 18, lineHeight: 1 },
  active: { color: '#7c6af7' }
}

export default function BottomNav() {
  return (
    <nav style={s.nav}>
      {tabs.map(tab => (
        <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.active : {}) })}>
          <span style={s.icon}>{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}

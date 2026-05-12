import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', icon: '▣' },
  { to: '/stats', label: 'Stats', icon: '↗' },
  { to: '/photos', label: 'Photos', icon: '📷' },
  { to: '/profile', label: 'Profile', icon: '◉' },
]

const s = {
  nav: {
    position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: 480,
    background: '#1a1a2e', borderTop: '1px solid #252540',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '8px 0 0', zIndex: 100
  },
  tabs: { display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%' },
  tab: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 12px', textDecoration: 'none', color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' },
  icon: { fontSize: 18, lineHeight: 1 },
  active: { color: 'var(--accent-dim)' },
  netlify: { fontSize: 9, color: '#333', textDecoration: 'none', padding: '4px 0 10px', letterSpacing: '0.3px' }
}

export default function BottomNav() {
  return (
    <nav style={s.nav}>
      <div style={s.tabs}>
        {tabs.map(tab => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} style={({ isActive }) => ({ ...s.tab, ...(isActive ? s.active : {}) })}>
            <span style={s.icon}>{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </div>
      <a href="https://www.netlify.com" target="_blank" rel="noopener noreferrer" style={s.netlify}>
        This site is powered by Netlify
      </a>
    </nav>
  )
}

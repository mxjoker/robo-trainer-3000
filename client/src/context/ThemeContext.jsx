import { createContext, useContext, useState, useEffect, useMemo } from 'react'

const SCHEMES = {
  purple: { accent: '#7c6af7', accentDim: '#a090ff', accentBg: '#7c6af722' },
  blue:   { accent: '#4db6f7', accentDim: '#80cbf9', accentBg: '#4db6f722' },
  green:  { accent: '#4caf8a', accentDim: '#7acdb0', accentBg: '#4caf8a22' },
  coral:  { accent: '#f76c6c', accentDim: '#f99999', accentBg: '#f76c6c22' },
}

function applyScheme(name) {
  const s = SCHEMES[name] || SCHEMES.purple
  const root = document.documentElement.style
  root.setProperty('--accent', s.accent)
  root.setProperty('--accent-dim', s.accentDim)
  root.setProperty('--accent-bg', s.accentBg)
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [scheme, setSchemeState] = useState(() => {
    const saved = localStorage.getItem('rt_color_scheme')
    return saved && SCHEMES[saved] ? saved : 'purple'
  })

  useEffect(() => { applyScheme(scheme) }, [scheme])

  function setScheme(name) {
    if (!SCHEMES[name]) return
    localStorage.setItem('rt_color_scheme', name)
    setSchemeState(name)
  }

  const value = useMemo(() => ({
    scheme,
    setScheme,
    schemes: Object.keys(SCHEMES),
    accent: SCHEMES[scheme].accent,
    accentDim: SCHEMES[scheme].accentDim,
    accentBg: SCHEMES[scheme].accentBg,
  }), [scheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

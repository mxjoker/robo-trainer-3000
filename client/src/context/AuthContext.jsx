import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('rt_token')
    if (!token) { setLoading(false); return }
    api.get('/auth/me')
      .then(user => setCurrentUser(user))
      .catch(() => localStorage.removeItem('rt_token'))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const { token, user } = await api.post('/auth/login', { email, password })
    if (!token || !user) throw new Error('Invalid response from server')
    localStorage.setItem('rt_token', token)
    setCurrentUser(user)
    return user
  }, [])

  const register = useCallback(async (name, email, password) => {
    const { token, user } = await api.post('/auth/register', { name, email, password })
    if (!token || !user) throw new Error('Invalid response from server')
    localStorage.setItem('rt_token', token)
    setCurrentUser(user)
    return user
  }, [])

  const acceptInvite = useCallback(async (name, email, password, inviteToken) => {
    const { token, user } = await api.post('/auth/accept-invite', { name, email, password, inviteToken })
    if (!token || !user) throw new Error('Invalid response from server')
    localStorage.setItem('rt_token', token)
    setCurrentUser(user)
    return user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('rt_token')
    setCurrentUser(null)
  }, [])

  const value = useMemo(
    () => ({ currentUser, loading, login, register, acceptInvite, logout }),
    [currentUser, loading, login, register, acceptInvite, logout]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === null) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

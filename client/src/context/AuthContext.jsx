import { createContext, useContext, useState, useEffect } from 'react'
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

  async function login(email, password) {
    const { token, user } = await api.post('/auth/login', { email, password })
    localStorage.setItem('rt_token', token)
    setCurrentUser(user)
    return user
  }

  async function register(name, email, password) {
    const { token, user } = await api.post('/auth/register', { name, email, password })
    localStorage.setItem('rt_token', token)
    setCurrentUser(user)
    return user
  }

  async function acceptInvite(name, email, password, inviteToken) {
    const { token, user } = await api.post('/auth/accept-invite', { name, email, password, inviteToken })
    localStorage.setItem('rt_token', token)
    setCurrentUser(user)
    return user
  }

  function logout() {
    localStorage.removeItem('rt_token')
    setCurrentUser(null)
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, register, acceptInvite, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

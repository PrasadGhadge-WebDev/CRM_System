import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../services/api'
import { authApi } from '../services/auth'

const AuthContext = createContext()
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

function storeSession(user, token) {
  localStorage.setItem('user', JSON.stringify(user))
  if (token) {
    localStorage.setItem('token', token)
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('token')

    if (storedUser && token) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', {
        identifier: String(email ?? '').trim(),
        password,
      })
      const { user: nextUser, token } = response

      storeSession(nextUser, token)
      setUser(nextUser)

      return { success: true }
    } catch (error) {
      return { success: false, message: error?.response?.data?.message || error.message }
    }
  }, [])

  const demoLogin = useCallback(async (role = 'Manager') => {
    try {
      const response = await api.post('/api/auth/demo-login', { role })
      const { user: nextUser, token } = response

      storeSession(nextUser, token)
      setUser(nextUser)

      return { success: true }
    } catch (error) {
      return { success: false, message: error?.response?.data?.message || error.message }
    }
  }, [])

  const switchDemoRole = useCallback(async (role = 'Manager') => {
    try {
      const response = await api.post('/api/auth/demo-switch', { role })
      const { user: nextUser, token } = response

      storeSession(nextUser, token)
      setUser(nextUser)

      return { success: true }
    } catch (error) {
      return { success: false, message: error?.response?.data?.message || error.message }
    }
  }, [])

  const register = useCallback(async (payload) => {
    try {
      const username = String(payload.username ?? '').trim()
      const role = String(payload.role ?? '').trim()
      const response = await api.post('/api/auth/register', {
        name: String(payload.fullName ?? '').trim(),
        email: String(payload.email ?? '').trim().toLowerCase(),
        phone: String(payload.phone ?? '').trim(),
        password: payload.password,
        ...(username ? { username } : {}),
        ...(role ? { role } : {}),
      })

      const { user: nextUser, token } = response
      if (nextUser && token) {
        storeSession(nextUser, token)
        setUser(nextUser)
      }

      return {
        success: true,
        user: nextUser,
        token: token,
        message: 'Account created and workspace initialized.',
      }
    } catch (error) {
      return { success: false, message: error?.response?.data?.message || error.message }
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const nextUser = await authApi.me()
    storeSession(nextUser)
    setUser(nextUser)
    return nextUser
  }, [])

  const updateUser = useCallback((nextUser) => {
    storeSession(nextUser)
    setUser(nextUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.get('/api/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, loading, login, demoLogin, switchDemoRole, register, logout, refreshUser, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

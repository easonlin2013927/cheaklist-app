/**
 * Auth context — manages login, signup, and cloud sync.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(localStorage.getItem('checklist-userId') || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('checklist-token')
    if (token) {
      setUserId(localStorage.getItem('checklist-userId'))
      // Auth restored from localStorage — signal that verification is done
      window.dispatchEvent(new CustomEvent('auth-verified'))
    } else {
      // No token — login is required
      window.dispatchEvent(new CustomEvent('auth-required'))
    }
  }, [])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.login(email, password)
      localStorage.setItem('checklist-token', res.token)
      localStorage.setItem('checklist-userId', res.userId)
      setUserId(res.userId)
      window.dispatchEvent(new CustomEvent('auth-verified'))
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.register(email, password)
      localStorage.setItem('checklist-token', res.token)
      localStorage.setItem('checklist-userId', res.userId)
      setUserId(res.userId)
      window.dispatchEvent(new CustomEvent('auth-verified'))
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    api.logout()
    setUserId(null)
    window.dispatchEvent(new CustomEvent('auth-required'))
  }, [])

  return (
    <AuthContext.Provider value={{ userId, loading, error, login, register, logout, isAuthenticated: !!userId }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

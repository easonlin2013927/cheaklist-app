import { useState, useEffect } from 'react'
import { useAuth } from '../utils/auth'
import './Auth.css'

export default function LoginPage() {
  const { login, register, loading, error } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // If already logged in, redirect to app
  useEffect(() => {
    const token = localStorage.getItem('checklist-token')
    if (token) {
      window.dispatchEvent(new CustomEvent('auth-verified'))
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isLogin && password !== confirmPassword) {
      alert('兩次輸入的密碼不一致')
      return
    }
    if (!isLogin && password.length < 6) {
      alert('密碼至少需要 6 個字元')
      return
    }

    let result
    if (isLogin) {
      result = await login(email, password)
    } else {
      result = await register(email, password)
    }

    if (result.success) {
      window.dispatchEvent(new CustomEvent('auth-verified'))
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">清單製作器</h1>
        <p className="auth-subtitle">
          {isLogin ? '歡迎回來，請登入' : '建立您的帳號'}
        </p>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-email">電子郵件</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
              className="auth-input"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="auth-password">密碼</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 個字元"
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className="auth-input"
            />
          </div>

          {!isLogin && (
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-confirm">確認密碼</label>
              <input
                id="auth-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次輸入密碼"
                required
                autoComplete="new-password"
                className="auth-input"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="auth-submit"
          >
            {loading ? '處理中...' : (isLogin ? '登入' : '註冊')}
          </button>
        </form>

        <div className="auth-switch">
          {isLogin ? '還沒有帳號？' : '已經有帳號？'}
          <button
            type="button"
            className="auth-switch-btn"
            onClick={() => { setIsLogin(!isLogin); setEmail(''); setPassword(''); setConfirmPassword('') }}
          >
            {isLogin ? '註冊' : '登入'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './LoginPage.css'

export default function LoginPage({ onSuccess }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const successMessage = location.state?.message

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Invalid credentials')
        return
      }
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify({
        id: data.user_id,
        username: data.username,
        email: data.email,
      }))
      onSuccess({ id: data.user_id, username: data.username, email: data.email })
      navigate('/explore')
    } catch {
      setError('Could not connect to server. Is it running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <button className="login-back" onClick={() => navigate('/')}>← Back</button>
        <div className="login-logo">
          <img src="/nitpickr_logo.svg" alt="NitPickr" height="30" />
        </div>
        <h1 className="login-title">Welcome back</h1>
        <p className="login-sub">Sign in to your account to continue</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="identifier">Username or email</label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="Username or email address"
              autoFocus
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {successMessage && <p className="login-error" style={{ color: '#16a34a', background: '#f0fdf4', borderColor: '#bbf7d0' }}>{successMessage}</p>}
          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="login-switch">
          <button className="login-switch-btn" onClick={() => navigate('/forgot-password')}>Forgot password?</button>
        </p>
        <p className="login-switch">
          Don't have an account?{' '}
          <button className="login-switch-btn" onClick={() => navigate('/signup')}>Sign up</button>
        </p>
      </div>
    </div>
  )
}

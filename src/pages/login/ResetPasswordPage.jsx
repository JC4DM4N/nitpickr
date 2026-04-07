import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './LoginPage.css'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (/\s/.test(password)) {
      setError('Password must not contain spaces')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Something went wrong')
        return
      }
      navigate('/login', { state: { message: 'Password reset — please sign in.' } })
    } catch {
      setError('Could not connect to server. Is it running?')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1 className="login-title">Invalid link</h1>
          <p className="login-sub">This reset link is missing or malformed.</p>
          <button className="login-submit" style={{ marginTop: '8px' }} onClick={() => navigate('/forgot-password')}>
            Request a new link
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <img src="/nitpickr_logo.svg" alt="NitPickr" height="30" />
        </div>
        <h1 className="login-title">Set new password</h1>
        <p className="login-sub">Choose a new password for your account</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  )
}

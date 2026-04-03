import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'

export default function SignUpPage({ onSuccess }) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (/\s/.test(username)) {
      setError('Username must not contain spaces')
      return
    }
    if (/\s/.test(password)) {
      setError('Password must not contain spaces')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Could not create account')
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
          <span className="login-logo-icon">◎</span>
          <span className="login-logo-text">FeedbackPal</span>
        </div>
        <h1 className="login-title">Create account</h1>
        <p className="login-sub">Join the community of indie developers</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="your_username"
              autoFocus
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
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

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="login-switch">
          Already have an account?{' '}
          <button className="login-switch-btn" onClick={() => navigate('/login')}>Sign in</button>
        </p>
      </div>
    </div>
  )
}

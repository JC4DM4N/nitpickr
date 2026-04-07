import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Something went wrong')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Could not connect to server. Is it running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <button className="login-back" onClick={() => navigate('/login')}>← Back</button>
        <div className="login-logo">
          <img src="/nitpickr_logo.svg" alt="NitPickr" height="30" />
        </div>

        {submitted ? (
          <>
            <h1 className="login-title">Check your email</h1>
            <p className="login-sub">
              If an account exists for <strong>{email}</strong>, you'll receive a reset link shortly.
            </p>
            <button className="login-submit" style={{ marginTop: '8px', display: 'block', margin: '8px auto 0' }} onClick={() => navigate('/login')}>
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <h1 className="login-title">Forgot password?</h1>
            <p className="login-sub">Enter your email and we'll send you a reset link</p>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  required
                />
              </div>

              {error && <p className="login-error">{error}</p>}

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

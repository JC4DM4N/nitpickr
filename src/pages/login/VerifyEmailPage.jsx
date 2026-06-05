import { useState, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import './LoginPage.css'

export default function VerifyEmailPage({ onSuccess }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const token = searchParams.get('token')
  const emailFromState = location.state?.email ?? ''

  const [email, setEmail] = useState(emailFromState)
  const [status, setStatus] = useState('idle') // idle | verifying | resending | done | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) return

    setStatus('verifying')
    fetch('/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setStatus('error')
          setMessage(data.detail || 'This verification link is invalid or has expired.')
        } else {
          localStorage.setItem('token', data.access_token)
          localStorage.setItem('user', JSON.stringify({
            id: data.user_id,
            username: data.username,
            email: data.email,
          }))
          onSuccess({ id: data.user_id, username: data.username, email: data.email })
          navigate('/explore')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Could not connect to server.')
      })
  }, [token])

  async function handleResend(e) {
    e.preventDefault()
    setStatus('resending')
    try {
      await fetch('/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setStatus('done')
    } catch {
      setStatus('error')
      setMessage('Could not connect to server.')
    }
  }

  if (token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <img src="/nitpickr_logo.svg" alt="NitPickr" height="30" />
          </div>
          {status === 'verifying' && <p className="login-sub">Verifying your email…</p>}
          {status === 'error' && (
            <>
              <h1 className="login-title">Link expired</h1>
              <p className="login-sub">{message}</p>
              <button className="login-submit" style={{ marginTop: '16px' }} onClick={() => navigate('/verify-email')}>
                Request a new link
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <img src="/nitpickr_logo.svg" alt="NitPickr" height="30" />
          </div>
          <h1 className="login-title">Email sent</h1>
          <p className="login-sub">Check your inbox for a new verification link.</p>
          <button className="login-submit" style={{ marginTop: '24px' }} onClick={() => navigate('/login')}>
            Back to sign in
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
        <h1 className="login-title">Check your email</h1>
        <p className="login-sub">
          {emailFromState
            ? `We sent a verification link to ${emailFromState}. Click it to activate your account.`
            : 'Enter your email address to resend the verification link.'}
        </p>

        <form className="login-form" onSubmit={handleResend} style={{ marginTop: '24px' }}>
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

          {status === 'error' && <p className="login-error">{message}</p>}

          <button type="submit" className="login-submit" disabled={status === 'resending'}>
            {status === 'resending' ? 'Sending…' : 'Resend verification email'}
          </button>
        </form>

        <p className="login-switch">
          Already verified?{' '}
          <button className="login-switch-btn" onClick={() => navigate('/login')}>Sign in</button>
        </p>
      </div>
    </div>
  )
}

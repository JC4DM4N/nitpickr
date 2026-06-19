import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './ReviewAppPage.css'
import './MyAppDetailPage.css'
import './SubmitAppPage.css'
import './ExplorePage.css'
import { STAGE_STYLES, CATEGORIES, STAGES, PALETTE } from '../../constants'
import { authFetch } from '../../utils/authFetch'
import confetti from 'canvas-confetti'

export default function SubmitAppPage() {
  const navigate = useNavigate()
  const [fields, setFields] = useState({
    name: '',
    url: '',
    category: CATEGORIES[0],
    stage: STAGES[0],
    description: '',
    request: '',
    color: PALETTE[5],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [submittedAppId, setSubmittedAppId] = useState(null)
  const [feedbackCheck, setFeedbackCheck] = useState({ loading: true, hasStarted: false })
  const [showOnboardingCompleteModal, setShowOnboardingCompleteModal] = useState(false)
  const pendingOnboardingModal = useRef(false)
  const preSubmitBonusAwarded = useRef(false)
  const postNavigatePath = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    Promise.all([
      authFetch('/reviews/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      authFetch('/users/me/onboarding', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([reviews, onboardingData]) => {
        setFeedbackCheck({ loading: false, hasStarted: Array.isArray(reviews) && reviews.length > 0 })
        preSubmitBonusAwarded.current = onboardingData.onboarding_bonus_credit_awarded
      })
      .catch(() => setFeedbackCheck({ loading: false, hasStarted: false }))
  }, [])

  useEffect(() => {
    if (!submittedAppId) return
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#22c55e', '#f97316', '#facc15', '#3b82f6'] })
  }, [submittedAppId])

  useEffect(() => {
    if (!showOnboardingCompleteModal) return
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.5 }, colors: ['#22c55e', '#f97316', '#facc15', '#3b82f6', '#a855f7'] })
  }, [showOnboardingCompleteModal])

  function set(key) {
    return e => setFields(prev => ({ ...prev, [key]: e.target.value }))
  }

  const initials = fields.name.trim()
    ? fields.name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')
    : '?'

  const stage = STAGE_STYLES[fields.stage] || {}

  const canSubmit = fields.name.trim() && fields.url.trim() &&
    fields.description.trim() && fields.request.trim()

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await authFetch('/apps/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(fields),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail || 'Failed to submit app')
        return
      }
      pendingOnboardingModal.current = false
      try {
        const onboardingRes = await authFetch('/users/me/onboarding', { headers: { Authorization: `Bearer ${token}` } })
        if (onboardingRes.ok) {
          const onboardingData = await onboardingRes.json()
          if (onboardingData.onboarding_bonus_credit_awarded && !preSubmitBonusAwarded.current) {
            pendingOnboardingModal.current = true
            preSubmitBonusAwarded.current = true
          }
        }
      } catch {}
      setSubmittedAppId(data.id)
    } catch {
      setError('Could not connect to server')
    } finally {
      setSaving(false)
    }
  }

  function dismissAppSubmitted(navPath) {
    if (pendingOnboardingModal.current) {
      pendingOnboardingModal.current = false
      postNavigatePath.current = navPath
      setShowOnboardingCompleteModal(true)
    } else {
      navigate(navPath)
    }
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  if (feedbackCheck.loading) {
    return null
  }

  if (!feedbackCheck.hasStarted) {
    return (
      <div className="review-app-page">
        <div className="review-app-header">
          <button className="review-app-back" onClick={() => navigate('/explore')}>← Back</button>
        </div>
        <div className="review-app-body" style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Leave feedback first</h2>
            <p style={{ color: '#6b6a66', marginBottom: 24 }}>
              You need to leave feedback on at least one app before you can submit your own. This keeps the community balanced.
            </p>
            <button className="edit-save-btn" onClick={() => navigate('/explore')}>
              Browse apps →
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showOnboardingCompleteModal) {
    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <div className="modal-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <div className="modal-title" style={{ fontSize: 18, fontWeight: 700, color: '#0f0e0b' }}>
              Onboarding complete! 🎉
            </div>
            <p className="modal-description" style={{ margin: 0 }}>
              Congratulations! 1 bonus credit has been added to your account.
            </p>
          </div>
          <div className="modal-actions">
            <button className="modal-btn-cancel" onClick={() => navigate(postNavigatePath.current || `/my-apps/${submittedAppId}`)}>
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (submittedAppId) {
    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <div className="modal-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <div className="modal-title" style={{ fontSize: 18, fontWeight: 700, color: '#0f0e0b' }}>
              App submitted!
            </div>
            <p className="modal-description" style={{ margin: 0 }}>
              Share your apps to get feedback faster!
            </p>
          </div>
          <div className="modal-actions">
            <button className="modal-btn-cancel" onClick={() => dismissAppSubmitted(`/my-apps/${submittedAppId}`)}>
              Close
            </button>
            <button className="modal-btn-start" onClick={() => dismissAppSubmitted(`/${user.username}`)}>
              Go →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="review-app-page">
      <div className="review-app-header">
        <button className="review-app-back" onClick={() => navigate('/explore')}>← Back</button>
        <div className="review-app-title-row">
          <div className="review-app-icon" style={{ background: fields.color }}>
            {initials}
          </div>
          <div className="review-app-title-block">
            <h1 className="review-app-name">{fields.name || 'New app'}</h1>
            <div className="review-app-meta">
              <span className="app-stage-badge" style={stage}>{fields.stage}</span>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="edit-save-btn"
              onClick={handleSubmit}
              disabled={saving || !canSubmit}
            >
              {saving ? 'Submitting…' : 'Submit app'}
            </button>
          </div>
        </div>
      </div>

      <div className="review-app-body">
        <div className="review-app-main">
          {error && <p className="edit-form-error" style={{ marginBottom: 8 }}>{error}</p>}

          <div className="edit-form">
            <div className="edit-field-group">
              <label className="edit-field-label">APP NAME</label>
              <input
                className="edit-field-input"
                placeholder="My Awesome App"
                value={fields.name}
                onChange={set('name')}
              />
            </div>

            <div className="edit-field-group">
              <label className="edit-field-label">URL</label>
              <input
                className="edit-field-input"
                placeholder="https://myapp.com"
                value={fields.url}
                onChange={set('url')}
              />
            </div>

            <div className="edit-field-row">
              <div className="edit-field-group">
                <label className="edit-field-label">CATEGORY</label>
                <select className="edit-field-select" value={fields.category} onChange={set('category')}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="edit-field-group">
                <label className="edit-field-label">STAGE</label>
                <select className="edit-field-select" value={fields.stage} onChange={set('stage')}>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="edit-field-group">
              <label className="edit-field-label">COLOR</label>
              <div className="color-palette">
                {PALETTE.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch${fields.color === c ? ' color-swatch--selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setFields(prev => ({ ...prev, color: c }))}
                  />
                ))}
              </div>
            </div>

            <div className="edit-field-group">
              <label className="edit-field-label">DESCRIPTION</label>
              <textarea
                className="edit-field-textarea"
                placeholder="What does your app do?"
                value={fields.description}
                onChange={set('description')}
                rows={3}
              />
            </div>

            <div className="edit-field-group">
              <label className="edit-field-label">DESCRIBE THE FEEDBACK YOU ARE LOOKING FOR</label>
              <textarea
                className="edit-field-textarea"
                placeholder="What specific feedback are you looking for from reviewers?"
                value={fields.request}
                onChange={set('request')}
                rows={4}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

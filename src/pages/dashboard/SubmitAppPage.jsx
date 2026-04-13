import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ReviewAppPage.css'
import './MyAppDetailPage.css'
import './SubmitAppPage.css'
import './ExplorePage.css'
import { STAGE_STYLES, CATEGORIES, STAGES, PALETTE } from '../../constants'
import { authFetch } from '../../utils/authFetch'

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
      setSubmittedAppId(data.id)
    } catch {
      setError('Could not connect to server')
    } finally {
      setSaving(false)
    }
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  if (submittedAppId) {
    return (
      <div className="modal-overlay">
        <div className="modal-card">
          <div className="modal-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
            <div className="modal-title" style={{ fontSize: 18, fontWeight: 700, color: '#0f0e0b' }}>
              Share your apps to get feedback faster!
            </div>
            <p className="modal-description" style={{ margin: 0 }}>
              Go to your share page to get your shareable link.
            </p>
          </div>
          <div className="modal-actions">
            <button className="modal-btn-cancel" onClick={() => navigate(`/my-apps/${submittedAppId}`)}>
              Close
            </button>
            <button className="modal-btn-start" onClick={() => navigate(`/${user.username}`)}>
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

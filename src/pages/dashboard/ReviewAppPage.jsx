import { useState, useEffect, useRef } from 'react'
import './ReviewAppPage.css'

const STAGE_STYLES = {
  'Pre-launch': { bg: '#fef3c7', color: '#92400e' },
  'Beta':       { bg: '#dbeafe', color: '#1e40af' },
  'Live':       { bg: '#d1fae5', color: '#065f46' },
}

export default function ReviewAppPage({ reviewId, onBack }) {
  const [detail, setDetail] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [screenshots, setScreenshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch(`http://localhost:8000/reviews/${reviewId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setDetail(data)
        setFeedback(data.feedback || '')
        setScreenshots(data.screenshots || [])
        setLoading(false)
      })
      .catch(() => { setError('Failed to load review'); setLoading(false) })
  }, [reviewId])

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:8000/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ feedback, is_complete: true }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Failed to submit review')
        return
      }
      onBack()
    } catch {
      setError('Could not connect to server')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this review? This cannot be undone.')) return
    try {
      const token = localStorage.getItem('token')
      await fetch(`http://localhost:8000/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      onBack()
    } catch {
      setError('Could not connect to server')
    }
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(`http://localhost:8000/reviews/${reviewId}/screenshots`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: form,
        })
        if (res.ok) {
          const data = await res.json()
          setScreenshots(prev => [...prev, data.filename])
        }
      }
    } catch {
      setError('Failed to upload screenshot')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (loading) return <div className="review-app-loading">Loading…</div>
  if (error && !detail) return <div className="review-app-loading">{error}</div>

  const stage = STAGE_STYLES[detail.app_stage]

  return (
    <div className="review-app-page">
      <div className="review-app-header">
        <button className="review-app-back" onClick={onBack}>← Back to reviews</button>
        <div className="review-app-title-row">
          <div className="review-app-icon" style={{ background: detail.app_color }}>
            {detail.app_initials}
          </div>
          <div className="review-app-title-block">
            <h1 className="review-app-name">{detail.app_name}</h1>
            <div className="review-app-meta">
              <span className="app-stage-badge" style={{ background: stage.bg, color: stage.color }}>
                {detail.app_stage}
              </span>
              {detail.is_complete && (
                <span className="review-status-badge complete">Complete</span>
              )}
            </div>
          </div>
          <a
            href={detail.app_url.startsWith('http') ? detail.app_url : `https://${detail.app_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="visit-app-btn"
          >
            Visit app ↗
          </a>
        </div>
      </div>

      <div className="review-app-body">
        <div className="review-app-main">
          <section className="review-section">
            <p className="review-section-label">WHAT THE DEVELOPER IS LOOKING FOR</p>
            <textarea className="review-request-text" value={detail.app_request} readOnly />
          </section>

          <section className="review-section">
            <p className="review-section-label">YOUR FEEDBACK</p>
            <textarea
              className="review-feedback-input"
              placeholder="Write your honest, constructive feedback here…"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              disabled={detail.is_complete}
            />
          </section>

          {error && <p className="review-app-error">{error}</p>}

          <div className="review-app-actions">
            <button className="review-delete-btn" onClick={handleDelete}>
              Delete review
            </button>
            <button
              className="review-submit-btn"
              onClick={handleSubmit}
              disabled={saving || detail.is_complete || !feedback.trim()}
            >
              {saving ? 'Submitting…' : detail.is_complete ? 'Already submitted' : 'Submit review →'}
            </button>
          </div>
        </div>

        <aside className="review-app-sidebar">
          <section className="review-section">
            <p className="review-section-label">SCREENSHOTS</p>
            <p className="review-screenshots-hint">
              Attach screenshots to illustrate your feedback.
            </p>

            {screenshots.length > 0 && (
              <div className="screenshots-grid">
                {screenshots.map((filename, i) => (
                  <img
                    key={i}
                    src={`http://localhost:8000/uploads/${filename}`}
                    alt={`Screenshot ${i + 1}`}
                    className="screenshot-thumb"
                  />
                ))}
              </div>
            )}

            {!detail.is_complete && (
              <>
                <div
                  className={`upload-zone${uploading ? ' uploading' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? 'Uploading…' : (
                    <>
                      <span className="upload-zone-icon">📎</span>
                      <span>Click to upload</span>
                      <span className="upload-zone-sub">PNG, JPG, GIF up to 10MB</span>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}

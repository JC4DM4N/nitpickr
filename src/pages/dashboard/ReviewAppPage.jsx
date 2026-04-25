import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './ReviewAppPage.css'
import { STAGE_STYLES } from '../../constants'
import { OwnerMessageBanner } from '../../components/OwnerMessageBanner'
import { ImageLightbox } from '../../components/ImageLightbox'
import { ReviewerDeadlineBanner, OwnerDeadlineBanner } from '../../components/DeadlineBanner'
import { authFetch } from '../../utils/authFetch'

export default function ReviewAppPage() {
  const { reviewId } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [testedPlatform, setTestedPlatform] = useState('')
  const [testDuration, setTestDuration] = useState('')
  const [createdAccount, setCreatedAccount] = useState('')
  const [screenshots, setScreenshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [showValidation, setShowValidation] = useState(false)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [expandedImg, setExpandedImg] = useState(null)
  const [messages, setMessages] = useState([])
  const [msgInput, setMsgInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [msgError, setMsgError] = useState(null)
  const fileInputRef = useRef(null)
  const chatBottomRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    Promise.all([
      authFetch(`/reviews/${reviewId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
      authFetch(`/reviews/${reviewId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).then(r => r.json()),
    ])
      .then(([data, msgData]) => {
        setDetail(data)
        setFeedback(data.feedback || '')
        setTestedPlatform(data.tested_platform || '')
        setTestDuration(data.test_duration || '')
        setCreatedAccount(data.created_account === null ? '' : String(data.created_account))
        setScreenshots(data.screenshots || [])
        setMessages(Array.isArray(msgData) ? msgData : [])
        setLoading(false)
      })
      .catch(() => { setError('Failed to load review'); setLoading(false) })
  }, [reviewId])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSendMessage() {
    if (!msgInput.trim()) return
    setSendingMsg(true)
    setMsgError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await authFetch(`/reviews/${reviewId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ body: msgInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsgError(data.detail || 'Failed to send message')
        return
      }
      setMessages(prev => [...prev, data])
      setMsgInput('')
      // Refresh detail so deadline banners update immediately
      const token2 = localStorage.getItem('token')
      const updated = await authFetch(`/reviews/${reviewId}`, {
        headers: { 'Authorization': `Bearer ${token2}` },
      }).then(r => r.json())
      setDetail(updated)
    } catch {
      setMsgError('Could not connect to server')
    } finally {
      setSendingMsg(false)
    }
  }

  async function handleSubmit() {
    const invalid = feedback.trim().length < 200 || !testedPlatform || !testDuration.trim() || createdAccount === ''
    if (invalid) {
      setShowValidation(true)
      setShowValidationModal(true)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await authFetch(`/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          feedback,
          is_submitted: true,
          tested_platform: testedPlatform || null,
          test_duration: testDuration || null,
          created_account: createdAccount === '' ? null : createdAccount === 'true',
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.detail || 'Failed to submit review')
        return
      }
      const data = await res.json()
      setDetail(data)
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
      await authFetch(`/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      navigate('/reviews')
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
        const res = await authFetch(`/reviews/${reviewId}/screenshots`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: form,
        })
        if (res.ok) {
          const data = await res.json()
          setScreenshots(prev => [...prev, { filename: data.filename, url: data.url }])
        }
      }
    } catch {
      setError('Failed to upload screenshot')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDeleteScreenshot(filename) {
    try {
      const token = localStorage.getItem('token')
      const res = await authFetch(`/reviews/${reviewId}/screenshots/${filename}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        setScreenshots(prev => prev.filter(s => s.filename !== filename))
      } else {
        setError('Failed to delete screenshot')
      }
    } catch {
      setError('Could not connect to server')
    }
  }

  if (loading) return <div className="review-app-loading">Loading…</div>
  if (error && !detail) return <div className="review-app-loading">{error}</div>

  const stage = STAGE_STYLES[detail.app_stage]

  return (
    <div className="review-app-page">
      <ImageLightbox src={expandedImg} onClose={() => setExpandedImg(null)} />
      {showValidationModal && (
        <div className="validation-modal-overlay" onClick={() => setShowValidationModal(false)}>
          <div className="validation-modal" onClick={e => e.stopPropagation()}>
            <p className="validation-modal-title">Submission failed</p>
            <p className="validation-modal-body">Please fill in all required fields before submitting.</p>
            <button className="validation-modal-dismiss" onClick={() => setShowValidationModal(false)}>Dismiss</button>
          </div>
        </div>
      )}
      <div className="review-app-header">
        <button className="review-app-back" onClick={() => navigate('/reviews')}>← Back to reviews</button>
        <div className="review-app-title-row">
          <div className="review-app-icon" style={{ background: detail.app_color }}>
            {detail.app_initials}
          </div>
          <div className="review-app-title-block">
            <h1 className="review-app-name">{detail.app_name}</h1>
            <div className="review-app-meta">
              <span className="app-stage-badge" style={stage}>
                {detail.app_stage}
              </span>
              {detail.is_expired   && <span className="review-status-badge expired">Expired</span>}
              {detail.is_rejected  && <span className="review-status-badge rejected">Rejected</span>}
              {detail.is_complete  && <span className="review-status-badge complete">Approved</span>}
              {detail.is_submitted && !detail.is_complete && !detail.is_rejected && !detail.is_expired && (
                <span className="review-status-badge awaiting">Awaiting approval</span>
              )}
              {!detail.is_submitted && !detail.is_complete && !detail.is_rejected && !detail.is_expired && detail.review_requested && (
                <span className="review-status-badge in-progress">Review Requested</span>
              )}
            </div>
          </div>
          <div className="header-actions">
            <a
              href={detail.app_url.startsWith('http') ? detail.app_url : `https://${detail.app_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="header-action-btn visit-app-btn"
            >
              Visit app ↗
            </a>
          </div>
        </div>
      </div>

      {!detail.is_expired && !detail.is_complete && !detail.is_rejected && (
        <div className="review-app-actions review-app-actions--top">
          {!detail.is_complete && !detail.is_exchange && (
            <button className="review-delete-btn" onClick={handleDelete}>
              Delete review
            </button>
          )}
          <button
            className="review-submit-btn"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Submitting…'
              : detail.is_complete ? 'Approved'
              : detail.is_rejected ? 'Rejected'
              : detail.is_submitted ? 'Awaiting approval'
              : 'Submit review →'}
          </button>
        </div>
      )}

      <div className="review-app-body">
        <div className="review-app-main">

          {!detail.is_complete && !detail.is_rejected && (
            <>
              <ReviewerDeadlineBanner deadline={detail.reviewer_deadline} />
              <OwnerDeadlineBanner deadline={detail.owner_deadline} />
            </>
          )}
          
          <section className="review-section">
            <p className="review-section-label">ABOUT THIS APP</p>
            <textarea className="review-request-text" value={detail.app_description} readOnly />
          </section>

          <section className="review-section">
            <p className="review-section-label">WHAT THE DEVELOPER IS LOOKING FOR</p>
            <textarea className="review-request-text" value={detail.app_request} readOnly />
          </section>

          <OwnerMessageBanner
            message={detail.owner_message}
            is_complete={detail.is_complete}
            is_rejected={detail.is_rejected}
          />

          <section className="review-section">
            <p className="review-section-label">FEEDBACK</p>
            <div className="rubric-fields">
              <div className="rubric-field">
                <label className={`rubric-label${showValidation && !testedPlatform ? ' rubric-label--error' : ''}`}>What platform did you test on?{showValidation && !testedPlatform && <span className="rubric-error-hint"> — required</span>}</label>
                <div className={`rubric-options${showValidation && !testedPlatform ? ' rubric-options--error' : ''}`}>
                  {['mobile', 'web'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      className={`rubric-option${testedPlatform === opt ? ' selected' : ''}`}
                      onClick={() => !detail.is_submitted && !detail.is_complete && !detail.is_rejected && setTestedPlatform(opt)}
                      disabled={detail.is_submitted || detail.is_complete || detail.is_rejected}
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rubric-field">
                <label className={`rubric-label${showValidation && !testDuration.trim() ? ' rubric-label--error' : ''}`}>How long did you test the app for?{showValidation && !testDuration.trim() && <span className="rubric-error-hint"> — required</span>}</label>
                <input
                  className={`rubric-input${showValidation && !testDuration.trim() ? ' rubric-input--error' : ''}`}
                  type="text"
                  placeholder="e.g. 20 minutes"
                  value={testDuration}
                  onChange={e => setTestDuration(e.target.value)}
                  disabled={detail.is_submitted || detail.is_complete || detail.is_rejected}
                />
              </div>
              <div className="rubric-field">
                <label className={`rubric-label${showValidation && createdAccount === '' ? ' rubric-label--error' : ''}`}>Did you create an account?{showValidation && createdAccount === '' && <span className="rubric-error-hint"> — required</span>}</label>
                <div className={`rubric-options${showValidation && createdAccount === '' ? ' rubric-options--error' : ''}`}>
                  {[['true', 'Yes'], ['false', 'No']].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={`rubric-option${createdAccount === val ? ' selected' : ''}`}
                      onClick={() => !detail.is_submitted && !detail.is_complete && !detail.is_rejected && setCreatedAccount(val)}
                      disabled={detail.is_submitted || detail.is_complete || detail.is_rejected}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="review-section">
            <p className={`rubric-label${showValidation && feedback.trim().length < 200 ? ' rubric-label--error' : ''}`}>
              Your Feedback{showValidation && feedback.trim().length < 200 && <span className="rubric-error-hint"> — minimum 200 characters. Ensure you include plenty of detail!</span>}
            </p>
            <textarea
              className={`review-feedback-input${showValidation && feedback.trim().length < 200 ? ' review-feedback-input--error' : ''}`}
              placeholder="Write your honest, constructive feedback here…"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              disabled={detail.is_complete || detail.is_submitted || detail.is_rejected}
            />
            {!detail.is_submitted && !detail.is_complete && !detail.is_rejected && (
              <p className={`feedback-char-count ${feedback.trim().length >= 200 ? 'feedback-char-count--ok' : ''}`}>
                {feedback.trim().length} / 200 characters minimum
              </p>
            )}
          </section>

          {/* Conversation thread */}
          {detail.is_submitted && (
            <section className="review-section chat-section">
              <p className="review-section-label">CONVERSATION</p>
              {messages.length > 0 && (
                <div className="chat-messages">
                  {messages.map(msg => {
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
                    const isMe = msg.sender_username === currentUser.username
                    return (
                      <div key={msg.id} className={`chat-bubble-wrap${isMe ? ' chat-bubble-wrap--me' : ''}`}>
                        {!isMe && <span className="chat-sender">{msg.sender_username}</span>}
                        <div className={`chat-bubble${isMe ? ' chat-bubble--me' : ''}`}>
                          {msg.body}
                        </div>
                        <span className="chat-time">{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                    )
                  })}
                  <div ref={chatBottomRef} />
                </div>
              )}
              {!detail.is_complete && !detail.is_rejected && !detail.is_expired && (
                <div className="chat-input-row">
                  <textarea
                    className="chat-input"
                    placeholder="Reply to the app owner…"
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
                    }}
                    rows={2}
                  />
                  <button
                    className="chat-send-btn"
                    onClick={handleSendMessage}
                    disabled={sendingMsg || !msgInput.trim()}
                  >
                    {sendingMsg ? '…' : 'Send'}
                  </button>
                </div>
              )}
              {msgError && <p className="review-app-error">{msgError}</p>}
            </section>
          )}

          {error && <p className="review-app-error">{error}</p>}
        </div>

        {(!detail.is_complete || screenshots.length > 0) && (
          <aside className="review-app-sidebar">
            <section className="review-section">
              <p className="review-section-label">SCREENSHOTS</p>

              {!detail.is_complete && (
                <p className="review-screenshots-hint">
                  Attach screenshots to illustrate your feedback.
                </p>
              )}

              {screenshots.length > 0 && (
                <div className="screenshots-grid">
                  {screenshots.map((s, i) => (
                    <div key={i} className="screenshot-thumb-wrap">
                      <img
                        src={s.url}
                        alt={`Screenshot ${i + 1}`}
                        className="screenshot-thumb screenshot-thumb--clickable"
                        onClick={() => setExpandedImg(s.url)}
                      />
                      {!detail.is_complete && !detail.is_submitted && !detail.is_rejected && (
                        <button
                          className="screenshot-delete-btn"
                          onClick={() => handleDeleteScreenshot(s.filename)}
                          title="Delete screenshot"
                        >
                          ✕
                        </button>
                      )}
                    </div>
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
        )}

      </div>
    </div>
  )
}

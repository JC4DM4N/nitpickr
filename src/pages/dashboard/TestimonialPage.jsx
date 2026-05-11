import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { authFetch } from '../../utils/authFetch'
import './TestimonialPage.css'

export default function TestimonialPage() {
  const { appId, reviewId } = useParams()
  const navigate = useNavigate()

  const [detail, setDetail] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [pendingSelection, setPendingSelection] = useState(null)
  const [quoteText, setQuoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedTestimonial, setSavedTestimonial] = useState(null)
  const [copied, setCopied] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const sourceRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    Promise.all([
      authFetch(`/apps/${appId}/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      authFetch(`/apps/${appId}/reviews/${reviewId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
    ])
      .then(([reviewData, msgData]) => {
        setDetail(reviewData)
        setMessages(Array.isArray(msgData) ? msgData : [])
        setLoading(false)
      })
      .catch(() => { setError('Failed to load review'); setLoading(false) })
  }, [appId, reviewId])

  function handleMouseUp() {
    const sel = window.getSelection()
    const text = sel?.toString().trim()
    if (text && sourceRef.current?.contains(sel.anchorNode)) {
      setPendingSelection(text)
    }
  }

  function useSelection() {
    setQuoteText(pendingSelection)
    setPendingSelection(null)
    setSavedTestimonial(null)
    setSaveError(null)
    window.getSelection()?.removeAllRanges()
  }

  async function handleSave() {
    if (!quoteText.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await authFetch(`/apps/${appId}/reviews/${reviewId}/testimonials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quote_text: quoteText.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveError(data.detail || 'Failed to save testimonial')
        return
      }
      setSavedTestimonial(data)
    } catch {
      setSaveError('Could not connect to server')
    } finally {
      setSaving(false)
    }
  }

  function getEmbedSnippet(id) {
    return `<div data-nitpickr="${id}"></div>\n<script src="https://nitpickr.dev/embed.js" async><\/script>`
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(getEmbedSnippet(savedTestimonial.id))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="testimonial-loading">Loading…</div>
  if (error) return <div className="testimonial-loading">{error}</div>
  if (!detail.is_complete) return <div className="testimonial-loading">This review must be approved before creating a testimonial.</div>

  function dismissModal() {
    setQuoteText('')
    setSavedTestimonial(null)
    setSaveError(null)
  }

  return (
    <div className="testimonial-page">
      <div className="testimonial-header">
        <button className="testimonial-back-btn" onClick={() => navigate(`/my-apps/${appId}/reviews/${reviewId}`)}>
          ← Back to review
        </button>
        <h1 className="reviews-title testimonial-title">Testimonials Studio</h1>
      </div>

      {/* Quote modal */}
      {quoteText && (
        <div className="testimonial-modal-backdrop" onClick={dismissModal}>
          <div className="testimonial-modal" onClick={e => e.stopPropagation()}>
            <p className="testimonial-section-label">YOUR QUOTE</p>
            <div className="testimonial-preview">
              <blockquote className="testimonial-preview-quote">"{quoteText}"</blockquote>
              <div className="testimonial-preview-badge">
                <img src="/nitpickr_verified.svg" alt="NitPickr Verified" width="140" height="32" />
              </div>
            </div>

            {savedTestimonial ? (
              <>
                <p className="testimonial-section-label" style={{ marginTop: '20px' }}>EMBED SNIPPET</p>
                <p className="testimonial-hint">
                  Paste this anywhere on your landing page. Style the container however you like —
                  the quote text is always served live from NitPickr so it can't be altered.
                </p>
                <div className="testimonial-embed-box">
                  <pre className="testimonial-embed-code">{getEmbedSnippet(savedTestimonial.id)}</pre>
                  <button className="testimonial-copy-btn" onClick={handleCopy}>
                    {copied ? 'Copied!' : 'Copy snippet'}
                  </button>
                </div>
                <div className="testimonial-save-row" style={{ marginTop: '14px' }}>
                  <button className="testimonial-clear-btn" onClick={dismissModal}>
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="testimonial-save-row">
                  <button className="testimonial-clear-btn" onClick={dismissModal}>
                    Choose different quote
                  </button>
                  <button
                    className="testimonial-save-btn"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save & get embed snippet →'}
                  </button>
                </div>
                {saveError && <p className="testimonial-error">{saveError}</p>}
              </>
            )}
          </div>
        </div>
      )}

      <div className="testimonial-body">
        <div className="testimonial-main">

          <section className="testimonial-section">
            <p className="testimonial-section-label">SELECT YOUR QUOTE</p>
            <p className="testimonial-hint">Highlight any text below to use it as your testimonial quote.</p>

            <div className="testimonial-source" ref={sourceRef} onMouseUp={handleMouseUp}>
              {detail.feedback && (
                <div className="testimonial-source-block">
                  <span className="testimonial-source-tag">Feedback</span>
                  <p className="testimonial-source-text">{detail.feedback}</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className="testimonial-source-block">
                  <span className="testimonial-source-tag">{msg.sender_username}</span>
                  <p className="testimonial-source-text">{msg.body}</p>
                </div>
              ))}
              {!detail.feedback && messages.length === 0 && (
                <p className="testimonial-hint">No feedback or messages on this review.</p>
              )}
            </div>

            {pendingSelection && (
              <div className="testimonial-selection-bar">
                <span className="testimonial-selection-preview">
                  "{pendingSelection.length > 100 ? pendingSelection.slice(0, 100) + '…' : pendingSelection}"
                </span>
                <button className="testimonial-use-btn" onClick={useSelection}>
                  Use this quote
                </button>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import './ReviewAppPage.css'
import './MyAppDetailPage.css'
import './SubmitAppPage.css'
import { AppPageHeader } from '../../components/AppPageHeader'
import { FeedbackRequestSection } from '../../components/FeedbackRequestSection'
import { FeedbackFeed } from '../../components/FeedbackFeed'
import { CATEGORIES, STAGES, PALETTE } from '../../constants'

export default function MyAppDetailPage({ appId, onBack, onOpenReview }) {
  const [app, setApp] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [editMode, setEditMode] = useState(false)
  const [editFields, setEditFields] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    Promise.all([
      fetch(`http://localhost:8000/apps/${appId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).then(r => r.json()),
      fetch(`http://localhost:8000/apps/${appId}/reviews`, {
        headers: { 'Authorization': `Bearer ${token}` },
      }).then(r => r.json()),
    ])
      .then(([appData, reviewsData]) => {
        setApp(appData)
        setReviews(reviewsData)
        setLoading(false)
      })
      .catch(() => { setError('Failed to load app'); setLoading(false) })
  }, [appId])

  function handleEdit() {
    setEditFields({
      name: app.name,
      url: app.url,
      category: app.category,
      stage: app.stage,
      description: app.description,
      request: app.request,
      color: app.color,
    })
    setSaveError(null)
    setEditMode(true)
  }

  function handleCancel() {
    setEditMode(false)
    setEditFields(null)
    setSaveError(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:8000/apps/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editFields),
      })
      if (!res.ok) {
        const data = await res.json()
        setSaveError(data.detail || 'Failed to save')
        return
      }
      const updated = await res.json()
      setApp(updated)
      setEditMode(false)
      setEditFields(null)
    } catch {
      setSaveError('Could not connect to server')
    } finally {
      setSaving(false)
    }
  }

  function field(key) {
    return e => setEditFields(prev => ({ ...prev, [key]: e.target.value }))
  }

  if (loading) return <div className="review-app-loading">Loading…</div>
  if (error) return <div className="review-app-loading">{error}</div>

  return (
    <div className="review-app-page">
      <AppPageHeader
        backLabel="← Back to my apps"
        onBack={onBack}
        color={editMode ? editFields.color : app.color}
        initials={editMode ? (editFields.name.split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('') || app.initials) : app.initials}
        name={editMode ? editFields.name : app.name}
        stage={editMode ? editFields.stage : app.stage}
        url={editMode ? editFields.url : app.url}
        actions={
          editMode ? (
            <>
              <button className="edit-cancel-btn" onClick={handleCancel}>Cancel</button>
              <button className="edit-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : (
            <button className="edit-app-btn" onClick={handleEdit}>Edit</button>
          )
        }
      />

      <div className="review-app-body">
        <div className="review-app-main">
          {editMode ? (
            <div className="edit-form">
              {saveError && <p className="edit-form-error">{saveError}</p>}

              <div className="edit-field-group">
                <label className="edit-field-label">APP NAME</label>
                <input className="edit-field-input" value={editFields.name} onChange={field('name')} />
              </div>

              <div className="edit-field-group">
                <label className="edit-field-label">URL</label>
                <input className="edit-field-input" value={editFields.url} onChange={field('url')} />
              </div>

              <div className="edit-field-row">
                <div className="edit-field-group">
                  <label className="edit-field-label">CATEGORY</label>
                  <select className="edit-field-select" value={editFields.category} onChange={field('category')}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="edit-field-group">
                  <label className="edit-field-label">STAGE</label>
                  <select className="edit-field-select" value={editFields.stage} onChange={field('stage')}>
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
                      className={`color-swatch${editFields.color === c ? ' color-swatch--selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => setEditFields(prev => ({ ...prev, color: c }))}
                    />
                  ))}
                </div>
              </div>

              <div className="edit-field-group">
                <label className="edit-field-label">DESCRIPTION</label>
                <textarea className="edit-field-textarea" value={editFields.description} onChange={field('description')} />
              </div>

              <FeedbackRequestSection
                value={editFields.request}
                originalValue={app.request}
                onChange={v => setEditFields(prev => ({ ...prev, request: v }))}
              />
            </div>
          ) : (
            <FeedbackRequestSection
              value={app.request}
              originalValue={app.request}
            />
          )}

          <section className="review-section">
            <p className="review-section-label">YOUR FEEDBACK</p>
            <FeedbackFeed reviews={reviews} onOpenReview={onOpenReview} />
          </section>
        </div>
      </div>
    </div>
  )
}

import '../pages/dashboard/ReviewAppPage.css'

export function FeedbackRequestSection({ value, originalValue, onChange, onSave, saving }) {
  const editable = !!onChange
  const isDirty = editable && value !== originalValue

  return (
    <section className="review-section">
      <p className="review-section-label">DESCRIBE THE FEEDBACK YOU ARE LOOKING FOR</p>
      <textarea
        className={`review-request-text${editable ? ' review-request-text--editable' : ''}`}
        value={value}
        readOnly={!editable}
        onChange={editable ? e => onChange(e.target.value) : undefined}
      />
      {isDirty && onSave && (
        <div className="save-request-row">
          <button className="save-request-btn" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </section>
  )
}

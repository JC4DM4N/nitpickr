import '../pages/dashboard/ReviewAppPage.css'

export function FeedbackRequestSection({ value }) {
  return (
    <section className="review-section">
      <p className="review-section-label">DESCRIBE THE FEEDBACK YOU ARE LOOKING FOR</p>
      <textarea className="review-request-text" value={value} readOnly />
    </section>
  )
}

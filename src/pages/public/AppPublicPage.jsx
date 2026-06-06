import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { STAGE_STYLES } from '../../constants'
import { authFetch } from '../../utils/authFetch'
import '../dashboard/ExplorePage.css'
import '../dashboard/UserProfilePage.css'
import './AppPublicPage.css'

const SITE_URL = 'https://nitpickr.dev'

function setMetaTag(attr, name, content) {
  let el = document.querySelector(`meta[${attr}="${name}"]`)
  if (el) {
    el.setAttribute('content', content)
  } else {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    el.setAttribute('content', content)
    document.head.appendChild(el)
  }
}

export default function AppPublicPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState(null)

  const isLoggedIn = !!localStorage.getItem('token')
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    const prevTitle = document.title
    fetch(`/apps/by-slug/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then(data => {
        if (data.is_hidden) { setNotFound(true); setLoading(false); return }
        setApp(data)
        setLoading(false)
        const pageTitle = `${data.name} — developer feedback on NitPickr`
        const pageDesc = `${data.description} Get real feedback from indie developers on NitPickr — a free, credit-based feedback community.`
        const pageUrl = `${SITE_URL}/discover/${slug}`
        document.title = pageTitle
        setMetaTag('name', 'description', pageDesc)
        setMetaTag('property', 'og:title', pageTitle)
        setMetaTag('property', 'og:description', pageDesc)
        setMetaTag('property', 'og:url', pageUrl)
        setMetaTag('name', 'twitter:title', pageTitle)
        setMetaTag('name', 'twitter:description', pageDesc)
        let canonical = document.querySelector('link[rel="canonical"]')
        if (canonical) canonical.setAttribute('href', pageUrl)
      })
      .catch(() => {
        setNotFound(true)
        setLoading(false)
      })
    return () => { document.title = prevTitle }
  }, [slug])

  async function handleStartReview() {
    setReviewLoading(true)
    setReviewError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await authFetch('/reviews/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ app_id: app.id }),
      })
      const data = await res.json()
      if (!res.ok) { setReviewError(data.detail || 'Failed to start review'); return }
      navigate(`/reviews/${data.id}`)
    } catch {
      setReviewError('Could not connect to server')
    } finally {
      setReviewLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="app-pub-standalone">
        <AppPubHeader isLoggedIn={isLoggedIn} />
        <div className="app-pub-loading">Loading…</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="app-pub-standalone">
        <AppPubHeader isLoggedIn={isLoggedIn} />
        <div className="app-pub-not-found">
          <h1>App not found</h1>
          <p>This app may have been removed or made private.</p>
          <Link to="/" className="modal-btn-start">Back to NitPickr</Link>
        </div>
      </div>
    )
  }

  const stage = STAGE_STYLES[app.stage] || {}
  const appUrl = app.url.startsWith('http') ? app.url : `https://${app.url}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: app.name,
    url: appUrl,
    applicationCategory: app.category,
    description: app.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }

  return (
    <div className="app-pub-standalone">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AppPubHeader isLoggedIn={isLoggedIn} />

      <div className="explore">
        <div className="explore-hero profile-hero app-pub-hero-section">
          <div className="profile-hero-identity">
            <div className="app-icon app-pub-icon-lg" style={{ background: app.color }}>
              {app.initials}
            </div>
            <div>
              <h1 className="explore-title profile-title">{app.name}</h1>
              <a
                className="app-pub-url-link"
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {app.url} ↗
              </a>
              <div className="profile-meta-row">
                <span className="app-pub-owner-text">
                  by{' '}
                  <Link to={`/${app.owner_username}`} className="app-pub-owner-link">
                    {app.owner_username}
                  </Link>
                </span>
              </div>
              {/* <div className="profile-meta-row">
                <span className="app-category-tag">{app.category}</span>
                <span className="app-stage-badge" style={stage}>{app.stage}</span>
                {app.owner_reviewer_rating != null && (
                  <span className="profile-rating-badge">
                    {app.owner_reviewer_rating}
                    <img src="/star.png" width="20" height="20" alt="star" style={{ display: 'block' }} />
                    reviewer rating
                  </span>
                )}
              </div> */}
            </div>
          </div>
        </div>

        <div className="explore-body profile-body">
          <div className="explore-results app-pub-results">
            <div className="modal-card modal-card--wide app-pub-content-card">
              <div className="modal-meta-row">
                <div className="modal-meta-item">
                  <span className="app-footer-label">STAGE</span>
                  <span className="app-stage-badge" style={stage}>{app.stage}</span>
                </div>
                <div className="modal-meta-item">
                  <span className="app-footer-label">REVIEWS RECEIVED</span>
                  <span className="app-footer-value">{app.approved_count}</span>
                </div>
                <div className="modal-meta-item">
                  <span className="app-footer-label">CREDITS PER REVIEW</span>
                  <span className="app-footer-value">{app.credits}</span>
                </div>
                <div className="modal-meta-item">
                  <span className="app-footer-label">REVIEWER RATING</span>
                  {app.owner_reviewer_rating != null ? (
                    <span className="app-footer-value user-card-rating">
                      {app.owner_reviewer_rating}
                      <img src="/star.png" width="20" height="20" alt="star" style={{ display: 'block' }} />
                      / 5
                    </span>
                  ) : (
                    <span className="app-footer-value">—</span>
                  )}
                </div>
              </div>

              {app.description && (
                <>
                  <p className="modal-section-label">ABOUT THIS APP</p>
                  <p className="modal-description">{app.description}</p>
                </>
              )}

              <p className="modal-section-label">WHAT THE DEVELOPER IS LOOKING FOR</p>
              <div className="modal-request modal-request-app-profile-page">{app.request}</div>

              {reviewError && <p className="modal-error">{reviewError}</p>}

              <div className="modal-actions">
                {/* <a
                  href={appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="app-review-btn"
                >
                  Visit
                </a> */}
                {isLoggedIn && currentUser.username?.toLowerCase() === app.owner_username?.toLowerCase() ? null : isLoggedIn ? (
                  <button
                    className="app-review-btn"
                    onClick={handleStartReview}
                    disabled={reviewLoading}
                  >
                    {reviewLoading ? 'Starting…' : 'Leave feedback →'}
                  </button>
                ) : (
                  <Link to="/signup" className="app-review-btn">
                    Sign up to leave feedback →
                  </Link>
                )}
              </div>
            </div>

            {/* <div className="app-pub-how-section">
              <p className="modal-section-label">HOW NITPICKR WORKS</p>
              <ol className="app-pub-steps">
                <li>
                  <strong>Review apps</strong> — Try other developers' apps and leave
                  honest, actionable feedback.
                </li>
                <li>
                  <strong>Earn credits</strong> — Each approved review earns you one
                  credit.
                </li>
                <li>
                  <strong>Get feedback</strong> — Spend credits to receive feedback on
                  your own app.
                </li>
              </ol>
              <p className="app-pub-how-note">
                No subscriptions. No credit card. Just developers helping developers.
              </p>
            </div> */}
          </div>
        </div>
      </div>

      <footer className="app-pub-footer">
        <Link to="/">NitPickr</Link>
        <span>·</span>
        <Link to="/signup">Get free feedback</Link>
        <span>·</span>
        <Link to="/how-it-works">How it works</Link>
        <span>·</span>
        <Link to="/explore">Explore apps</Link>
      </footer>
    </div>
  )
}

function AppPubHeader({ isLoggedIn }) {
  return (
    <header className="app-pub-header">
      <Link to="/" className="app-pub-logo">
        <img src="/nitpickr_logo.svg" alt="NitPickr" height="30" />
      </Link>
      <div className="app-pub-header-actions">
        {!isLoggedIn && <Link to="/login" className="app-pub-btn-ghost">Sign in</Link>}
        <Link to={isLoggedIn ? '/explore' : '/'} className="app-review-btn">Explore apps →</Link>
      </div>
    </header>
  )
}

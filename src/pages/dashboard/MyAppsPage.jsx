import { useState, useEffect } from 'react'
import './ReviewsPage.css'

const STAGE_STYLES = {
  'Pre-launch': { bg: '#fef3c7', color: '#92400e' },
  'Beta':       { bg: '#dbeafe', color: '#1e40af' },
  'Live':       { bg: '#d1fae5', color: '#065f46' },
}

export default function MyAppsPage({ onOpenApp }) {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('http://localhost:8000/apps/mine', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setApps(data); setLoading(false) })
      .catch(() => { setError('Failed to load apps'); setLoading(false) })
  }, [])

  return (
    <div className="reviews-page">
      <div className="reviews-header">
        <h1 className="reviews-title">My Apps</h1>
        <p className="reviews-sub">Apps you have submitted for feedback.</p>
      </div>
      <div className="reviews-body">
        {loading && <p className="reviews-empty">Loading…</p>}
        {error && <p className="reviews-empty">{error}</p>}
        {!loading && !error && apps.length === 0 && (
          <p className="reviews-empty">No apps yet.</p>
        )}
        {!loading && !error && apps.length > 0 && (
          <table className="reviews-table">
            <thead>
              <tr>
                <th>App</th>
                <th>Category</th>
                <th>Stage</th>
                <th>Feedbacks</th>
                <th>Views</th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => (
                <tr key={app.id} onClick={() => onOpenApp(app.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="reviews-app-cell">
                      <div className="reviews-app-icon" style={{ background: app.color }}>{app.initials}</div>
                      <div>
                        <div className="reviews-app-name">{app.name}</div>
                        <div className="reviews-app-url">{app.url}</div>
                      </div>
                    </div>
                  </td>
                  <td>{app.category}</td>
                  <td>
                    <span className="app-stage-badge" style={STAGE_STYLES[app.stage]}>
                      {app.stage}
                    </span>
                  </td>
                  <td className="reviews-date">{app.feedbacks}</td>
                  <td className="reviews-date">{app.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

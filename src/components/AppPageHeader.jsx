import { STAGE_STYLES } from '../constants'
import '../pages/dashboard/ReviewAppPage.css'

export function AppPageHeader({ backLabel, onBack, color, initials, name, stage, url, actions, children }) {
  return (
    <div className="review-app-header">
      <button className="review-app-back" onClick={onBack}>{backLabel}</button>
      <div className="review-app-title-row">
        <div className="review-app-icon" style={{ background: color }}>{initials}</div>
        <div className="review-app-title-block">
          <h1 className="review-app-name">{name}</h1>
          <div className="review-app-meta">
            <span className="app-stage-badge" style={STAGE_STYLES[stage]}>{stage}</span>
            {children}
          </div>
        </div>
        <div className="header-actions">
          {actions}
          <button
            className="header-action-btn visit-app-btn"
            onClick={() => window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener,noreferrer')}
          >
            Visit app ↗
          </button>
        </div>
      </div>
    </div>
  )
}

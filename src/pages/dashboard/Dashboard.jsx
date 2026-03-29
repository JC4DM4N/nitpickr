import { useState } from 'react'
import './Dashboard.css'
import Sidebar from '../../components/Sidebar'
import ExplorePage from './ExplorePage'
import MyAppsPage from './MyAppsPage'
import MyAppDetailPage from './MyAppDetailPage'
import OwnerReviewPage from './OwnerReviewPage'
import ReviewsPage from './ReviewsPage'
import ReviewAppPage from './ReviewAppPage'
import CreditsPage from './CreditsPage'

const NAV = [
  { id: 'explore',  label: 'Explore' },
  { id: 'my-apps',  label: 'My Apps' },
  { id: 'reviews',  label: 'Reviews' },
  { id: 'credits',  label: 'Credits' },
]

export default function Dashboard({ user, onLogout }) {
  const [page, setPage] = useState('explore')
  const [reviewId, setReviewId] = useState(null)
  const [appId, setAppId] = useState(null)

  function handleOpenReview(id) {
    setReviewId(id)
    setPage('review-app')
  }

  function handleOpenApp(id) {
    setAppId(id)
    setPage('my-app-detail')
  }

  function handleOpenOwnerReview(id) {
    setReviewId(id)
    setPage('owner-review')
  }

  function handleNavChange(p) {
    setReviewId(null)
    setAppId(null)
    setPage(p)
  }

  return (
    <div className="dashboard">
      <Sidebar page={page} setPage={handleNavChange} user={user} onLogout={onLogout} />
      <main className="dash-main">
        {page === 'explore'       && <ExplorePage />}
        {page === 'my-apps'       && <MyAppsPage onOpenApp={handleOpenApp} />}
        {page === 'my-app-detail' && <MyAppDetailPage appId={appId} onBack={() => handleNavChange('my-apps')} onOpenReview={handleOpenOwnerReview} />}
        {page === 'owner-review'  && <OwnerReviewPage appId={appId} reviewId={reviewId} onBack={() => setPage('my-app-detail')} />}
        {page === 'reviews'       && <ReviewsPage onOpenReview={handleOpenReview} />}
        {page === 'review-app'    && <ReviewAppPage reviewId={reviewId} onBack={() => handleNavChange('reviews')} />}
        {page === 'credits'       && <CreditsPage />}
        {page !== 'explore' && page !== 'my-apps' && page !== 'my-app-detail' && page !== 'owner-review' && page !== 'reviews' && page !== 'review-app' && page !== 'credits' && (
          <ComingSoon label={NAV.find(n => n.id === page)?.label} />
        )}
      </main>
    </div>
  )
}


function ComingSoon({ label }) {
  return (
    <div className="coming-soon">
      <div className="coming-soon-icon">🚧</div>
      <h2>{label}</h2>
      <p>This page is coming soon.</p>
    </div>
  )
}

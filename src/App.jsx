import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import LandingPage from './pages/landing/LandingPage'
import LoginPage from './pages/login/LoginPage'
import SignUpPage from './pages/login/SignUpPage'
import ForgotPasswordPage from './pages/login/ForgotPasswordPage'
import ResetPasswordPage from './pages/login/ResetPasswordPage'
import Dashboard from './pages/dashboard/Dashboard'
import ExplorePage from './pages/dashboard/ExplorePage'
import MyAppsPage from './pages/dashboard/MyAppsPage'
import MyAppDetailPage from './pages/dashboard/MyAppDetailPage'
import OwnerReviewPage from './pages/dashboard/OwnerReviewPage'
import ReviewsPage from './pages/dashboard/ReviewsPage'
import ReviewAppPage from './pages/dashboard/ReviewAppPage'
import CreditsPage from './pages/dashboard/CreditsPage'
import SubmitAppPage from './pages/dashboard/SubmitAppPage'
import NotificationsPage from './pages/dashboard/NotificationsPage'

function getStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function App() {
  const [user, setUser] = useState(getStoredUser())

  function handleLoginSuccess(userData) {
    setUser(userData)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  // Redirects to /explore if already logged in
  function PublicOnly({ children }) {
    return user ? <Navigate to="/explore" replace /> : children
  }

  // Redirects to /login if not logged in
  function Protected() {
    return user ? <Outlet /> : <Navigate to="/login" replace />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicOnly><LandingPage /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><LoginPage onSuccess={handleLoginSuccess} /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><SignUpPage onSuccess={handleLoginSuccess} /></PublicOnly>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<Protected />}>
          <Route element={<Dashboard user={user} onLogout={handleLogout} />}>
            <Route path="/explore"       element={<ExplorePage />} />
            <Route path="/my-apps"       element={<MyAppsPage />} />
            <Route path="/my-apps/new"   element={<SubmitAppPage />} />
            <Route path="/my-apps/:appId"                          element={<MyAppDetailPage />} />
            <Route path="/my-apps/:appId/reviews/:reviewId"        element={<OwnerReviewPage />} />
            <Route path="/reviews"       element={<ReviewsPage />} />
            <Route path="/reviews/:reviewId"                       element={<ReviewAppPage />} />
            <Route path="/credits"       element={<CreditsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="*"              element={<Navigate to="/explore" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

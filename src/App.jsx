import { useState } from 'react'
import LandingPage from './pages/landing/LandingPage'
import LoginPage from './pages/login/LoginPage'
import SignUpPage from './pages/login/SignUpPage'
import Dashboard from './pages/dashboard/Dashboard'

function getStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function App() {
  const storedUser = getStoredUser()
  const [view, setView] = useState(storedUser ? 'dashboard' : 'landing')
  const [user, setUser] = useState(storedUser)

  function handleLoginSuccess(userData) {
    setUser(userData)
    setView('dashboard')
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setView('landing')
  }

  if (view === 'login') {
    return (
      <LoginPage
        onSuccess={handleLoginSuccess}
        onBack={() => setView('landing')}
        onSignUp={() => setView('signup')}
      />
    )
  }

  if (view === 'signup') {
    return (
      <SignUpPage
        onSuccess={handleLoginSuccess}
        onBack={() => setView('landing')}
        onLogin={() => setView('login')}
      />
    )
  }

  if (view === 'dashboard') {
    return <Dashboard user={user} onLogout={handleLogout} />
  }

  return (
    <LandingPage
      onLogin={() => setView('login')}
      onGetStarted={() => setView('signup')}
      onSignUp={() => setView('signup')}
    />
  )
}

export default App

import { useState, useEffect, Suspense, lazy, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'
import { useNotificationsRealtime } from './hooks/useNotificationsRealtime'
import { usePostsRealtime } from './hooks/usePostsRealtime'
import { testSupabaseConnection } from './utils/test-connection'
import Layout from './components/layout/Layout'
import ForumView from './components/forum/ForumView'
import PostView from './components/forum/PostView'
import './App.css'

// Lazy load heavy components
const MessagesPage = lazy(() => import('./components/messaging/MessagesPage'))
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'))
const ModerationQueue = lazy(() => import('./components/admin/ModerationQueue'))
const TherapistDirectoryPage = lazy(() => import('./components/therapist/TherapistDirectoryPage'))
const UserProfile = lazy(() => import('./components/user/UserProfile'))
const ResetPassword = lazy(() => import('./components/auth/ResetPassword'))
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword'))
const ConfirmEmail = lazy(() => import('./components/auth/ConfirmEmail'))
const CommunityGuidelinesPage = lazy(() => import('./components/static/CommunityGuidelinesPage'))
const WelcomePage = lazy(() => import('./components/auth/WelcomePage'))

function App() {
  const [showCreatePostDialog, setShowCreatePostDialog] = useState(false)
  const { user, userProfile, loading, completeOnboarding, checkUsernameAvailable } = useAuthStore()
  
  // Set up real-time subscriptions
  useNotificationsRealtime()
  usePostsRealtime()
  
  
  // Test connection on startup
  useEffect(() => {
    testSupabaseConnection()
  }, [])

  const handleCreatePost = () => {
    setShowCreatePostDialog(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Router basename="/">
          <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            </div>
          }>
            <Routes>
          {/* Public routes (no auth required) */}
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/callback" element={<ConfirmEmail />} />
          <Route path="/auth/confirm" element={
            <WelcomePage
              onComplete={completeOnboarding}
              checkUsernameAvailable={checkUsernameAvailable}
            />
          } />

          {/* Auth-protected routes */}
          {!user ? (
            <Route path="*" element={<AuthForm />} />
          ) : !userProfile?.onboarding_complete ? (
            // New user - show welcome page for onboarding
            <>
              {/* Allow access to community guidelines during onboarding */}
              <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />
              <Route path="*" element={
                <WelcomePage
                  onComplete={completeOnboarding}
                  checkUsernameAvailable={checkUsernameAvailable}
                />
              } />
            </>
          ) : (
            <>
              {/* PostView, TherapistDirectoryPage, and CommunityGuidelinesPage without Layout to avoid double navigation */}
              <Route path="/post/:id" element={<PostView />} />
              <Route path="/therapists" element={<TherapistDirectoryPage />} />
              <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />

              {/* All other routes use Layout */}
              <Route
                path="/"
                element={
                  <Layout onCreatePost={handleCreatePost}>
                    <ForumView
                      showCreatePostDialog={showCreatePostDialog}
                      onCreatePostDialogClose={() => setShowCreatePostDialog(false)}
                      onCreatePost={handleCreatePost}
                    />
                  </Layout>
                }
              />
              <Route path="/messages" element={<Layout onCreatePost={handleCreatePost}><MessagesPage /></Layout>} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/admin" element={<Layout onCreatePost={handleCreatePost}><AdminDashboard /></Layout>} />
              <Route path="/admin/moderation" element={<Layout onCreatePost={handleCreatePost} headerBg="#fff0b5"><ModerationQueue /></Layout>} />
            </>
          )}
            </Routes>
          </Suspense>
      </Router>
  )
}

function AuthForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(searchParams.get('login') === 'true')
  const [message, setMessage] = useState('')
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const { login, register } = useAuthStore()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const result = await register(email, password)

      // Handle email confirmation required
      if (result?.requiresConfirmation) {
        setMessage('Registrierung erfolgreich! Bitte überprüfe deine E-Mails und klicke auf den Bestätigungslink.')
        setRegistrationComplete(true)
      } else {
        setMessage('Registrierung erfolgreich!')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      await login(email, password)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterClick = () => {
    setShowRegisterForm(true)
    setShowLoginForm(false)
    setRegistrationComplete(false)
    setMessage('')
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 0)
  }

  const handleLoginClick = () => {
    setShowLoginForm(true)
    setShowRegisterForm(false)
    setRegistrationComplete(false)
    setMessage('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#d5f4da', position: 'relative', overflow: 'hidden' }}>
      <div className="max-w-md w-full" style={{ padding: '9px', position: 'relative', zIndex: 10 }}>
        {/* Welcome Text */}
        {!showLoginForm && (
          <div className="mb-8" style={{ textAlign: 'left', marginTop: '60px' }}>
            <p className="font-body text-[27px] font-semibold" style={{ color: '#144220', fontWeight: 600, lineHeight: '1.3', hyphens: 'auto' } as React.CSSProperties}>
              Du machst eine Psychotherapie? Auf <span className="text-[60px]" style={{ fontFamily: 'Gaegu, cursive', color: 'var(--primary)', fontWeight: 'bold', display: 'inline-block', lineHeight: '0.5', verticalAlign: 'middle' }}>REMY</span> kannst du dich anonym mit Gleichgesinnten austauschen, deine Erfahrungen mit Therapeuten teilen oder nach neuen Therapeuten suchen.
            </p>
            <p className="font-body text-[20px] font-semibold" style={{ color: '#144220', fontWeight: 600, lineHeight: '1.3', hyphens: 'auto', textDecoration: 'underline', textDecorationColor: 'var(--primary)', textDecorationThickness: '3px', textUnderlineOffset: '4px', marginTop: '20px', marginBottom: '30px' } as React.CSSProperties}>
              Melde dich jetzt anonym an und schau herein!
            </p>
          </div>
        )}

        {/* Registration Button - Initial State */}
        {!showRegisterForm && !showLoginForm && (
          <div style={{ textAlign: 'left' }}>
            <button
              onClick={handleRegisterClick}
              className="w-full px-8 py-3 text-white font-medium text-lg rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Registrieren
            </button>
            <div className="mt-4">
              <span className="font-body text-[16px]" style={{ color: '#144220' }}>
                Schon registriert? Weiter zum{' '}
              </span>
              <button
                onClick={handleLoginClick}
                className="font-body text-[16px] underline"
                style={{ color: 'var(--primary)' }}
              >
                Login
              </button>
            </div>
          </div>
        )}

        {/* Registration Form */}
        {showRegisterForm && !registrationComplete && (
          <form ref={formRef} onSubmit={handleRegister} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1 text-left" style={{ color: '#144220' }}>
                E-Mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white"
                placeholder="deine@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1 text-left" style={{ color: '#144220' }}>
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {message && (
              <div className={`rounded-lg p-4 ${
                message.includes('error') || message.includes('Error')
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-green-50 border border-green-200 text-green-700'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white font-medium text-lg rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)' }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {loading ? 'Loading...' : 'Bestätigen'}
            </button>

            <div className="text-center mt-4">
              <span className="font-body text-[16px]" style={{ color: '#144220' }}>
                Schon registriert?{' '}
              </span>
              <button
                type="button"
                onClick={handleLoginClick}
                className="font-body text-[16px] underline"
                style={{ color: 'var(--primary)' }}
              >
                Login
              </button>
            </div>
          </form>
        )}

        {/* Registration Complete - Email Confirmation Required */}
        {showRegisterForm && registrationComplete && (
          <div className="text-center space-y-6">
            <div className="text-green-600 text-6xl mb-4">✓</div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <p className="text-lg font-medium mb-2" style={{ color: '#144220' }}>
                Registrierung erfolgreich!
              </p>
              <p className="text-base" style={{ color: '#144220' }}>
                Bitte überprüfe deine E-Mails und klicke auf den Bestätigungslink.
              </p>
            </div>

            <div className="text-sm" style={{ color: '#144220' }}>
              <p className="mb-4">Nach der Bestätigung kannst du dich einloggen.</p>
              <button
                onClick={handleLoginClick}
                className="font-body text-[16px] underline font-medium"
                style={{ color: 'var(--primary)' }}
              >
                Zum Login
              </button>
            </div>
          </div>
        )}

        {/* Login Form */}
        {showLoginForm && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-center mb-8">
              <h2 style={{ fontFamily: 'Gaegu, cursive', fontWeight: 'bold', fontSize: '60px', color: 'var(--primary)', lineHeight: '0.9', marginBottom: '4px' }}>
                REMY
              </h2>
              <p className="font-body text-[18px]" style={{ color: '#144220', marginBottom: '24px' }}>
                Willkommen zurück
              </p>
            </div>

            <div>
              <label htmlFor="login-email" className="block text-sm font-medium mb-1 text-left" style={{ color: '#144220' }}>
                E-Mail
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white"
                placeholder="deine@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium mb-1 text-left" style={{ color: '#144220' }}>
                Passwort
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="mt-2 text-left">
                <span className="font-body text-[14px]" style={{ color: '#144220' }}>
                  Passwort vergessen?{' '}
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="font-body text-[14px] underline"
                  style={{ color: 'var(--primary)' }}
                >
                  Zurücksetzen
                </button>
              </div>
            </div>

            {message && (
              <div className={`rounded-lg p-4 ${
                message.includes('error') || message.includes('Error')
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-green-50 border border-green-200 text-green-700'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white font-medium text-lg rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)' }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {loading ? 'Loading...' : 'Einloggen'}
            </button>

            <div className="text-center mt-4">
              <span className="font-body text-[16px]" style={{ color: '#144220' }}>
                Noch kein Konto?{' '}
              </span>
              <button
                type="button"
                onClick={handleRegisterClick}
                className="font-body text-[16px] underline"
                style={{ color: 'var(--primary)' }}
              >
                Registrieren
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default App

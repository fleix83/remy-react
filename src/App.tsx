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
    <div className="min-h-screen flex py-8 px-4" style={{
      background: 'linear-gradient(to bottom, #e8f5e9 0%, #c8e6c9 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Large sofa - exact positioning, min-width changes on register form */}
      <img
        src="/images/sofa-landing.png"
        alt=""
        className="block md:hidden"
        style={{
          position: 'absolute',
          left: '0%',
          top: '0%',
          transform: 'rotate(0deg)',
          width: '75vw',
          minWidth: showRegisterForm ? '436px' : '336px',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'left bottom',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      {/* Desktop version - different positioning */}
      <img
        src="/images/sofa-landing.png"
        alt=""
        className="hidden md:block"
        style={{
          position: 'absolute',
          left: '-100px',
          bottom: '-50px',
          transform: 'rotate(15.78deg)',
          width: '500px',
          height: 'auto',
          zIndex: 1,
          pointerEvents: 'none',
          opacity: 0.7
        }}
      />

      <div className="w-full" style={{ position: 'relative', zIndex: 10 }}>
        {/* Welcome Text - Matching mockup exactly */}
        {!showLoginForm && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            paddingLeft: 'clamp(20px, 5vw, 40px)',
            paddingRight: 'clamp(20px, 5vw, 40px)',
            paddingTop: 'clamp(20px, 4vh, 40px)'
          }}>
            {/* Logo and claim image - upper right corner */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: 'clamp(100px, 20vh, 180px)', marginTop: '-20px' }}>
              <img
                src="/images/logo-claim-landing.png"
                alt="REMY - Forum für Menschen in Psychotherapie"
                style={{
                  width: 'clamp(180px, 42vw, 300px)',
                  height: 'auto'
                }}
              />
            </div>

            {/* Text and CTA group - moved 30px to the right, 15px more upwards */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              width: '100%',
              maxWidth: '500px',
              paddingLeft: 'clamp(10px, 3vw, 30px)',
              marginTop: '-35px',
              marginLeft: '20px'
            }}>
              {/* "Du machst eine Psychotherapie?" - moved 20px upwards */}
              <div style={{
                fontFamily: '"Nunito", sans-serif',
                fontWeight: 700,
                fontSize: '32px',
                lineHeight: '1.0',
                color: '#5482ff',
                letterSpacing: '0.01em',
                marginTop: '10px',
                marginBottom: '12px',
                textAlign: 'left'
              }}>
                Du machst eine Psychotherapie?
              </div>

              {/* Subtext - no change */}
              <div style={{
                fontFamily: '"Nunito", sans-serif',
                fontWeight: 600,
                fontSize: 'clamp(17px, 4vw, 24px)',
                lineHeight: '1.35',
                color: '#5482ff',
                letterSpacing: '0.01em',
                marginBottom: 'clamp(35px, 7vh, 50px)',
                textAlign: 'left'
              }}>
                Tausche dich anonym aus mit Gleichgesinnten.
              </div>

              {/* Registration Button - moved 35px upwards */}
              <button
                onClick={handleRegisterClick}
                style={{
                  width: '60vw',
                  maxWidth: '400px',
                  padding: 'clamp(13px, 3vh, 16px) 28px',
                  backgroundColor: '#5482ff',
                  color: 'white',
                  fontFamily: '"Nunito Sans", sans-serif',
                  fontSize: 'clamp(19px, 4.2vw, 24px)',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(84, 130, 255, 0.3)',
                  marginTop: '-35px',
                  marginBottom: 'clamp(18px, 3.5vh, 26px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4070e0'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(84, 130, 255, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#5482ff'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(84, 130, 255, 0.3)'
                }}
              >
                Registrieren
              </button>

              {/* Login link - left aligned */}
              <div style={{ textAlign: 'left', background: 'transparent' }}>
                <span style={{
                  color: '#e9eaee',
                  fontFamily: '"Nunito Sans", sans-serif',
                  fontSize: 'clamp(14px, 3.2vw, 17px)',
                  fontWeight: 600,
                  background: 'transparent'
                }}>
                  Schon registriert? Weiter zum{' '}
                </span>
                <button
                  onClick={handleLoginClick}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#5482ff',
                    fontFamily: '"Nunito Sans", sans-serif',
                    fontSize: 'clamp(14px, 3.2vw, 17px)',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Registration Form - aligned with register button */}
        {showRegisterForm && !registrationComplete && (
          <div style={{
            marginLeft: '30px',
            paddingLeft: 'clamp(10px, 3vw, 30px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            marginTop: '20px'
          }}>
            <form ref={formRef} onSubmit={handleRegister} className="space-y-4" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              width: '100%',
              marginLeft: '20px'
            }}>
              <div style={{ width: '60vw', maxWidth: '400px' }}>
                <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: '#e9eaee', textAlign: 'left' }}>
                  E-Mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white"
                  style={{ width: '100%' }}
                  placeholder="deine@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div style={{ width: '60vw', maxWidth: '400px' }}>
                <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: '#e9eaee', textAlign: 'left' }}>
                  Passwort
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white"
                  style={{ width: '100%' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {message && (
                <div
                  className={`rounded-lg p-4 ${
                    message.includes('error') || message.includes('Error')
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'bg-green-50 border border-green-200 text-green-700'
                  }`}
                  style={{ width: '60vw', maxWidth: '400px' }}
                >
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="py-3 text-white font-medium text-lg rounded-lg transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: '#5482ff',
                  width: '60vw',
                  maxWidth: '400px'
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {loading ? 'Loading...' : 'Bestätigen'}
              </button>

              <div className="text-left mt-4">
                <span className="font-body text-[16px]" style={{ color: '#e9eaee' }}>
                  Schon registriert?{' '}
                </span>
                <button
                  type="button"
                  onClick={handleLoginClick}
                  className="font-body text-[16px] underline"
                  style={{ color: '#e9eaee' }}
                >
                  Login
                </button>
              </div>
            </form>
          </div>
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

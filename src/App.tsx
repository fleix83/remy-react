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

const IMG_BASE = import.meta.env.DEV ? '' : './dist'

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
    <div style={{
      height: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden'
    }}>
      {/* First Section - Landing Page */}
      <div style={{
        height: '100vh',
        background: 'linear-gradient(to bottom, #e8f5e9 0%, #c8e6c9 100%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>

      {/* Blue gradient bar */}
      <div className="md:hidden" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '65px',
        background: 'linear-gradient(rgb(230, 238, 255) 0%, rgb(239 250 241 / 0%) 100%, rgb(239 250 241) 100%)',
        zIndex: 5
      }} />

      {/* Dog illustration - upper left, partially cropped */}
      <img
        src={`${IMG_BASE}/images/dog.png`}
        alt=""
        style={{
          position: 'absolute',
          top: '5%',
          left: '0%',
          width: '100%',
          height: '57%',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      {/* Saul illustration - wavy river, middle area */}
      <img
        src={`${IMG_BASE}/images/saul.png`}
        alt=""
        style={{
          position: 'absolute',
          top: '0%',
          left: '0%',
          width: '41%',
          height: 'auto',
          zIndex: 2,
          pointerEvents: 'none'
        }}
      />

      {/* Gate illustration - bottom area */}
      <img
        src={`${IMG_BASE}/images/gate.png`}
        alt=""
        style={{
          position: 'absolute',
          bottom: '-5%',
          left: '0',
          width: '100%',
          height: 'auto',
          zIndex: 3,
          pointerEvents: 'none'
        }}
      />

      <div className="w-full" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Welcome Text - Matching mockup exactly */}
        {!showLoginForm && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            {/* Logo and claim image - upper right */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              paddingTop: '28px',
              paddingRight: '24px'
            }}>
              <img
                src={`${IMG_BASE}/images/logo_claim.png`}
                alt="REMY - Forum für Menschen in Psychotherapie"
                style={{
                  width: 'clamp(180px, 42vw, 280px)',
                  height: 'auto'
                }}
              />
            </div>

            {/* Spacer to push content down */}
            <div style={{ flex: 1 }} />

            {/* Text and CTA group - bottom portion */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingLeft: '24px',
              paddingRight: '24px',
              paddingBottom: '12vh'
            }}>
              {/* Tagline */}
              <div style={{
                fontFamily: '"Gaegu", cursive',
                fontWeight: 700,
                fontSize: '56px',
                lineHeight: '45px',
                color: 'rgb(84, 130, 255)',
                marginBottom: '28px',
                textAlign: 'left',
                width: '100%',
                maxWidth: '500px'
              }}>
                Du machst eine Psycho­therapie?
              </div>

              {/* Registration Button */}
              <button
                onClick={handleRegisterClick}
                style={{
                  width: '65vw',
                  maxWidth: '360px',
                  padding: '14px 28px',
                  backgroundColor: 'rgb(84, 130, 255)',
                  color: 'white',
                  fontFamily: '"Nunito Sans", sans-serif',
                  fontSize: '20px',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  borderRadius: '25px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: '0.2s',
                  boxShadow: 'rgba(84, 130, 255, 0.3) 0px 4px 12px'
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

              {/* Login link */}
              <div style={{ textAlign: 'center', marginTop: '16px', background: 'transparent' }}>
                <span style={{
                  color: '#8a9ab5',
                  fontFamily: '"Nunito Sans", sans-serif',
                  fontSize: '15px',
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
                    fontSize: '15px',
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

    {/* Second Section - Über Remy */}
    <div className="min-h-screen flex items-center justify-center px-6 py-12 md:hidden" style={{
      background: 'linear-gradient(172deg, #c8e6c9 0.63%, rgb(240, 255, 242) 116.79%)',
      position: 'relative'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        paddingBottom: '60px'
      }}>
        {/* Über Remy Text */}
        <div style={{
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 600,
          fontSize: '24px',
          lineHeight: '1.45',
          color: 'rgb(84, 130, 255)',
          letterSpacing: '0.01em',
          textAlign: 'left',
          hyphens: 'auto',
          WebkitHyphens: 'auto',
          msHyphens: 'auto',
          marginBottom: '60px',
          paddingLeft: '10px',
          paddingRight: '10px',
          maxWidth: '600px',
          widows: 2,
          orphans: 2
        }}>
          PSYCHOTHERAPIE IST INTIM. UND DOCH IST DAS BEDÜRFNIS GROSS, DARÜBER ZU SPRECHEN. AUF REMY KANNST DU DICH ANONYM MIT GLEICHGESINNTEN AUSTAUSCHEN, DEINE ERLEBNISSE MIT THERAPEUT:INNEN TEILEN UND DIE ERFAHRUNGEN ANDERER NUTZEN, UM NEUE THERAPEUT:INNEN ZU FINDEN. REMY IST EINE PATIENTENINITIATIVE FÜR DIE SCHWEIZ UND UNABHÄNGIG VON STAATLICHEN UND PRIVATEN STELLEN.
        </div>
      </div>
    </div>
  </div>
  )
}

export default App

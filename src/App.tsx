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
          <Route path="/community-guidelines" element={<CommunityGuidelinesPage />} />
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
    <div style={{
      height: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden'
    }}>
      {/* Info bar */}
      <div style={{
        width: '100%',
        height: '36px',
        backgroundColor: '#ffffffd1',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '40px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        position: 'relative',
        zIndex: 20
      }}>
        <span style={{
          fontFamily: '"Nunito Sans", sans-serif',
          fontSize: '13px',
          fontWeight: 600,
          color: '#8a9ab5',
          letterSpacing: '0.03em',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a9ab5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Sicher
        </span>
        <span style={{
          fontFamily: '"Nunito Sans", sans-serif',
          fontSize: '13px',
          fontWeight: 600,
          color: '#8a9ab5',
          letterSpacing: '0.03em',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a9ab5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
          Anonym
        </span>
        <span style={{
          fontFamily: '"Nunito Sans", sans-serif',
          fontSize: '13px',
          fontWeight: 600,
          color: '#8a9ab5',
          letterSpacing: '0.03em',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a9ab5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          Moderiert
        </span>
      </div>

      {/* First Section - Landing Page */}
      <div style={{
        height: 'calc(100vh - 36px)',
        background: 'linear-gradient(to bottom, #e8f5e9 0%, #c8e6c9 100%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>


      {/* Dog illustration - upper left, hidden on login */}
      {!showLoginForm && (
        <img
          src={`/images/dog.png`}
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
      )}

      {/* Saul illustration - wavy river, middle area */}
      <img
        src={`/images/saul.png`}
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
              paddingRight: '4px'
            }}>
              <img
                src={`/images/logo_claim.png`}
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
            <div onClick={() => { if (showRegisterForm) { setShowRegisterForm(false); setMessage('') } }} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingLeft: '24px',
              paddingRight: '24px',
              paddingBottom: '8vh'
            }}>
              {/* Tagline - hidden when register form is open */}
              {!showRegisterForm && (
                <div style={{
                  fontFamily: '"Gaegu", cursive',
                  fontWeight: 700,
                  fontSize: '51px',
                  lineHeight: '45px',
                  color: 'rgb(84, 130, 255)',
                  marginBottom: '49px',
                  textAlign: 'left',
                  alignSelf: 'center',
                  maxWidth: '500px'
                }}>
                  Du machst eine Psycho­therapie?
                </div>
              )}

              {/* Registration Button - hidden when form is shown */}
              {!showRegisterForm && (
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
                  Austauschen
                </button>
              )}

              {/* Inline Registration Form */}
              {showRegisterForm && !registrationComplete && (
                <form ref={formRef} onSubmit={handleRegister} onClick={(e) => e.stopPropagation()} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '100%',
                  gap: '12px'
                }}>
                  <p style={{
                    fontFamily: '"Nunito Sans", sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'rgb(84, 130, 255)',
                    marginBottom: '-9px',
                    width: '65vw',
                    maxWidth: '360px',
                    textAlign: 'left',
                    position: 'relative',
                    left: '8px'
                  }}>
                    Melde Dich anonym und sicher an
                  </p>
                  <div style={{ width: '65vw', maxWidth: '360px' }}>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="px-4 py-3 rounded-xl focus:outline-none focus:ring-2 bg-white"
                      style={{ width: '100%', fontSize: '16px', border: '1.5px solid rgb(84, 130, 255)' }}
                      placeholder="E-Mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div style={{ width: '65vw', maxWidth: '360px' }}>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="px-4 py-3 rounded-xl focus:outline-none focus:ring-2 bg-white"
                      style={{ width: '100%', fontSize: '16px', border: '1.5px solid rgb(84, 130, 255)' }}
                      placeholder="Passwort"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  {message && (
                    <div
                      className={`rounded-lg p-3 text-sm ${
                        message.includes('error') || message.includes('Error')
                          ? 'bg-red-50 border border-red-200 text-red-700'
                          : 'bg-green-50 border border-green-200 text-green-700'
                      }`}
                      style={{ width: '65vw', maxWidth: '360px' }}
                    >
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '65vw',
                      maxWidth: '360px',
                      padding: '14px 28px',
                      backgroundColor: 'rgb(84, 130, 255)',
                      color: 'white',
                      fontFamily: '"Nunito Sans", sans-serif',
                      fontSize: '20px',
                      fontWeight: 600,
                      borderRadius: '25px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: '0.2s',
                      opacity: loading ? 0.5 : 1
                    }}
                  >
                    {loading ? 'Loading...' : 'Registrieren'}
                  </button>
                </form>
              )}

              {/* Login link */}
              <div style={{ textAlign: 'center', marginTop: '16px', background: 'transparent' }}>
                <span style={{
                  color: '#8a9ab5',
                  fontFamily: '"Nunito Sans", sans-serif',
                  fontSize: '15px',
                  fontWeight: 600,
                  background: 'transparent'
                }}>
                  Schon registriert? Zum{' '}
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
                  Login.
                </button>
              </div>
            </div>
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
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '0 24px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h2 style={{ fontFamily: 'Gaegu, cursive', fontWeight: 'bold', fontSize: '60px', color: 'var(--primary)', lineHeight: '0.9', marginBottom: '8px' }}>
                REMY
              </h2>
              <p style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '18px', color: '#144220' }}>
                Willkommen zurück
              </p>
            </div>

            <form onSubmit={handleLogin} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              gap: '16px'
            }}>
              <div style={{ width: '75vw', maxWidth: '340px' }}>
                <label htmlFor="login-email" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#144220', textAlign: 'left' }}>
                  E-Mail
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="px-4 py-3 rounded-xl focus:outline-none focus:ring-2 bg-white"
                  style={{ width: '100%', fontSize: '16px', border: '1.5px solid rgb(84, 130, 255)' }}
                  placeholder="deine@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div style={{ width: '75vw', maxWidth: '340px' }}>
                <label htmlFor="login-password" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#144220', textAlign: 'left' }}>
                  Passwort
                </label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="px-4 py-3 rounded-xl focus:outline-none focus:ring-2 bg-white"
                  style={{ width: '100%', fontSize: '16px', border: '1.5px solid rgb(84, 130, 255)' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div style={{ marginTop: '6px', textAlign: 'left' }}>
                  <span style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '13px', color: '#144220' }}>
                    Passwort vergessen?{' '}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '13px', color: 'var(--primary)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Zurücksetzen
                  </button>
                </div>
              </div>

              {message && (
                <div className={`rounded-lg p-3 text-sm ${
                  message.includes('error') || message.includes('Error')
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`} style={{ width: '75vw', maxWidth: '340px' }}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '75vw',
                  maxWidth: '340px',
                  padding: '14px 28px',
                  backgroundColor: 'rgb(84, 130, 255)',
                  color: 'white',
                  fontFamily: '"Nunito Sans", sans-serif',
                  fontSize: '20px',
                  fontWeight: 600,
                  borderRadius: '25px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: '0.2s',
                  opacity: loading ? 0.5 : 1,
                  marginTop: '8px'
                }}
              >
                {loading ? 'Loading...' : 'Einloggen'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <span style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '15px', color: '#8a9ab5' }}>
                  Noch kein Konto?{' '}
                </span>
                <button
                  type="button"
                  onClick={handleRegisterClick}
                  style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '15px', color: '#5482ff', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                >
                  Registrieren
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>

    {/* Second Section - About */}
    <div className="flex flex-col px-6 md:hidden" style={{
      background: 'linear-gradient(172deg, #c8e6c9 0.63%, rgb(240, 255, 242) 116.79%)',
      position: 'relative',
      paddingBottom: '60px'
    }}>
      {/* Snail illustration */}
      <img
        src={`/images/snail.png`}
        alt=""
        style={{
          width: 'calc(100% + 48px)',
          height: 'auto',
          alignSelf: 'center',
          marginBottom: '40px',
          marginLeft: '0px',
          maxWidth: 'none',
          pointerEvents: 'none'
        }}
      />

      <div style={{
        width: '100%',
        paddingLeft: '10px',
        paddingRight: '10px'
      }}>
        {/* Main text */}
        <div style={{
          fontFamily: '"Nunito Sans", sans-serif',
          textTransform: 'uppercase' as const,
          fontWeight: 700,
          fontSize: '22px',
          lineHeight: '46px',
          color: 'rgb(71, 132, 255)',
          letterSpacing: '0.09em',
          textAlign: 'left',
          marginTop: '20px',
          fontStyle: 'normal'
        }}>
          {[
            { text: 'Willkommen!', ml: 3 },
            { text: <><span style={{ fontFamily: '"Gaegu", cursive', fontSize: '30px', letterSpacing: '0.04em' }}>Remy</span> ist ein Forum</>, ml: 0 },
            { text: 'für Menschen, die', ml: 5 },
            { text: 'sich für Psycho\u00ADtherapie', ml: 2 },
            { text: 'interessieren oder', ml: 6 },
            { text: 'aktuell eine', ml: 1 },
            { text: 'Psycho\u00ADtherapie in', ml: 4 },
            { text: 'Anspruch nehmen.', ml: 0, mb: 24 },
            { text: 'Psycho\u00ADtherapie ist', ml: 5 },
            { text: 'kompliziert und kann', ml: 1 },
            { text: 'verunsichern. Auf', ml: 4 },
            { text: <><span style={{ fontFamily: '"Gaegu", cursive', fontSize: '30px', letterSpacing: '0.04em' }}>Remy</span> kannst Du</>, ml: 0 },
            { text: 'Erlebnisse aus Deiner', ml: 6 },
            { text: 'Therapie anonym teilen', ml: 2 },
            { text: 'und Dich mit der', ml: 5 },
            { text: 'Community austauschen.', ml: 0, mb: 24 },
            { text: 'Dann gehörst Du zu', ml: 3 },
            { text: "den über 400\u2019000", ml: 6 },
            { text: 'Menschen in der', ml: 1 },
            { text: 'Schweiz, die wissen,', ml: 4 },
            { text: 'wie es sich anfühlt:', ml: 0 },
            { text: 'Psycho\u00ADtherapie.', ml: 5 },
          ].map((line, i) => (
            <span key={i} style={{
              display: 'block',
              backgroundColor: '#4784ff59',
              padding: '0px 6px',
              whiteSpace: 'nowrap',
              marginLeft: `${line.ml}px`,
              marginBottom: line.mb ? `${line.mb}px` : '11px',
              width: 'fit-content'
            }}>
              {line.text}
            </span>
          ))}
        </div>

        {/* Disclaimer text */}
        <div style={{
          fontFamily: '"Nunito Sans", sans-serif',
          textTransform: 'uppercase' as const,
          fontWeight: 700,
          fontSize: '22px',
          lineHeight: '46px',
          color: 'rgb(137, 169, 255)',
          letterSpacing: '0.09em',
          textAlign: 'left',
          fontStyle: 'normal',
          marginTop: '24px'
        }}>
          {[
            { text: <><span style={{ fontFamily: '"Gaegu", cursive', fontSize: '30px', letterSpacing: '0.04em' }}>Remy</span> ist eine</>, ml: 2 },
            { text: 'Patienten\u00ADinitiative', ml: 5 },
            { text: 'für die Schweiz und', ml: 0 },
            { text: 'unabhängig von', ml: 4 },
            { text: 'staatlichen und', ml: 1 },
            { text: 'privaten Institutionen.', ml: 6 },
          ].map((line, i) => (
            <span key={i} style={{
              display: 'block',
              backgroundColor: '#4784ff30',
              padding: '0px 6px',
              whiteSpace: 'nowrap',
              marginLeft: `${line.ml}px`,
              width: 'fit-content'
            }}>
              {line.text}
            </span>
          ))}
        </div>
      </div>
    </div>

    {/* Footer */}
    <div style={{
      width: '100%',
      height: '100px',
      backgroundColor: 'rgb(241, 241, 241)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      flexShrink: 0
    }}>
      <img
        src="/images/logo_claim.png"
        alt="Remy"
        style={{
          height: '36px',
          width: 'auto',
          filter: 'grayscale(100%)',
          opacity: 1
        }}
      />
      <span style={{
        fontFamily: '"Nunito Sans", sans-serif',
        fontSize: '13px',
        fontWeight: 600,
        color: '#8a9ab5',
        letterSpacing: '0.03em'
      }}>
        Impressum
      </span>
      <div style={{
        fontFamily: '"Nunito Sans", sans-serif',
        fontSize: '11px',
        fontWeight: 500,
        color: '#8a9ab5',
        letterSpacing: '0.02em',
        textAlign: 'center'
      }}>
        <div>Made by</div>
        <div>Studio LUMINELLI</div>
      </div>
    </div>
  </div>
  )
}

export default App

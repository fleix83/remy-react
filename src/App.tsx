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
      <div className="landing-hero" style={{
        height: 'calc(100vh - 36px)',
        background: 'linear-gradient(to bottom, #e8f5e9 0%, #c8e6c9 100%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>


      {/* Top-right nav - desktop only via CSS */}
      {!showLoginForm && !showRegisterForm && (
        <div className="landing-topnav">
          <button
            type="button"
            className="landing-topnav-link"
            onClick={() => document.querySelector('.landing-about')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Wer oder was ist Remy?
          </button>
          <button
            type="button"
            className="landing-topnav-link"
            onClick={handleLoginClick}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Login
          </button>
        </div>
      )}

      {/* Frau + Mann illustrations - desktop only, co-registered canvases */}
      {!showLoginForm && (
        <>
          <img
            className="landing-frau hidden"
            src="/images/Frau.png"
            alt=""
            width={2247}
            height={1432}
            decoding="async"
          />
          <div className="landing-mann-clip">
            <img
              className="landing-mann hidden"
              src="/images/Mann.png"
              alt=""
              width={2247}
              height={1432}
              decoding="async"
            />
          </div>
        </>
      )}

      {/* Dog illustration - upper left, hidden on login */}
      {!showLoginForm && (
        <img
          className="landing-dog"
          src={`/images/dog.png`}
          alt=""
          width={393}
          height={485}
          decoding="async"
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
        className="landing-saul"
        src={`/images/saul.png`}
        alt=""
        width={171}
        height={196}
        decoding="async"
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
            <div className="landing-logo-wrap" style={{
              display: 'flex',
              justifyContent: 'flex-end',
              paddingTop: '28px',
              paddingRight: '4px'
            }}>
              <img
                className="landing-logo"
                src={`/images/logo_claim.png`}
                alt="REMY - Forum für Menschen in Psychotherapie"
                width={437}
                height={169}
                decoding="async"
                fetchPriority="high"
                style={{
                  width: 'clamp(117px, 36vw, 275px)',
                  height: 'auto'
                }}
              />
            </div>

            {/* Spacer to push content down */}
            <div style={{ flex: 1 }} />

            {/* Text and CTA group - bottom portion */}
            <div className="landing-cta-area" onClick={() => { if (showRegisterForm) { setShowRegisterForm(false); setMessage('') } }} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingLeft: '24px',
              paddingRight: '24px',
              paddingBottom: '8vh'
            }}>
              {/* Tagline - mobile single block (hidden on desktop via CSS) */}
              {!showRegisterForm && (
                <div className="landing-tagline" style={{
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
                  Du machst<br />eine<br />Psycho­therapie?
                </div>
              )}

              {/* Tagline - desktop scattered word pills */}
              {!showRegisterForm && (
                <>
                  <div className="landing-tag landing-tag-du">Du</div>
                  <div className="landing-tag landing-tag-machst">machst</div>
                  <div className="landing-tag landing-tag-eine">eine</div>
                  <div className="landing-tag landing-tag-psycho">Psycho­therapie?</div>
                </>
              )}

              {/* Registration Button - hidden when form is shown */}
              {!showRegisterForm && (
                <div className="landing-cta-wrap">
                <button
                  className="landing-cta"
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
                </div>
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

              {/* Login link - hide after registration complete */}
              {!registrationComplete && (
                <div className="landing-login-link" style={{ textAlign: 'center', marginTop: '16px', background: 'transparent' }}>
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
              )}
            </div>
          </div>
        )}

        {/* Registration Complete - Email Confirmation Required */}
        {showRegisterForm && registrationComplete && (
          <div className="text-center space-y-6" style={{ marginBottom: '30px' }}>
            <div className="text-6xl mb-4" style={{ color: '#4785ff' }}>✓</div>

            <div className="rounded-lg p-6">
              <p className="text-lg font-medium mb-2" style={{ color: '#144220' }}>
                Registrierung erfolgreich!
              </p>
              <p className="text-base" style={{ color: '#144220' }}>
                Bitte überprüfe deine E-Mails und klicke auf den Bestätigungslink.
              </p>
            </div>

            <div className="text-sm" style={{ color: '#144220' }}>
              <p>Nach der Bestätigung kannst du dich einloggen.</p>
              <br />
              <button
                onClick={handleLoginClick}
                className="font-body text-[16px] underline font-medium"
                style={{ color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Login
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
    <div className="landing-about flex flex-col px-6" style={{
      background: '#cddeff',
      position: 'relative',
      paddingBottom: '60px'
    }}>
      {/* Snail illustration — below the fold, lazy load */}
      <img
        className="landing-about-snail"
        src={`/images/snail.png`}
        alt=""
        width={590}
        height={272}
        loading="lazy"
        decoding="async"
        style={{ pointerEvents: 'none' }}
      />

      <div className="landing-about-text" style={{
        width: '100%',
        paddingLeft: '10px',
        paddingRight: '10px'
      }}>
        {/* Main text */}
        <div className="landing-about-body" style={{
          fontFamily: '"Nunito Sans", sans-serif',
          textTransform: 'uppercase' as const,
          fontWeight: 700,
          fontSize: '22px',
          lineHeight: '1.4',
          color: 'rgb(71, 132, 255)',
          letterSpacing: '0.09em',
          textAlign: 'left',
          marginTop: '20px'
        }}>
          <p style={{ marginBottom: '24px' }}>
            {`Über 400\u2019000 Men\u00ADschen in der Schweiz machen eine Psycho\u00ADtherapie. Aber wenige reden darüber, ver\u00ADständ\u00ADlicher\u00ADweise.`}
          </p>
          <p style={{ marginBottom: '24px' }}>
            {`Therapie ist kompli\u00ADziert und kann ver\u00ADunsichern. `}
            <span className="landing-remy-name" style={{ fontFamily: '"Gaegu", cursive', fontSize: '30px', letterSpacing: '0.04em' }}>Remy</span>
            {` ist der Ort, an dem du dich anonym aus\u00ADtauschen kannst. Über das, was dich be\u00ADschäftigt. Über Therapeut:innen. Über den Weg, den du gehst.`}
          </p>
          <p style={{ color: 'rgb(137, 169, 255)' }}>
            <span className="landing-remy-name" style={{ fontFamily: '"Gaegu", cursive', fontSize: '30px', letterSpacing: '0.04em' }}>Remy</span>
            {` ist eine un\u00ADab\u00ADhängige Patienten\u00ADinitiative für die Schweiz.`}
          </p>
        </div>
      </div>
    </div>

    {/* Footer */}
    <div style={{
      width: '100%',
      height: '200px',
      backgroundColor: 'rgb(241, 241, 241)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px',
      flexShrink: 0
    }}>
      {/* First line: Logo | Impressum | Datenschutz */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '500px' }}>
        <img src="/images/logo_claim.png" alt="Remy" width={437} height={169} loading="lazy" decoding="async" style={{ height: '36px', width: 'auto', filter: 'grayscale(100%)' }} />
        <a href="/impressum" style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '13px', fontWeight: 600, color: '#8a9ab5', letterSpacing: '0.03em', textDecoration: 'none' }}>Impressum</a>
        <a href="/datenschutz" style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '13px', fontWeight: 600, color: '#8a9ab5', letterSpacing: '0.03em', textDecoration: 'none' }}>Datenschutz</a>
      </div>
      {/* Second line: Made by */}
      <div style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '11px', fontWeight: 500, color: '#8a9ab5', letterSpacing: '0.02em', textAlign: 'center', marginTop: '16px' }}>
        <div>Made by</div>
        <div>Studio LUMINELLI</div>
      </div>
    </div>
  </div>
  )
}

export default App

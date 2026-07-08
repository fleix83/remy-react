import { useState, useEffect, Suspense, lazy, useRef, Fragment } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'
import { initializeMessagingAuth } from './stores/messages.store'
import { useNotificationsRealtime } from './hooks/useNotificationsRealtime'
import { usePostsRealtime } from './hooks/usePostsRealtime'
import { testSupabaseConnection } from './utils/test-connection'
import ToastContainer from './components/ui/ToastContainer'
import ConfirmDialog from './components/ui/ConfirmDialog'
import LanguageSwitcher from './components/ui/LanguageSwitcher'
import Layout from './components/layout/Layout'
import ForumView from './components/forum/ForumView'
import PostView from './components/forum/PostView'
import { useLandingContent, useFooterContent } from './hooks/useSiteContent'
import { renderLandingText } from './utils/renderRemy'
import SeoHead from './components/seo/SeoHead'
import OrgJsonLd from './components/seo/OrgJsonLd'
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
const StaticDocumentPage = lazy(() => import('./components/static/StaticDocumentPage'))
const WelcomePage = lazy(() => import('./components/auth/WelcomePage'))
const PublicProfile = lazy(() => import('./components/user/PublicProfile'))

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

  // Messaging subscriptions app-wide so unread badges update in realtime
  // outside the Messages page too
  useEffect(() => {
    initializeMessagingAuth()
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
          <ToastContainer />
          <ConfirmDialog />
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
          <Route path="/impressum" element={<StaticDocumentPage slug="impressum" page="impressum" />} />
          <Route path="/datenschutz" element={<StaticDocumentPage slug="datenschutz" page="datenschutz" />} />
          <Route path="/about" element={<StaticDocumentPage slug="about" page="about" />} />
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
              <Route path="/user/:id" element={<PublicProfile />} />
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
              <Route path="/messages" element={<Layout onCreatePost={handleCreatePost} background="linear-gradient(180deg, #e6eeff 0%, #ffffff 380px)"><MessagesPage /></Layout>} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/admin" element={<Layout onCreatePost={handleCreatePost}><AdminDashboard /></Layout>} />
              <Route path="/admin/moderation" element={<Layout onCreatePost={handleCreatePost} background="#f8f5e6"><ModerationQueue /></Layout>} />
            </>
          )}
            </Routes>
          </Suspense>
      </Router>
  )
}

// Desktop landing feature row — abstract artsy blobs + placeholder lead text
const LANDING_FEATURES = [
  {
    key: 'austauschen',
    title: 'Austausch',
    lead: 'Teile deine Erfahrungen mit Menschen, die Ähnliches erleben.',
    blob: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="blobGradAustauschen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6F96FF"/><stop offset="1" stop-color="#4470F0"/></linearGradient></defs><path fill="#5482FF" d="M44.5,-66.8C57.4,-58.9,67.3,-46.1,72.8,-31.6C78.3,-17.1,79.4,-0.9,75.6,13.7C71.8,28.3,63.1,41.3,51.5,51.9C39.9,62.5,25.4,70.7,9.4,74.6C-6.6,78.5,-24.1,78.1,-38.7,71C-53.3,63.9,-65,50.1,-71.4,34.3C-77.8,18.5,-78.9,0.7,-74.6,-15.3C-70.3,-31.3,-60.6,-45.5,-47.6,-53.7C-34.6,-61.9,-18.3,-64.1,-1.3,-62.3C15.7,-60.5,31.6,-74.7,44.5,-66.8Z" transform="translate(100 100)"/></svg>`,
    // Austausch — exchange arrows
    icon: `<svg viewBox="0 0 100 100" fill="none" stroke="#141414" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 38 H78"/><path d="M64 26 L80 38 L64 50"/><path d="M80 62 H22"/><path d="M36 50 L20 62 L36 74"/></svg>`,
  },
  {
    key: 'anonymitaet',
    title: 'Anonym',
    lead: 'Schreib offen und geschützt — ohne deinen Namen preiszugeben.',
    blob: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="blobGradAnonymitaet" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#89ACFF"/><stop offset="1" stop-color="#5B84F6"/></linearGradient></defs><path fill="#6E96FF" d="M38.9,-62.4C50.8,-56.3,60.9,-46.1,67.8,-33.7C74.7,-21.3,78.4,-6.7,76.3,7C74.2,20.7,66.3,33.5,56.1,44.5C45.9,55.5,33.4,64.7,18.9,69.8C4.4,74.9,-12.1,75.9,-27.1,71C-42.1,66.1,-55.6,55.3,-64.2,41.6C-72.8,27.9,-76.5,11.3,-74.6,-4.4C-72.7,-20.1,-65.2,-34.9,-54.3,-46.2C-43.4,-57.5,-29.1,-65.3,-14.1,-67.9C0.9,-70.5,27,-68.5,38.9,-62.4Z" transform="translate(100 100)"/></svg>`,
    // Anonym — domino mask
    icon: `<svg viewBox="0 0 100 100" fill="none" stroke="#141414" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 42 C14 33 24 31 33 35 C40 38 45 41 50 41 C55 41 60 38 67 35 C76 31 86 33 86 42 C86 57 75 65 62 62 C56 61 53 57 50 57 C47 57 44 61 38 62 C25 65 14 57 14 42 Z"/><circle cx="34" cy="46" r="5"/><circle cx="66" cy="46" r="5"/></svg>`,
  },
  {
    key: 'moderiert',
    title: 'Moderiert',
    lead: 'Ein respektvoller Raum, sorgfältig betreut und moderiert.',
    blob: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="blobGradModeriert" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A0BDFF"/><stop offset="1" stop-color="#7392F4"/></linearGradient></defs><path fill="#89A9FF" d="M41.7,-68.3C53.6,-61.4,62.4,-49.5,68.9,-36.3C75.4,-23.1,79.6,-8.6,77.6,5C75.6,18.6,67.4,31.3,57.4,42.4C47.4,53.5,35.6,63,21.9,68.7C8.2,74.4,-7.4,76.3,-22.1,72.5C-36.8,68.7,-50.6,59.2,-60.3,46.5C-70,33.8,-75.6,17.9,-75.9,1.6C-76.2,-14.7,-71.2,-31.4,-61.1,-43.9C-51,-56.4,-35.8,-64.7,-20.9,-70.7C-6,-76.7,8.6,-80.4,22.6,-77.4C36.6,-74.4,29.8,-75.2,41.7,-68.3Z" transform="translate(100 100)"/></svg>`,
    // Moderiert — shield with check
    icon: `<svg viewBox="0 0 100 100" fill="none" stroke="#141414" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M50 16 L82 28 V52 C82 72 68 84 50 90 C32 84 18 72 18 52 V28 Z"/><path d="M37 52 L47 62 L65 41"/></svg>`,
  },
  {
    key: 'schweiz',
    title: 'Schweiz',
    lead: 'Eine unabhängige Patient:innen­initiative aus der Schweiz.',
    blob: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="blobGradSchweiz" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BDD1FF"/><stop offset="1" stop-color="#90AAF6"/></linearGradient></defs><path fill="#A7C0FF" d="M36.8,-60.9C48.6,-53.7,59.4,-44.1,66.3,-31.9C73.2,-19.7,76.2,-4.9,73.4,8.6C70.6,22.1,62,34.3,51.4,44.8C40.8,55.3,28.2,64.1,13.7,69.2C-0.8,74.3,-17.2,75.7,-31.7,70.7C-46.2,65.7,-58.8,54.3,-66.7,40.4C-74.6,26.5,-77.8,10.1,-75.4,-5.3C-73,-20.7,-65,-35.1,-54.1,-46.5C-43.2,-57.9,-29.4,-66.3,-14.8,-69.4C-0.2,-72.5,15.2,-70.3,29.6,-67.1C44,-63.9,25,-68.1,36.8,-60.9Z" transform="translate(100 100)"/></svg>`,
    // Schweiz — Swiss cross
    icon: `<svg viewBox="0 0 100 100" fill="none" stroke="#141414" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><rect x="18" y="18" width="64" height="64" rx="16"/><path d="M50 33 V67" stroke-width="9"/><path d="M33 50 H67" stroke-width="9"/></svg>`,
  },
] as const

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
  const { content: landing } = useLandingContent()
  const { content: footer } = useFooterContent()

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
      <SeoHead page="landing" path="/" />
      <OrgJsonLd />
      {/* Language switcher — lets anonymous visitors override browser detection.
          Positioned via .landing-lang-switcher (desktop top-left, mobile top-right). */}
      <LanguageSwitcher className="landing-lang-switcher" style={{ position: 'fixed', zIndex: 50 }} />

      {/* First Section - Landing Page */}
      <div className="landing-hero" style={{
        height: '100vh',
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

      {/* Masken illustration - desktop only */}
      {!showLoginForm && (
        <img
          className="landing-frau hidden"
          src="/images/Masken.png"
          alt=""
          width={2247}
          height={1432}
          decoding="async"
        />
      )}

      <div className="w-full" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Welcome Text - Matching mockup exactly */}
        {!showLoginForm && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            {/* Logo: REMY wordmark + claim text - upper left (mobile only; desktop hides it) */}
            <div className="landing-logo-wrap" style={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: '12px',
              paddingTop: '42px',
              paddingLeft: '40px'
            }}>
              <img
                className="landing-logo"
                src={`/images/remy-wordmark.png`}
                alt="REMY"
                width={322}
                height={91}
                decoding="async"
                fetchPriority="high"
                style={{
                  width: '111px',
                  height: 'auto'
                }}
              />
              <div className="landing-logo-claim">
                {landing.hero.claim.split('\n').map((line, i, arr) => (
                  <Fragment key={i}>{line}{i < arr.length - 1 ? <br /> : null}</Fragment>
                ))}
              </div>
            </div>

            {/* Tagline - mobile single block (hidden on desktop via CSS) */}
            {!showRegisterForm && (
              <div className="landing-tagline" style={{
                fontFamily: '"Gaegu", "Gaegu Accents", cursive',
                fontWeight: 700,
                // 40px per the mockup (430px artboard); shrinks fluidly so the two
                // tagline lines never wrap on narrower phones
                fontSize: 'min(40px, calc((100vw - 64px) / 8.6))',
                lineHeight: 1.27,
                letterSpacing: '0.04em',
                wordSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgb(84, 130, 255)',
                textAlign: 'left',
                margin: '54px 0 0',
                padding: '0 24px 0 40px'
              }}>
                {landing.hero.taglineMobile.split('\n').map((line, i, arr) => (
                  <Fragment key={i}>{line}{i < arr.length - 1 ? <br /> : null}</Fragment>
                ))}
              </div>
            )}

            {/* Swirl + registration button row (mobile); on desktop the swirl is
                hidden and .landing-cta-wrap floats bottom-right via CSS */}
            {!showRegisterForm && (
              <div className="landing-hero-actions">
                <img
                  className="landing-swirl"
                  src={`/images/swirl.png`}
                  alt=""
                  width={212}
                  height={113}
                  decoding="async"
                />
                <div className="landing-cta-wrap">
                  <button className="landing-cta" onClick={handleRegisterClick}>
                    {landing.hero.ctaLabel}
                  </button>
                </div>
              </div>
            )}

            {/* Remy duo figures - fills the hero's free space (mobile only) */}
            <div className="landing-duo-wrap">
              <img
                className="landing-duo"
                src={`/images/remy-duo.png`}
                alt=""
                width={615}
                height={532}
                decoding="async"
              />
            </div>

            {/* Register form + login link - bottom portion */}
            <div className="landing-cta-area" onClick={() => { if (showRegisterForm) { setShowRegisterForm(false); setMessage('') } }} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingLeft: '24px',
              paddingRight: '24px',
              paddingBottom: '3vh'
            }}>
              {/* Tagline - desktop scattered word pills */}
              {!showRegisterForm && (
                <>
                  <div className="landing-tag landing-tag-du">{landing.hero.taglineWords[0]}</div>
                  <div className="landing-tag landing-tag-machst">{landing.hero.taglineWords[1]}</div>
                  <div className="landing-tag landing-tag-eine">{landing.hero.taglineWords[2]}</div>
                  <div className="landing-tag landing-tag-psycho">{landing.hero.taglineWords[3]}</div>
                </>
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
                    {landing.hero.registerPrompt}
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
                    {loading ? 'Loading...' : landing.hero.registerSubmit}
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
                    {landing.hero.loginLinkPrefix}
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
                    {landing.hero.loginLinkLabel}
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
                {landing.registrationComplete.title}
              </p>
              <p className="text-base" style={{ color: '#144220' }}>
                {landing.registrationComplete.body}
              </p>
            </div>

            <div className="text-sm" style={{ color: '#144220' }}>
              <p>{landing.registrationComplete.hint}</p>
              <br />
              <button
                onClick={handleLoginClick}
                className="font-body text-[16px] underline font-medium"
                style={{ color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {landing.registrationComplete.loginLabel}
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
              <h2 style={{ fontFamily: 'Gaegu, "Gaegu Accents", cursive', fontWeight: 'bold', fontSize: '60px', color: 'var(--primary)', lineHeight: '0.9', marginBottom: '8px' }}>
                {landing.login.title}
              </h2>
              <p style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '18px', color: '#144220' }}>
                {landing.login.subtitle}
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
                  {landing.login.emailLabel}
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
                  {landing.login.passwordLabel}
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
                    {landing.login.forgotPrefix}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '13px', color: 'var(--primary)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {landing.login.forgotLabel}
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
                {loading ? 'Loading...' : landing.login.submit}
              </button>

              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <span style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '15px', color: '#8a9ab5' }}>
                  {landing.login.registerPrefix}
                </span>
                <button
                  type="button"
                  onClick={handleRegisterClick}
                  style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '15px', color: '#5482ff', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                >
                  {landing.login.registerLabel}
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

      {/* Desktop feature row — hidden on mobile */}
      <div className="landing-features" aria-hidden="true">
        {LANDING_FEATURES.map((f, i) => (
          <div className={`landing-feature landing-feature--${f.key}`} key={f.key}>
            <div className="landing-feature-blob">
              <span className="landing-feature-shape" dangerouslySetInnerHTML={{ __html: f.blob }} />
              <span className="landing-feature-icon" dangerouslySetInnerHTML={{ __html: f.icon }} />
            </div>
            <h3 className="landing-feature-title">{landing.features[i]?.title ?? f.title}</h3>
            <p className="landing-feature-lead">{landing.features[i]?.lead ?? f.lead}</p>
          </div>
        ))}
      </div>

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
            {renderLandingText(landing.about.paragraphs[0] ?? '', 'about-0')}
          </p>
          <p style={{ marginBottom: '24px' }}>
            {renderLandingText(landing.about.paragraphs[1] ?? '', 'about-1')}
          </p>
          <p style={{ color: 'rgb(137, 169, 255)' }}>
            {renderLandingText(landing.about.paragraphs[2] ?? '', 'about-2')}
          </p>
        </div>
      </div>
    </div>

    {/* Footer */}
    <footer className="flex h-[350px] flex-shrink-0 items-center bg-[#f1f1f1] px-6 md:px-0">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-8 text-center md:flex-row md:items-center md:justify-between md:gap-10 md:px-6 md:text-left lg:px-8">
        {/* Left: logo + credits on one line, aligned to the REMY baseline */}
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-end md:gap-12">
          <img
            src="/images/logo_claim.png"
            alt="Remy"
            width={437}
            height={169}
            loading="lazy"
            decoding="async"
            className="h-[65px] w-auto md:shrink-0"
            style={{ filter: 'grayscale(100%)' }}
          />
          <div className="flex flex-col gap-3 md:pb-[5px]">
            <p
              className="max-w-md text-center text-[15px] leading-relaxed md:text-left"
              style={{ fontFamily: '"Nunito Sans", sans-serif', color: '#828282' }}
            >
              {footer.description}
            </p>
            <div
              className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[17px] text-[#828282] md:justify-start md:whitespace-nowrap"
              style={{ fontFamily: '"Nunito Sans", sans-serif' }}
            >
              <a href={footer.aboutHref} className="transition-opacity hover:opacity-70">{footer.aboutLabel}</a>
              <a href={footer.impressumHref} className="transition-opacity hover:opacity-70">{footer.impressumLabel}</a>
              <a href={footer.datenschutzHref} className="transition-opacity hover:opacity-70">{footer.datenschutzLabel}</a>
              <span className="hidden h-[18px] w-px self-center bg-[#828282] opacity-40 md:block" aria-hidden="true"></span>
              <span>{footer.madeByPrefix} {footer.madeByName}</span>
            </div>
          </div>
        </div>

        {/* Right: lead text (desktop only) */}
        <div
          className="hidden shrink-0 uppercase leading-[1.18] text-[#828282] md:block md:text-right md:text-[30px] lg:text-[36px] xl:text-[42px]"
          style={{ fontFamily: '"Nunito", sans-serif', fontWeight: 700, letterSpacing: '0.06em', wordSpacing: '0.1em' }}
        >
          REMY, DAS FORUM<br />FÜR MENSCHEN IN<br />PSYCHOTHERAPIE
        </div>
      </div>
    </footer>
  </div>
  )
}

export default App

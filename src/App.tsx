import { useState, useEffect, useLayoutEffect, Suspense, lazy, useRef, Fragment } from 'react'
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
import { useTranslation } from 'react-i18next'
import { useLandingContent } from './hooks/useSiteContent'
import LandingFooter from './components/layout/LandingFooter'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useActiveLanguage } from './hooks/useActiveLanguage'
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

// Personal HIN identity (vorname.nachname@hin.ch). Client-side hint only —
// the signup trigger re-checks the address server-side before verifying.
export const HIN_PERSONAL_EMAIL_RE = /^[a-z]+(-[a-z]+)*(\.[a-z]+(-[a-z]+)*)+@hin\.ch$/i

// Checklist row icons (mask / flag / Swiss cross), drawn in the same
// confetti squares as the hero and the submarine. All three share the mask's
// 88px width (heights follow each artwork: 272×122, 232×242, 204×204) so they
// fill the 88px .landing-check-icon column edge to edge, one per row in CMS
// order.
const CHECKLIST_ICONS = [
  { src: '/assets/sq-mask.svg', w: 88, h: 39 },
  { src: '/assets/sq-flag.svg', w: 88, h: 92 },
  { src: '/assets/sq-swiss.svg', w: 88, h: 88 },
]

// Searchlight of the deep-sea submarine (mobile CTA band): #fff399 confetti
// squares scattered in a cone that opens leftwards from the nose (apex at the
// right edge, x=160 y=50 of a 160×100 box), bigger near the sub, smaller and
// slightly fainter with distance (opacity stays ≥ 0.45 so the yellow never
// muddies to grey on the blue). Rendered by .landing-sub-beam (App.css).
const SUB_BEAM_SQUARES = [
  { x: 5.3, y: 4.9, s: 3.0, o: 0.45, r: 18 },
  { x: 5.6, y: 81.9, s: 3.8, o: 0.45, r: 2 },
  { x: 7.2, y: 14.3, s: 2.9, o: 0.46, r: 16 },
  { x: 7.6, y: 64.5, s: 3.9, o: 0.46, r: -10 },
  { x: 9.9, y: 73.6, s: 3.0, o: 0.47, r: -3 },
  { x: 15.8, y: 28.5, s: 2.9, o: 0.49, r: 1 },
  { x: 18.5, y: 82.1, s: 3.6, o: 0.5, r: -17 },
  { x: 25.1, y: 59.5, s: 3.5, o: 0.52, r: -5 },
  { x: 28.0, y: 40.5, s: 4.0, o: 0.53, r: 2 },
  { x: 33.2, y: 82.5, s: 3.8, o: 0.55, r: 12 },
  { x: 37.0, y: 42.4, s: 4.7, o: 0.57, r: 6 },
  { x: 38.1, y: 51.0, s: 3.4, o: 0.57, r: 18 },
  { x: 38.6, y: 27.5, s: 3.7, o: 0.57, r: -4 },
  { x: 43.9, y: 74.7, s: 4.5, o: 0.59, r: 2 },
  { x: 44.6, y: 82.3, s: 3.9, o: 0.6, r: -8 },
  { x: 45.2, y: 15.0, s: 4.2, o: 0.6, r: 13 },
  { x: 47.0, y: 47.0, s: 4.3, o: 0.6, r: 16 },
  { x: 49.7, y: 38.8, s: 4.1, o: 0.61, r: -18 },
  { x: 57.0, y: 71.5, s: 3.8, o: 0.64, r: -16 },
  { x: 60.9, y: 43.5, s: 4.5, o: 0.66, r: -8 },
  { x: 64.2, y: 27.6, s: 4.5, o: 0.67, r: 10 },
  { x: 72.8, y: 36.3, s: 5.2, o: 0.7, r: 7 },
  { x: 81.4, y: 43.2, s: 4.3, o: 0.73, r: -10 },
  { x: 81.5, y: 53.1, s: 5.7, o: 0.73, r: 11 },
  { x: 81.6, y: 68.1, s: 4.5, o: 0.73, r: 14 },
  { x: 82.4, y: 31.9, s: 5.1, o: 0.73, r: -16 },
  { x: 91.3, y: 30.6, s: 4.8, o: 0.77, r: -3 },
  { x: 91.9, y: 53.8, s: 5.4, o: 0.77, r: -13 },
  { x: 100.3, y: 53.7, s: 4.9, o: 0.8, r: -4 },
  { x: 102.6, y: 39.3, s: 5.6, o: 0.81, r: -6 },
  { x: 102.9, y: 61.4, s: 4.7, o: 0.81, r: -10 },
  { x: 112.1, y: 34.6, s: 5.3, o: 0.84, r: 15 },
  { x: 118.2, y: 62.6, s: 5.7, o: 0.87, r: 7 },
  { x: 121.3, y: 42.6, s: 5.1, o: 0.88, r: 11 },
  { x: 123.3, y: 51.6, s: 5.8, o: 0.88, r: -6 },
  { x: 136.1, y: 60.1, s: 5.7, o: 0.93, r: -2 },
  { x: 141.9, y: 41.6, s: 6.5, o: 0.95, r: -5 },
  { x: 154.8, y: 53.7, s: 7.3, o: 1.0, r: 1 },
]

// Confetti rain above the desktop login/register screens (design canvas
// option C, 90 squares, seed 22): theme-colour squares in a 1440×300 band,
// bigger and more opaque at the top edge, thinning out in a funnel toward
// the centred REMY title. Rendered by .landing-auth-confetti (App.css).
const AUTH_CONFETTI_SQUARES = [
  { x: 895, y: 10, s: 17, c: '#4785ff', o: 0.91, r: -12 },
  { x: 1292, y: 28, s: 18, c: '#edd3ff', o: 0.82, r: -44 },
  { x: 155, y: -4, s: 17, c: '#ffeb99', o: 0.94, r: -31 },
  { x: 795, y: 10, s: 19, c: '#98ffc7', o: 0.91, r: 15 },
  { x: 1115, y: -5, s: 20, c: '#c5d0ff', o: 0.94, r: -45 },
  { x: 69, y: 51, s: 14, c: '#4785ff', o: 0.71, r: -21 },
  { x: 1176, y: -5, s: 18, c: '#4785ff', o: 0.94, r: -19 },
  { x: 426, y: -3, s: 18, c: '#c5d0ff', o: 0.94, r: -34 },
  { x: 4, y: 19, s: 14, c: '#98ffc7', o: 0.83, r: 11 },
  { x: 54, y: -5, s: 19, c: '#95c7ff', o: 0.94, r: 29 },
  { x: 288, y: 30, s: 18, c: '#ffeb99', o: 0.84, r: 36 },
  { x: 604, y: 5, s: 17, c: '#c5d0ff', o: 0.92, r: 20 },
  { x: 755, y: 102, s: 17, c: '#4785ff', o: 0.73, r: -13 },
  { x: 1089, y: -4, s: 16, c: '#c5d0ff', o: 0.94, r: 26 },
  { x: 690, y: 209, s: 10, c: '#4785ff', o: 0.51, r: -44 },
  { x: 886, y: 78, s: 15, c: '#c5d0ff', o: 0.76, r: -18 },
  { x: 203, y: 110, s: 10, c: '#ffeb99', o: 0.56, r: -32 },
  { x: 1375, y: 14, s: 18, c: '#ff6b6b', o: 0.86, r: -17 },
  { x: 1018, y: 34, s: 17, c: '#95c7ff', o: 0.84, r: 37 },
  { x: 617, y: 247, s: 9, c: '#c5d0ff', o: 0.41, r: 15 },
  { x: 125, y: 41, s: 13, c: '#ffc8c8', o: 0.77, r: -23 },
  { x: 701, y: 90, s: 17, c: '#ffeb99', o: 0.75, r: -3 },
  { x: 319, y: -8, s: 19, c: '#95c7ff', o: 0.95, r: 9 },
  { x: 616, y: 203, s: 11, c: '#edd3ff', o: 0.5, r: 13 },
  { x: 1436, y: 18, s: 19, c: '#4785ff', o: 0.83, r: -15 },
  { x: 717, y: 79, s: 17, c: '#edd3ff', o: 0.78, r: 14 },
  { x: 1019, y: 45, s: 16, c: '#95c7ff', o: 0.81, r: -7 },
  { x: 704, y: 161, s: 14, c: '#95c7ff', o: 0.61, r: 11 },
  { x: 685, y: 192, s: 13, c: '#98ffc7', o: 0.55, r: 36 },
  { x: 448, y: 122, s: 12, c: '#ffc8c8', o: 0.62, r: -40 },
  { x: 1323, y: -5, s: 17, c: '#98ffc7', o: 0.94, r: -15 },
  { x: 1419, y: 42, s: 12, c: '#4785ff', o: 0.73, r: -16 },
  { x: 177, y: 0, s: 19, c: '#edd3ff', o: 0.92, r: -43 },
  { x: 767, y: 57, s: 15, c: '#ffc8c8', o: 0.82, r: -43 },
  { x: 614, y: 88, s: 16, c: '#ffc8c8', o: 0.74, r: -31 },
  { x: 362, y: 91, s: 11, c: '#c5d0ff', o: 0.68, r: 1 },
  { x: 299, y: -6, s: 16, c: '#98ffc7', o: 0.94, r: -23 },
  { x: 247, y: 96, s: 14, c: '#c5d0ff', o: 0.62, r: 32 },
  { x: 118, y: 110, s: 8, c: '#4785ff', o: 0.51, r: 37 },
  { x: 1279, y: 145, s: 7, c: '#4785ff', o: 0.41, r: -40 },
  { x: 838, y: 207, s: 9, c: '#edd3ff', o: 0.48, r: 26 },
  { x: 1266, y: 87, s: 14, c: '#95c7ff', o: 0.62, r: 17 },
  { x: 395, y: 168, s: 13, c: '#edd3ff', o: 0.48, r: 13 },
  { x: 1074, y: 78, s: 16, c: '#95c7ff', o: 0.71, r: -12 },
  { x: 882, y: 130, s: 12, c: '#edd3ff', o: 0.64, r: 6 },
  { x: 1295, y: -7, s: 19, c: '#98ffc7', o: 0.95, r: 2 },
  { x: 472, y: 95, s: 16, c: '#4785ff', o: 0.7, r: -36 },
  { x: 486, y: -4, s: 21, c: '#4785ff', o: 0.94, r: -5 },
  { x: 872, y: 23, s: 16, c: '#ffc8c8', o: 0.88, r: -44 },
  { x: 1208, y: 70, s: 16, c: '#ffc8c8', o: 0.7, r: -1 },
  { x: 82, y: 12, s: 19, c: '#95c7ff', o: 0.87, r: 34 },
  { x: 947, y: 59, s: 14, c: '#c5d0ff', o: 0.79, r: 25 },
  { x: 107, y: -8, s: 19, c: '#ffc8c8', o: 0.95, r: 32 },
  { x: 121, y: 6, s: 20, c: '#edd3ff', o: 0.9, r: 40 },
  { x: 498, y: 10, s: 20, c: '#98ffc7', o: 0.91, r: 4 },
  { x: 178, y: 44, s: 16, c: '#4785ff', o: 0.77, r: -6 },
  { x: 543, y: 10, s: 19, c: '#95c7ff', o: 0.91, r: -25 },
  { x: 282, y: 23, s: 18, c: '#ffeb99', o: 0.86, r: -33 },
  { x: 562, y: 19, s: 20, c: '#ff6b6b', o: 0.89, r: -15 },
  { x: 1272, y: 140, s: 7, c: '#95c7ff', o: 0.43, r: -33 },
  { x: 1248, y: -6, s: 19, c: '#edd3ff', o: 0.94, r: 27 },
  { x: 441, y: 178, s: 12, c: '#edd3ff', o: 0.48, r: 11 },
  { x: 485, y: 183, s: 12, c: '#c5d0ff', o: 0.49, r: 6 },
  { x: 799, y: 114, s: 13, c: '#ffc8c8', o: 0.69, r: -37 },
  { x: 290, y: 130, s: 12, c: '#95c7ff', o: 0.54, r: -27 },
  { x: 1323, y: 113, s: 12, c: '#4785ff', o: 0.5, r: 28 },
  { x: 1319, y: 17, s: 15, c: '#95c7ff', o: 0.86, r: 7 },
  { x: 1060, y: 85, s: 12, c: '#ff6b6b', o: 0.7, r: 6 },
  { x: 1225, y: 44, s: 17, c: '#ff6b6b', o: 0.78, r: 10 },
  { x: 341, y: 2, s: 18, c: '#edd3ff', o: 0.92, r: 32 },
  { x: 23, y: -8, s: 18, c: '#edd3ff', o: 0.95, r: 17 },
  { x: 744, y: 43, s: 20, c: '#4785ff', o: 0.85, r: -5 },
  { x: 357, y: 144, s: 9, c: '#ffeb99', o: 0.53, r: -37 },
  { x: 995, y: 10, s: 16, c: '#4785ff', o: 0.91, r: 42 },
  { x: 166, y: 92, s: 12, c: '#4785ff', o: 0.6, r: 12 },
  { x: 1133, y: 56, s: 19, c: '#98ffc7', o: 0.76, r: -32 },
  { x: 740, y: 230, s: 8, c: '#98ffc7', o: 0.48, r: 42 },
  { x: 1347, y: 121, s: 12, c: '#ff6b6b', o: 0.44, r: -34 },
  { x: 276, y: 64, s: 15, c: '#ffeb99', o: 0.73, r: -21 },
  { x: 1188, y: -5, s: 19, c: '#4785ff', o: 0.94, r: -23 },
  { x: 1221, y: 10, s: 17, c: '#4785ff', o: 0.89, r: -45 },
  { x: 355, y: -2, s: 21, c: '#98ffc7', o: 0.93, r: -41 },
  { x: 1239, y: -6, s: 19, c: '#4785ff', o: 0.94, r: -11 },
  { x: 829, y: 177, s: 14, c: '#4785ff', o: 0.55, r: 32 },
  { x: 463, y: 132, s: 11, c: '#ff6b6b', o: 0.6, r: -10 },
  { x: 895, y: -2, s: 21, c: '#edd3ff', o: 0.94, r: -1 },
  { x: 659, y: 211, s: 12, c: '#98ffc7', o: 0.5, r: -14 },
  { x: 658, y: 134, s: 16, c: '#4785ff', o: 0.66, r: -2 },
  { x: 486, y: -6, s: 18, c: '#95c7ff', o: 0.94, r: -34 },
  { x: 60, y: -5, s: 19, c: '#ffeb99', o: 0.94, r: -40 },
]

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

// Desktop intro row: two equal columns. The second CMS paragraph's lead-in
// (everything before its ==highlighted== sentence, e.g. "Therapie ist
// kompliziert und kann verunsichern.") moves to the end of the first column
// so both columns carry about the same amount of text. Without a highlight
// the paragraphs stay as they are.
function balanceIntroColumns(first: string, second: string): [string, string] {
  const mark = second.indexOf('==')
  if (mark <= 0) return [first, second]
  const leadIn = second.slice(0, mark).trim()
  return [`${first} ${leadIn}`.trim(), second.slice(mark).trim()]
}

// Desktop landing feature row — the mobile checklist's confetti icons
// (CHECKLIST_ICONS) with a title + lead each, in CMS order.
const LANDING_FEATURES = [
  { key: 'anonym', icon: CHECKLIST_ICONS[0], title: 'Anonym', lead: 'Auf Remy schreibst du anonym' },
  { key: 'moderiert', icon: CHECKLIST_ICONS[1], title: 'Moderiert', lead: 'Remy ist moderiert' },
  { key: 'schweiz', icon: CHECKLIST_ICONS[2], title: 'Schweiz', lead: 'Remy ist eine Schweizer Plattform' },
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
  const [isError, setIsError] = useState(false)
  const [isTherapist, setIsTherapist] = useState(false)
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const taglineRef = useRef<HTMLDivElement>(null)
  // Right inset (px from viewport's right edge) that lines the CTA's right edge
  // up with the tagline's rendered right edge. Measured at runtime because the
  // Gaegu tagline renders at different widths per device/font-load — a fixed
  // formula drifts on real phones. `null` until measured (CSS fallback applies).
  const [ctaInset, setCtaInset] = useState<number | null>(null)

  const { login, register } = useAuthStore()
  const { content: landing } = useLandingContent()
  const { t } = useTranslation()
  const { t: tAuth } = useTranslation('auth')
  const lang = useActiveLanguage()
  // The figures animation is a different artboard per breakpoint (2 figures at
  // 363×314 on mobile, 4 at 1734×678 on desktop), so the <iframe> src has to
  // switch in JS — CSS can't pick it, and rendering both would download ~110 KB
  // of animation twice.
  // The register view is its own login-style screen (REMY title, subtitle,
  // labelled fields, no figures) at every width — same layout as the login.
  const registerScreen = showRegisterForm && !registrationComplete
  // "Check your inbox" screen after a successful sign-up — replaces the hero
  // (logo, tagline, figures) entirely, like the register screen does.
  const registeredScreen = showRegisterForm && registrationComplete
  const isDesktop = useMediaQuery('(min-width: 768px)')
  // Deep-sea closer (confetti submarine + yellow searchlight), shown at the
  // bottom of the mobile CTA band and in its own band above the desktop footer.
  const deepSea = (
    <div className="landing-deepsea" aria-hidden="true">
      <div className="landing-sub">
        <svg className="landing-sub-beam" viewBox="0 0 160 100">
          {SUB_BEAM_SQUARES.map((q, i) => (
            <rect
              key={i}
              x={q.x - q.s / 2}
              y={q.y - q.s / 2}
              width={q.s}
              height={q.s}
              fill="#fff399"
              opacity={q.o}
              transform={`rotate(${q.r} ${q.x} ${q.y})`}
            />
          ))}
        </svg>
        <img src="/assets/submarine_v3.svg" alt="" width={340} height={316} loading="lazy" decoding="async" />
      </div>
    </div>
  )
  // Older CMS rows still carry the retired leading "Austausch" feature (4
  // entries); keep only the last three so they line up with LANDING_FEATURES.
  const desktopFeatures = landing.features.slice(-LANDING_FEATURES.length)

  // Per-language tagline tuning so the two `\n` lines never wrap further on
  // mobile. Font size is untouched; only tracking/word-spacing is eased, and
  // French gets a narrow no-break space before its "?" (also the correct FR
  // typography) so the "?" can't drop to its own line.
  const taglineSpacing =
    lang === 'fr'
      ? { letterSpacing: '0.025em', wordSpacing: '0.1em' }
      : lang === 'it'
        ? { letterSpacing: '0.008em', wordSpacing: '0em' }
        : { letterSpacing: '0.04em', wordSpacing: '0.1em' }
  const taglineText =
    lang === 'fr'
      ? landing.hero.taglineMobile.replace(/ ([?!:;»])/g, ' $1')
      : landing.hero.taglineMobile

  // Shared style for the About copy blocks (desktop values; mobile overrides
  // in CSS). Reused so the closing paragraph below the checklist matches.
  const aboutBodyStyle: React.CSSProperties = {
    fontFamily: '"Nunito Sans", sans-serif',
    textTransform: 'uppercase',
    fontWeight: 700,
    fontSize: '22px',
    lineHeight: '1.4',
    color: 'rgb(71, 132, 255)',
    letterSpacing: '0.09em',
    textAlign: 'left',
  }

  useLayoutEffect(() => {
    const el = taglineRef.current
    if (!el) return
    const measure = () => {
      const node = taglineRef.current
      if (!node) return
      const range = document.createRange()
      range.selectNodeContents(node)
      const rects = range.getClientRects()
      if (!rects.length) return
      let right = 0
      for (const r of rects) right = Math.max(right, r.right)
      // Below the desktop breakpoint only; desktop uses its own CTA layout.
      if (window.innerWidth >= 768) { setCtaInset(null); return }
      setCtaInset(Math.max(16, Math.round(window.innerWidth - right)))
    }
    measure()
    window.addEventListener('resize', measure)
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    document.fonts?.ready.then(measure).catch(() => {})
    return () => {
      window.removeEventListener('resize', measure)
      ro.disconnect()
    }
  }, [showLoginForm, showRegisterForm, landing.hero.taglineMobile])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(''); setIsError(false)

    const trimmedEmail = email.trim()
    if (isTherapist && !HIN_PERSONAL_EMAIL_RE.test(trimmedEmail.toLowerCase())) {
      setMessage(tAuth('register.therapistEmailInvalid'))
      setIsError(true)
      setLoading(false)
      return
    }

    try {
      const result = await register(trimmedEmail, password, isTherapist)

      // Handle email confirmation required
      if (result?.requiresConfirmation) {
        setMessage('Registrierung erfolgreich! Bitte überprüfe deine E-Mails und klicke auf den Bestätigungslink.')
        setRegistrationComplete(true)
      } else {
        setMessage('Registrierung erfolgreich!')
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An error occurred')
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(''); setIsError(false)

    try {
      await login(email, password)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An error occurred')
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  // `asTherapist` pre-ticks the form's therapist checkbox (the professionals'
  // note CTA); every other entry point opens it unticked.
  const handleRegisterClick = (asTherapist = false) => {
    setIsTherapist(asTherapist)
    setShowRegisterForm(true)
    setShowLoginForm(false)
    setRegistrationComplete(false)
    setMessage(''); setIsError(false)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 0)
  }

  const handleLoginClick = () => {
    setShowLoginForm(true)
    setShowRegisterForm(false)
    setRegistrationComplete(false)
    setMessage(''); setIsError(false)
  }

  return (
    <div style={{
      height: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
      /* Containing block for the mobile lang switcher (absolute), so it
         scrolls away with the hero instead of pinning to the viewport. */
      position: 'relative'
    }}>
      <SeoHead page="landing" path="/" />
      <OrgJsonLd />
      {/* Language switcher — lets anonymous visitors override browser detection.
          Positioned via .landing-lang-switcher (desktop top-left, fixed;
          mobile top-right, absolute so it scrolls away with the hero). */}
      <LanguageSwitcher className="landing-lang-switcher" />

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

        {(showLoginForm || registerScreen) && (
          <svg
            className="landing-auth-confetti"
            viewBox="0 0 1440 300"
            preserveAspectRatio="xMidYMin slice"
            aria-hidden="true"
          >
            {AUTH_CONFETTI_SQUARES.map((q, i) => (
              <rect
                key={i}
                x={q.x}
                y={q.y}
                width={q.s}
                height={q.s}
                rx={2}
                fill={q.c}
                opacity={q.o}
                transform={`rotate(${q.r} ${q.x + q.s / 2} ${q.y + q.s / 2})`}
              />
            ))}
          </svg>
        )}

      <div className="w-full" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Welcome Text - Matching mockup exactly (the register screen swaps
            this whole block — top-bar logo included — for its own screen below) */}
        {!showLoginForm && !registerScreen && !registeredScreen && (
          <div className="landing-hero-body" style={{
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
              paddingTop: '40px',
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
                {t('brandClaim').split('\n').map((line, i, arr) => (
                  <Fragment key={i}>{line}{i < arr.length - 1 ? <br /> : null}</Fragment>
                ))}
              </div>
            </div>


            {/* Tagline + swirl/CTA row. On mobile these stack (the wrapper is
                `display: contents`); on desktop the wrapper becomes the flex
                row that centres them between the logo and the figures. */}
            <div className="landing-hero-mid">
            {!showRegisterForm && (
              <div ref={taglineRef} className="landing-tagline" style={{
                fontFamily: '"Gaegu", "Gaegu Accents", cursive',
                fontWeight: 700,
                // 40px per the mockup (430px artboard); shrinks fluidly so the two
                // tagline lines never wrap on narrower phones
                fontSize: 'min(40px, calc((100vw - 64px) / 8.6))',
                lineHeight: 1.27,
                letterSpacing: taglineSpacing.letterSpacing,
                wordSpacing: taglineSpacing.wordSpacing,
                textTransform: 'uppercase',
                color: 'rgb(84, 130, 255)',
                textAlign: 'left',
                margin: '53px 0 0',
                padding: '0 24px 0 40px'
              }}>
                {taglineText.split('\n').map((line, i, arr) => (
                  <Fragment key={i}>{line}{i < arr.length - 1 ? <br /> : null}</Fragment>
                ))}
              </div>
            )}

            {/* Subtitle under the tagline — desktop only (hidden on mobile). */}
            {!showRegisterForm && landing.hero.subtitle && (
              <p className="landing-subtitle">
                {landing.hero.subtitle.split('\n').map((line, i, arr) => (
                  <Fragment key={i}>{line}{i < arr.length - 1 ? <br /> : null}</Fragment>
                ))}
              </p>
            )}

            {/* Swirl + registration button row (mobile); on desktop the swirl is
                hidden and .landing-cta-wrap floats bottom-right via CSS */}
            {!showRegisterForm && (
              <div
                className="landing-hero-actions"
                style={ctaInset != null ? ({ ['--cta-inset']: `${ctaInset}px` } as React.CSSProperties) : undefined}
              >
                <img
                  className="landing-swirl"
                  src={`/images/swirl.png`}
                  alt=""
                  width={212}
                  height={113}
                  decoding="async"
                />
                <div className="landing-cta-wrap">
                  <button className="landing-cta" onClick={() => handleRegisterClick()}>
                    {landing.hero.ctaLabel}
                  </button>
                </div>
              </div>
            )}
            </div>

            {/* Remy figures, each an animated, self-contained HTML file with a
                transparent stage. Mobile: the two-figure confetti stage
                (363×314), full width under the tagline. Desktop: the duo with
                the moving wall shadow, big in the left column. Rendered per
                breakpoint so neither device loads the other's file. */}
            <div className={`landing-duo-wrap${showRegisterForm ? ' landing-duo-wrap--form' : ''}`}>
              {isDesktop ? (
                <iframe
                  className="landing-duo"
                  src="/figures_duo_desktop.html"
                  title="Remy Figuren"
                  scrolling="no"
                  aria-hidden="true"
                />
              ) : (
                <iframe
                  className="landing-duo"
                  src="/figures_animation_mobile.html"
                  title="Remy Figuren"
                  loading="lazy"
                  scrolling="no"
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Register form + login link - bottom portion */}
            <div className="landing-cta-area" onClick={() => { if (showRegisterForm) { setShowRegisterForm(false); setMessage(''); setIsError(false) } }} style={{
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

        {/* Register screen — mirrors the login screen: REMY title + subtitle,
            labelled fields, no top-bar logo, no figures (all widths). */}
        {registerScreen && (
          <div className="landing-auth-screen" style={{
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
                {landing.hero.registerPrompt}
              </p>
            </div>

            <form ref={formRef} onSubmit={handleRegister} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              gap: '16px'
            }}>
              <div style={{ width: '75vw', maxWidth: '340px' }}>
                <label htmlFor="email" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#144220', textAlign: 'left' }}>
                  {landing.login.emailLabel}
                </label>
                <input
                  id="email"
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
                <label htmlFor="password" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#144220', textAlign: 'left' }}>
                  {landing.login.passwordLabel}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="px-4 py-3 rounded-xl focus:outline-none focus:ring-2 bg-white"
                  style={{ width: '100%', fontSize: '16px', border: '1.5px solid rgb(84, 130, 255)' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div style={{ width: '75vw', maxWidth: '340px', textAlign: 'left' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: '"Nunito Sans", sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#144220',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    name="isTherapist"
                    checked={isTherapist}
                    onChange={(e) => setIsTherapist(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'rgb(84, 130, 255)', cursor: 'pointer' }}
                  />
                  {tAuth('register.therapistCheckbox')}
                </label>
                {isTherapist && (
                  <p style={{
                    fontFamily: '"Nunito Sans", sans-serif',
                    fontSize: '12px',
                    color: '#144220',
                    marginTop: '4px',
                    lineHeight: 1.4
                  }}>
                    {tAuth('register.therapistHint')}
                    <br />
                    <strong>{tAuth('register.therapistAnonymityWarning')}</strong>
                  </p>
                )}
              </div>

              {message && (
                <div
                  className={`rounded-lg p-3 text-sm ${
                    isError
                      ? 'bg-red-50 border border-red-200 text-red-700'
                      : 'bg-green-50 border border-green-200 text-green-700'
                  }`}
                  style={{ width: '75vw', maxWidth: '340px' }}
                >
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
                {loading ? 'Loading...' : landing.hero.registerSubmit}
              </button>

              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <span style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '15px', color: '#8a9ab5' }}>
                  {landing.hero.loginLinkPrefix}
                </span>
                <button
                  type="button"
                  onClick={handleLoginClick}
                  style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '15px', color: '#5482ff', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                >
                  {landing.hero.loginLinkLabel}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Registration Complete - Email Confirmation Required */}
        {registeredScreen && (
          <div className="landing-registered">
            <div className="landing-registered-card" role="status">
              {/* Hand-drawn-feel checkmark in a soft blue disc */}
              <div className="landing-registered-check" aria-hidden="true">
                <svg viewBox="0 0 64 64" fill="none">
                  <path d="M18 33.5 L28 43 L47 22" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="landing-registered-title">{landing.registrationComplete.title}</h2>
              <p className="landing-registered-body">{landing.registrationComplete.body}</p>
              <p className="landing-registered-hint">{landing.registrationComplete.hint}</p>
              <button type="button" className="landing-registered-login" onClick={handleLoginClick}>
                {landing.registrationComplete.loginLabel}
              </button>
            </div>
          </div>
        )}

        {/* Login Form */}
        {showLoginForm && (
          <div className="landing-auth-screen" style={{
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
                  isError
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
                  onClick={() => handleRegisterClick()}
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
      position: 'relative'
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

      {/* Desktop intro row: the two intro paragraphs side by side, balanced
          (see balanceIntroColumns) — hidden on mobile, which shows them
          stacked in .landing-about-text below. */}
      <div className="landing-about-columns">
        {landing.about.title && <h2 className="landing-about-title">{landing.about.title}</h2>}
        {balanceIntroColumns(landing.about.paragraphs[0] ?? '', landing.about.paragraphs[1] ?? '').map((text, i) => (
          <p key={i}>{renderLandingText(text, `about-col-${i}`)}</p>
        ))}
      </div>

      {/* Desktop feature row — hidden on mobile */}
      <div className="landing-features" aria-hidden="true">
        {LANDING_FEATURES.map((f, i) => (
          <div className={`landing-feature landing-feature--${f.key}`} key={f.key}>
            <div className="landing-feature-icon">
              <img src={f.icon.src} alt="" width={f.icon.w} height={f.icon.h} loading="lazy" decoding="async" />
            </div>
            <h3 className="landing-feature-title">{desktopFeatures[i]?.title ?? f.title}</h3>
            <p className="landing-feature-lead">{desktopFeatures[i]?.lead ?? f.lead}</p>
          </div>
        ))}
      </div>

      {/* Desktop: the professionals' note under the features (the mobile
          notes' second entry — the first, "für die Schweiz konzipiert", is
          covered by the Schweiz feature here). Hidden on mobile, which shows
          both notes under its checklist. */}
      {/* …followed by "Wer steht hinter Remy?" in the right column, stepped
          down below the note (desktop only). */}
      <div className="landing-about-pro">
        {landing.about.notes?.length > 1 && (
          <div className="landing-about-pro-note">
            {landing.about.notes.slice(1).map((note, i) => (
              <p key={i}>{renderLandingText(note, `about-pro-${i}`)}</p>
            ))}
            <button className="landing-cta landing-about-pro-cta" onClick={() => handleRegisterClick(true)}>
              {landing.about.cta?.button || landing.hero.registerSubmit}
            </button>
          </div>
        )}
        {landing.about.story?.text && (
          <div className="landing-about-story">
            {landing.about.story.title && <h2 className="landing-about-title">{landing.about.story.title}</h2>}
            <p>{renderLandingText(landing.about.story.text, 'about-story')}</p>
          </div>
        )}
      </div>

      <div className="landing-about-text" style={{
        width: '100%',
        paddingLeft: '10px',
        paddingRight: '10px'
      }}>
        {/* Main text (intro + core) */}
        <div className="landing-about-body landing-about-intro" style={{ ...aboutBodyStyle, marginTop: '20px' }}>
          <p style={{ marginBottom: '24px' }}>
            {renderLandingText(landing.about.paragraphs[0] ?? '', 'about-0')}
          </p>
          <p style={{ marginBottom: '24px' }}>
            {renderLandingText(landing.about.paragraphs[1] ?? '', 'about-1')}
          </p>
        </div>

        {landing.about.checklist?.length > 0 && (
          <ul className="landing-about-checklist">
            {landing.about.checklist.map((item, i) => {
              const icon = CHECKLIST_ICONS[i % CHECKLIST_ICONS.length]
              return (
                <li key={i}>
                  <span className="landing-check-icon" aria-hidden="true">
                    <img src={icon.src} alt="" width={icon.w} height={icon.h} loading="lazy" decoding="async" />
                  </span>
                  <span>{item}</span>
                </li>
              )
            })}
          </ul>
        )}

        {/* Notes under the checklist (mobile) — same body style as the intro. */}
        {landing.about.notes?.length > 0 && (
          <div className="landing-about-body landing-about-note" style={aboutBodyStyle}>
            {landing.about.notes.map((note, i) => (
              <p key={i}>{renderLandingText(note, `about-note-${i}`)}</p>
            ))}
          </div>
        )}

        {/* Call-to-action (mobile): copy + swirl + Registrieren button that
            opens the register form (same elements as the hero). */}
        {landing.about.cta?.text && (
          <div className="landing-about-cta">
            <div className="landing-about-body" style={aboutBodyStyle}>
              <p>{renderLandingText(landing.about.cta.text, 'about-cta')}</p>
            </div>
            <div className="landing-about-cta-row">
              <img
                className="landing-swirl"
                src={`/images/swirl.png`}
                alt=""
                width={212}
                height={113}
                decoding="async"
              />
              <button className="landing-cta landing-about-cta-btn" onClick={() => handleRegisterClick()}>
                {landing.about.cta.button}
              </button>
            </div>
            {/* Deep-sea closer: the confetti submarine bobbing in the dark end
                of the fade, its searchlight a cone of yellow squares ahead. */}
            {deepSea}
          </div>
        )}
      </div>
    </div>

    {/* Desktop only: white → footer-blue band carrying the deep-sea closer
        (mobile shows it inside the CTA band instead). */}
    <div className="landing-deepsea-band" aria-hidden="true">
      {deepSea}
    </div>

    <LandingFooter />
  </div>
  )
}

export default App

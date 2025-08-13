import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'
import { useNotificationsRealtime } from './hooks/useNotificationsRealtime'
import { usePostsRealtime } from './hooks/usePostsRealtime'
import { testSupabaseConnection } from './utils/test-connection'
import Layout from './components/layout/Layout'
import ForumView from './components/forum/ForumView'
import PostView from './components/forum/PostView'
import './App.css'

function App() {
  const [showCreatePostDialog, setShowCreatePostDialog] = useState(false)
  const { user, loading } = useAuthStore()
  
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

  if (!user) {
    return <AuthForm />
  }

  return (
    <Router>
      <Layout onCreatePost={handleCreatePost}>
        <Routes>
          <Route 
            path="/" 
            element={
              <ForumView 
                showCreatePostDialog={showCreatePostDialog}
                onCreatePostDialogClose={() => setShowCreatePostDialog(false)}
              />
            } 
          />
          <Route path="/post/:id" element={<PostView />} />
        </Routes>
      </Layout>
    </Router>
  )
}

function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  
  const { login, register } = useAuthStore()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        await register(email, password, email.split('@')[0])
        setMessage('Check your email for the confirmation link!')
      } else {
        await login(email, password)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-4xl font-headline font-bold text-center text-primary-600 mb-2">
            Remy Forum
          </h1>
          <h2 className="text-2xl font-headline font-semibold text-center text-gray-900">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            A safe space for psychotherapy patient experiences
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {message && (
            <div className={`rounded-md p-4 ${
              message.includes('error') || message.includes('Error') 
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default App

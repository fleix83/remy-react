import React, { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth.store'

interface WelcomePageProps {
  onComplete: (username: string) => Promise<void>
  checkUsernameAvailable: (username: string) => Promise<boolean>
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onComplete, checkUsernameAvailable }) => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshSession } = useAuthStore()
  const [username, setUsername] = useState('')

  // Override body background so no other bg bleeds through
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#eefaf0'
    return () => { document.body.style.background = prev }
  }, [])
  const [error, setError] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if we have token params (coming from email confirmation link)
  const tokenHash = searchParams.get('token_hash')
  const tokenType = searchParams.get('type')
  const needsEmailConfirmation = !!(tokenHash && tokenType)

  const validateUsername = (value: string): string | null => {
    if (value.length < 2) {
      return 'Benutzername muss mindestens 2 Zeichen lang sein'
    }
    if (value.length > 50) {
      return 'Benutzername darf maximal 50 Zeichen lang sein'
    }
    // Check for valid characters (alphanumeric, underscores, hyphens)
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      return 'Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten'
    }
    return null
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setUsername(value)

    // Clear error when user starts typing
    if (error) {
      setError('')
    }
  }

  const handleUsernameBlur = async () => {
    if (!username.trim()) return

    const validationError = validateUsername(username)
    if (validationError) {
      setError(validationError)
      return
    }

    // Check availability
    setIsChecking(true)
    try {
      const isAvailable = await checkUsernameAvailable(username)
      if (!isAvailable) {
        setError('Dieser Benutzername ist bereits vergeben')
      }
    } catch (err) {
      console.error('Error checking username:', err)
    } finally {
      setIsChecking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const validationError = validateUsername(username)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // Check availability one more time
      const isAvailable = await checkUsernameAvailable(username)
      if (!isAvailable) {
        setError('Dieser Benutzername ist bereits vergeben')
        setIsSubmitting(false)
        return
      }

      // If we have token params, verify the email first (this also logs the user in)
      if (needsEmailConfirmation) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: tokenType as 'signup' | 'email' | 'recovery' | 'invite' | 'email_change',
        })

        if (verifyError) {
          // Translate common errors to German
          let errorMessage = verifyError.message
          if (verifyError.message.includes('expired')) {
            errorMessage = 'Der Bestätigungslink ist abgelaufen. Bitte registriere dich erneut.'
          } else if (verifyError.message.includes('invalid')) {
            errorMessage = 'Der Bestätigungslink ist ungültig. Bitte registriere dich erneut.'
          }
          setError(errorMessage)
          setIsSubmitting(false)
          return
        }

        // Refresh the session to get the authenticated user
        await refreshSession()
      }

      // Complete onboarding (saves username and sets onboarding_complete)
      await onComplete(username)

      // Navigate to home
      navigate('/')
    } catch (err) {
      console.error('Error completing onboarding:', err)
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
      setIsSubmitting(false)
    }
  }

  const isButtonDisabled = !username.trim() || username.length < 2 || isChecking || isSubmitting || !!error

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: '#eefaf0' }}>
      <div className="max-w-md w-full">
        {/* Heading */}
        <h1
          className="font-headline font-bold text-left mb-6"
          style={{ color: '#4785ff', fontSize: '28px' }}
        >
          Herzlich Willkommen
        </h1>

        {/* Guidelines Section */}
        <p className="text-gray-700 text-left mb-4 leading-relaxed">
          Bitte lese dir zu Beginn die Community Guidelines durch. Sie sind gerade hinsichtlich Thema Psychotherapie wichtig.
        </p>

        <div className="mb-10 text-left">
          <Link
            to="/community-guidelines"
            target="_blank"
            className="inline-block px-6 py-2 rounded-full text-white font-medium"
            style={{ backgroundColor: '#4785ff' }}
          >
            Community Guidelines
          </Link>
        </div>

        {/* Username Section */}
        <p className="text-gray-700 text-left mb-4 font-medium">
          Dann benötigst du nur noch einen Benutzernamen
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <input
              type="text"
              placeholder="Dein Benutzername"
              value={username}
              onChange={handleUsernameChange}
              onBlur={handleUsernameBlur}
              className="w-full px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-[#4785ff] bg-white"
              style={{ fontSize: '16px' }}
              disabled={isSubmitting}
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-2 ml-4">{error}</p>
            )}
            {isChecking && (
              <p className="text-gray-500 text-sm mt-2 ml-4">Prüfe Verfügbarkeit...</p>
            )}
          </div>

          {/* Continue Section */}
          <p className="text-gray-700 text-left mb-4">
            Perfekt, hier geht es weiter zum Forum
          </p>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isButtonDisabled}
              className="px-6 py-2 rounded-full text-white font-medium transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#4785ff' }}
            >
              {isSubmitting ? 'Wird gespeichert...' : 'Weiter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default WelcomePage

import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useTranslation } from 'react-i18next'

const ConfirmEmail: React.FC = () => {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDescription, setErrorDescription] = useState<string | null>(null)
  const [showConfirmButton, setShowConfirmButton] = useState(false)
  const [tokenHash, setTokenHash] = useState<string | null>(null)
  const [tokenType, setTokenType] = useState<string | null>(null)

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Check for token_hash in query params (custom email template approach)
        // This prevents email prefetching from consuming the token
        const queryTokenHash = searchParams.get('token_hash')
        const queryType = searchParams.get('type')

        if (queryTokenHash && queryType) {
          // Custom email template flow - show button to confirm
          setTokenHash(queryTokenHash)
          setTokenType(queryType)
          setShowConfirmButton(true)
          setLoading(false)
          return
        }

        // Check if there's an error in the URL hash (from Supabase redirect)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const urlError = hashParams.get('error')
        const urlErrorCode = hashParams.get('error_code')
        const urlErrorDescription = hashParams.get('error_description')

        if (urlError) {
          // Set i18n keys (or raw text); translated at render time via t()
          let errorMessage = 'errorGeneric'
          let errorDetails = urlErrorDescription?.replace(/\+/g, ' ') || ''

          if (urlErrorCode === 'otp_expired') {
            errorMessage = 'confirm.expiredTitle'
            errorDetails = 'confirm.expiredDetails'
          } else if (urlErrorCode === 'access_denied') {
            errorMessage = 'confirm.accessDenied'
          }

          setError(errorMessage)
          setErrorDescription(errorDetails)
          setLoading(false)
          return
        }

        // No error in URL - try to get session (standard flow)
        await new Promise(resolve => setTimeout(resolve, 500))

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        if (session) {
          // Success - redirect to home after 2 seconds
          setTimeout(() => navigate('/'), 2000)
        } else {
          // Try one more time after a delay
          await new Promise(resolve => setTimeout(resolve, 1000))
          const { data: { session: retrySession } } = await supabase.auth.getSession()

          if (retrySession) {
            setTimeout(() => navigate('/'), 2000)
          } else {
            setError('confirm.failedTitle')
            setErrorDescription('confirm.failedDetails')
            setLoading(false)
          }
        }
      } catch (err) {
        setError('errorGeneric')
        setErrorDescription(err instanceof Error ? err.message : 'unknownError')
        setLoading(false)
      }
    }

    handleEmailConfirmation()
  }, [navigate, searchParams])

  // Handle manual confirmation button click
  const handleConfirmClick = async () => {
    if (!tokenHash || !tokenType) return

    setLoading(true)
    setShowConfirmButton(false)

    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: tokenType as 'signup' | 'email' | 'recovery' | 'invite' | 'email_change',
      })

      if (error) {
        setError('confirm.failedTitle')
        setErrorDescription(error.message)
        setLoading(false)
        return
      }

      // Success - redirect to home
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setError('Ein Fehler ist aufgetreten')
      setErrorDescription(err instanceof Error ? err.message : 'Unbekannter Fehler')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4"
      style={{ backgroundColor: '#d5f4da' }}
    >
      <div className="max-w-md w-full text-center" style={{ padding: '9px' }}>
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-lg" style={{ color: '#144220' }}>
              {t('confirm.verifying')}
            </p>
          </>
        ) : showConfirmButton ? (
          <>
            <div className="text-blue-600 mb-4 text-5xl">✉️</div>
            <p className="text-lg mb-2 font-semibold" style={{ color: '#144220' }}>
              {t('confirm.confirmTitle')}
            </p>
            <p className="text-sm mb-6" style={{ color: '#144220', opacity: 0.8 }}>
              {t('confirm.confirmBody')}
            </p>
            <button
              onClick={handleConfirmClick}
              className="w-full px-6 py-3 rounded-lg font-semibold"
              style={{ backgroundColor: 'var(--primary)', color: 'white' }}
            >
              {t('confirm.confirmButton')}
            </button>
          </>
        ) : error ? (
          <>
            <div className="text-red-600 mb-4 text-5xl">✗</div>
            <p className="text-lg mb-2 font-semibold" style={{ color: '#144220' }}>
              {t(error)}
            </p>
            {errorDescription && (
              <p className="text-sm mb-6" style={{ color: '#144220', opacity: 0.8 }}>
                {t(errorDescription)}
              </p>
            )}
            <div className="space-y-3">
              <button
                onClick={() => navigate('/')}
                className="block w-full px-6 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
              >
                {t('confirm.registerAgain')}
              </button>
              <button
                onClick={() => navigate('/?login=true')}
                className="block w-full px-6 py-2 rounded-lg border"
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)', backgroundColor: 'transparent' }}
              >
                {t('confirm.toLogin')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-green-600 mb-4 text-5xl">✓</div>
            <p className="text-lg mb-4" style={{ color: '#144220' }}>
              {t('confirm.successTitle')}
            </p>
            <p className="text-sm" style={{ color: '#144220' }}>
              {t('confirm.redirecting')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default ConfirmEmail

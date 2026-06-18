import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'
import { useTranslation } from 'react-i18next'

const ResetPassword: React.FC = () => {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const { updatePassword } = useAuthStore()
  const { t } = useTranslation('auth')

  useEffect(() => {
    // Check if we have a valid session/token from the email link
    // Supabase automatically handles the token from the URL
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    // Validation
    if (newPassword.length < 6) {
      setError(t('reset.tooShort'))
      setLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t('reset.mismatch'))
      setLoading(false)
      return
    }

    try {
      await updatePassword(newPassword)
      setMessage(t('reset.success'))

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/?login=true')
      }, 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('errorGeneric')

      // Translate common Supabase errors to German
      if (errorMessage.includes('New password should be different')) {
        setError(t('reset.sameAsOld'))
      } else if (errorMessage.includes('Invalid token')) {
        setError(t('reset.invalidToken'))
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#d5f4da' }}>
      <div className="max-w-md w-full" style={{ padding: '9px' }}>
        <div className="text-center mb-8">
          <p className="font-body text-[18px]" style={{ color: '#144220', marginBottom: '24px' }}>
            {t('reset.title')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium mb-1 text-left" style={{ color: '#144220' }}>
              {t('reset.newPassword')}
            </label>
            <input
              id="new-password"
              name="newPassword"
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium mb-1 text-left" style={{ color: '#144220' }}>
              {t('reset.confirmPassword')}
            </label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
            />
          </div>

          {error && (
            <div className="rounded-lg p-4 bg-red-50 border border-red-200 text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-lg p-4 bg-green-50 border border-green-200 text-green-700">
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
            {loading ? t('common:loading') : t('reset.submit')}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => navigate('/?login=true')}
              className="font-body text-[16px] underline"
              style={{ color: 'var(--primary)' }}
            >
              {t('backToLogin')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ResetPassword

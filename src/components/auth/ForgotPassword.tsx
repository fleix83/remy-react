import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth.store'

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { resetPassword } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      await resetPassword(email)
      setMessage('Wir haben dir eine E-Mail zum Zurücksetzen deines Passworts geschickt. Bitte überprüfe deinen Posteingang.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#d5f4da' }}>
      <div className="max-w-md w-full" style={{ padding: '9px' }}>
        <div className="text-center mb-8">
          <p className="font-body text-[18px]" style={{ color: '#144220', marginBottom: '24px' }}>
            Passwort zurücksetzen
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="block text-sm font-medium mb-1 text-left" style={{ color: '#144220' }}>
              E-Mail
            </label>
            <input
              id="reset-email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white"
              placeholder="deine@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {message && (
            <div className={`rounded-lg p-4 ${
              message.includes('error') || message.includes('Error') || message.includes('Fehler')
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
            {loading ? 'Loading...' : 'Link senden'}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => navigate('/?login=true')}
              className="font-body text-[16px] underline"
              style={{ color: 'var(--primary)' }}
            >
              Zurück zum Login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ForgotPassword

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const ConfirmEmail: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) throw error

        if (session) {
          // Success - redirect to home after 2 seconds
          setTimeout(() => navigate('/'), 2000)
        } else {
          setError('Bestätigung fehlgeschlagen. Bitte versuche es erneut.')
          setLoading(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
        setLoading(false)
      }
    }

    handleEmailConfirmation()
  }, [navigate])

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
              E-Mail wird bestätigt...
            </p>
          </>
        ) : error ? (
          <>
            <div className="text-red-600 mb-4 text-5xl">✗</div>
            <p className="text-lg mb-4" style={{ color: '#144220' }}>
              {error}
            </p>
            <button
              onClick={() => navigate('/?login=true')}
              className="px-6 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--primary)', color: 'white' }}
            >
              Zum Login
            </button>
          </>
        ) : (
          <>
            <div className="text-green-600 mb-4 text-5xl">✓</div>
            <p className="text-lg mb-4" style={{ color: '#144220' }}>
              E-Mail erfolgreich bestätigt!
            </p>
            <p className="text-sm" style={{ color: '#144220' }}>
              Du wirst automatisch weitergeleitet...
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default ConfirmEmail

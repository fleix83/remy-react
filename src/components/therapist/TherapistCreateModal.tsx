import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TherapistsService } from '../../services/therapists.service'
import type { Therapist } from '../../types/database.types'

interface TherapistCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onTherapistCreated: (therapist: Therapist) => void
  preselectedCanton?: string
}

const TherapistCreateModal: React.FC<TherapistCreateModalProps> = ({
  isOpen,
  onClose,
  onTherapistCreated,
  preselectedCanton = ''
}) => {
  const [formData, setFormData] = useState({
    canton: preselectedCanton,
    form_of_address: '',
    first_name: '',
    last_name: '',
    designation: '',
    institution: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const therapistsService = new TherapistsService()

  // Update canton when preselectedCanton changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      canton: preselectedCanton
    }))
  }, [preselectedCanton])

  // Swiss cantons
  const cantons = [
    { code: '', name: 'Kanton auswählen' },
    { code: 'AG', name: 'Aargau' },
    { code: 'AI', name: 'Appenzell Innerrhoden' },
    { code: 'AR', name: 'Appenzell Ausserrhoden' },
    { code: 'BE', name: 'Bern' },
    { code: 'BL', name: 'Basel-Landschaft' },
    { code: 'BS', name: 'Basel-Stadt' },
    { code: 'FR', name: 'Freiburg' },
    { code: 'GE', name: 'Genf' },
    { code: 'GL', name: 'Glarus' },
    { code: 'GR', name: 'Graubünden' },
    { code: 'JU', name: 'Jura' },
    { code: 'LU', name: 'Luzern' },
    { code: 'NE', name: 'Neuenburg' },
    { code: 'NW', name: 'Nidwalden' },
    { code: 'OW', name: 'Obwalden' },
    { code: 'SG', name: 'St. Gallen' },
    { code: 'SH', name: 'Schaffhausen' },
    { code: 'SO', name: 'Solothurn' },
    { code: 'SZ', name: 'Schwyz' },
    { code: 'TG', name: 'Thurgau' },
    { code: 'TI', name: 'Tessin' },
    { code: 'UR', name: 'Uri' },
    { code: 'VD', name: 'Waadt' },
    { code: 'VS', name: 'Wallis' },
    { code: 'ZG', name: 'Zug' },
    { code: 'ZH', name: 'Zürich' }
  ]

  // Forms of address
  const formsOfAddress = [
    'Frau',
    'Herr',
    'Dr.',
    'Dr. med.',
    'Prof.',
    'Prof. Dr.',
    'Prof. Dr. med.'
  ]

  // Professional designations
  const designations = [
    'Psychotherapeut',
    'Psychologe',
    'Psychiater',
    'Facharzt für Psychiatrie',
    'Facharzt für Psychotherapie',
    'Coach',
    'Berater',
    'Sozialarbeiter',
    'Klinischer Psychologe'
  ]

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  const validateForm = () => {
    if (!formData.canton) {
      setError('Bitte wählen Sie einen Kanton aus')
      return false
    }
    if (!formData.first_name.trim()) {
      setError('Bitte geben Sie den Vornamen ein')
      return false
    }
    if (!formData.last_name.trim()) {
      setError('Bitte geben Sie den Nachnamen ein')
      return false
    }
    if (!formData.designation) {
      setError('Bitte wählen Sie eine Berufsbezeichnung aus')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event bubbling to parent forms
    
    if (!validateForm()) return

    setIsSubmitting(true)
    setError('')

    try {
      console.log('🔧 TherapistCreateModal: Submitting form with data:', formData)
      
      const newTherapist = await therapistsService.createTherapist({
        canton: formData.canton,
        form_of_address: formData.form_of_address,
        first_name: formData.first_name,
        last_name: formData.last_name,
        designation: formData.designation,
        institution: formData.institution || undefined
      })

      console.log('✅ TherapistCreateModal: Therapist created successfully:', newTherapist)
      onTherapistCreated(newTherapist)
      onClose()
      
      // Reset form
      setFormData({
        canton: preselectedCanton,
        form_of_address: '',
        first_name: '',
        last_name: '',
        designation: '',
        institution: ''
      })
    } catch (error) {
      console.error('❌ TherapistCreateModal: Error creating therapist:', error)
      setError(error instanceof Error ? error.message : 'Fehler beim Speichern')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      setError('')
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-700 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <h2 className="text-xl font-bold text-yellow-400">
            Neuen Therapeuten hinzufügen
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Kanton */}
            <div>
              <label className="block text-yellow-400 text-sm font-medium mb-2">
                Kanton
              </label>
              <select
                value={formData.canton}
                onChange={(e) => handleInputChange('canton', e.target.value)}
                className="w-full px-3 py-2 bg-slate-600 border border-yellow-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                disabled={isSubmitting}
                required
              >
                {cantons.map((canton) => (
                  <option key={canton.code} value={canton.code} className="bg-slate-600">
                    {canton.code ? `${canton.code} - ${canton.name}` : canton.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Anrede */}
            <div>
              <label className="block text-yellow-400 text-sm font-medium mb-2">
                Anrede
              </label>
              <select
                value={formData.form_of_address}
                onChange={(e) => handleInputChange('form_of_address', e.target.value)}
                className="w-full px-3 py-2 bg-slate-600 border border-yellow-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                disabled={isSubmitting}
              >
                <option value="" className="bg-slate-600">Anrede auswählen (optional)</option>
                {formsOfAddress.map((address) => (
                  <option key={address} value={address} className="bg-slate-600">
                    {address}
                  </option>
                ))}
              </select>
            </div>

            {/* Vorname */}
            <div>
              <label className="block text-yellow-400 text-sm font-medium mb-2">
                Vorname
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="Vorname"
                className="w-full px-3 py-2 bg-slate-600 border border-yellow-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                disabled={isSubmitting}
                required
                maxLength={100}
              />
            </div>

            {/* Nachname */}
            <div>
              <label className="block text-yellow-400 text-sm font-medium mb-2">
                Nachname
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder="Nachname"
                className="w-full px-3 py-2 bg-slate-600 border border-yellow-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                disabled={isSubmitting}
                required
                maxLength={100}
              />
            </div>

            {/* Berufsbezeichnung */}
            <div>
              <label className="block text-yellow-400 text-sm font-medium mb-2">
                Berufsbezeichnung
              </label>
              <select
                value={formData.designation}
                onChange={(e) => handleInputChange('designation', e.target.value)}
                className="w-full px-3 py-2 bg-slate-600 border border-yellow-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                disabled={isSubmitting}
                required
              >
                <option value="" className="bg-slate-600">Berufsbezeichnung auswählen</option>
                {designations.map((designation) => (
                  <option key={designation} value={designation} className="bg-slate-600">
                    {designation}
                  </option>
                ))}
              </select>
            </div>

            {/* Institution */}
            <div>
              <label className="block text-yellow-400 text-sm font-medium mb-2">
                Institution (wenn vorhanden)
              </label>
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => handleInputChange('institution', e.target.value)}
                placeholder="z.B. Klinik, Tagesstruktur, Programm"
                className="w-full px-3 py-2 bg-slate-600 border border-yellow-500 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                disabled={isSubmitting}
                maxLength={200}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-black font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default TherapistCreateModal
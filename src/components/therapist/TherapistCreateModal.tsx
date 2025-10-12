import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { TherapistsService } from '../../services/therapists.service'
import type { Therapist } from '../../types/database.types'

interface TherapistCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onTherapistCreated: (therapist: Therapist) => void
  preselectedCanton?: string
  therapist?: Therapist | null  // Optional: for edit mode
}

const TherapistCreateModal: React.FC<TherapistCreateModalProps> = ({
  isOpen,
  onClose,
  onTherapistCreated,
  preselectedCanton = '',
  therapist = null
}) => {
  const isEditMode = !!therapist

  const [formData, setFormData] = useState({
    canton: preselectedCanton,
    form_of_address: '',
    first_name: '',
    last_name: '',
    designation: '',
    institution: '',
    description: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const therapistsService = new TherapistsService()

  // Initialize form data when therapist prop changes (edit mode)
  useEffect(() => {
    if (therapist) {
      setFormData({
        canton: therapist.canton || '',
        form_of_address: therapist.form_of_address || '',
        first_name: therapist.first_name || '',
        last_name: therapist.last_name || '',
        designation: therapist.designation || '',
        institution: therapist.institution || '',
        description: therapist.description || ''
      })
    } else if (preselectedCanton) {
      setFormData(prev => ({
        ...prev,
        canton: preselectedCanton
      }))
    }
  }, [therapist, preselectedCanton])

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
      console.log(`🔧 TherapistCreateModal: ${isEditMode ? 'Updating' : 'Creating'} therapist with data:`, formData)

      let resultTherapist: Therapist

      if (isEditMode && therapist) {
        // Update existing therapist
        resultTherapist = await therapistsService.updateTherapist(therapist.id, {
          canton: formData.canton || null,
          form_of_address: formData.form_of_address,
          first_name: formData.first_name,
          last_name: formData.last_name,
          designation: formData.designation,
          institution: formData.institution || null,
          description: formData.description || null
        })
      } else {
        // Create new therapist
        resultTherapist = await therapistsService.createTherapist({
          canton: formData.canton,
          form_of_address: formData.form_of_address,
          first_name: formData.first_name,
          last_name: formData.last_name,
          designation: formData.designation,
          institution: formData.institution || undefined,
          description: formData.description || undefined
        })
      }

      console.log(`✅ TherapistCreateModal: Therapist ${isEditMode ? 'updated' : 'created'} successfully:`, resultTherapist)
      onTherapistCreated(resultTherapist)
      onClose()

      // Reset form
      if (!isEditMode) {
        setFormData({
          canton: preselectedCanton,
          form_of_address: '',
          first_name: '',
          last_name: '',
          designation: '',
          institution: '',
          description: ''
        })
      }
    } catch (error) {
      console.error(`❌ TherapistCreateModal: Error ${isEditMode ? 'updating' : 'creating'} therapist:`, error)
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
      <div className="rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#ecffef' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderBottomColor: '#ebebeb' }}>
          <h2 className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
            {isEditMode ? 'Therapeut bearbeiten' : 'Neuen Therapeuten hinzufügen'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
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
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                Kanton
              </label>
              <select
                value={formData.canton}
                onChange={(e) => handleInputChange('canton', e.target.value)}
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting}
                required
              >
                {cantons.map((canton) => (
                  <option key={canton.code} value={canton.code} className="bg-white">
                    {canton.code ? `${canton.code} - ${canton.name}` : canton.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Anrede */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                Anrede
              </label>
              <select
                value={formData.form_of_address}
                onChange={(e) => handleInputChange('form_of_address', e.target.value)}
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting}
              >
                <option value="" className="bg-white">Anrede auswählen (optional)</option>
                {formsOfAddress.map((address) => (
                  <option key={address} value={address} className="bg-white">
                    {address}
                  </option>
                ))}
              </select>
            </div>

            {/* Vorname */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                Vorname
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder="Vorname"
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting}
                required
                maxLength={100}
              />
            </div>

            {/* Nachname */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                Nachname
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder="Nachname"
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting}
                required
                maxLength={100}
              />
            </div>

            {/* Berufsbezeichnung */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                Berufsbezeichnung
              </label>
              <select
                value={formData.designation}
                onChange={(e) => handleInputChange('designation', e.target.value)}
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting}
                required
              >
                <option value="" className="bg-white">Berufsbezeichnung auswählen</option>
                {designations.map((designation) => (
                  <option key={designation} value={designation} className="bg-white">
                    {designation}
                  </option>
                ))}
              </select>
            </div>

            {/* Institution */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                Institution (wenn vorhanden)
              </label>
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => handleInputChange('institution', e.target.value)}
                placeholder="z.B. Klinik, Tagesstruktur, Programm"
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting}
                maxLength={200}
              />
            </div>

            {/* Description/Bio */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                Beschreibung (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Zusätzliche Informationen über den Therapeuten"
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting}
                rows={3}
                maxLength={500}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#4785ff' }}
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
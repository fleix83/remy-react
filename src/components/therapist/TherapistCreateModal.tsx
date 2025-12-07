import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { TherapistsService } from '../../services/therapists.service'
import { DesignationsService } from '../../services/designations.service'
import { TherapistImportService, type ImportResult } from '../../services/therapist-import.service'
import { downloadTherapistCSVTemplate } from '../../utils/therapist-csv-template'
import { usePermissions } from '../../hooks/usePermissions'
import { useAuthStore } from '../../stores/auth.store'
import type { Therapist, Designation } from '../../types/database.types'
import { SWISS_CANTONS } from '../../constants/switzerland.constants'
import { FORMS_OF_ADDRESS } from '../../constants/therapist.constants'

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
    designation_id: null as number | null,
    short_designation: '',
    institution: '',
    languages: '',
    city: '',
    gender: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // CSV Import state
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [showImportSection, setShowImportSection] = useState(false)

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Designations state (fetched from database)
  const [designations, setDesignations] = useState<Designation[]>([])
  const [loadingDesignations, setLoadingDesignations] = useState(true)

  const therapistsService = new TherapistsService()
  const designationsService = new DesignationsService()
  const importService = new TherapistImportService()
  const permissions = usePermissions()
  const { userProfile } = useAuthStore()

  // Filter designations by user's language preference, showing only short forms
  const filteredDesignations = useMemo(() => {
    const lang = userProfile?.language_preference || 'de'

    const options: Array<{ id: number; designation: Designation; displayText: string }> = []

    designations.forEach(d => {
      const shortForms: string[] = []

      if (lang === 'de') {
        if (d.name_de_short_m) shortForms.push(d.name_de_short_m)
        if (d.name_de_short_w) shortForms.push(d.name_de_short_w)
      } else if (lang === 'fr') {
        if (d.name_fr_short_m) shortForms.push(d.name_fr_short_m)
        if (d.name_fr_short_w) shortForms.push(d.name_fr_short_w)
      } else if (lang === 'it') {
        if (d.name_it_short_m) shortForms.push(d.name_it_short_m)
        if (d.name_it_short_w) shortForms.push(d.name_it_short_w)
      }

      shortForms.forEach(text => {
        options.push({
          id: d.id,
          designation: d,
          displayText: text
        })
      })
    })

    // Sort alphabetically by display text
    return options.sort((a, b) => a.displayText.localeCompare(b.displayText, lang))
  }, [designations, userProfile?.language_preference])

  // Initialize form data when therapist prop changes (edit mode)
  useEffect(() => {
    if (therapist) {
      setFormData({
        canton: therapist.canton || '',
        form_of_address: therapist.form_of_address || '',
        first_name: therapist.first_name || '',
        last_name: therapist.last_name || '',
        designation: therapist.designation || '',
        designation_id: therapist.designation_id || null,
        short_designation: therapist.short_designation || '',
        institution: therapist.institution || '',
        languages: therapist.languages || '',
        city: therapist.city || '',
        gender: therapist.gender || ''
      })
    } else if (preselectedCanton) {
      setFormData(prev => ({
        ...prev,
        canton: preselectedCanton
      }))
    }
  }, [therapist, preselectedCanton])

  // Load designations from database on mount
  useEffect(() => {
    const loadDesignations = async () => {
      try {
        setLoadingDesignations(true)
        const fetchedDesignations = await designationsService.getActiveDesignations()
        setDesignations(fetchedDesignations)
      } catch (error) {
        console.error('Error loading designations:', error)
        // Continue with empty list - non-critical error
        setDesignations([])
      } finally {
        setLoadingDesignations(false)
      }
    }

    loadDesignations()
  }, []) // Only run once on mount

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleCSVImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setError('')
    setImportResult(null)

    try {
      console.log('📂 Starting CSV import:', file.name)

      const result = await importService.importFromCSV(
        file,
        (therapists) => therapistsService.bulkImportTherapists(therapists)
      )

      setImportResult(result)

      if (result.success && result.imported > 0) {
        // Notify parent component about new therapists
        // We'll pass the first therapist to trigger a refresh
        if (result.importedTherapists.length > 0) {
          onTherapistCreated(result.importedTherapists[0])
        }
      }

      // Clear file input
      event.target.value = ''
    } catch (error) {
      console.error('❌ CSV import error:', error)
      setError(error instanceof Error ? error.message : 'CSV import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const handleDownloadTemplate = () => {
    downloadTherapistCSVTemplate()
  }

  const handleDelete = async () => {
    if (!therapist || !isEditMode) return

    setIsDeleting(true)
    setError('')

    try {
      console.log('🗑️ TherapistCreateModal: Deleting therapist ID:', therapist.id)

      await therapistsService.deleteTherapist(therapist.id)

      console.log('✅ TherapistCreateModal: Therapist deleted successfully')

      // Close the confirmation dialog
      setShowDeleteConfirm(false)

      // Notify parent and close modal
      // We pass the deleted therapist to trigger a refresh
      onTherapistCreated(therapist)
      onClose()
    } catch (error) {
      console.error('❌ TherapistCreateModal: Error deleting therapist:', error)
      setError(error instanceof Error ? error.message : 'Fehler beim Löschen')
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
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
          designation_id: formData.designation_id,
          short_designation: formData.short_designation || null,
          institution: formData.institution || null,
          languages: formData.languages || null,
          city: formData.city || null,
          gender: formData.gender || null
        })
      } else {
        // Create new therapist
        resultTherapist = await therapistsService.createTherapist({
          canton: formData.canton,
          form_of_address: formData.form_of_address,
          first_name: formData.first_name,
          last_name: formData.last_name,
          designation: formData.designation,
          designation_id: formData.designation_id,
          short_designation: formData.short_designation || undefined,
          institution: formData.institution || undefined,
          languages: formData.languages || undefined,
          city: formData.city || undefined,
          gender: formData.gender || undefined
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
          designation_id: null,
          short_designation: '',
          institution: '',
          languages: '',
          city: '',
          gender: ''
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="w-full h-full overflow-y-auto" style={{ backgroundColor: '#ecffef' }}>
        {/* Header */}
        <div className="px-4 md:px-6 pb-0" style={{ paddingTop: '35px' }}>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="absolute text-gray-500 hover:text-gray-700 transition-colors p-1 disabled:opacity-50"
            style={{ top: '35px', right: '25px' }}
          >
            <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="mb-10"></div>
          <h2 className="font-headline font-bold text-left" style={{ color: '#4785ff', fontSize: '20px' }}>
            {isEditMode ? 'Therapeut bearbeiten' : 'Neuen Therapeuten hinzufügen'}
          </h2>
        </div>

        {/* Form */}
        <div className="px-4 md:px-6 pb-20 md:pb-6">
          {/* CSV Import Section - Admin Only */}
          {permissions.isAdmin && !isEditMode && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowImportSection(!showImportSection)}
                className="px-4 py-2 rounded-md font-medium transition-colors text-sm flex items-center gap-2"
                style={{ backgroundColor: '#ff6b6b', color: 'white' }}
              >
                <span>CSV Import (Admin)</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showImportSection ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showImportSection && (
                <div className="space-y-3 mt-4">
                  <p className="text-sm" style={{ color: 'var(--primary)' }}>
                    Importieren Sie mehrere Therapeuten gleichzeitig aus einer CSV-Datei.
                  </p>

                  {/* Template Download */}
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>CSV-Vorlage herunterladen</span>
                  </button>

                  {/* File Upload */}
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVImport}
                      disabled={isImporting || isSubmitting}
                      className="w-full px-3 py-2 bg-white border rounded text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ borderColor: '#ebebeb' }}
                    />
                  </div>

                  {/* Import Status */}
                  {isImporting && (
                    <div className="bg-blue-500 bg-opacity-20 border border-blue-500 text-blue-700 px-4 py-3 rounded flex items-center">
                      <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Importiere Therapeuten...
                    </div>
                  )}

                  {/* Import Results */}
                  {importResult && (
                    <div className={`border px-4 py-3 rounded ${
                      importResult.success
                        ? 'bg-green-500 bg-opacity-20 border-green-500 text-green-700'
                        : 'bg-red-500 bg-opacity-20 border-red-500 text-red-700'
                    }`}>
                      <div className="font-semibold mb-2">
                        {importResult.success ? '✓ Import erfolgreich' : '✗ Import fehlgeschlagen'}
                      </div>
                      <div className="text-sm space-y-1">
                        <div>Importiert: {importResult.imported}</div>
                        <div>Duplikate übersprungen: {importResult.skipped}</div>
                        {importResult.errors.length > 0 && (
                          <div>
                            <div className="font-semibold mt-2">Fehler ({importResult.errors.length}):</div>
                            <ul className="list-disc list-inside max-h-32 overflow-y-auto">
                              {importResult.errors.slice(0, 5).map((err, idx) => (
                                <li key={idx}>
                                  Zeile {err.row}: {err.error}
                                </li>
                              ))}
                              {importResult.errors.length > 5 && (
                                <li>... und {importResult.errors.length - 5} weitere Fehler</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="text-xs" style={{ color: '#888' }}>
                    <p>Hinweis: Bei Duplikaten (gleicher Name + Kanton) wird der Eintrag mit mehr ausgefüllten Feldern behalten.</p>
                  </div>
                </div>
              )}
            </div>
          )}

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
                {SWISS_CANTONS.map((canton) => (
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
                {FORMS_OF_ADDRESS.map((address) => (
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
                maxLength={100}
              />
            </div>

            {/* Berufsbezeichnung */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                Berufsbezeichnung
              </label>
              <select
                value={formData.designation_id || ''}
                onChange={(e) => {
                  const designationId = e.target.value ? parseInt(e.target.value) : null
                  const selectedOption = filteredDesignations.find(opt => opt.id === designationId)

                  if (selectedOption) {
                    // Get the short form for auto-population
                    const lang = userProfile?.language_preference || 'de'
                    let shortForm = ''

                    if (lang === 'de') {
                      shortForm = selectedOption.designation.name_de_short_m || selectedOption.designation.name_de_short_w || ''
                    } else if (lang === 'fr') {
                      shortForm = selectedOption.designation.name_fr_short_m || selectedOption.designation.name_fr_short_w || ''
                    } else if (lang === 'it') {
                      shortForm = selectedOption.designation.name_it_short_m || selectedOption.designation.name_it_short_w || ''
                    }

                    setFormData(prev => ({
                      ...prev,
                      designation: selectedOption.displayText,
                      designation_id: designationId,
                      short_designation: shortForm
                    }))
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      designation: '',
                      designation_id: null,
                      short_designation: ''
                    }))
                  }

                  if (error) setError('')
                }}
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting || loadingDesignations}
                required
              >
                <option value="" className="bg-white">
                  {loadingDesignations ? 'Lade Bezeichnungen...' : 'Berufsbezeichnung auswählen'}
                </option>
                {filteredDesignations.map((option, index) => (
                  <option key={`${option.id}-${index}`} value={option.id} className="bg-white">
                    {option.displayText}
                  </option>
                ))}
              </select>
            </div>

            {/* Institution */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                Institution (Erfahrung mit Institution oder Institution in der dein Therapeut tätig war)
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

            {/* City */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                Stadt (optional)
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="z.B. Zürich, Bern"
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>

            {/* Languages */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                Sprachen (optional)
              </label>
              <input
                type="text"
                value={formData.languages}
                onChange={(e) => handleInputChange('languages', e.target.value)}
                placeholder="z.B. Deutsch, Englisch, Französisch"
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting}
                maxLength={200}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4">
              {/* Delete Button - Left Side (Admin Only, Edit Mode Only) */}
              {permissions.isAdmin && isEditMode && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSubmitting || isDeleting}
                  className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Löschen
                </button>
              )}

              {/* Right Side Buttons */}
              <div className={`flex gap-3 ${!permissions.isAdmin || !isEditMode ? 'ml-auto' : ''}`}>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting || isDeleting}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isDeleting}
                  className="px-3 py-1.5 text-sm text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#4785ff' }}
                >
                  {isSubmitting ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </div>
          </form>

          {/* Delete Confirmation Dialog */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
              <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-xl">
                <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  Therapeut löschen?
                </h3>
                <p className="mb-6 text-gray-700">
                  Sind Sie sicher, dass Sie <strong>{formData.first_name} {formData.last_name}</strong> löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:opacity-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? 'Löschen...' : 'Löschen'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default TherapistCreateModal
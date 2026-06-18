import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { createPortal } from 'react-dom'
import { TherapistsService } from '../../services/therapists.service'
import { DesignationsService } from '../../services/designations.service'
import { TherapistImportService, type ImportResult } from '../../services/therapist-import.service'
import { downloadTherapistCSVTemplate } from '../../utils/therapist-csv-template'
import { usePermissions } from '../../hooks/usePermissions'
import { useActiveLanguage } from '../../hooks/useActiveLanguage'
import { getDesignationLabel } from '../../utils/designationHelpers'
import { getTherapistEntryType, type TherapistEntryType } from '../../utils/therapistHelpers'
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
  const { t } = useTranslation('therapist')
  const isEditMode = !!therapist

  // person (default) | person_institution (works at a clinic etc.) | institution
  const [entryType, setEntryType] = useState<TherapistEntryType>('person')
  const [formData, setFormData] = useState({
    canton: preselectedCanton,
    form_of_address: '',
    first_name: '',
    last_name: '',
    designation_id: null as number | null,
    full_title: '',
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
  const lang = useActiveLanguage()
  const designationOptions = useMemo(
    () => designations.map(d => ({ id: d.id, label: getDesignationLabel(d, lang) })),
    [designations, lang]
  )

  // Initialize form data when therapist prop changes (edit mode)
  useEffect(() => {
    if (therapist) {
      setEntryType(getTherapistEntryType(therapist))
      setFormData({
        canton: therapist.canton || '',
        form_of_address: therapist.form_of_address || '',
        first_name: therapist.first_name || '',
        last_name: therapist.last_name || '',
        designation_id: therapist.designation_id || null,
        full_title: therapist.full_title || '',
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

  const handleEntryTypeChange = (type: TherapistEntryType) => {
    setEntryType(type)
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
      setError(error instanceof Error ? error.message : t('modal.import.failedFallback'))
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
      setError(error instanceof Error ? error.message : t('modal.errors.deleteFailed'))
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const validateForm = () => {
    if (!formData.canton) {
      setError(t('modal.errors.cantonRequired'))
      return false
    }
    if (entryType !== 'person' && !formData.institution.trim()) {
      setError(t('modal.errors.institutionRequired'))
      return false
    }
    if (entryType === 'institution') {
      // Art der Institution (full_title) is optional
      return true
    }
    if (!formData.first_name.trim()) {
      setError(t('modal.errors.firstNameRequired'))
      return false
    }
    if (!formData.last_name.trim()) {
      setError(t('modal.errors.lastNameRequired'))
      return false
    }
    if (!formData.designation_id) {
      setError(t('modal.errors.designationRequired'))
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

      // Normalize per entry type so fields hidden in the form never carry
      // stale values (relevant when an edit switches the type).
      const isInstitutionOnly = entryType === 'institution'
      const payload = {
        canton: formData.canton || null,
        form_of_address: isInstitutionOnly ? '' : formData.form_of_address,
        first_name: isInstitutionOnly ? '' : formData.first_name.trim(),
        last_name: isInstitutionOnly ? '' : formData.last_name.trim(),
        designation_id: isInstitutionOnly ? null : formData.designation_id,
        full_title: formData.full_title.trim() || null,
        institution: entryType === 'person' ? null : formData.institution.trim() || null,
        languages: formData.languages.trim() || null,
        city: formData.city.trim() || null,
        gender: isInstitutionOnly ? null : formData.gender || null
      }

      if (isEditMode && therapist) {
        resultTherapist = await therapistsService.updateTherapist(therapist.id, payload)
      } else {
        resultTherapist = await therapistsService.createTherapist(payload)
      }

      console.log(`✅ TherapistCreateModal: Therapist ${isEditMode ? 'updated' : 'created'} successfully:`, resultTherapist)
      onTherapistCreated(resultTherapist)
      onClose()

      // Reset form
      if (!isEditMode) {
        setEntryType('person')
        setFormData({
          canton: preselectedCanton,
          form_of_address: '',
          first_name: '',
          last_name: '',
          designation_id: null,
          full_title: '',
          institution: '',
          languages: '',
          city: '',
          gender: ''
        })
      }
    } catch (error) {
      console.error(`❌ TherapistCreateModal: Error ${isEditMode ? 'updating' : 'creating'} therapist:`, error)
      setError(error instanceof Error ? error.message : t('modal.errors.saveFailed'))
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
            {isEditMode ? t('modal.editTitle') : t('modal.createTitle')}
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
                <span>{t('modal.import.button')}</span>
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
                    {t('modal.import.intro')}
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
                    <span>{t('modal.import.downloadTemplate')}</span>
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
                      {t('modal.import.importing')}
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
                        {importResult.success ? t('modal.import.success') : t('modal.import.failed')}
                      </div>
                      <div className="text-sm space-y-1">
                        <div>{t('modal.import.imported', { count: importResult.imported })}</div>
                        <div>{t('modal.import.skipped', { count: importResult.skipped })}</div>
                        {importResult.needsReview > 0 && (
                          <div>{t('modal.import.needsReview', { count: importResult.needsReview })}</div>
                        )}
                        {importResult.errors.length > 0 && (
                          <div>
                            <div className="font-semibold mt-2">{t('modal.import.errorsTitle', { count: importResult.errors.length })}</div>
                            <ul className="list-disc list-inside max-h-32 overflow-y-auto">
                              {importResult.errors.slice(0, 5).map((err, idx) => (
                                <li key={idx}>
                                  {t('modal.import.errorRow', { row: err.row, error: err.error })}
                                </li>
                              ))}
                              {importResult.errors.length > 5 && (
                                <li>{t('modal.import.moreErrors', { count: importResult.errors.length - 5 })}</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="text-xs" style={{ color: '#888' }}>
                    <p>{t('modal.import.hint')}</p>
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
                {t('modal.canton')}
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

            {/* Eintragstyp: keine Auswahl = Einzelperson */}
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2 text-sm cursor-pointer" style={{ color: 'var(--primary)' }}>
                <input
                  type="checkbox"
                  checked={entryType === 'person_institution'}
                  onChange={(e) => handleEntryTypeChange(e.target.checked ? 'person_institution' : 'person')}
                  disabled={isSubmitting}
                  className="mt-0.5 accent-[#4785ff]"
                />
                <span>{t('modal.entryType.personInstitution')}</span>
              </label>
              <label className="flex items-start gap-2 text-sm cursor-pointer" style={{ color: 'var(--primary)' }}>
                <input
                  type="checkbox"
                  checked={entryType === 'institution'}
                  onChange={(e) => handleEntryTypeChange(e.target.checked ? 'institution' : 'person')}
                  disabled={isSubmitting}
                  className="mt-0.5 accent-[#4785ff]"
                />
                <span>{t('modal.entryType.institution')}</span>
              </label>
            </div>

            {/* Name der Institution (Typen 2 und 3) */}
            {entryType !== 'person' && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                  {t('modal.institutionName')}
                </label>
                <input
                  type="text"
                  value={formData.institution}
                  onChange={(e) => handleInputChange('institution', e.target.value)}
                  placeholder={t('modal.institutionNamePlaceholder')}
                  className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  style={{ borderColor: '#ebebeb' }}
                  disabled={isSubmitting}
                  maxLength={200}
                />
              </div>
            )}

            {entryType !== 'institution' && (
            <>
            {/* Anrede */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                {t('modal.formOfAddress')}
              </label>
              <select
                value={formData.form_of_address}
                onChange={(e) => handleInputChange('form_of_address', e.target.value)}
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting}
              >
                <option value="" className="bg-white">{t('modal.formOfAddressPlaceholder')}</option>
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
                {t('modal.firstName')}
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder={t('modal.firstNamePlaceholder')}
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>

            {/* Nachname */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                {t('modal.lastName')}
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder={t('modal.lastNamePlaceholder')}
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>

            {/* Berufsbezeichnung */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                {t('modal.designation')}
              </label>
              <select
                value={formData.designation_id ?? ''}
                onChange={(e) => {
                  const designationId = e.target.value ? parseInt(e.target.value) : null
                  setFormData(prev => ({ ...prev, designation_id: designationId }))
                  if (error) setError('')
                }}
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting || loadingDesignations}
                required
              >
                <option value="" className="bg-white">
                  {loadingDesignations ? t('modal.designationLoading') : t('modal.designationPlaceholder')}
                </option>
                {designationOptions.map(option => (
                  <option key={option.id} value={option.id} className="bg-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            </>
            )}

            {/* Offizielle Berufsbezeichnung (verbatim, local language). Für
                Institutionen die Art der Einrichtung. */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                {entryType === 'institution' ? t('modal.fullTitleInstitution') : t('modal.fullTitlePerson')}
              </label>
              <input
                type="text"
                value={formData.full_title}
                onChange={(e) => handleInputChange('full_title', e.target.value)}
                placeholder={entryType === 'institution'
                  ? t('modal.fullTitleInstitutionPlaceholder')
                  : t('modal.fullTitlePersonPlaceholder')}
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting}
                maxLength={255}
              />
            </div>

            {/* Geschlecht (feeds the m/f therapist filter) */}
            {entryType !== 'institution' && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                {t('modal.gender')}
              </label>
              <select
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting}
              >
                <option value="" className="bg-white">{t('modal.genderNone')}</option>
                <option value="f" className="bg-white">{t('modal.genderFemale')}</option>
                <option value="m" className="bg-white">{t('modal.genderMale')}</option>
              </select>
            </div>
            )}

            {/* City */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                {t('modal.city')}
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder={t('modal.cityPlaceholder')}
                className="w-full px-3 py-2 bg-white border rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ borderColor: '#ebebeb' }}
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>

            {/* Languages */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--primary)' }}>
                {t('modal.languages')}
              </label>
              <input
                type="text"
                value={formData.languages}
                onChange={(e) => handleInputChange('languages', e.target.value)}
                placeholder={t('modal.languagesPlaceholder')}
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
                  {t('common:actions.delete')}
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
                  {t('common:actions.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isDeleting}
                  className="px-3 py-1.5 text-sm text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#4785ff' }}
                >
                  {isSubmitting ? t('modal.submitting') : t('common:actions.save')}
                </button>
              </div>
            </div>
          </form>

          {/* Delete Confirmation Dialog */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
              <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-xl">
                <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  {entryType === 'institution' ? t('modal.deleteConfirm.titleInstitution') : t('modal.deleteConfirm.titlePerson')}
                </h3>
                <p className="mb-6 text-gray-700">
                  <Trans
                    t={t}
                    i18nKey="modal.deleteConfirm.body"
                    values={{ name: entryType === 'institution' ? formData.institution : `${formData.first_name} ${formData.last_name}`.trim() }}
                    components={{ strong: <strong /> }}
                  />
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:opacity-50"
                  >
                    {t('common:actions.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? t('modal.deleteConfirm.deleting') : t('common:actions.delete')}
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
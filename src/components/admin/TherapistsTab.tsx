import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Designation, TherapistWithDesignation } from '../../types/database.types'
import { TherapistsService } from '../../services/therapists.service'
import { DesignationsService } from '../../services/designations.service'
import { usePermissions } from '../../hooks/usePermissions'
import TherapistRow from './TherapistRow'
import TherapistCreateModal from '../therapist/TherapistCreateModal'

/**
 * Admin tab for managing therapists.
 * Lists all therapists with inline editing of every field and flags
 * unclassified entries (no designation_id) that still need attribution.
 */
const TherapistsTab: React.FC = () => {
  const { t } = useTranslation('admin')
  const [therapists, setTherapists] = useState<TherapistWithDesignation[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [onlyMissingDesignation, setOnlyMissingDesignation] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const permissions = usePermissions()
  const therapistsService = new TherapistsService()
  const designationsService = new DesignationsService()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [therapistsData, designationsData] = await Promise.all([
        therapistsService.getTherapists(true), // admin view includes deactivated entries
        designationsService.getActiveDesignations()
      ])
      setTherapists(therapistsData)
      setDesignations(designationsData)
    } catch (err) {
      console.error('Error loading therapists:', err)
      setError(t('therapists.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const missingCount = useMemo(
    () => therapists.filter((t) => !t.designation_id).length,
    [therapists]
  )

  const inactiveCount = useMemo(
    () => therapists.filter((t) => t.is_active === false).length,
    [therapists]
  )

  const filteredTherapists = useMemo(() => {
    const term = search.trim().toLowerCase()
    return therapists.filter((t) => {
      if (onlyMissingDesignation && t.designation_id) return false
      if (!term) return true
      return [t.first_name, t.last_name, t.institution, t.full_title, t.city, t.canton]
        .some((field) => field?.toLowerCase().includes(term))
    })
  }, [therapists, search, onlyMissingDesignation])

  const handleUpdated = (updated: TherapistWithDesignation) => {
    setTherapists((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }

  const handleDeleted = (id: number) => {
    setTherapists((prev) => prev.filter((t) => t.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
        <span className="ml-3 text-slate-500">{t('therapists.loading')}</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
        <button
          onClick={loadData}
          className="ml-4 text-sm underline hover:no-underline"
        >
          {t('therapists.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with search and missing-designation filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-[var(--type)]">{t('therapists.title')}</h2>
          <span className="rounded-full bg-[#eef3ff] px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)]">{therapists.length}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {missingCount > 0 && (
            <button
              onClick={() => setOnlyMissingDesignation((v) => !v)}
              aria-pressed={onlyMissingDesignation}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                onlyMissingDesignation
                  ? 'bg-amber-400 text-amber-950'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              }`}
              title={t('therapists.missingFilterTitle')}
            >
              {t('therapists.missingFilter', { count: missingCount })}
            </button>
          )}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('therapists.searchPlaceholder')}
            className="w-64 rounded-lg border border-[#e2ddd3] bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-[#eef3ff] px-3 py-1.5 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[#e0eaff]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
            </svg>
            {t('therapists.new')}
          </button>
        </div>
      </div>

      {/* Scrollable Table Container — inner wrapper sizes itself from the
          columns so header, rows and scroll range can never drift apart */}
      <div className="overflow-x-auto rounded-xl border border-[#efe9df]">
        <div className="w-max min-w-full">
          {/* Table Header */}
          <div className="border-b border-[#efe9df] bg-[#faf8f4]">
            <div className="flex items-center gap-2 px-2 py-3">
              <div className="w-28 shrink-0 text-xs font-semibold text-slate-500 uppercase text-left">{t('therapists.colFormOfAddress')}</div>
              <div className="w-32 shrink-0 text-xs font-semibold text-slate-500 uppercase text-left">{t('therapists.colFirstName')}</div>
              <div className="w-32 shrink-0 text-xs font-semibold text-slate-500 uppercase text-left">{t('therapists.colLastName')}</div>
              <div className="w-48 shrink-0 text-xs font-semibold text-slate-500 uppercase text-left">{t('therapists.colDesignation')}</div>
              <div className="min-w-0 grow basis-56 text-xs font-semibold text-slate-500 uppercase text-left">{t('therapists.colFullTitle')}</div>
              <div className="w-40 shrink-0 text-xs font-semibold text-slate-500 uppercase text-left">{t('therapists.colInstitution')}</div>
              <div className="w-28 shrink-0 text-xs font-semibold text-slate-500 uppercase text-left">{t('therapists.colCity')}</div>
              <div className="w-20 shrink-0 text-xs font-semibold text-slate-500 uppercase text-left">{t('therapists.colCanton')}</div>
              <div className="w-32 shrink-0 text-xs font-semibold text-slate-500 uppercase text-left">{t('therapists.colLanguages')}</div>
              <div className="w-24 shrink-0 text-xs font-semibold text-slate-500 uppercase text-left">{t('therapists.colGender')}</div>
              <div className="w-32 shrink-0 text-xs font-semibold text-slate-500 uppercase text-left">{t('therapists.colSpecialty')}</div>
              <div className="w-32 shrink-0 text-xs font-semibold text-slate-500 uppercase text-left">{t('therapists.colServices')}</div>
              <div className="w-24 shrink-0 text-xs font-semibold text-slate-500 uppercase text-left">{t('therapists.colStatus')}</div>
              <div className="w-48 shrink-0 text-xs font-semibold text-slate-500 uppercase flex justify-end">{t('therapists.colActions')}</div>
            </div>
          </div>

          {/* Therapists List */}
          <div className="bg-white">
            {filteredTherapists.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                {therapists.length === 0
                  ? t('therapists.emptyNone')
                  : t('therapists.emptyFiltered')}
              </div>
            ) : (
              filteredTherapists.map((therapist) => (
                <TherapistRow
                  key={therapist.id}
                  therapist={therapist}
                  designations={designations}
                  adminId={permissions.userProfile?.id ?? null}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="text-sm text-slate-500 text-right">
        {t('therapists.summary', { count: therapists.length, shown: filteredTherapists.length, total: therapists.length })}
        {' • '}
        <span className={missingCount > 0 ? 'font-semibold text-amber-700' : ''}>
          {t('therapists.summaryMissing', { count: missingCount })}
        </span>
        {' • '}
        {t('therapists.summaryInactive', { count: inactiveCount })}
      </div>

      {/* Reuses the directory's create modal (incl. CSV import) unchanged */}
      <TherapistCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTherapistCreated={() => loadData()}
      />
    </div>
  )
}

export default TherapistsTab

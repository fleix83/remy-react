import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useActiveLanguage } from '../../hooks/useActiveLanguage'
import { intlLocale } from '../../utils/dateFormat'
import { therapistClaimsService, type PendingClaim } from '../../services/therapist-claims.service'
import { TherapistsService } from '../../services/therapists.service'
import type { TherapistClaimCandidate, TherapistWithDesignation } from '../../types/database.types'
import UserAvatar from '../user/UserAvatar'
import UserName from '../user/UserName'
import { toast } from '../../stores/toast.store'

interface TherapistClaimsPanelProps {
  /** Bump to force a reload (e.g. from a realtime event). */
  refreshKey?: number
  onCountChange?: (count: number) => void
}

/** Candidate row shape shared by RPC candidates and free-text search hits. */
interface CandidateRow {
  id: number
  name: string
  institution: string | null
  location: string
  score: number | null
  linked: boolean
}

const cardClass = 'bg-white p-6 shadow-[0_2px_12px_rgba(20,66,32,0.05)] text-left'
const cardStyle: React.CSSProperties = { borderRadius: '20px' }

const toRow = (c: TherapistClaimCandidate): CandidateRow => ({
  id: c.therapist_id,
  name: [c.form_of_address, c.first_name, c.last_name].filter(Boolean).join(' '),
  institution: c.institution,
  location: [c.city, c.canton].filter(Boolean).join(' '),
  score: c.score,
  linked: !!c.user_id,
})

const searchToRow = (t: TherapistWithDesignation): CandidateRow => ({
  id: t.id,
  name: [t.form_of_address, t.first_name, t.last_name].filter(Boolean).join(' ').trim() || t.institution || `#${t.id}`,
  institution: t.first_name || t.last_name ? t.institution : null,
  location: [t.city, t.canton].filter(Boolean).join(' '),
  score: null,
  linked: !!t.user_id,
})

/**
 * Moderator view of pending therapist profile claims: pick a directory row
 * (suggested or searched) and link it, create a fresh row from the verified
 * HIN name, or reject with a note.
 */
const TherapistClaimsPanel: React.FC<TherapistClaimsPanelProps> = ({ refreshKey = 0, onCountChange }) => {
  const { t } = useTranslation('moderation')
  const lang = useActiveLanguage()
  const [claims, setClaims] = useState<PendingClaim[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await therapistClaimsService.getPendingClaims()
      setClaims(data)
    } catch (error) {
      console.error('Error loading therapist claims:', error)
      toast.error(t('claims.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  useEffect(() => {
    onCountChange?.(claims.length)
  }, [claims.length, onCountChange])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString(intlLocale(lang), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
      </div>
    )
  }

  if (claims.length === 0) {
    return (
      <div className="bg-[#fff9e2] p-8 text-center shadow-[0_2px_12px_rgba(20,66,32,0.05)]" style={cardStyle}>
        <div className="text-[#1f9d57] mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[var(--primary)] mb-2">{t('claims.emptyTitle')}</h3>
        <p className="text-[var(--primary)]">{t('claims.emptyBody')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {claims.map((claim) => (
        <ClaimCard
          key={claim.id}
          claim={claim}
          formatDate={formatDate}
          onResolved={() => setClaims((prev) => prev.filter((c) => c.id !== claim.id))}
        />
      ))}
    </div>
  )
}

interface ClaimCardProps {
  claim: PendingClaim
  formatDate: (d: string | null) => string
  onResolved: () => void
}

const ClaimCard: React.FC<ClaimCardProps> = ({ claim, formatDate, onResolved }) => {
  const { t } = useTranslation('moderation')
  const [candidates, setCandidates] = useState<CandidateRow[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<CandidateRow[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showReject, setShowReject] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [processing, setProcessing] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const therapistsService = useRef(new TherapistsService()).current

  const hinName = `${claim.hin_first_name} ${claim.hin_last_name}`.trim()
  const conflict =
    !!claim.therapists && !!claim.therapists.user_id && claim.therapists.user_id !== claim.user_id

  useEffect(() => {
    let cancelled = false
    therapistClaimsService
      .getCandidates(claim.id)
      .then((rows) => {
        if (cancelled) return
        const mapped = rows.map(toRow)
        setCandidates(mapped)
        // Preselect the single unclaimed exact match the server already found
        if (claim.therapist_id && !conflict) setSelectedId(claim.therapist_id)
      })
      .catch((error) => {
        console.error('Error loading claim candidates:', error)
        toast.error(t('claims.candidatesError'))
      })
      .finally(() => {
        if (!cancelled) setLoadingCandidates(false)
      })
    return () => {
      cancelled = true
    }
  }, [claim.id, claim.therapist_id, conflict, t])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    const term = searchTerm.trim()
    if (!term) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const rows = await therapistsService.searchTherapists(term)
        setSearchResults(rows.slice(0, 15).map(searchToRow))
      } catch (error) {
        console.error('Error searching therapists:', error)
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [searchTerm, therapistsService])

  const resolve = async (action: 'link' | 'create' | 'reject') => {
    setProcessing(true)
    try {
      await therapistClaimsService.resolveClaim(
        claim.id,
        action,
        action === 'link' ? selectedId : null,
        action === 'reject' ? rejectNote.trim() || null : null
      )
      toast.success(
        action === 'link'
          ? t('claims.toast.linked')
          : action === 'create'
            ? t('claims.toast.created')
            : t('claims.toast.rejected')
      )
      onResolved()
    } catch (error) {
      console.error('Error resolving claim:', error)
      toast.error(error instanceof Error && error.message ? error.message : t('claims.toast.error'))
    } finally {
      setProcessing(false)
    }
  }

  const candidateIds = new Set(candidates.map((c) => c.id))
  const extraResults = searchResults.filter((r) => !candidateIds.has(r.id))

  const renderRow = (row: CandidateRow) => (
    <label
      key={row.id}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer transition-colors ${
        selectedId === row.id ? 'bg-[#eef3ff]' : 'hover:bg-[#f6f9ff]'
      }`}
    >
      <input
        type="radio"
        name={`claim-${claim.id}-candidate`}
        checked={selectedId === row.id}
        onChange={() => setSelectedId(row.id)}
        disabled={processing}
        className="accent-[var(--primary)]"
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--type)] truncate">
          {row.name}
          {row.linked && (
            <span className="ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-800 align-middle">
              {t('claims.alreadyLinked')}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {[row.institution, row.location].filter(Boolean).join(' · ') || '—'}
        </div>
      </div>
      {row.score !== null && (
        <span className="text-xs font-semibold text-[var(--primary)] tabular-nums">
          {Math.round(row.score * 100)}%
        </span>
      )}
    </label>
  )

  return (
    <div className={cardClass} style={cardStyle}>
      {/* Claimant */}
      <div className="flex items-start gap-3 mb-4">
        {claim.users && <UserAvatar user={claim.users} size="small" className="flex-shrink-0" clickable />}
        <div className="flex-1 min-w-0">
          <UserName user={claim.users} as="p" className="font-medium text-[var(--type)] text-xs leading-none" />
          <p className="text-xs text-gray-500 leading-none mt-0.5" style={{ fontSize: '0.65rem' }}>
            {t('claims.requestedOn', { date: formatDate(claim.created_at) })}
          </p>
        </div>
      </div>

      {/* Verified identity */}
      <div className="mb-4 rounded-xl bg-[#f6f9ff] px-4 py-3 text-sm">
        <div className="font-semibold text-[var(--primary)]">
          {t('claims.hinName')}: <span className="text-[var(--type)]">{hinName}</span>
        </div>
        {claim.users?.default_canton && (
          <div className="text-xs text-gray-600 mt-1">
            {t('claims.claimantCanton')}: {claim.users.default_canton}
          </div>
        )}
      </div>

      {conflict && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('claims.conflictWarning')}
        </div>
      )}

      {/* Candidates */}
      <div className="mb-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{t('claims.candidates')}</div>
        {loadingCandidates ? (
          <div className="text-sm text-gray-400 px-3 py-2">{t('claims.loadingCandidates')}</div>
        ) : candidates.length === 0 ? (
          <div className="text-sm text-gray-400 px-3 py-2">{t('claims.noCandidates')}</div>
        ) : (
          <div className="space-y-1">{candidates.map(renderRow)}</div>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('claims.searchPlaceholder')}
          disabled={processing}
          className="w-full rounded-lg border border-[#e2ddd3] bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4785ff]/50"
        />
        {searchTerm.trim() && (
          <div className="mt-2 space-y-1">
            {searching ? (
              <div className="text-sm text-gray-400 px-3 py-2">{t('claims.searching')}</div>
            ) : extraResults.length === 0 ? (
              <div className="text-sm text-gray-400 px-3 py-2">{t('claims.noSearchResults')}</div>
            ) : (
              extraResults.map(renderRow)
            )}
          </div>
        )}
      </div>

      {/* Reject note */}
      {showReject && (
        <div className="mb-4">
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder={t('claims.rejectPlaceholder')}
            rows={3}
            disabled={processing}
            className="w-full rounded-lg border border-[#e2ddd3] bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4785ff]/50"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => resolve('link')}
          disabled={processing || selectedId === null}
          className="rounded-full bg-[var(--primary)] hover:bg-[#3b71e6] text-white px-4 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('claims.link')}
        </button>
        <button
          onClick={() => resolve('create')}
          disabled={processing}
          className="rounded-full bg-[#eef3ff] hover:bg-[#e0eaff] text-[var(--primary)] px-4 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {t('claims.createNew')}
        </button>
        {showReject ? (
          <>
            <button
              onClick={() => resolve('reject')}
              disabled={processing}
              className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              {t('claims.confirmReject')}
            </button>
            <button
              onClick={() => {
                setShowReject(false)
                setRejectNote('')
              }}
              disabled={processing}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t('common:actions.cancel')}
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowReject(true)}
            disabled={processing}
            className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            {t('claims.reject')}
          </button>
        )}
        {processing && <span className="ml-auto text-xs text-gray-400">{t('processing')}</span>}
      </div>
    </div>
  )
}

export default TherapistClaimsPanel

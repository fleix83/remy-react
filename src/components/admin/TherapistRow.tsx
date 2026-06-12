import React, { useState } from 'react'
import type { Designation, Therapist, TherapistWithDesignation } from '../../types/database.types'
import InlineEditCell from '../ui/InlineEditCell'
import { TherapistsService } from '../../services/therapists.service'
import { getDesignationLabel } from '../../utils/designationHelpers'
import { SWISS_CANTONS } from '../../constants/switzerland.constants'
import { FORMS_OF_ADDRESS } from '../../constants/therapist.constants'
import { toast } from '../../stores/toast.store'
import { confirmDialog } from '../../stores/confirm.store'

interface TherapistRowProps {
  therapist: TherapistWithDesignation
  designations: Designation[]
  adminId: string | null
  onUpdated: (updated: TherapistWithDesignation) => void
  onDeleted: (id: number) => void
}

const selectClass =
  'w-full rounded-lg border border-[#e2ddd3] bg-white px-2 py-1.5 text-sm text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50'

/**
 * One therapist with every field editable inline.
 * A therapist without designation_id is unclassified (shows verbatim full_title
 * in the directory) and is flagged amber until an admin assigns a designation.
 */
const TherapistRow: React.FC<TherapistRowProps> = ({ therapist, designations, adminId, onUpdated, onDeleted }) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const therapistsService = new TherapistsService()

  const missingDesignation = !therapist.designation_id
  // Rows from before migration 021 have no is_active value yet — treat as active
  const isActive = therapist.is_active !== false

  const handleUpdate = async (field: keyof Therapist, newValue: string | number | boolean | null): Promise<void> => {
    try {
      const updated = await therapistsService.updateTherapist(therapist.id, { [field]: newValue })
      onUpdated(updated)
    } catch (error) {
      console.error('Error updating therapist:', error)
      throw error
    }
  }

  // Empty string from an inline edit means "clear the field" for nullable columns
  const handleTextUpdate = (field: keyof Therapist) => (v: string) => handleUpdate(field, v.trim() || null)

  const handleDelete = async () => {
    if (!(await confirmDialog({ message: `Möchten Sie "${therapist.first_name} ${therapist.last_name}" wirklich löschen?`, confirmLabel: 'Löschen', danger: true }))) return
    setIsDeleting(true)
    try {
      await therapistsService.deleteTherapist(therapist.id)
      onDeleted(therapist.id)
    } catch (error) {
      console.error('Error deleting therapist:', error)
      toast.error('Fehler beim Löschen des Therapeuten')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleActive = async () => {
    setIsToggling(true)
    try {
      await handleUpdate('is_active', !isActive)
    } catch {
      toast.error('Fehler beim Ändern des Status (Migration 021 angewendet?)')
    } finally {
      setIsToggling(false)
    }
  }

  const handleDismissReview = async () => {
    if (!adminId) return
    setIsDismissing(true)
    try {
      await therapistsService.dismissReview(therapist.id, adminId)
      onUpdated({ ...therapist, needs_review: false, reviewed_by: adminId, reviewed_at: new Date().toISOString() })
    } catch (error) {
      console.error('Error dismissing review:', error)
      toast.error('Fehler beim Bestätigen der Prüfung')
    } finally {
      setIsDismissing(false)
    }
  }

  return (
    <div className="border-b border-[#f1ece3] last:border-b-0">
      <div className={`flex items-center gap-2 px-2 py-1 transition-colors hover:bg-[#faf8f4] ${!isActive ? 'bg-[#f7f5f1] opacity-60' : missingDesignation ? 'bg-[#fff9ec]' : ''}`}>
        {/* Anrede */}
        <div className="w-28 shrink-0">
          <select
            value={therapist.form_of_address || ''}
            onChange={(e) => handleUpdate('form_of_address', e.target.value)}
            className={selectClass}
          >
            <option value="">—</option>
            {FORMS_OF_ADDRESS.map((address) => (
              <option key={address} value={address}>{address}</option>
            ))}
          </select>
        </div>

        {/* Vorname */}
        <div className="w-32 shrink-0">
          <InlineEditCell
            value={therapist.first_name}
            onSave={(v) => handleUpdate('first_name', v)}
            placeholder="Vorname"
            displayClassName="text-left"
            required
          />
        </div>

        {/* Nachname */}
        <div className="w-32 shrink-0">
          <InlineEditCell
            value={therapist.last_name}
            onSave={(v) => handleUpdate('last_name', v)}
            placeholder="Nachname"
            displayClassName="text-left"
            required
          />
        </div>

        {/* Bezeichnung — amber when unclassified */}
        <div className="w-48 shrink-0">
          <select
            value={therapist.designation_id ?? ''}
            onChange={(e) => handleUpdate('designation_id', e.target.value ? parseInt(e.target.value) : null)}
            className={`${selectClass} ${missingDesignation ? 'border-amber-400 bg-amber-50 font-semibold text-amber-800' : ''}`}
            title={missingDesignation ? 'Keine Bezeichnung zugeordnet — bitte zuordnen' : undefined}
          >
            <option value="">⚠ Ohne Bezeichnung</option>
            {designations.map((d) => (
              <option key={d.id} value={d.id}>{getDesignationLabel(d)}</option>
            ))}
          </select>
        </div>

        {/* Voller Titel (verbatim) */}
        <div className="min-w-0 grow basis-56">
          <InlineEditCell
            value={therapist.full_title || ''}
            onSave={handleTextUpdate('full_title')}
            placeholder="Offizieller Titel"
            displayClassName="text-left"
          />
        </div>

        {/* Institution */}
        <div className="w-40 shrink-0">
          <InlineEditCell
            value={therapist.institution || ''}
            onSave={handleTextUpdate('institution')}
            placeholder="Institution"
            displayClassName="text-left"
          />
        </div>

        {/* Ort */}
        <div className="w-28 shrink-0">
          <InlineEditCell
            value={therapist.city || ''}
            onSave={handleTextUpdate('city')}
            placeholder="Ort"
            displayClassName="text-left"
          />
        </div>

        {/* Kanton */}
        <div className="w-20 shrink-0">
          <select
            value={therapist.canton || ''}
            onChange={(e) => handleUpdate('canton', e.target.value || null)}
            className={selectClass}
          >
            <option value="">—</option>
            {SWISS_CANTONS.filter((c) => c.code).map((canton) => (
              <option key={canton.code} value={canton.code}>{canton.code}</option>
            ))}
          </select>
        </div>

        {/* Sprachen */}
        <div className="w-32 shrink-0">
          <InlineEditCell
            value={therapist.languages || ''}
            onSave={handleTextUpdate('languages')}
            placeholder="Sprachen"
            displayClassName="text-left"
          />
        </div>

        {/* Geschlecht */}
        <div className="w-24 shrink-0">
          <select
            value={therapist.gender || ''}
            onChange={(e) => handleUpdate('gender', e.target.value || null)}
            className={selectClass}
          >
            <option value="">—</option>
            <option value="f">Weiblich</option>
            <option value="m">Männlich</option>
          </select>
        </div>

        {/* Fachgebiet */}
        <div className="w-32 shrink-0">
          <InlineEditCell
            value={therapist.specialty || ''}
            onSave={handleTextUpdate('specialty')}
            placeholder="Fachgebiet"
            displayClassName="text-left"
          />
        </div>

        {/* Angebote */}
        <div className="w-32 shrink-0">
          <InlineEditCell
            value={therapist.services || ''}
            onSave={handleTextUpdate('services')}
            placeholder="Angebote"
            displayClassName="text-left"
          />
        </div>

        {/* Status (Review-Queue / Inaktiv) */}
        <div className="flex w-24 shrink-0 flex-col items-start gap-1">
          {!isActive && (
            <span className="inline-flex rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-600">Inaktiv</span>
          )}
          {therapist.needs_review ? (
            <button
              onClick={handleDismissReview}
              disabled={isDismissing || !adminId}
              className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800 transition-colors hover:bg-orange-200 disabled:opacity-50"
              title="Als geprüft markieren"
            >
              {isDismissing ? '…' : 'Prüfung ✓'}
            </button>
          ) : (
            <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">Geprüft</span>
          )}
        </div>

        {/* Aktionen */}
        <div className="flex w-48 shrink-0 items-center justify-end gap-2">
          <button
            onClick={handleToggleActive}
            disabled={isToggling}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
              isActive
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
            title={isActive ? 'Im Verzeichnis ausblenden (bleibt erhalten)' : 'Wieder im Verzeichnis anzeigen'}
          >
            {isToggling ? '…' : isActive ? 'Deaktivieren' : 'Aktivieren'}
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            {isDeleting ? '…' : 'Löschen'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TherapistRow

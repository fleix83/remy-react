import React, { useEffect, useState } from 'react'
import { SiteContentService } from '../../services/site-content.service'
import { CmsSection, CmsSaveBar } from './CmsField'

const service = new SiteContentService()

const inputClass =
  'w-full rounded-lg border border-[#efe9df] bg-[#ffffff] px-3 py-2 text-left text-sm text-[var(--type)] ' +
  'focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]'

/**
 * Default rules shown by "Standardtext laden". Keep in sync with
 * DEFAULT_MODERATION_RULES in supabase/functions/moderate-post/index.ts —
 * that copy is the runtime fallback when the site_content row is missing.
 */
export const DEFAULT_MODERATION_RULES = `
- therapist_pii (severity: block): The content exposes private or identifying
  information about a named or identifiable real therapist or other private
  person beyond a plain name-in-context: phone numbers, e-mail or postal
  addresses, private schedules or locations, family details, or an
  accumulation of details that pinpoints them. Sharing a personal experience
  that merely names a therapist is allowed; doxxing is not.
- hate_violence (severity: block): Hate speech or discrimination against any
  person or group, or threats/incitement of violence.
- harassment (severity: flag): Personal attacks, bullying, or demeaning,
  targeted hostility toward another forum member or person.
- spam (severity: flag): Advertising, promotional or affiliate links, SEO
  spam, repeated low-effort content, commercial solicitation.
- off_topic (severity: warn): Content clearly unrelated to psychotherapy,
  mental health, or the purpose of this forum.
`

/**
 * Admin editor for the LLM moderation rules (site_content key 'moderation').
 * The moderate-post edge function reads value.rules on every invocation, so a
 * save takes effect for the very next post/comment — no redeploy needed.
 */
const ModerationRulesEditor: React.FC = () => {
  const [initial, setInitial] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    service.getRawValue('moderation').then((value) => {
      if (cancelled) return
      const rules = (value as { rules?: string } | null)?.rules
      const text = typeof rules === 'string' && rules.trim() ? rules : DEFAULT_MODERATION_RULES
      setInitial(text)
      setDraft(text)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (initial === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        <span className="ml-3 text-slate-500">Lade Inhalte…</span>
      </div>
    )
  }

  const dirty = draft !== initial

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await service.saveRawValue('moderation', { rules: draft })
      setInitial(draft)
      setSaved(true)
    } catch {
      setError('Speichern fehlgeschlagen')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5 pb-2">
      <CmsSection title="KI-Moderationsregeln">
        <p className="text-xs text-slate-500">
          Diese Regeln steuern die automatische Moderation neuer Beiträge und Kommentare.
          Eine Regel pro Punkt: <code>- kennung (severity: block|flag|warn): Beschreibung</code> —{' '}
          <strong>block</strong> lehnt ab, <strong>flag</strong> hält zur manuellen Prüfung zurück,{' '}
          <strong>warn</strong> wird nur vermerkt. Gespeicherte Änderungen gelten sofort für den
          nächsten Beitrag. Die öffentliche Community-Guidelines-Seite ist davon unabhängig —
          inhaltlich synchron halten lohnt sich, passiert aber nicht automatisch.
        </p>
        <textarea
          value={draft}
          rows={18}
          onChange={(e) => setDraft(e.target.value)}
          className={`${inputClass} resize-y font-mono text-xs leading-relaxed`}
        />
      </CmsSection>

      <CmsSaveBar
        dirty={dirty}
        isSaving={isSaving}
        saved={saved}
        error={error}
        onSave={handleSave}
        onDiscard={() => setDraft(initial)}
        onLoadDefaults={() => setDraft(DEFAULT_MODERATION_RULES)}
      />
    </div>
  )
}

export default ModerationRulesEditor

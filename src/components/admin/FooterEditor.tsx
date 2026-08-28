import React, { useState } from 'react'
import { useFooterContent, useContentEditor } from '../../hooks/useSiteContent'
import { DEFAULT_FOOTER_CONTENT, type FooterContent } from '../../types/landing-content.types'
import { CmsField, CmsSection, CmsSaveBar, CmsLanguageTabs } from './CmsField'

/** Admin editor for the landing page footer (links + credit, per language). */
const FooterEditor: React.FC = () => {
  const [lng, setLng] = useState('de')
  return (
    <div className="space-y-4">
      <CmsLanguageTabs value={lng} onChange={setLng} />
      {lng !== 'de' && (
        <p className="text-xs text-slate-500">
          Nicht übersetzte Felder zeigen auf der Seite automatisch den deutschen Text.
        </p>
      )}
      <FooterEditorBody key={lng} lng={lng} />
    </div>
  )
}

const FooterEditorBody: React.FC<{ lng: string }> = ({ lng }) => {
  const doc = useFooterContent(lng)
  const editor = useContentEditor<FooterContent>(doc, DEFAULT_FOOTER_CONTENT)
  const { draft, setDraft } = editor

  const set = (patch: Partial<FooterContent>) => setDraft((d) => ({ ...d, ...patch }))

  if (!editor.isFetched) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        <span className="ml-3 text-slate-500">Lade Inhalte…</span>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-2">
      <CmsSection title="Projektbeschrieb">
        <CmsField
          label="Kurzbeschreibung (erscheint im Footer jeder Seite)"
          value={draft.description}
          onChange={(v) => set({ description: v })}
          multiline
          rows={3}
        />
      </CmsSection>

      <CmsSection title="Links">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CmsField label="Forum – Beschriftung (nur mobiler Footer)" value={draft.forumLabel} onChange={(v) => set({ forumLabel: v })} />
          <CmsField label="Forum – Link (URL)" value={draft.forumHref} onChange={(v) => set({ forumHref: v })} />
          <CmsField label="Impressum – Beschriftung" value={draft.impressumLabel} onChange={(v) => set({ impressumLabel: v })} />
          <CmsField label="Impressum – Link (URL)" value={draft.impressumHref} onChange={(v) => set({ impressumHref: v })} />
          <CmsField label="Datenschutz – Beschriftung" value={draft.datenschutzLabel} onChange={(v) => set({ datenschutzLabel: v })} />
          <CmsField label="Datenschutz – Link (URL)" value={draft.datenschutzHref} onChange={(v) => set({ datenschutzHref: v })} />
          <CmsField label="Über Remy – Beschriftung" value={draft.aboutLabel} onChange={(v) => set({ aboutLabel: v })} />
          <CmsField label="Über Remy – Link (URL)" value={draft.aboutHref} onChange={(v) => set({ aboutHref: v })} />
        </div>
      </CmsSection>

      <CmsSection title="Credit">
        <CmsField label="Text davor" value={draft.madeByPrefix} onChange={(v) => set({ madeByPrefix: v })} />
        <CmsField label="Name" value={draft.madeByName} onChange={(v) => set({ madeByName: v })} />
      </CmsSection>

      <CmsSaveBar
        dirty={editor.dirty}
        isSaving={editor.isSaving}
        saved={editor.saved}
        error={editor.error}
        onSave={editor.handleSave}
        onDiscard={editor.handleDiscard}
        onLoadDefaults={editor.handleLoadDefaults}
      />
    </div>
  )
}

export default FooterEditor

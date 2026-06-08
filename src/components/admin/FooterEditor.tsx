import React from 'react'
import { useFooterContent, useContentEditor } from '../../hooks/useSiteContent'
import { DEFAULT_FOOTER_CONTENT, type FooterContent } from '../../types/landing-content.types'
import { CmsField, CmsSection, CmsSaveBar } from './CmsField'

/** Admin editor for the landing page footer (links + credit). */
const FooterEditor: React.FC = () => {
  const doc = useFooterContent()
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
      <CmsSection title="Links">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CmsField label="Impressum – Beschriftung" value={draft.impressumLabel} onChange={(v) => set({ impressumLabel: v })} />
          <CmsField label="Impressum – Link (URL)" value={draft.impressumHref} onChange={(v) => set({ impressumHref: v })} />
          <CmsField label="Datenschutz – Beschriftung" value={draft.datenschutzLabel} onChange={(v) => set({ datenschutzLabel: v })} />
          <CmsField label="Datenschutz – Link (URL)" value={draft.datenschutzHref} onChange={(v) => set({ datenschutzHref: v })} />
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

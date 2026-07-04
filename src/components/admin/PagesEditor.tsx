import React, { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DocumentsService } from '../../services/documents.service'
import type { Document, DocumentSection } from '../../types/database.types'
import { CmsField, CmsSection, CmsSaveBar } from './CmsField'

const documentsService = new DocumentsService()

/** The static pages editable here (slug → admin label). */
const PAGE_SLUGS: ReadonlyArray<readonly [string, string]> = [
  ['impressum', 'Impressum'],
  ['datenschutz', 'Datenschutz'],
  ['about', 'Über Remy'],
]

interface PageDraft {
  title: string
  lead_text: string
  sections: DocumentSection[]
}

const toDraft = (doc: Document): PageDraft => ({
  title: doc.title,
  lead_text: doc.lead_text ?? '',
  sections: doc.sections,
})

/** Admin editor for the public static pages (documents table, German only for now). */
const PagesEditor: React.FC = () => {
  const [slug, setSlug] = useState<string>(PAGE_SLUGS[0][0])
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-[#efe9df]">
        {PAGE_SLUGS.map(([s, label]) => (
          <button
            key={s}
            type="button"
            onClick={() => setSlug(s)}
            className={`-mb-px rounded-t px-3 py-1.5 text-sm transition-colors ${
              slug === s
                ? 'border border-b-0 border-[#efe9df] bg-white font-semibold text-[var(--primary)]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <PageEditorBody key={slug} slug={slug} />
    </div>
  )
}

const PageEditorBody: React.FC<{ slug: string }> = ({ slug }) => {
  const queryClient = useQueryClient()
  const { data: doc, isFetched } = useQuery({
    queryKey: ['document', slug],
    queryFn: () => documentsService.getDocumentBySlug(slug),
  })

  const [draft, setDraft] = useState<PageDraft | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (doc && !draft) setDraft(toDraft(doc))
  }, [doc, draft])

  if (!isFetched || (doc && !draft)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        <span className="ml-3 text-slate-500">Lade Inhalte…</span>
      </div>
    )
  }
  if (!doc || !draft) {
    return <p className="py-8 text-sm text-slate-500">Dokument «{slug}» nicht gefunden — wurde die Migration 032 angewendet?</p>
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(doc))

  const setSection = (index: number, patch: Partial<DocumentSection>) =>
    setDraft((d) => d && { ...d, sections: d.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)) })

  const addSection = () =>
    setDraft((d) => d && {
      ...d,
      sections: [...d.sections, { number: d.sections.length + 1, title: '', content: '', examples: [] }],
    })

  const removeSection = (index: number) =>
    setDraft((d) => d && {
      ...d,
      sections: d.sections.filter((_, i) => i !== index).map((s, i) => ({ ...s, number: i + 1 })),
    })

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await documentsService.updateDocument(doc.id, {
        title: draft.title,
        lead_text: draft.lead_text || null,
        sections: draft.sections,
      })
      queryClient.invalidateQueries({ queryKey: ['document', slug] })
      setSaved(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5 pb-2">
      <CmsSection title="Kopf">
        <CmsField label="Seitentitel" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
        <CmsField label="Einleitung (optional)" value={draft.lead_text} onChange={(v) => setDraft({ ...draft, lead_text: v })} multiline rows={3} />
      </CmsSection>

      {draft.sections.map((section, i) => (
        <CmsSection key={i} title={`Abschnitt ${i + 1}`}>
          <CmsField label="Überschrift" value={section.title} onChange={(v) => setSection(i, { title: v })} />
          <CmsField label="Text" value={section.content} onChange={(v) => setSection(i, { content: v })} multiline rows={5} />
          <button
            type="button"
            onClick={() => removeSection(i)}
            className="text-sm font-semibold text-red-500 transition-opacity hover:opacity-70"
          >
            Abschnitt entfernen
          </button>
        </CmsSection>
      ))}

      <button
        type="button"
        onClick={addSection}
        className="rounded-lg border border-dashed border-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[#eef3ff]"
      >
        + Abschnitt hinzufügen
      </button>

      <CmsSaveBar
        dirty={dirty}
        isSaving={isSaving}
        saved={saved}
        error={error}
        onSave={handleSave}
        onDiscard={() => setDraft(toDraft(doc))}
        onLoadDefaults={() => setDraft(toDraft(doc))}
      />
    </div>
  )
}

export default PagesEditor

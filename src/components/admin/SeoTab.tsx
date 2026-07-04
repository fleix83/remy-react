import React, { useEffect, useState } from 'react'
import { useSeoContent } from '../../hooks/useSeoContent'
import { useContentEditor, type ContentEditor } from '../../hooks/useSiteContent'
import {
  DEFAULT_SEO_CONTENT,
  resolvePageMeta,
  type PageMeta,
  type SeoContent,
  type SeoPageId,
} from '../../types/seo-content.types'
import { SITE_URL } from '../../constants/site'
import { CmsField, CmsSection, CmsSaveBar, CmsLanguageTabs } from './CmsField'

type SeoSection = 'meta' | 'social' | 'status'

const SECTION_LABELS: Record<SeoSection, string> = {
  meta: 'Meta-Texte',
  social: 'Social / OG',
  status: 'Status',
}

/** Page list with German admin labels and their public paths (for previews). */
const PAGES: ReadonlyArray<{ id: SeoPageId; label: string; path: string }> = [
  { id: 'landing', label: 'Startseite', path: '/' },
  { id: 'about', label: 'Über Remy', path: '/about' },
  { id: 'impressum', label: 'Impressum', path: '/impressum' },
  { id: 'datenschutz', label: 'Datenschutz', path: '/datenschutz' },
  { id: 'communityGuidelines', label: 'Community Guidelines', path: '/community-guidelines' },
]

/** Admin SEO tab: meta defaults per page × language, social defaults, status. */
const SeoTab: React.FC = () => {
  const [section, setSection] = useState<SeoSection>('meta')

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <nav className="flex flex-row gap-1 md:w-48 md:shrink-0 md:flex-col" aria-label="SEO-Bereiche">
        {(Object.keys(SECTION_LABELS) as SeoSection[]).map((key) => {
          const active = section === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              aria-current={active ? 'page' : undefined}
              className={`rounded-lg px-4 py-2 text-left text-sm font-semibold transition-colors ${
                active
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-slate-500 hover:bg-[#eef3ff] hover:text-[var(--primary)]'
              }`}
            >
              {SECTION_LABELS[key]}
            </button>
          )
        })}
      </nav>

      <div className="min-w-0 flex-1">
        {section === 'meta' && <SeoMetaEditor />}
        {section === 'social' && <SeoSocialEditor />}
        {section === 'status' && <SeoStatusPanel />}
      </div>
    </div>
  )
}

/** Approximate Google result preview (visual aid, not pixel-exact). */
const SnippetPreview: React.FC<{ title: string; description: string; path: string }> = ({
  title,
  description,
  path,
}) => (
  <div className="rounded-lg border border-[#efe9df] bg-white p-4 text-left">
    <p className="text-xs text-[#202124]">{SITE_URL.replace(/^https?:\/\//, '')}{path}</p>
    <p className="truncate text-lg leading-snug text-[#1a0dab]">{title}</p>
    <p className="line-clamp-2 text-sm text-[#4d5156]">{description}</p>
  </div>
)

const SeoEditorShell: React.FC<{ children: (props: {
  editor: ContentEditor<SeoContent>
}) => React.ReactNode; lng: string }> = ({ children, lng }) => {
  const doc = useSeoContent(lng)
  const editor = useContentEditor<SeoContent>(doc, DEFAULT_SEO_CONTENT)
  if (!editor.isFetched) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        <span className="ml-3 text-slate-500">Lade Inhalte…</span>
      </div>
    )
  }
  return <>{children({ editor })}</>
}

const SeoMetaEditor: React.FC = () => {
  const [lng, setLng] = useState('de')
  return (
    <div className="space-y-4">
      <CmsLanguageTabs value={lng} onChange={setLng} />
      {lng !== 'de' && (
        <p className="text-xs text-slate-500">
          Nicht übersetzte Felder zeigen auf der Seite automatisch den deutschen Text.
        </p>
      )}
      <SeoEditorShell key={lng} lng={lng}>
        {({ editor }) => {
          const { draft, setDraft } = editor
          const setPage = (id: SeoPageId, patch: Partial<PageMeta>) =>
            setDraft((d) => ({ ...d, pages: { ...d.pages, [id]: { ...d.pages[id], ...patch } } }))
          return (
            <div className="space-y-5 pb-2">
              {PAGES.map(({ id, label, path }) => (
                <CmsSection key={id} title={label}>
                  <CmsField
                    label="Titel (Browser-Tab & Google)"
                    value={draft.pages[id].title}
                    onChange={(v) => setPage(id, { title: v })}
                    hint={`${draft.pages[id].title.length} Zeichen — Richtwert: bis ~60`}
                  />
                  <CmsField
                    label="Beschreibung (Google-Snippet)"
                    value={draft.pages[id].description}
                    onChange={(v) => setPage(id, { description: v })}
                    multiline
                    rows={3}
                    hint={`${draft.pages[id].description.length} Zeichen — Richtwert: 120–160`}
                  />
                  <SnippetPreview
                    title={draft.pages[id].title}
                    description={draft.pages[id].description}
                    path={path}
                  />
                </CmsSection>
              ))}
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
        }}
      </SeoEditorShell>
    </div>
  )
}

const SeoSocialEditor: React.FC = () => (
  <SeoEditorShell lng="de">
    {({ editor }) => {
      const { draft, setDraft } = editor
      const setSocial = (patch: Partial<SeoContent['social']>) =>
        setDraft((d) => ({ ...d, social: { ...d.social, ...patch } }))
      const preview = resolvePageMeta(draft, 'landing', SITE_URL, '/')
      return (
        <div className="space-y-5 pb-2">
          <CmsSection title="Social-Media-Vorschau (Open Graph)">
            <CmsField label="Seitenname (og:site_name)" value={draft.social.siteName} onChange={(v) => setSocial({ siteName: v })} />
            <CmsField
              label="Standard-Vorschaubild (Pfad oder URL)"
              value={draft.social.defaultOgImage}
              onChange={(v) => setSocial({ defaultOgImage: v })}
              hint="Empfohlen: 1200×630px. Gilt für alle Seiten ohne eigenes Bild."
            />
            <img src={preview.ogImage} alt="OG-Vorschau" className="max-h-40 rounded-lg border border-[#efe9df]" />
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
    }}
  </SeoEditorShell>
)

const SeoStatusPanel: React.FC = () => {
  const [robots, setRobots] = useState<string>('lädt…')
  const [sitemap, setSitemap] = useState<string>('lädt…')

  useEffect(() => {
    fetch('/robots.txt')
      .then((r) => (r.ok ? r.text() : Promise.resolve('— nicht gefunden (404) —')))
      .then((t) => setRobots(t.slice(0, 500)))
      .catch(() => setRobots('— nicht erreichbar —'))
    fetch('/sitemap.xml')
      .then((r) => (r.ok ? r.text() : Promise.resolve('— nicht gefunden (404) —')))
      .then((t) => setSitemap(t.slice(0, 1500)))
      .catch(() => setSitemap('— nicht erreichbar —'))
  }, [])

  return (
    <div className="space-y-5 pb-2">
      <CmsSection title="Hinweis">
        <p className="text-sm text-slate-600">
          Titel und Beschreibungen werden clientseitig gesetzt: Google (führt JavaScript aus) sieht sie,
          die meisten KI-Crawler noch nicht. Vollständige Sichtbarkeit kommt mit dem Prerendering
          (siehe docs/PLAN-SEO-GEO.md, Phase 2).
        </p>
      </CmsSection>
      <CmsSection title="Kanonische Domain">
        <p className="text-sm text-slate-700">{SITE_URL}</p>
      </CmsSection>
      <CmsSection title="robots.txt (aktuelle Umgebung)">
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-slate-700">{robots}</pre>
      </CmsSection>
      <CmsSection title="sitemap.xml (aktuelle Umgebung)">
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-slate-700">{sitemap}</pre>
      </CmsSection>
    </div>
  )
}

export default SeoTab

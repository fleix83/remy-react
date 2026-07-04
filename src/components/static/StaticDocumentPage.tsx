import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DocumentsService } from '../../services/documents.service'
import SeoHead from '../seo/SeoHead'
import type { SeoPageId } from '../../types/seo-content.types'
import { useFooterContent } from '../../hooks/useSiteContent'

const documentsService = new DocumentsService()

interface StaticDocumentPageProps {
  /** documents.slug to load (anon-readable when published — RLS 013). */
  slug: string
  /** Which 'seo' CMS entry provides meta defaults for this page. */
  page: SeoPageId
}

/**
 * Public CMS-backed static page (Impressum, Datenschutz, About). Reachable
 * logged-out: routed before the auth catch-all in App.tsx. Content is edited
 * in the admin CMS "Seiten" section.
 */
const StaticDocumentPage: React.FC<StaticDocumentPageProps> = ({ slug, page }) => {
  const { data: doc, isFetched } = useQuery({
    queryKey: ['document', slug],
    queryFn: () => documentsService.getDocumentBySlug(slug),
    staleTime: 60 * 60 * 1000,
  })
  const { content: footer } = useFooterContent()
  const notFound = isFetched && !doc

  return (
    <div className="min-h-screen bg-[var(--bg-body)]">
      <SeoHead page={page} titleOverride={notFound ? 'Seite nicht gefunden' : doc?.title} noindex={notFound} />
      <header className="mx-auto w-full max-w-3xl px-6 pt-8 text-left">
        <Link to="/" className="text-sm font-semibold text-[var(--primary)] transition-opacity hover:opacity-70">
          ← Remy
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl px-6 py-10 text-left">
        {!isFetched ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : !doc ? (
          <>
            <h1 className="mb-4 text-3xl font-bold text-[var(--type)]">Seite nicht gefunden</h1>
            <p className="text-slate-500">
              Diese Seite existiert nicht (mehr). <Link to="/" className="text-[var(--primary)] underline">Zur Startseite</Link>
            </p>
          </>
        ) : (
          <article>
            <h1 className="mb-6 text-3xl font-bold text-[var(--type)]">{doc.title}</h1>
            {doc.lead_text && <p className="mb-8 text-lg leading-relaxed text-slate-600">{doc.lead_text}</p>}
            {doc.sections.map((section) => (
              <section key={section.number} className="mb-8">
                <h2 className="mb-3 text-xl font-bold text-[var(--type)]">{section.title}</h2>
                <p className="whitespace-pre-line leading-relaxed text-slate-700">{section.content}</p>
              </section>
            ))}
          </article>
        )}
      </main>
      <footer className="mx-auto w-full max-w-3xl border-t border-[#efe9df] px-6 py-8 text-left">
        <p className="mb-3 text-sm leading-relaxed text-slate-500">{footer.description}</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
          <a href={footer.aboutHref} className="transition-opacity hover:opacity-70">{footer.aboutLabel}</a>
          <a href={footer.impressumHref} className="transition-opacity hover:opacity-70">{footer.impressumLabel}</a>
          <a href={footer.datenschutzHref} className="transition-opacity hover:opacity-70">{footer.datenschutzLabel}</a>
          <a href="/community-guidelines" className="transition-opacity hover:opacity-70">Community Guidelines</a>
        </nav>
      </footer>
    </div>
  )
}

export default StaticDocumentPage

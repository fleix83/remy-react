import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import LandingPageEditor from './LandingPageEditor'
import FooterEditor from './FooterEditor'
import PagesEditor from './PagesEditor'
import ModerationRulesEditor from './ModerationRulesEditor'

type CmsSection = 'landing' | 'footer' | 'pages' | 'moderation'

const SECTION_KEYS: CmsSection[] = ['landing', 'footer', 'pages', 'moderation']

const SECTION_LABEL_KEY: Record<CmsSection, string> = {
  landing: 'cms.sectionLanding',
  footer: 'cms.sectionFooter',
  pages: 'cms.sectionPages',
  moderation: 'cms.sectionModeration',
}

/**
 * CMS tab shell: a vertical tab rail (left) selecting which content document to
 * edit (right). Built to accept more pages over time.
 */
const CmsTab: React.FC = () => {
  const { t } = useTranslation('admin')
  const [section, setSection] = useState<CmsSection>('landing')

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      {/* Vertical tab rail */}
      <nav className="flex flex-row gap-1 md:w-48 md:shrink-0 md:flex-col" aria-label={t('cms.railLabel')}>
        {SECTION_KEYS.map((key) => {
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
              {t(SECTION_LABEL_KEY[key])}
            </button>
          )
        })}
      </nav>

      {/* Editor pane */}
      <div className="min-w-0 flex-1">
        {section === 'landing' && <LandingPageEditor />}
        {section === 'footer' && <FooterEditor />}
        {section === 'pages' && <PagesEditor />}
        {section === 'moderation' && <ModerationRulesEditor />}
      </div>
    </div>
  )
}

export default CmsTab

import React, { useState } from 'react'
import LandingPageEditor from './LandingPageEditor'
import FooterEditor from './FooterEditor'

type CmsSection = 'landing' | 'footer'

const SECTIONS: { key: CmsSection; label: string }[] = [
  { key: 'landing', label: 'Landing Page' },
  { key: 'footer', label: 'Footer' },
]

/**
 * CMS tab shell: a vertical tab rail (left) selecting which content document to
 * edit (right). Built to accept more pages over time.
 */
const CmsTab: React.FC = () => {
  const [section, setSection] = useState<CmsSection>('landing')

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      {/* Vertical tab rail */}
      <nav className="flex flex-row gap-1 md:w-48 md:shrink-0 md:flex-col" aria-label="CMS-Bereiche">
        {SECTIONS.map(({ key, label }) => {
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
              {label}
            </button>
          )
        })}
      </nav>

      {/* Editor pane */}
      <div className="min-w-0 flex-1">
        {section === 'landing' && <LandingPageEditor />}
        {section === 'footer' && <FooterEditor />}
      </div>
    </div>
  )
}

export default CmsTab

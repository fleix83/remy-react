import React, { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Navigation from './Navigation'
import { useFooterContent } from '../../hooks/useSiteContent'

interface LayoutProps {
  children: React.ReactNode
  onCreatePost?: () => void
  showCreatePostButton?: boolean
  headerBg?: string
  background?: string
}

const Layout: React.FC<LayoutProps> = ({
  children,
  onCreatePost = () => {},
  showCreatePostButton = true,
  headerBg,
  background
}) => {
  const footerRef = useRef<HTMLElement>(null)
  const location = useLocation()
  const { content: footer } = useFooterContent()
  // Forum landing gets the desktop blue-header / white-page treatment;
  // the admin dashboard gets its own cream top-header treatment.
  const pageClass =
    location.pathname === '/' ? 'page-forum'
    : location.pathname === '/admin' ? 'page-admin'
    : ''

  // Push the fixed filter sidebars up as the footer scrolls into view,
  // so they never overlap it (consumed via --footer-push in App.css)
  useEffect(() => {
    const footer = footerRef.current
    if (!footer) return
    let raf = 0
    const update = () => {
      raf = 0
      const push = Math.max(0, window.innerHeight - footer.getBoundingClientRect().top)
      document.documentElement.style.setProperty('--footer-push', `${push}px`)
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (raf) cancelAnimationFrame(raf)
      document.documentElement.style.setProperty('--footer-push', '0px')
    }
  }, [])

  return (
    <div
      className={`min-h-screen relative layout-root flex flex-col ${pageClass}`}
      style={{
        background: background ?? 'rgb(239, 255, 241)',
        zIndex: 1
      }}
    >
      <Navigation
        onCreatePost={onCreatePost}
        showCreatePostButton={showCreatePostButton}
        headerBg={headerBg}
      />

      <main className="flex-1 relative min-h-screen" style={{ zIndex: 2 }}>
        {children}
      </main>
      
      {/* Footer */}
      <footer ref={footerRef} className="mt-auto flex h-[350px] flex-shrink-0 items-center bg-[#f1f1f1] px-6 md:px-0">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-8 text-center md:flex-row md:items-center md:justify-between md:gap-10 md:px-6 md:text-left lg:px-8">
          {/* Left: logo + credits on one line, aligned to the REMY baseline */}
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-end md:gap-12">
            <img
              src="/images/logo_claim.png"
              alt="Remy"
              width={437}
              height={169}
              loading="lazy"
              decoding="async"
              className="h-[65px] w-auto md:shrink-0"
              style={{ filter: 'grayscale(100%)' }}
            />
            <div
              className="flex flex-col items-start gap-y-2 text-left text-[17px] text-[#828282] md:pb-[5px]"
              style={{ fontFamily: '"Nunito Sans", sans-serif' }}
            >
              <a href={footer.aboutHref} className="transition-opacity hover:opacity-70">{footer.aboutLabel}</a>
              <a href={footer.impressumHref} className="transition-opacity hover:opacity-70">{footer.impressumLabel}</a>
              <a href={footer.datenschutzHref} className="transition-opacity hover:opacity-70">{footer.datenschutzLabel}</a>
              <span>{footer.madeByPrefix}<br />{footer.madeByName}</span>
            </div>
          </div>

          {/* Right: lead text (desktop only) */}
          <div
            className="hidden shrink-0 leading-[1.18] text-[#828282] md:block md:max-w-[300px]"
            style={{ fontFamily: '"Nunito", sans-serif', fontWeight: 700, letterSpacing: '0.06em', wordSpacing: '0.1em' }}
          >
            <p className="md:text-[34px]">Die Wahrheit ist selten rein und nie einfach.</p>
            <p className="md:text-[28px] md:text-right">Oscar Wilde</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
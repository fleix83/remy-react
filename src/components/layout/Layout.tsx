import React, { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Navigation from './Navigation'
import LandingFooter from './LandingFooter'

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
      
      {/* Footer — the landing footer, shared site-wide */}
      <LandingFooter ref={footerRef} className="mt-auto" />
    </div>
  )
}

export default Layout
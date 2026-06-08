import React from 'react'
import Navigation from './Navigation'

interface LayoutProps {
  children: React.ReactNode
  onCreatePost?: () => void
  showCreatePostButton?: boolean
  headerBg?: string
}

const Layout: React.FC<LayoutProps> = ({
  children,
  onCreatePost = () => {},
  showCreatePostButton = true,
  headerBg
}) => {
  return (
    <div
      className="min-h-screen relative layout-root"
      style={{
        background: 'rgb(239, 255, 241) url(/background.svg) no-repeat 0 0',
        zIndex: 1
      }}
    >
      <Navigation
        onCreatePost={onCreatePost}
        showCreatePostButton={showCreatePostButton}
        headerBg={headerBg}
      />

      <main className="flex-1 relative" style={{ zIndex: 2 }}>
        {children}
      </main>
      
      {/* Footer */}
      <footer className="mt-auto flex h-[350px] flex-shrink-0 items-center bg-[#f1f1f1] px-6 md:px-10">
        <div className="flex w-full flex-col items-center gap-8 text-center md:flex-row md:items-center md:justify-between md:text-left">
          {/* Left: logo + credits on one line, to the right of the logo */}
          <div className="flex flex-col items-center gap-6 md:flex-row md:gap-14">
            <img
              src="/images/logo_claim.png"
              alt="Remy"
              width={437}
              height={169}
              loading="lazy"
              decoding="async"
              className="h-[65px] w-auto"
              style={{ filter: 'grayscale(100%)' }}
            />
            <div
              className="flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-[17px] text-[#828282]"
              style={{ fontFamily: '"Nunito Sans", sans-serif' }}
            >
              <a href="/impressum" className="transition-opacity hover:opacity-70">Impressum</a>
              <a href="/datenschutz" className="transition-opacity hover:opacity-70">Datenschutz</a>
              <span>Made by Studio LUMINELLI</span>
            </div>
          </div>

          {/* Right: lead text (desktop only) */}
          <div
            className="hidden text-[42px] uppercase leading-[1.15] text-[#828282] md:block md:text-right"
            style={{ fontFamily: '"Nunito", sans-serif', fontWeight: 700, letterSpacing: '0.06em', wordSpacing: '0.2em' }}
          >
            REMY, DAS FORUM<br />FÜR MENSCHEN IN<br />PSYCHOTHERAPIE
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
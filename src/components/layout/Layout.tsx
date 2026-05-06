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
      <footer className="mt-auto" style={{
        height: '200px',
        backgroundColor: 'rgb(241, 241, 241)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        flexShrink: 0
      }}>
        {/* First line: Logo | Impressum | Datenschutz */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '500px' }}>
          <img src="/images/logo_claim.png" alt="Remy" width={437} height={169} loading="lazy" decoding="async" style={{ height: '36px', width: 'auto', filter: 'grayscale(100%)' }} />
          <a href="/impressum" style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '13px', fontWeight: 600, color: '#8a9ab5', letterSpacing: '0.03em', textDecoration: 'none' }}>Impressum</a>
          <a href="/datenschutz" style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '13px', fontWeight: 600, color: '#8a9ab5', letterSpacing: '0.03em', textDecoration: 'none' }}>Datenschutz</a>
        </div>
        {/* Second line: Made by */}
        <div style={{ fontFamily: '"Nunito Sans", sans-serif', fontSize: '11px', fontWeight: 500, color: '#8a9ab5', letterSpacing: '0.02em', textAlign: 'center', marginTop: '16px' }}>
          <div>Made by</div>
          <div>Studio LUMINELLI</div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
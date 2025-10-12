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
      className="min-h-screen relative"
      style={{
        background: '#f6fff7 url(/remyreact/background.svg) no-repeat 0 0',
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
      <footer className="border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* About */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Über Remy Forum
              </h3>
              <p className="text-gray-600 text-sm">
                Eine sichere Community für Psychotherapie-Patienten zum Austausch von Erfahrungen und gegenseitiger Unterstützung.
              </p>
            </div>
            
            {/* Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Hilfreiche Links
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-primary-600 transition-colors">📋 Community-Regeln</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">🔒 Datenschutz</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">📞 Krisenhilfe</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">❓ FAQ</a></li>
              </ul>
            </div>
            
            {/* Contact */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Kontakt & Support
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="mailto:support@remy-forum.ch" className="hover:text-primary-600 transition-colors">✉️ Support kontaktieren</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">🚨 Problem melden</a></li>
                <li><a href="#" className="hover:text-primary-600 transition-colors">💡 Feedback geben</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-8 pt-6">
            <p className="text-center text-sm text-gray-500">
              © 2024 Remy Forum. Alle Rechte vorbehalten. 
              <span className="mx-2">•</span>
              Behandle andere respektvoll und teile keine persönlichen Daten.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
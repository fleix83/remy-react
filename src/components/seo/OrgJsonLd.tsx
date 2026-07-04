import React from 'react'
import { SITE_URL } from '../../constants/site'
import { DEFAULT_FOOTER_CONTENT } from '../../types/landing-content.types'

/**
 * Sitewide entity anchor for search/AI engines: who Remy is, one canonical
 * Organization + WebSite. Static by design — sameAs links get added here once
 * real external profiles exist.
 */
const ORG_ID = `${SITE_URL}/#organization`

const data = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': ORG_ID,
      name: 'Remy',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/images/logo_claim.png`,
      description: DEFAULT_FOOTER_CONTENT.description,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Remy',
      url: `${SITE_URL}/`,
      inLanguage: 'de',
      publisher: { '@id': ORG_ID },
    },
  ],
}

const OrgJsonLd: React.FC = () => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
)

export default OrgJsonLd

import React from 'react'

/** Inline styling for the cursive "Remy" brand word, matching the landing page. */
export const REMY_SPAN_STYLE: React.CSSProperties = {
  fontFamily: '"Gaegu", cursive',
  fontSize: '30px',
  letterSpacing: '0.04em',
}

/**
 * Render a string, wrapping every occurrence of the word "Remy" in the cursive
 * brand span used across the landing page. Segments without "Remy" are returned
 * as plain fragments, so a paragraph with zero occurrences renders unchanged.
 */
export function renderWithRemy(text: string, keyPrefix = 'remy'): React.ReactNode[] {
  return text.split(/(Remy)/g).map((part, index) =>
    part === 'Remy' ? (
      <span key={`${keyPrefix}-${index}`} className="landing-remy-name" style={REMY_SPAN_STYLE}>
        Remy
      </span>
    ) : (
      <React.Fragment key={`${keyPrefix}-${index}`}>{part}</React.Fragment>
    )
  )
}

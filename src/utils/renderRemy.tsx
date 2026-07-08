import React from 'react'

/** Inline styling for the cursive "Remy" brand word, matching the landing page. */
export const REMY_SPAN_STYLE: React.CSSProperties = {
  fontFamily: '"Gaegu", "Gaegu Accents", cursive',
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

/**
 * Landing paragraph renderer: on top of the cursive-"Remy" treatment,
 * `==so markierter Text==` is wrapped in a `.landing-highlight` span (yellow
 * marker shade on the mobile landing; unstyled elsewhere). Unpaired `==`
 * markers are left as literal text.
 */
export function renderLandingText(text: string, keyPrefix = 'lp'): React.ReactNode[] {
  return text.split(/==(.+?)==/g).flatMap((part, index) =>
    index % 2 === 1 ? (
      <span key={`${keyPrefix}-hl-${index}`} className="landing-highlight">
        {renderWithRemy(part, `${keyPrefix}-hl-${index}`)}
      </span>
    ) : (
      renderWithRemy(part, `${keyPrefix}-${index}`)
    )
  )
}

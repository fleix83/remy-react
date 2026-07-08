import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import { renderLandingText, renderWithRemy } from './renderRemy'

// Inspect the returned React element objects directly (no DOM render needed).
function remySpanCount(nodes: ReturnType<typeof renderWithRemy>): number {
  return nodes.filter(
    (n) => (n as ReactElement)?.type === 'span' &&
      (n as ReactElement<{ className?: string }>).props.className === 'landing-remy-name'
  ).length
}

describe('renderWithRemy', () => {
  it('wraps a single "Remy" in the cursive brand span', () => {
    const nodes = renderWithRemy('Remy ist hier.')
    expect(remySpanCount(nodes)).toBe(1)
  })

  it('wraps every occurrence when "Remy" appears multiple times', () => {
    const nodes = renderWithRemy('Remy und nochmal Remy.')
    expect(remySpanCount(nodes)).toBe(2)
  })

  it('produces no brand span when "Remy" is absent', () => {
    const nodes = renderWithRemy('Über 400’000 Menschen in der Schweiz.')
    expect(remySpanCount(nodes)).toBe(0)
  })

  it('preserves surrounding text segments', () => {
    const nodes = renderWithRemy('vor Remy nach')
    const text = nodes
      .map((n) => {
        const el = n as ReactElement<{ children?: unknown }>
        return typeof el.props?.children === 'string' ? el.props.children : ''
      })
      .join('')
    expect(text).toContain('vor ')
    expect(text).toContain(' nach')
    expect(text).toContain('Remy')
  })
})

function highlightSpans(nodes: ReturnType<typeof renderLandingText>): ReactElement[] {
  return nodes.filter(
    (n) => (n as ReactElement)?.type === 'span' &&
      (n as ReactElement<{ className?: string }>).props.className === 'landing-highlight'
  ) as ReactElement[]
}

describe('renderLandingText', () => {
  it('wraps ==marked== text in a highlight span and strips the markers', () => {
    const nodes = renderLandingText('Davor. ==Der markierte Satz.== Danach.')
    expect(highlightSpans(nodes)).toHaveLength(1)
    expect(JSON.stringify(nodes)).not.toContain('==')
  })

  it('applies the Remy brand span inside a highlight', () => {
    const nodes = renderLandingText('==Remy ist der Ort.==')
    const [hl] = highlightSpans(nodes)
    const inner = (hl.props as { children: ReturnType<typeof renderWithRemy> }).children
    expect(remySpanCount(inner)).toBe(1)
  })

  it('leaves text without markers unchanged (only Remy treatment applies)', () => {
    const nodes = renderLandingText('Remy ist eine Patienteninitiative.')
    expect(highlightSpans(nodes)).toHaveLength(0)
    expect(remySpanCount(nodes)).toBe(1)
  })

  it('keeps an unpaired == literal', () => {
    const nodes = renderLandingText('Ein == allein.')
    expect(highlightSpans(nodes)).toHaveLength(0)
    expect(JSON.stringify(nodes)).toContain('==')
  })
})

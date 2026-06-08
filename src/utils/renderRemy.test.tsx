import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import { renderWithRemy } from './renderRemy'

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

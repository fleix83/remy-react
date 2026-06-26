import { describe, it, expect } from 'vitest'
import { isSelfProfile, shouldShowPostHistory } from './profileVisibility'

describe('isSelfProfile', () => {
  it('true when viewer matches target', () => {
    expect(isSelfProfile('a', 'a')).toBe(true)
  })
  it('false when different', () => {
    expect(isSelfProfile('a', 'b')).toBe(false)
  })
  it('false when no viewer', () => {
    expect(isSelfProfile('a', undefined)).toBe(false)
  })
})

describe('shouldShowPostHistory', () => {
  it('defaults to public when flag is null/undefined', () => {
    expect(shouldShowPostHistory({ id: 'a', post_history_public: null }, 'b')).toBe(true)
    expect(shouldShowPostHistory({ id: 'a' }, 'b')).toBe(true)
  })
  it('hidden for other viewers when private', () => {
    expect(shouldShowPostHistory({ id: 'a', post_history_public: false }, 'b')).toBe(false)
  })
  it('shown when public', () => {
    expect(shouldShowPostHistory({ id: 'a', post_history_public: true }, 'b')).toBe(true)
  })
  it('owner always sees their own history even when private', () => {
    expect(shouldShowPostHistory({ id: 'a', post_history_public: false }, 'a')).toBe(true)
  })
})

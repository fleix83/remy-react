/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'

// Mock heic2any to avoid Worker/Canvas issues in test environment
vi.mock('heic2any', () => ({
  default: vi.fn()
}))

import { fitWithin } from './image-processing'

describe('fitWithin', () => {
  it('downscales a landscape image to fit maxWidth', () => {
    expect(fitWithin(4000, 3000, 1920, 1920)).toEqual({ width: 1920, height: 1440 })
  })

  it('downscales a portrait image to fit maxHeight', () => {
    expect(fitWithin(3000, 4000, 1920, 1920)).toEqual({ width: 1440, height: 1920 })
  })

  it('downscales a square image', () => {
    expect(fitWithin(2048, 2048, 512, 512)).toEqual({ width: 512, height: 512 })
  })

  it('never upscales an image that already fits', () => {
    expect(fitWithin(400, 300, 512, 512)).toEqual({ width: 400, height: 300 })
  })

  it('returns exact dimensions when the image exactly fits', () => {
    expect(fitWithin(512, 512, 512, 512)).toEqual({ width: 512, height: 512 })
  })

  it('respects both bounds when they differ', () => {
    // 4000x1000 into 1920x512: width is the binding constraint (scale 0.48)
    expect(fitWithin(4000, 1000, 1920, 512)).toEqual({ width: 1920, height: 480 })
  })

  it('never returns dimensions below 1px for extreme aspect ratios', () => {
    expect(fitWithin(10000, 10, 512, 512)).toEqual({ width: 512, height: 1 })
  })
})

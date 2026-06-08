import { describe, it, expect } from 'vitest'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { contentReady } from './useSiteContent'

const KEY = ['site-content', 'landing'] as const
const STALE_TIME = 60 * 60 * 1000 // mirror the hook's 1h staleTime

/** Options equivalent to what the admin editor's `useContentDocument` passes. */
const editorObserverOptions = (queryFn: () => Promise<unknown>) => ({
  queryKey: KEY,
  queryFn,
  initialData: { source: 'defaults' },
  initialDataUpdatedAt: 0,
  staleTime: STALE_TIME,
})

describe('contentReady', () => {
  it('is false while only epoch-0 defaults are present and nothing has fetched', () => {
    expect(contentReady({ dataUpdatedAt: 0, isFetchedAfterMount: false })).toBe(false)
  })

  it('is true once real DB data exists, even without a post-mount refetch', () => {
    expect(contentReady({ dataUpdatedAt: 1, isFetchedAfterMount: false })).toBe(true)
  })

  it('is true once any fetch has settled after mount (e.g. cold-cache error path)', () => {
    expect(contentReady({ dataUpdatedAt: 0, isFetchedAfterMount: true })).toBe(true)
  })
})

describe('CMS editor readiness against a warm React Query cache', () => {
  // Reproduces the "stuck on first load" bug: the public landing page warms the
  // cache, then the admin editor mounts into fresh data, so no refetch fires.
  it('treats already-cached DB content as ready (the old isFetchedAfterMount signal hangs)', async () => {
    const queryClient = new QueryClient()

    // 1) Public landing page (AuthForm) fetches + caches the real content.
    await queryClient.fetchQuery({
      queryKey: KEY,
      queryFn: async () => ({ source: 'db' }),
      staleTime: STALE_TIME,
    })

    // 2) Admin editor mounts later. Cache is fresh → React Query does NOT refetch.
    const editorObserver = new QueryObserver(queryClient, editorObserverOptions(async () => ({ source: 'db' })))
    const unsubscribe = editorObserver.subscribe(() => {})
    const result = editorObserver.getCurrentResult()
    unsubscribe()

    // The old signal would hang the editor: no fetch happened after this mount.
    expect(result.isFetchedAfterMount).toBe(false)
    // But the real DB content is present (initialData was stamped at epoch 0).
    expect(result.data).toEqual({ source: 'db' })
    expect(result.dataUpdatedAt).toBeGreaterThan(0)

    // The fix releases the spinner because real content already exists.
    expect(contentReady(result)).toBe(true)

    queryClient.clear()
  })
})

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SiteContentService } from '../services/site-content.service'
import {
  DEFAULT_LANDING_CONTENT,
  DEFAULT_FOOTER_CONTENT,
  type LandingContent,
  type FooterContent,
} from '../types/landing-content.types'

const service = new SiteContentService()

export const siteContentKeys = {
  doc: (key: string) => ['site-content', key] as const,
}

/** Content rarely changes, so cache aggressively once fetched. */
const STALE_TIME = 60 * 60 * 1000 // 1 hour
const GC_TIME = 24 * 60 * 60 * 1000 // 1 day

export interface ContentDocument<T> {
  /** Always defined: the defaults (placeholder) until the DB row hydrates, then the merged result. */
  content: T
  /** True once real DB content is available (or a fetch has settled). Defaults are shown meanwhile. */
  isFetched: boolean
  save: (value: T) => Promise<void>
  isSaving: boolean
  saveError: Error | null
}

/**
 * Whether the editor may trust the content as real (DB) data rather than the
 * placeholder defaults.
 *
 * `initialData` is stamped at epoch 0, so `dataUpdatedAt > 0` means a real fetch
 * has populated the cache at SOME point — including one triggered earlier by the
 * public landing page (`AuthForm`). A mount-relative signal like
 * `isFetchedAfterMount` misses that: when the cache is already fresh, the editor's
 * mount triggers no refetch, the flag never flips, and the editor hangs on its
 * spinner. We also accept `isFetchedAfterMount` so a cold-cache fetch that settles
 * with an error still releases the spinner instead of hanging.
 */
export function contentReady(query: { dataUpdatedAt: number; isFetchedAfterMount: boolean }): boolean {
  return query.dataUpdatedAt > 0 || query.isFetchedAfterMount
}

function useContentDocument<T>(key: string, defaults: T): ContentDocument<T> {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: siteContentKeys.doc(key),
    queryFn: () => service.getContent<T>(key, defaults),
    // Render defaults instantly for the public landing page, but mark them as
    // fetched at epoch 0 so they count as stale and the DB overrides are still
    // fetched on mount. A long staleTime then avoids refetching afterwards.
    initialData: defaults,
    initialDataUpdatedAt: 0,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  })

  const mutation = useMutation({
    mutationFn: (value: T) => service.saveContent<T>(key, value),
    onSuccess: (_result, value) => {
      // Reflect the saved value immediately, then revalidate.
      queryClient.setQueryData(siteContentKeys.doc(key), value)
      queryClient.invalidateQueries({ queryKey: siteContentKeys.doc(key) })
    },
  })

  return {
    content: query.data ?? defaults,
    // Ready once real DB content exists in the cache (from this mount OR an
    // earlier one, e.g. the landing page) — not only after a post-mount refetch,
    // which never happens while the cache is still fresh and hangs the editor.
    isFetched: contentReady(query),
    save: mutation.mutateAsync,
    isSaving: mutation.isPending,
    saveError: (mutation.error as Error) ?? null,
  }
}

export function useLandingContent(): ContentDocument<LandingContent> {
  return useContentDocument<LandingContent>('landing', DEFAULT_LANDING_CONTENT)
}

export function useFooterContent(): ContentDocument<FooterContent> {
  return useContentDocument<FooterContent>('footer', DEFAULT_FOOTER_CONTENT)
}

export interface ContentEditor<T> {
  draft: T
  setDraft: (next: T | ((prev: T) => T)) => void
  dirty: boolean
  saved: boolean
  isSaving: boolean
  isFetched: boolean
  error: string | null
  handleSave: () => Promise<void>
  handleDiscard: () => void
  handleLoadDefaults: () => void
}

/**
 * Form-state wrapper around a content document for the admin editors:
 * populates the draft from the real DB content once it loads, tracks the dirty
 * state, and exposes save / discard / load-defaults actions.
 */
export function useContentEditor<T>(doc: ContentDocument<T>, defaults: T): ContentEditor<T> {
  const { content, isFetched, save, isSaving, saveError } = doc
  const [draft, setDraftState] = useState<T>(content)
  const [saved, setSaved] = useState(false)
  const initialized = useRef(false)

  // Populate the form from the actual DB content once it has settled, so the
  // admin never edits (and re-saves) stale defaults over existing overrides.
  useEffect(() => {
    if (isFetched && !initialized.current) {
      setDraftState(content)
      initialized.current = true
    }
  }, [isFetched, content])

  const setDraft = (next: T | ((prev: T) => T)) => {
    setDraftState((prev) => (typeof next === 'function' ? (next as (p: T) => T)(prev) : next))
    setSaved(false)
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(content)

  const handleSave = async () => {
    await save(draft)
    setSaved(true)
  }
  const handleDiscard = () => {
    setDraftState(content)
    setSaved(false)
  }
  const handleLoadDefaults = () => {
    setDraftState(defaults)
    setSaved(false)
  }

  return {
    draft,
    setDraft,
    dirty,
    saved,
    isSaving,
    isFetched,
    error: saveError?.message ?? null,
    handleSave,
    handleDiscard,
    handleLoadDefaults,
  }
}

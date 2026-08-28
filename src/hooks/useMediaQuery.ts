import { useSyncExternalStore } from 'react'

/**
 * Subscribes to a CSS media query. Used where a breakpoint has to change what
 * React renders (e.g. which asset an <iframe> loads) rather than just how CSS
 * paints it — prefer a media query in CSS whenever that is enough.
 *
 * SSR/first paint returns `false`; callers must render something sensible for
 * the "no match" case.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

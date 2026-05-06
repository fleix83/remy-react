# Performance Audit & Snappiness Checklist

Instructions for Claude Code to audit and improve perceived performance in Vue.js / React webapps backed by Supabase or MySQL. The goal is the "snappy" feel of apps like Linear, Notion, or Superhuman.

## How to use this document

Work through each section in order. Sections are ordered by impact (highest first). For each check:

1. Run the diagnostic against the current codebase
2. Report findings to the user with concrete file paths and line numbers
3. Propose the fix and wait for confirmation before editing
4. After implementing, verify the fix works as expected

If a section does not apply to this codebase, note why and skip it.

---

## 1. Optimistic UI Updates

**Goal:** UI reflects user actions instantly, before the server confirms.

**Check:**
- Search for all mutation calls (Supabase `.insert()`, `.update()`, `.delete()`, fetch POST/PUT/DELETE, MySQL writes via API).
- For each one, trace whether the UI waits for the response before updating, or updates immediately.
- Flag every mutation where the user sees a loading spinner or a delay greater than ~50ms after their action.

**Fix:**
- React: use TanStack Query with `onMutate` to update the cache optimistically. Roll back in `onError`. Invalidate or reconcile in `onSettled`.
- Vue: use VueQuery (`@tanstack/vue-query`) with the same pattern, or Pinia stores with manual rollback.
- Show an unobtrusive error toast on rollback rather than a blocking modal.

**Example pattern (TanStack Query):**

```js
useMutation({
  mutationFn: updateTask,
  onMutate: async (newTask) => {
    await queryClient.cancelQueries({ queryKey: ['tasks'] })
    const previous = queryClient.getQueryData(['tasks'])
    queryClient.setQueryData(['tasks'], (old) => [...old, newTask])
    return { previous }
  },
  onError: (err, newTask, context) => {
    queryClient.setQueryData(['tasks'], context.previous)
    toast.error('Could not save')
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
})
```

---

## 2. Instant Visual Feedback (under 16ms)

**Goal:** Every interactive element changes visually on the same frame as the user input.

**Check:**
- Open every button, link, draggable element, and toggle component. Verify each has an `:active` or pressed state defined in CSS.
- Look for `onClick` handlers on touch-relevant elements where `onPointerDown` would feel faster.
- Check that hover states exist for desktop and active states for touch.

**Fix:**
- Add CSS `:active` states with `transform: scale(0.97)` or similar, plus a `transition` of around 80ms.
- For elements where the visual response is critical, hook into `onPointerDown` for the visual change and `onClick` for the actual action.
- Use `cursor: pointer` consistently so the hover affordance is unambiguous.

---

## 3. Network Latency Audit

**Goal:** Backend round-trips should be under 100ms from the user's location.

**Check:**
- Identify the Supabase project region (Project Settings, General). Note the region.
- Identify the hosting region (Netlify, Vercel, Cloudflare).
- Open DevTools, Network tab, and record the Time-To-First-Byte for the slowest API calls during a typical interaction.
- Compare to the user's expected geography. For a Swiss user, anything outside `eu-central-1` (Frankfurt) or `eu-west-1` (Ireland) is suboptimal.

**Fix:**
- If Supabase is in a far region, propose migrating the project (this is a manual step, not a code change). Document it in a follow-up ticket.
- For MySQL: check that the database server, the API server, and the static frontend are all in the same region.
- Consider a CDN edge function layer for read-heavy endpoints.

---

## 4. Request Waterfalls

**Goal:** Independent data fetches happen in parallel, not sequentially.

**Check:**
- In every page/route component, list all data fetches that run on mount.
- For each chain of `await` calls, ask: does fetch B actually depend on the result of fetch A? If not, it is a waterfall.
- In DevTools Network tab, look for staircase patterns where requests start one after another rather than simultaneously.

**Fix:**
- Replace sequential `await` with `Promise.all([...])` for independent fetches.
- For Supabase, fold related data into one query using joins: `.select('*, projects(*), tasks(*)')`.
- For complex aggregations, write a Supabase RPC (Postgres function) that returns the full payload in one round trip.
- Prefetch route data on link hover (TanStack Router, Vue Router with prefetch).

---

## 5. Skeleton Screens vs Spinners

**Goal:** Loading states signal progress and structure, not just "wait".

**Check:**
- Find every spinner, "Loading..." text, or blank screen during data loads.
- Note which ones could be skeleton layouts that match the eventual content shape.

**Fix:**
- Replace spinners with skeleton components (gray boxes matching the layout, with a subtle shimmer animation).
- For data that has been loaded before, implement stale-while-revalidate: render cached content immediately, then refresh silently. TanStack Query does this by default if `staleTime` is set correctly.
- Persist the cache across reloads where it makes sense (TanStack Query persister with localStorage or IndexedDB).

---

## 6. Animation Performance

**Goal:** Animations run at 60fps without triggering layout or paint.

**Check:**
- Search the CSS and inline styles for transitions or animations on these properties: `width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding`. These are layout properties and cause jank.
- In Chrome DevTools, open the Performance tab and record an animation. Look for purple "Layout" or green "Paint" bars on every frame.

**Fix:**
- Animate `transform` (translate, scale, rotate) and `opacity` only.
- Replace `top: Xpx` animations with `transform: translateY(Xpx)`.
- Replace `width` reveals with `transform: scaleX(...)` plus `transform-origin: left`.
- Add `will-change: transform` sparingly to elements that animate frequently (do not overuse, it costs memory).

---

## 7. Drag and Drop Quality

**Goal:** Drag operations feel weightless, with no stutter and no layout thrash.

**Check:**
- If the app has DnD, identify the implementation. Custom code is a red flag unless it is very simple.
- During a drag, watch DevTools Performance: are pointer events causing layout recalculations?
- Test on a mid-range mobile device, not just a fast laptop.

**Fix:**
- React: migrate to `@dnd-kit/core`. It is the modern standard and outperforms `react-beautiful-dnd`.
- Vue: use `vue-draggable-plus` or `vuedraggable` (built on Sortable.js).
- Move the dragged element with `transform: translate(...)` only.
- Throttle pointer move handlers with `requestAnimationFrame`, never `setInterval` or unthrottled handlers.
- Pre-calculate drop zone bounding rects once on drag start. Recalculating on every pointer move is a common mistake.
- Reorder the local state immediately on drop. Persist to the backend in the background.

---

## 8. List Rendering & Component Re-renders

**Goal:** No wasted renders. Long lists are virtualized.

**Check:**
- Identify lists in the app. For any list rendering more than ~50 items at once, flag it for virtualization.
- React: install React DevTools Profiler. Record a typical interaction. Flag components that re-render without their props changing.
- Vue: use the Vue DevTools Performance tab.
- Look for inline object/array literals passed as props (`<Comp data={{...}} />`), which break memoization.

**Fix:**
- Virtualize long lists: TanStack Virtual, `react-virtuoso`, or `vue-virtual-scroller`.
- React: wrap pure components in `React.memo`. Stabilize callbacks with `useCallback` and objects with `useMemo`.
- Vue: most reactivity is automatic, but watch for deeply nested reactive objects and unnecessary `watch` handlers. Use `shallowRef` and `shallowReactive` where deep tracking is not needed.
- Move static data outside the component or into module scope.

---

## 9. Bundle Size & First Load

**Goal:** Initial JavaScript payload is small. Heavy code is lazy-loaded.

**Check:**
- Run a bundle analyzer:
  - Vite: `npx vite-bundle-visualizer`
  - Webpack: `webpack-bundle-analyzer`
- Note the total size of the initial JS chunk. Anything over ~200KB gzipped on the landing route is worth investigating.
- Identify large dependencies (charting libraries, rich text editors, date libraries, lodash) and check whether they are loaded on routes that do not need them.

**Fix:**
- Route-based code splitting: lazy-load every route component (`React.lazy`, Vue `defineAsyncComponent`).
- Lazy-load modals, dialogs, and admin-only screens.
- Replace heavy libraries with lighter ones where possible: `dayjs` instead of `moment`, native `Intl` instead of `date-fns` for simple cases, individual `lodash-es` imports instead of the full lodash bundle.
- Tree-shake icon libraries: import individual icons, not the whole set.

---

## 10. Image Performance

**Goal:** Images do not block rendering or push layout around.

**Check:**
- Audit image tags. Look for missing `width` and `height` attributes (causes layout shift).
- Look for unoptimized formats (PNG/JPG where WebP or AVIF would be smaller).
- Check that hero images are preloaded and below-fold images are lazy-loaded.

**Fix:**
- Add `width` and `height` attributes or CSS aspect ratios to every image.
- Use `loading="lazy"` for below-the-fold images.
- Convert to WebP or AVIF. For Supabase Storage, use the image transformation API.
- Use `<picture>` with multiple sources for responsive images.

---

## 11. Database Query Patterns (Supabase / MySQL)

**Goal:** Queries are indexed, return only needed columns, and scale.

**Check:**
- Find all Supabase `.select('*')` calls. Each one is a candidate for narrowing.
- For MySQL, run `EXPLAIN` on the slowest queries from the app's typical workflows.
- Check Supabase logs (Dashboard, Logs) for slow query warnings.
- Verify indexes exist on columns used in `.eq()`, `.order()`, and join conditions.

**Fix:**
- Replace `select('*')` with explicit column lists.
- Add indexes where `EXPLAIN` shows full table scans on frequent queries.
- For RLS-heavy Supabase tables, ensure the RLS policies themselves are indexed-friendly.
- Paginate any query that could return more than ~100 rows.

---

## Final Step: Measure Before and After

Before declaring victory, capture metrics:

1. Lighthouse scores (Performance, run in incognito)
2. Web Vitals: LCP, INP, CLS (use the `web-vitals` library or PageSpeed Insights)
3. Subjective test: tap through the main user flows on a mid-range phone over a throttled "Slow 4G" connection in DevTools

Report the deltas to the user.

## What this checklist does not cover

This audit gets a typical Supabase/MySQL CRUD app to feel professionally fast. It does not cover the architectural step beyond that, which is local-first sync (Linear's approach using a custom CRDT engine, or tools like Replicache, ElectricSQL, PowerSync, or RxDB). If the user wants the app to feel instant even when offline or on a flaky connection, that is a separate, larger conversation about replacing the data layer rather than tuning it.

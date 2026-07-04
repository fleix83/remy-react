/**
 * Key-order-insensitive equality: Postgres jsonb reorders object keys, so a
 * refetched document can differ from an identical draft only in key order.
 */
const sortKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeysDeep(v)])
    )
  }
  return value
}

export const draftsEqual = (a: unknown, b: unknown): boolean =>
  JSON.stringify(sortKeysDeep(a)) === JSON.stringify(sortKeysDeep(b))

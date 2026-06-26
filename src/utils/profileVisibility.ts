export function isSelfProfile(targetId: string, viewerId: string | undefined): boolean {
  return !!viewerId && viewerId === targetId
}

export function shouldShowPostHistory(
  target: { id: string; post_history_public?: boolean | null },
  viewerId: string | undefined,
): boolean {
  if (isSelfProfile(target.id, viewerId)) return true
  return target.post_history_public !== false // null/undefined => public
}

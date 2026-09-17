import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import BookmarksService from '../services/bookmarks.service'
import { useAuthStore } from '../stores/auth.store'
import { toast } from '../stores/toast.store'

export const bookmarksKeys = {
  all: ['bookmarks'] as const,
  ids: (userId: string) => [...bookmarksKeys.all, 'ids', userId] as const,
}

const EMPTY: number[] = []

// Ids of the current user's bookmarked posts — one small query shared by every
// bookmark button on screen, so the list renders without a request per card.
export function useBookmarkIds() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: bookmarksKeys.ids(user?.id ?? ''),
    queryFn: () => BookmarksService.getBookmarkedPostIds(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useIsBookmarked(postId: number): boolean {
  const { data } = useBookmarkIds()
  return (data ?? EMPTY).includes(postId)
}

// Optimistic toggle: the icon flips immediately, the cache is rolled back and
// a toast shown if the write fails.
export function useToggleBookmark() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { t } = useTranslation('forum')
  const key = bookmarksKeys.ids(user?.id ?? '')

  return useMutation({
    mutationFn: async ({ postId, bookmarked }: { postId: number; bookmarked: boolean }) => {
      if (!user) throw new Error('User not authenticated')
      if (bookmarked) {
        await BookmarksService.addBookmark(user.id, postId)
      } else {
        await BookmarksService.removeBookmark(user.id, postId)
      }
    },
    onMutate: async ({ postId, bookmarked }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<number[]>(key) ?? EMPTY
      const next = bookmarked
        ? previous.includes(postId) ? previous : [...previous, postId]
        : previous.filter((id) => id !== postId)
      queryClient.setQueryData<number[]>(key, next)
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context) queryClient.setQueryData(key, context.previous)
      toast.error(t('card.bookmarkError'))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}

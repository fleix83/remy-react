import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/auth.store'
import { useIsBookmarked, useToggleBookmark } from '../../hooks/useBookmarks'

interface BookmarkButtonProps {
  postId: number
  className?: string
  /** Icon size in px (default 16). */
  size?: number
  /** Called right after the optimistic flip, with the new state. */
  onToggle?: (bookmarked: boolean) => void
}

// Blue bookmark toggle: outline when not saved, filled when saved. Renders
// nothing for signed-out visitors. Stops click propagation so it can sit
// inside clickable cards.
const BookmarkButton: React.FC<BookmarkButtonProps> = ({ postId, className = '', size = 16, onToggle }) => {
  const { t } = useTranslation('forum')
  const user = useAuthStore((s) => s.user)
  const bookmarked = useIsBookmarked(postId)
  const { mutate } = useToggleBookmark()

  if (!user) return null

  const label = bookmarked ? t('card.unbookmark') : t('card.bookmark')

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const next = !bookmarked
    mutate({ postId, bookmarked: next })
    onToggle?.(next)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center justify-center p-1 hover:opacity-80 active:scale-95 transition-[opacity,transform] duration-100 ${className}`}
      style={{ color: '#4785ff' }}
      title={label}
      aria-label={label}
      aria-pressed={bookmarked}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={bookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M6 4.5A1.5 1.5 0 017.5 3h9A1.5 1.5 0 0118 4.5V21l-6-3.75L6 21V4.5z" />
      </svg>
    </button>
  )
}

export default BookmarkButton

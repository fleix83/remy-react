import React from 'react'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

// Windowed page list: 1 … (current-1) current (current+1) … last
const getPageItems = (current: number, total: number): (number | '…')[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages = new Set<number>([1, total])
  for (let p = current - 1; p <= current + 1; p++) {
    if (p >= 1 && p <= total) pages.add(p)
  }
  // Keep a stable window of 5 numbers near the edges
  if (current <= 3) [2, 3, 4].forEach(p => pages.add(p))
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach(p => pages.add(p))

  const sorted = [...pages].sort((a, b) => a - b)
  const items: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) items.push('…')
    items.push(p)
  })
  return items
}

const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange, className = '' }) => {
  if (totalPages <= 1) return null

  const items = getPageItems(page, totalPages)

  return (
    <nav
      className={`inline-flex items-center gap-1 rounded-full bg-white/80 p-1 shadow-sm ${className}`}
      aria-label="Seitennavigation"
    >
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--primary)] transition-colors hover:bg-[#eef3ff] disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="Vorherige Seite"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {items.map((item, i) =>
        item === '…' ? (
          <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-400 select-none">…</span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={`h-8 min-w-8 rounded-full px-2 text-sm font-medium transition-colors ${
              item === page
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--primary)] hover:bg-[#eef3ff]'
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--primary)] transition-colors hover:bg-[#eef3ff] disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="Nächste Seite"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  )
}

export default Pagination

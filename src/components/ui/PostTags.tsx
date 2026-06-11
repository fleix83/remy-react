import React from 'react'

// Per-breakpoint cap: 2 tags on mobile, 3 from sm, 4 from md, 6 from lg.
// Combined with flex-nowrap + overflow-hidden the row stays a single thin
// line and never collides with the Antworten/action elements.
const TAG_VISIBILITY = [
  'inline-flex',
  'inline-flex',
  'hidden sm:inline-flex',
  'hidden md:inline-flex',
  'hidden lg:inline-flex',
  'hidden lg:inline-flex',
]

interface PostTagsProps {
  tags?: string[] | null
  className?: string
}

// Read-only tag row: small black type on white chips, as if highlighted
// with a white marker on the tinted card backgrounds.
const PostTags: React.FC<PostTagsProps> = ({ tags, className = '' }) => {
  if (!Array.isArray(tags) || tags.length === 0) return null

  return (
    <div className={`flex flex-nowrap items-center gap-1.5 overflow-hidden ${className}`}>
      {tags.slice(0, TAG_VISIBILITY.length).map((tag, index) => (
        <span
          key={tag}
          className={`${TAG_VISIBILITY[index]} items-center whitespace-nowrap rounded-md bg-[#f5f5f5] px-2 py-0.5 font-medium text-black`}
          style={{ fontSize: '11px', lineHeight: '1.4' }}
        >
          {tag}
        </span>
      ))}
    </div>
  )
}

export default PostTags

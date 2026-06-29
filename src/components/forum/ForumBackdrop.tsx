import React from 'react'

/**
 * Decorative, non-interactive backdrop for the forum.
 *
 * A few large organic blobs in soft brand-blue tints, each filled with a radial
 * fade to transparent (the same "colour → nothing" move as the header gradient)
 * and lightly blurred. Fixed behind the content so it reads as a calm ambient
 * wash that enriches the white page without ever competing with the posts.
 *
 * Static (no motion) and pointer-events:none, so it has no interaction or
 * scroll cost beyond a single composited paint.
 */
const ForumBackdrop: React.FC = () => (
  <div
    aria-hidden="true"
    className="forum-backdrop pointer-events-none fixed inset-0 overflow-hidden"
    style={{ zIndex: 0 }}
  >
    <svg
      className="h-full w-full"
      viewBox="0 0 1440 1024"
      preserveAspectRatio="xMidYMid slice"
      style={{ filter: 'blur(24px)' }}
    >
      <defs>
        {/* Each blob fades from a soft tint at its core to fully transparent at
            the edge, so the organic shape dissolves into the page. */}
        <radialGradient id="forumBlobA" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6E96FF" stopOpacity="0.38" />
          <stop offset="65%" stopColor="#6E96FF" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#6E96FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="forumBlobB" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#A6B4FF" stopOpacity="0.32" />
          <stop offset="65%" stopColor="#A6B4FF" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#A6B4FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="forumBlobC" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#BFD2FF" stopOpacity="0.30" />
          <stop offset="65%" stopColor="#BFD2FF" stopOpacity="0.09" />
          <stop offset="100%" stopColor="#BFD2FF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Top-right */}
      <path
        fill="url(#forumBlobA)"
        transform="translate(1210 90) scale(4.4)"
        d="M44.5,-66.8C57.4,-58.9,67.3,-46.1,72.8,-31.6C78.3,-17.1,79.4,-0.9,75.6,13.7C71.8,28.3,63.1,41.3,51.5,51.9C39.9,62.5,25.4,70.7,9.4,74.6C-6.6,78.5,-24.1,78.1,-38.7,71C-53.3,63.9,-65,50.1,-71.4,34.3C-77.8,18.5,-78.9,0.7,-74.6,-15.3C-70.3,-31.3,-60.6,-45.5,-47.6,-53.7C-34.6,-61.9,-18.3,-64.1,-1.3,-62.3C15.7,-60.5,31.6,-74.7,44.5,-66.8Z"
      />
      {/* Left, mid-low */}
      <path
        fill="url(#forumBlobB)"
        transform="translate(60 620) scale(4.8)"
        d="M38.9,-62.4C50.8,-56.3,60.9,-46.1,67.8,-33.7C74.7,-21.3,78.4,-6.7,76.3,7C74.2,20.7,66.3,33.5,56.1,44.5C45.9,55.5,33.4,64.7,18.9,69.8C4.4,74.9,-12.1,75.9,-27.1,71C-42.1,66.1,-55.6,55.3,-64.2,41.6C-72.8,27.9,-76.5,11.3,-74.6,-4.4C-72.7,-20.1,-65.2,-34.9,-54.3,-46.2C-43.4,-57.5,-29.1,-65.3,-14.1,-67.9C0.9,-70.5,27,-68.5,38.9,-62.4Z"
      />
      {/* Bottom, right-of-centre */}
      <path
        fill="url(#forumBlobC)"
        transform="translate(960 1010) scale(5)"
        d="M41.7,-68.3C53.6,-61.4,62.4,-49.5,68.9,-36.3C75.4,-23.1,79.6,-8.6,77.6,5C75.6,18.6,67.4,31.3,57.4,42.4C47.4,53.5,35.6,63,21.9,68.7C8.2,74.4,-7.4,76.3,-22.1,72.5C-36.8,68.7,-50.6,59.2,-60.3,46.5C-70,33.8,-75.6,17.9,-75.9,1.6C-76.2,-14.7,-71.2,-31.4,-61.1,-43.9C-51,-56.4,-35.8,-64.7,-20.9,-70.7C-6,-76.7,8.6,-80.4,22.6,-77.4C36.6,-74.4,29.8,-75.2,41.7,-68.3Z"
      />
    </svg>
  </div>
)

export default ForumBackdrop

import DOMPurify from 'dompurify'

// Allowlist matches what the TipTap editor (StarterKit + Underline + Link) can
// produce. Anything else — scripts, event handlers, style, iframes, data: URIs —
// is stripped. User-authored post/comment HTML is untrusted and must pass through
// here before it reaches dangerouslySetInnerHTML.
const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'span',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'a',
]

const ALLOWED_ATTR = ['href', 'class']

// Force every surviving link to open safely: no reverse-tabnabbing, no referrer
// leak (the anonymity promise), and only http(s)/mailto targets.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer nofollow')
  }
})

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|\/)/i,
    FORBID_ATTR: ['style'],
  })
}

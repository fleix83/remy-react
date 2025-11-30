/**
 * Text utility functions for the Remy React Forum
 * Handles HTML content processing and title generation
 */

/**
 * Extracts the first two lines from HTML content and generates a display title
 * Handles HTML tag stripping, entity decoding, and intelligent truncation
 *
 * @param htmlContent - The HTML content to extract from
 * @param maxLength - Maximum length of the generated title (default: 100)
 * @returns Generated title string
 */
export const generateTitleFromContent = (
  htmlContent: string,
  maxLength: number = 100
): string => {
  if (!htmlContent || htmlContent.trim() === '') {
    return 'Kein Inhalt'
  }

  // Strip HTML tags, preserving line breaks
  const plainText = htmlContent
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()

  if (!plainText || plainText.length === 0) {
    return 'Kein Inhalt'
  }

  // Get first 2 non-empty lines
  const lines = plainText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  if (lines.length === 0) {
    return 'Kein Inhalt'
  }

  const firstTwoLines = lines.slice(0, 2).join(' ')

  // Truncate at word boundary if needed
  if (firstTwoLines.length <= maxLength) {
    return firstTwoLines
  }

  const truncated = firstTwoLines.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')

  // If we can find a word boundary in the last 20% of the truncated text, use it
  if (lastSpaceIndex > maxLength * 0.8) {
    return truncated.substring(0, lastSpaceIndex) + '...'
  }

  // Otherwise, hard truncate
  return truncated + '...'
}

/**
 * Get display title for a post
 * Uses actual title if available, otherwise generates from content for Rant posts
 *
 * @param title - The post's title (may be null/undefined)
 * @param content - The post's HTML content
 * @param categoryId - The post's category ID
 * @returns Display title string
 */
export const getPostDisplayTitle = (
  title: string | null | undefined,
  content: string,
  categoryId: number
): string => {
  // If post has a title, use it
  if (title && title.trim() !== '') {
    return title.trim()
  }

  // For Rant category (4), generate from content
  if (categoryId === 4) {
    return generateTitleFromContent(content)
  }

  // Fallback for other categories
  return 'Kein Titel'
}

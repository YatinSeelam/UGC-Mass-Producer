/**
 * Shared text wrapping utility for consistent caption rendering
 * Used by both frontend preview and backend FFmpeg rendering
 */

/**
 * Wraps text to fit within a maximum line length
 * @param text - The text to wrap
 * @param maxCharsPerLine - Maximum characters per line
 * @returns Wrapped text with newline characters
 */
export function wrapText(text: string, maxCharsPerLine: number = 35): string {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (testLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)

  return lines.join('\n')
}

/**
 * Escapes text for FFmpeg drawtext filter
 * @param text - The text to escape
 * @returns Escaped text safe for FFmpeg
 */
export function escapeDrawtextText(text: string): string {
  return (text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/%/g, '\\%')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

/**
 * Calculates characters per line based on width percentage
 * @param widthPercent - Width as a percentage (0-1)
 * @param baselineChars - Baseline characters at 80% width (default: 35)
 * @returns Characters per line
 */
export function calculateCharsPerLine(widthPercent: number, baselineChars: number = 35): number {
  return Math.round(baselineChars * widthPercent / 0.8) || 25
}

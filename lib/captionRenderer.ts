/**
 * Server-side caption rendering with emoji support
 * Uses Puppeteer (headless Chrome) to render captions exactly like the frontend preview
 */

import 'server-only'
import puppeteer from 'puppeteer'
import { wrapText } from './textUtils'
import fs from 'fs'
import path from 'path'

// Reuse browser instance across renders for performance
let browserInstance: any = null

async function getBrowser() {
  if (!browserInstance) {
    console.log('🚀 Launching headless browser for caption rendering...')
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    console.log('✓ Browser launched')
  }
  return browserInstance
}

interface CaptionStyle {
  textColor: string
  backgroundColor: string
  backgroundOpacity: number
  fontSize: number
  xPercent: number
  yPercent: number
  widthPercent: number
  paddingPx: number
}

interface RenderCaptionOptions {
  caption: string
  captionStyle: CaptionStyle
  videoWidth: number
  videoHeight: number
  outputPath: string
}

/**
 * Converts hex color to RGB object
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 }
}

/**
 * Renders a caption to a PNG image with transparent background (except for caption box)
 * This allows FFmpeg to composite it over video while preserving emojis
 * Uses Puppeteer to render exactly like the frontend canvas preview
 */
export async function renderCaptionToPNG({
  caption,
  captionStyle,
  videoWidth,
  videoHeight,
  outputPath,
}: RenderCaptionOptions): Promise<void> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    // Set viewport to match video dimensions
    await page.setViewport({ width: videoWidth, height: videoHeight })

    if (!caption) {
      // If no caption, create a transparent PNG
      await page.setContent('<html><body style="margin:0;padding:0;background:transparent;"></body></html>')
      await page.screenshot({ path: outputPath, omitBackground: true })
      await page.close()
      return
    }

    // Calculate text dimensions (same logic as VideoCanvasPreview)
    const charsPerLine = Math.round(35 * captionStyle.widthPercent / 0.8) || 25
    const wrappedText = wrapText(caption, charsPerLine)
    const fontSize = Math.max(24, Math.floor((captionStyle.fontSize || 16) * 1.5))
    const lineSpacing = Math.max(12, Math.floor(fontSize * 0.5))
    const padding = captionStyle.paddingPx || 20

    // RGB conversion for background
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : { r: 0, g: 0, b: 0 }
    }

    const rgb = hexToRgb(captionStyle.backgroundColor || '#000000')
    const bgOpacity = captionStyle.backgroundOpacity ?? 0.7

    // Create HTML with canvas that renders the caption
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; }
          body { background: transparent; }
        </style>
      </head>
      <body>
        <canvas id="canvas" width="${videoWidth}" height="${videoHeight}"></canvas>
        <script>
          const canvas = document.getElementById('canvas');
          const ctx = canvas.getContext('2d');

          // Clear canvas (transparent)
          ctx.clearRect(0, 0, ${videoWidth}, ${videoHeight});

          const caption = ${JSON.stringify(caption)};
          const charsPerLine = ${charsPerLine};
          const fontSize = ${fontSize};
          const lineSpacing = ${lineSpacing};
          const padding = ${padding};

          // Wrap text (simple word-based wrapping)
          function wrapText(text, maxCharsPerLine) {
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';

            for (const word of words) {
              const testLine = currentLine ? currentLine + ' ' + word : word;
              if (testLine.length > maxCharsPerLine && currentLine) {
                lines.push(currentLine);
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            }
            if (currentLine) lines.push(currentLine);

            return lines;
          }

          const lines = wrapText(caption, charsPerLine);

          // Set font
          ctx.font = '500 ' + fontSize + 'px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Measure text
          const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
          const textWidth = maxLineWidth;
          const textHeight = lines.length * fontSize + (lines.length - 1) * lineSpacing;

          // Calculate position
          const centerX = ${videoWidth} * ${captionStyle.xPercent};
          const centerY = ${videoHeight} * ${captionStyle.yPercent};

          const boxWidth = textWidth + padding * 2;
          const boxHeight = textHeight + padding * 2;
          const boxX = centerX - boxWidth / 2;
          const boxY = centerY - boxHeight / 2;

          // Draw background box
          ctx.fillStyle = 'rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${bgOpacity})';
          ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

          // Draw text
          ctx.fillStyle = '${captionStyle.textColor || '#ffffff'}';
          const startY = centerY - (textHeight / 2) + (fontSize / 2);

          lines.forEach((line, i) => {
            const lineY = startY + i * (fontSize + lineSpacing);
            ctx.fillText(line, centerX, lineY);
          });
        </script>
      </body>
      </html>
    `

    await page.setContent(html)

    // Wait for canvas to render
    await page.waitForSelector('#canvas')
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)))

    // Screenshot the canvas element only
    const canvas = await page.$('#canvas')
    if (canvas) {
      await canvas.screenshot({ path: outputPath, omitBackground: true })
      console.log('✓ Caption PNG rendered with emojis:', outputPath)
    }

    await page.close()
  } catch (error) {
    console.error('Error rendering caption:', error)
    await page.close()
    throw error
  }
}

/**
 * Generates a sequence of caption PNG images for a video segment
 * Each frame gets the same caption overlay
 */
export async function generateCaptionFrames({
  caption,
  captionStyle,
  videoWidth,
  videoHeight,
  fps,
  durationSeconds,
  outputDir,
}: {
  caption: string
  captionStyle: CaptionStyle
  videoWidth: number
  videoHeight: number
  fps: number
  durationSeconds: number
  outputDir: string
}): Promise<string[]> {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  // For simplicity, we'll just create one PNG and reuse it
  // This is much more efficient than generating thousands of identical frames
  const captionImagePath = path.join(outputDir, 'caption_overlay.png')

  await renderCaptionToPNG({
    caption,
    captionStyle,
    videoWidth,
    videoHeight,
    outputPath: captionImagePath,
  })

  return [captionImagePath]
}

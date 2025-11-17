import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, mkdir, readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { tmpdir } from 'os'
import { spawn } from 'child_process'
import { renderCaptionToPNG } from '@/lib/captionRenderer'
import { execSync } from 'child_process'

// Ensure temp directory exists
const TEMP_DIR = join(tmpdir(), 'ugc-render')

// Cross-platform font file detection (prioritize fonts with best Unicode/emoji support)
const getFontFile = () => {
  const possibleFonts = [
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf', // macOS - BEST for emoji (monochrome)
    '/System/Library/Fonts/SFNSText.ttf', // macOS SF - has better Unicode support
    '/System/Library/Fonts/Helvetica.ttc', // macOS
    '/System/Library/Fonts/Supplemental/Arial.ttf', // macOS fallback
    'C:\\Windows\\Fonts\\seguisym.ttf', // Windows symbol font with emoji
    'C:\\Windows\\Fonts\\segoeui.ttf', // Windows with emoji support
    'C:\\Windows\\Fonts\\arialuni.ttf', // Windows Arial Unicode
    'C:\\Windows\\Fonts\\arial.ttf', // Windows fallback
    '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf', // Linux with good Unicode
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', // Linux
    '/usr/share/fonts/TTF/DejaVuSans.ttf', // Linux alternate
  ]

  for (const font of possibleFonts) {
    if (existsSync(font)) {
      console.log(`✓ Using font: ${font}`)
      return font
    }
  }

  // Fallback to system default (FFmpeg will use default font)
  console.warn('⚠️  No font file found, using default')
  return '/System/Library/Fonts/Helvetica.ttc'
}

const FONT_FILE = getFontFile()

type RGBA = { r: number; g: number; b: number; a: number }

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const escapeDrawtextText = (text: string) => {
  // Keep emojis as-is (they're Unicode), just escape special FFmpeg characters
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

const rgbaToHex = ({ r, g, b }: RGBA) =>
  `${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`

// Helper to get video dimensions using ffprobe
const getVideoDimensions = async (videoPath: string): Promise<{ width: number; height: number }> => {
  try {
    const output = execSync(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoPath}"`
    ).toString().trim()

    const [width, height] = output.split('x').map(Number)
    return { width, height }
  } catch (error) {
    console.warn('Failed to get video dimensions, using default 1080x1920')
    return { width: 1080, height: 1920 }
  }
}

// Helper function to normalize CaptionStyle (migrate from old format if needed)
const normalizeCaptionStyle = (style: any) => {
  // If already has new format, return as-is
  if (style.xPercent !== undefined && style.yPercent !== undefined && style.widthPercent !== undefined) {
    return {
      ...style,
      xPercent: style.xPercent ?? 0.5,
      yPercent: style.yPercent ?? 0.85,
      widthPercent: style.widthPercent ?? 0.8,
      paddingPx: style.paddingPx ?? 20,
    }
  }

  // Migrate from old format
  let xPercent = 0.5
  let yPercent = 0.85
  const widthPercent = 0.8
  const paddingPx = 20

  if (style.position === 'custom' && style.customX !== undefined && style.customY !== undefined) {
    // Convert old pixel positions to percentages (assuming 1080x1920 video)
    xPercent = style.customX / 1080
    yPercent = style.customY / 1920
  } else if (style.position === 'top') {
    yPercent = 0.15 // 15% from top
  } else if (style.position === 'center') {
    yPercent = 0.5 // Center
  } else {
    yPercent = 0.85 // Bottom (default)
  }

  return {
    ...style,
    xPercent,
    yPercent,
    widthPercent,
    paddingPx,
  }
}

const wrapText = (text: string, maxCharsPerLine: number = 35): string => {
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

  return lines.join('\\n')
}

const buildDrawTextFilter = ({
  caption,
  captionStyle,
  textColor,
  backgroundColor,
  backgroundOpacity,
}: {
  caption: string
  captionStyle: any
  textColor: RGBA
  backgroundColor: RGBA
  backgroundOpacity: number
}) => {
  // Normalize caption style to ensure we have percentages
  const normalized = normalizeCaptionStyle(captionStyle)
  
  // Calculate chars per line based on widthPercent (scale from base 35 chars for 80% width)
  const charsPerLine = Math.round(35 * normalized.widthPercent / 0.8) || 25
  
  // Wrap text before escaping to ensure proper line breaks
  const wrappedCaption = wrapText(caption || '', charsPerLine)
  const escapedCaption = escapeDrawtextText(wrappedCaption)
  const fontSize = Math.max(24, Math.floor((normalized.fontSize || 16) * 1.5))
  const lineSpacing = Math.max(12, Math.floor(fontSize * 0.5))
  const paddingPx = normalized.paddingPx || 20

  const textColorHex = `0x${rgbaToHex(textColor)}`
  const bgHex = rgbaToHex(backgroundColor)
  const alphaHex = Math.round(clamp(backgroundOpacity, 0, 1) * 255)
    .toString(16)
    .padStart(2, '0')

  // Calculate position using percentages
  // xPercent/yPercent are the center of the caption box (0-1)
  // FFmpeg expressions: w = video width, h = video height, text_w = text width, text_h = text height
  const xPosition = `(w*${normalized.xPercent} - text_w/2)`
  const yPosition = `(h*${normalized.yPercent} - text_h/2)`

  console.log('🎨 Building drawtext filter:')
  console.log('  Caption:', caption)
  console.log('  Wrapped:', wrappedCaption)
  console.log('  Font size:', fontSize)
  console.log('  X percent:', normalized.xPercent, '→ Expression:', xPosition)
  console.log('  Y percent:', normalized.yPercent, '→ Expression:', yPosition)
  console.log('  Width percent:', normalized.widthPercent, '→ Chars per line:', charsPerLine)
  console.log('  Padding:', paddingPx)
  console.log('  Text color hex:', textColorHex)
  console.log('  BG color hex:', `0x${bgHex}${alphaHex}`)

  return [
    `drawtext=text='${escapedCaption}'`,
    `fontfile=${FONT_FILE}`,
    `fontsize=${fontSize}`,
    `fontcolor=${textColorHex}`,
    `x=${xPosition}`,
    `y=${yPosition}`,
    'box=1',
    `boxcolor=0x${bgHex}${alphaHex}`,
    `boxborderw=${paddingPx}`,
    'borderw=0',
    `line_spacing=${lineSpacing}`,
  ].join(':')
}

export async function POST(request: NextRequest) {
  let tempInputPath: string | null = null
  let tempOutputPath: string | null = null

  try {
    const formData = await request.formData()
    const videoFile = formData.get('video') as File
    const creatorVideoFile = formData.get('creatorVideo') as File | null
    const caption = formData.get('caption') as string
    const captionStyleJson = formData.get('captionStyle') as string
    const startTime = formData.get('startTime') as string | null // Optional: start time in seconds
    const duration = formData.get('duration') as string | null // Optional: duration in seconds

    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
    }

    let captionStyle = JSON.parse(captionStyleJson || '{}')
    // Normalize caption style to ensure percentages are present
    captionStyle = normalizeCaptionStyle(captionStyle)

    // Ensure temp directory exists
    if (!existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true })
    }

    // Save uploaded video to temp file
    const inputId = `input_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`
    tempInputPath = join(TEMP_DIR, inputId)
    const inputBuffer = Buffer.from(await videoFile.arrayBuffer())
    await writeFile(tempInputPath, inputBuffer)

    // Save creator video if provided
    let creatorVideoPath: string | null = null
    if (creatorVideoFile) {
      const creatorId = `creator_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`
      creatorVideoPath = join(TEMP_DIR, creatorId)
      const creatorBuffer = Buffer.from(await creatorVideoFile.arrayBuffer())
      await writeFile(creatorVideoPath, creatorBuffer)
    }

    // Output path
    const outputId = `output_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`
    tempOutputPath = join(TEMP_DIR, outputId)

    // Parse RGBA color
    const parseColor = (color: string) => {
      if (color.startsWith('rgba')) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
        if (match) {
          const r = parseInt(match[1])
          const g = parseInt(match[2])
          const b = parseInt(match[3])
          const a = match[4] ? parseFloat(match[4]) : 1
          return { r, g, b, a }
        }
      } else if (color.startsWith('#')) {
        const hex = color.slice(1)
        const r = parseInt(hex.slice(0, 2), 16)
        const g = parseInt(hex.slice(2, 4), 16)
        const b = parseInt(hex.slice(4, 6), 16)
        return { r, g, b, a: 1 }
      }
      return { r: 0, g: 0, b: 0, a: 1 }
    }

    const bgColor = parseColor(captionStyle.backgroundColor || '#000000')
    const textColor = parseColor(captionStyle.textColor || '#ffffff')
    const bgOpacityValue =
      captionStyle.backgroundOpacity !== undefined ? captionStyle.backgroundOpacity : bgColor.a ?? 0.7
    const bgOpacity = clamp(bgOpacityValue, 0, 1)

    console.log('📝 Caption Style Received:')
    console.log('  Text Color:', captionStyle.textColor, '→', textColor)
    console.log('  BG Color:', captionStyle.backgroundColor, '→', bgColor)
    console.log('  BG Opacity:', bgOpacity)
    console.log('  Font Size:', captionStyle.fontSize)
    console.log('  X Percent:', captionStyle.xPercent)
    console.log('  Y Percent:', captionStyle.yPercent)
    console.log('  Width Percent:', captionStyle.widthPercent)
    console.log('  Padding:', captionStyle.paddingPx)

    return new Promise<NextResponse>(async (resolve, reject) => {
      let concatFile: string | null = null
      let captionImagePath: string | null = null
      let inputFile: string
      let useConcat = false

      // If creator video exists, concatenate it first
      if (creatorVideoPath && tempInputPath) {
        console.log('🎬 Stitching mode: Creator video + Demo video')
        console.log('  Creator video:', creatorVideoPath)
        console.log('  Demo video:', tempInputPath)

        // Create concat file for ffmpeg
        concatFile = join(TEMP_DIR, `concat_${Date.now()}.txt`)
        const concatContent = `file '${creatorVideoPath.replace(/'/g, "'\\''")}'\nfile '${tempInputPath.replace(/'/g, "'\\''")}'`
        await writeFile(concatFile, concatContent)
        console.log('  Concat file created:', concatFile)
        console.log('  Concat content:', concatContent)
        inputFile = concatFile
        useConcat = true
      } else if (tempInputPath) {
        console.log('📹 Single video mode: Demo video only')
        console.log('  Demo video:', tempInputPath)
        inputFile = tempInputPath
        useConcat = false
      } else {
        return resolve(NextResponse.json({ error: 'No input file' }, { status: 400 }))
      }

      // Step 1: Render caption as PNG image with emoji support using server-side canvas
      console.log('🎨 Rendering caption with emoji support...')
      captionImagePath = join(TEMP_DIR, `caption_${Date.now()}.png`)

      await renderCaptionToPNG({
        caption,
        captionStyle,
        videoWidth: 1080,  // Target output dimensions
        videoHeight: 1920,
        outputPath: captionImagePath,
      })
      console.log('✅ Caption image rendered:', captionImagePath)

      // Step 2: Build FFmpeg filter to composite caption image over video
      // We'll use the overlay filter instead of drawtext to preserve emoji rendering
      const videoFilter = [
        'scale=1080:1920:force_original_aspect_ratio=increase',
        'crop=1080:1920',
      ].join(',')

      // Build ffmpeg args array (with -y FIRST as a global option)
      const args = [
        '-y', // Overwrite output file - MUST be first!
      ]

      // Add input options
      if (useConcat && concatFile) {
        console.log('  Using concat demuxer for stitching')
        args.push('-f', 'concat', '-safe', '0', '-i', inputFile)
      } else {
        console.log('  Using single input file')
        args.push('-i', inputFile)
      }

      // Add caption image as second input
      args.push('-i', captionImagePath)

      // Add time constraints if provided
      if (startTime) {
        args.push('-ss', startTime)
      }
      if (duration) {
        args.push('-t', duration)
      }

      // Add output options with overlay filter
      // [0:v] = first input (video), [1:v] = second input (caption PNG)
      args.push(
        '-filter_complex', `[0:v]${videoFilter}[v];[v][1:v]overlay=0:0[out]`,
        '-map', '[out]',
        '-map', '0:a?', // Map audio from first input if exists
        '-c:v', 'libx264',
        '-b:v', '5000k',
        '-r', '30',
        '-pix_fmt', 'yuv420p',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-ac', '2',
        '-ar', '44100',
        '-movflags', '+faststart',
        '-f', 'mp4',
        tempOutputPath!
      )

      console.log('\n🎥 FFmpeg command:')
      console.log('   ffmpeg', args.join(' '))
      console.log('')

      const ffmpegProcess = spawn('ffmpeg', args)
      let stderr = ''
      let lastProgressTime = ''

      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString()
        stderr += output

        // Log progress
        const progressMatch = output.match(/time=(\d+:\d+:\d+\.\d+)/)
        if (progressMatch && progressMatch[1] !== lastProgressTime) {
          lastProgressTime = progressMatch[1]
          console.log('⏱️  Processing:', progressMatch[1])
        }

        // Log any errors or warnings
        if (output.toLowerCase().includes('error') || output.toLowerCase().includes('warning')) {
          console.log('⚠️  FFmpeg:', output.trim())
        }
      })

      ffmpegProcess.on('close', async (code) => {
        if (code === 0) {
          try {
            const outputBuffer = await readFile(tempOutputPath!)
            console.log(`✅ Render complete! Output size: ${(outputBuffer.length / 1024 / 1024).toFixed(2)} MB`)

            // Clean up temp files
            if (tempInputPath) await unlink(tempInputPath).catch(() => {})
            if (creatorVideoPath) await unlink(creatorVideoPath).catch(() => {})
            if (concatFile) await unlink(concatFile).catch(() => {})
            if (captionImagePath) await unlink(captionImagePath).catch(() => {})
            if (tempOutputPath) await unlink(tempOutputPath).catch(() => {})

            // Return video as binary
            resolve(new NextResponse(outputBuffer, {
              headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="rendered-video.mp4"`,
              },
            }))
          } catch (error) {
            console.error('❌ Error reading output:', error)
            resolve(NextResponse.json(
              { error: 'Failed to read output file' },
              { status: 500 }
            ))
          }
        } else {
          console.error(`❌ FFmpeg failed with exit code ${code}`)
          console.error('Last 10 lines of stderr:')
          stderr.split('\n').slice(-10).forEach(line => console.error('  ', line))

          // Clean up temp files
          if (tempInputPath) await unlink(tempInputPath).catch(() => {})
          if (creatorVideoPath) await unlink(creatorVideoPath).catch(() => {})
          if (concatFile) await unlink(concatFile).catch(() => {})
          if (captionImagePath) await unlink(captionImagePath).catch(() => {})
          if (tempOutputPath) await unlink(tempOutputPath).catch(() => {})

          resolve(NextResponse.json(
            { error: 'Video processing failed: ' + stderr.split('\n').slice(-5).join('\n') },
            { status: 500 }
          ))
        }
      })

      ffmpegProcess.on('error', async (err) => {
        console.error('FFmpeg spawn error:', err)

        // Clean up temp files
        if (tempInputPath) await unlink(tempInputPath).catch(() => {})
        if (creatorVideoPath) await unlink(creatorVideoPath).catch(() => {})
        if (concatFile) await unlink(concatFile).catch(() => {})
        if (captionImagePath) await unlink(captionImagePath).catch(() => {})
        if (tempOutputPath) await unlink(tempOutputPath).catch(() => {})

        resolve(NextResponse.json(
          { error: 'Failed to spawn ffmpeg: ' + err.message },
          { status: 500 }
        ))
      })
    })
  } catch (error: any) {
    console.error('Render error:', error)
    
    // Clean up temp files
    if (tempInputPath) await unlink(tempInputPath).catch(() => {})
    if (tempOutputPath) await unlink(tempOutputPath).catch(() => {})
    
    return NextResponse.json(
      { error: error.message || 'Failed to render video' },
      { status: 500 }
    )
  }
}

// Note: This API requires ffmpeg to be installed on the system
// Install with: 
//   macOS: brew install ffmpeg
//   Linux: apt-get install ffmpeg or yum install ffmpeg
//   Windows: Download from https://ffmpeg.org/download.html


'use client'

import { useState, useRef, useEffect } from 'react'
import { Variant, CaptionStyle, DemoVideo } from '@/types'
import { CREATOR_TEMPLATES } from '@/lib/constants'
import JSZip from 'jszip'
import VideoCanvasPreview from './VideoCanvasPreview'

interface Step4ReviewProps {
  variants: Variant[]
  captionStyle: CaptionStyle
  demos: DemoVideo[]
  onUpdate: (variants: Variant[]) => void
  onBack: () => void
}

const CREATOR_NAMES: Record<string, string> = {
  'female-hype': 'Female – Hype',
  'female-calm': 'Female – Calm Aesthetic',
  'male-gym': 'Male – Gym Bro',
  'neutral': 'Neutral Brand Voice',
}

const SUBTITLE_STYLE_NAMES: Record<string, string> = {
  'clean-white': 'Clean White',
  'yellow-highlight': 'Yellow Highlight',
  'brand-color': 'Brand Color',
}

// Helper function to wrap text (matches backend logic exactly)
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

  return lines.join('\n')
}

// Helper function to normalize CaptionStyle (migrate from old format if needed)
const normalizeCaptionStyle = (style: CaptionStyle): CaptionStyle => {
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
    // This is approximate - we'll use the preview container size when dragging
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

// Helper function to replace emojis with boxes (matches FFmpeg rendering limitation)
const replaceEmojisWithBoxes = (text: string): string => {
  // Replace color emojis with empty box character to match FFmpeg's drawtext rendering
  // FFmpeg's drawtext filter cannot render color emojis, they appear as boxes
  return text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '□')
}

// Stitched Video Preview Component
function StitchedVideoPreview({
  creatorVideoUrl,
  demoVideoUrl,
  caption,
  captionStyle,
  onCaptionStyleChange
}: {
  creatorVideoUrl: string | null | undefined
  demoVideoUrl: string | undefined
  caption: string
  captionStyle: CaptionStyle
  onCaptionStyleChange?: (style: Partial<CaptionStyle>) => void
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<'creator' | 'demo'>('creator')
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [isEditingCaption, setIsEditingCaption] = useState(false)
  const [localFontSize, setLocalFontSize] = useState(captionStyle.fontSize)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ offsetX: 0, offsetY: 0 })

  // Normalize caption style (migrate from old format if needed)
  const normalizedStyle = normalizeCaptionStyle(captionStyle)

  const creatorVideoRef = useRef<HTMLVideoElement>(null)
  const demoVideoRef = useRef<HTMLVideoElement>(null)
  const progressIntervalRef = useRef<number | null>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const captionBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Calculate total duration when videos load
    const creatorDuration = creatorVideoRef.current?.duration || 0
    const demoDuration = demoVideoRef.current?.duration || 0
    const total = creatorDuration + demoDuration
    if (total > 0 && total !== totalDuration) {
      setTotalDuration(total)
    }
  }, [creatorVideoRef.current?.duration, demoVideoRef.current?.duration])

  useEffect(() => {
    // Update progress during playback
    if (isPlaying) {
      progressIntervalRef.current = window.setInterval(() => {
        const currentVideo = currentPhase === 'creator' ? creatorVideoRef.current : demoVideoRef.current
        if (currentVideo) {
          const creatorDuration = creatorVideoRef.current?.duration || 0
          const elapsed = currentPhase === 'creator'
            ? currentVideo.currentTime
            : creatorDuration + currentVideo.currentTime
          setCurrentTime(elapsed)
          setProgress(totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0)
        }
      }, 100)
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isPlaying, currentPhase, totalDuration])

  const handlePlayPause = () => {
    if (isPlaying) {
      if (creatorVideoRef.current) creatorVideoRef.current.pause()
      if (demoVideoRef.current) demoVideoRef.current.pause()
      setIsPlaying(false)
    } else {
      if (currentPhase === 'creator' && creatorVideoRef.current) {
        creatorVideoRef.current.play()
      } else if (demoVideoRef.current) {
        demoVideoRef.current.play()
      }
      setIsPlaying(true)
    }
  }

  const handleCreatorEnded = () => {
    setCurrentPhase('demo')
    if (demoVideoRef.current) {
      demoVideoRef.current.currentTime = 0
      demoVideoRef.current.play()
    }
  }

  const handleDemoEnded = () => {
    setIsPlaying(false)
    setCurrentPhase('creator')
    setProgress(0)
    setCurrentTime(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const seekTime = percentage * totalDuration

    const creatorDuration = creatorVideoRef.current?.duration || 0

    if (seekTime <= creatorDuration && creatorVideoRef.current) {
      // Seek in creator video
      setCurrentPhase('creator')
      creatorVideoRef.current.currentTime = seekTime
      setCurrentTime(seekTime)
      setProgress(percentage * 100)
      if (demoVideoRef.current) {
        demoVideoRef.current.pause()
        demoVideoRef.current.currentTime = 0
      }
    } else if (demoVideoRef.current) {
      // Seek in demo video
      setCurrentPhase('demo')
      const demoTime = seekTime - creatorDuration
      demoVideoRef.current.currentTime = demoTime
      setCurrentTime(seekTime)
      setProgress(percentage * 100)
      if (creatorVideoRef.current) {
        creatorVideoRef.current.pause()
      }
    }
  }

  const handleFontSizeChange = (newSize: number) => {
    setLocalFontSize(newSize)
    if (onCaptionStyleChange) {
      onCaptionStyleChange({ fontSize: newSize })
    }
  }

  const handleCaptionMouseDown = (e: React.MouseEvent) => {
    if (!isEditingCaption || !videoContainerRef.current || !captionBoxRef.current) return
    e.stopPropagation()
    setIsDragging(true)
    const containerRect = videoContainerRef.current.getBoundingClientRect()
    const captionRect = captionBoxRef.current.getBoundingClientRect()
    
    // Calculate offset from click point to caption center
    const clickX = e.clientX - containerRect.left
    const clickY = e.clientY - containerRect.top
    const captionCenterX = (captionRect.left + captionRect.width / 2) - containerRect.left
    const captionCenterY = (captionRect.top + captionRect.height / 2) - containerRect.top
    
    setDragStart({
      offsetX: clickX - captionCenterX,
      offsetY: clickY - captionCenterY,
    })
  }

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (!isEditingCaption || !videoContainerRef.current || !captionBoxRef.current) return
    e.stopPropagation()
    setIsResizing(true)
    const containerRect = videoContainerRef.current.getBoundingClientRect()
    const captionRect = captionBoxRef.current.getBoundingClientRect()
    
    // Store initial width for resize calculation
    const initialWidthPx = captionRect.width
    const initialLeftPx = captionRect.left - containerRect.left
    
    setDragStart({
      offsetX: e.clientX - containerRect.left - (initialLeftPx + initialWidthPx),
      offsetY: 0,
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!videoContainerRef.current) return
    
    const rect = videoContainerRef.current.getBoundingClientRect()
    
    if (isDragging) {
      // Calculate new center position
      const newCenterX = e.clientX - rect.left - dragStart.offsetX
      const newCenterY = e.clientY - rect.top - dragStart.offsetY
      
      // Convert to percentages
      const xPct = newCenterX / rect.width
      const yPct = newCenterY / rect.height
      
      // Clamp to valid range (0-1)
      const clampedX = Math.min(0.95, Math.max(0.05, xPct))
      const clampedY = Math.min(0.95, Math.max(0.05, yPct))
      
      // Update style immediately for smooth dragging
      if (onCaptionStyleChange) {
        onCaptionStyleChange({
          xPercent: clampedX,
          yPercent: clampedY,
        })
      }
    } else if (isResizing && captionBoxRef.current) {
      // Calculate new width based on mouse position
      const captionRect = captionBoxRef.current.getBoundingClientRect()
      const captionLeft = captionRect.left - rect.left
      const mouseX = e.clientX - rect.left
      const newWidthPx = mouseX - captionLeft
      
      // Convert to percentage
      let widthPct = newWidthPx / rect.width
      
      // Clamp to valid range (0.3 to 0.95)
      widthPct = Math.min(0.95, Math.max(0.3, widthPct))
      
      // Update style immediately for smooth resizing
      if (onCaptionStyleChange) {
        onCaptionStyleChange({
          widthPercent: widthPct,
        })
      }
    }
  }

  const handleMouseUp = () => {
    if (isDragging || isResizing) {
      setIsDragging(false)
      setIsResizing(false)
      // Position/size is already saved in handleMouseMove
    }
  }

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, dragStart, normalizedStyle])

  return (
    <div style={{
      width: '100%',
      position: 'relative',
    }}>
      <div
        ref={videoContainerRef}
        style={{
          width: '100%',
          aspectRatio: '9/16',
          backgroundColor: '#000',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '8px',
        }}
      >
      {/* Show both videos, control which is visible */}
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {creatorVideoUrl && (
          <video
            ref={creatorVideoRef}
            src={creatorVideoUrl}
            onEnded={handleCreatorEnded}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: currentPhase === 'creator' ? 'block' : 'none',
            }}
            playsInline
            preload="metadata"
          />
        )}
        {demoVideoUrl && (
          <video
            ref={demoVideoRef}
            src={demoVideoUrl}
            onEnded={handleDemoEnded}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: currentPhase === 'demo' || !creatorVideoUrl ? 'block' : 'none',
            }}
            playsInline
            preload="metadata"
          />
        )}
        {!creatorVideoUrl && !demoVideoUrl && (
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            color: 'rgba(255,255,255,0.3)',
          }}>
            🎬
          </div>
        )}

        {/* Play button overlay */}
        <div
          onClick={handlePlayPause}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: isPlaying ? 'transparent' : 'rgba(0,0,0,0.3)',
            transition: 'background-color 0.2s',
          }}
        >
          {!isPlaying && (creatorVideoUrl || demoVideoUrl) && (
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
            }}>
              ▶
            </div>
          )}
        </div>

        {/* Caption Overlay - Drag to position anywhere */}
        {caption && (
          <div
            ref={captionBoxRef}
            onMouseDown={handleCaptionMouseDown}
            onDoubleClick={() => setIsEditingCaption(!isEditingCaption)}
            style={{
              position: 'absolute',
              left: `${normalizedStyle.xPercent * 100}%`,
              top: `${normalizedStyle.yPercent * 100}%`,
              transform: 'translate(-50%, -50%)', // Center the box on xPercent, yPercent
              width: `${normalizedStyle.widthPercent * 100}%`,
              maxWidth: '90%',
              padding: `${normalizedStyle.paddingPx}px`,
              backgroundColor: `${normalizedStyle.backgroundColor}${Math.round(normalizedStyle.backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
              borderRadius: '0',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto',
              cursor: isEditingCaption ? (isDragging ? 'grabbing' : isResizing ? 'nwse-resize' : 'grab') : 'default',
              border: isEditingCaption ? '2px dashed #3b82f6' : 'none',
              outline: isEditingCaption ? '2px solid rgba(59, 130, 246, 0.3)' : 'none',
              outlineOffset: '4px',
              transition: (isDragging || isResizing) ? 'none' : 'all 0.2s',
              userSelect: 'none',
              boxSizing: 'border-box',
            }}
          >
            <div style={{
              color: normalizedStyle.textColor,
              fontSize: `${Math.max(24, Math.floor((localFontSize || normalizedStyle.fontSize || 16) * 1.5))}px`,
              fontWeight: '500',
              textAlign: 'center',
              lineHeight: `${Math.max(24, Math.floor((localFontSize || normalizedStyle.fontSize || 16) * 1.5)) * 1.4}px`,
              textShadow: 'none',
              maxWidth: '100%',
              wordWrap: 'break-word',
              whiteSpace: 'pre-line',
              width: '100%',
            }}>
              {wrapText(caption, Math.round(35 * normalizedStyle.widthPercent / 0.8))}
            </div>

            {/* Resize Handle */}
            {isEditingCaption && (
              <div
                onMouseDown={handleResizeMouseDown}
                style={{
                  position: 'absolute',
                  right: -8,
                  bottom: -8,
                  width: 16,
                  height: 16,
                  borderRadius: '9999px',
                  border: '2px solid #3b82f6',
                  background: 'white',
                  cursor: 'nwse-resize',
                  zIndex: 10,
                }}
              />
            )}

            {/* Edit Mode Indicator */}
            {isEditingCaption && (
              <div style={{
                position: 'absolute',
                top: '-24px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}>
                🖱️ DRAG TO MOVE • 🔲 RESIZE • DOUBLE-CLICK TO LOCK
              </div>
            )}
          </div>
        )}

        {/* Phase indicator */}
        {creatorVideoUrl && demoVideoUrl && (
          <div style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            padding: '0.25rem 0.5rem',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: '500',
            pointerEvents: 'none',
          }}>
            {currentPhase === 'creator' ? '👤 Creator' : '🎬 Demo'}
          </div>
        )}
      </div>
      </div>

      {/* Timeline/Progress Bar */}
      <div style={{
        marginTop: '0.5rem',
        padding: '0 0.25rem',
      }}>
        {/* Progress bar - now clickable for seeking */}
        <div
          onClick={handleSeek}
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '0.25rem',
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <div style={{
            height: '100%',
            width: `${progress}%`,
            backgroundColor: '#3b82f6',
            transition: 'width 0.1s linear',
            position: 'relative',
          }}>
            {/* Scrubber handle */}
            <div style={{
              position: 'absolute',
              right: '-6px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </div>
        </div>

        {/* Time display */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
          color: '#6b7280',
          fontWeight: '500',
        }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>

        {/* Interactive Caption Controls */}
        {isEditingCaption && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            backgroundColor: '#eff6ff',
            borderRadius: '6px',
            border: '1px solid #3b82f6',
          }}>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: '600', color: '#1e40af' }}>
              📝 Caption Editor
            </div>

            {/* Position Info */}
            <div style={{ marginBottom: '0.75rem', padding: '0.5rem', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Caption Position
              </div>
              <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
                X: {Math.round(normalizedStyle.xPercent * 100)}% | Y: {Math.round(normalizedStyle.yPercent * 100)}% | Width: {Math.round(normalizedStyle.widthPercent * 100)}%
              </div>
              <div style={{ fontSize: '0.6rem', color: '#9ca3af', marginTop: '0.25rem', fontStyle: 'italic' }}>
                💡 Drag the caption on the video to reposition
              </div>
            </div>

            {/* Font Size Slider */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.7rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                Font Size: {localFontSize}px (Render: {Math.max(24, Math.floor((localFontSize || 16) * 1.5))}px)
              </label>
              <input
                type="range"
                min="12"
                max="32"
                value={localFontSize}
                onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  outline: 'none',
                  background: '#3b82f6',
                }}
              />
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.7rem' }}>
              <button
                onClick={() => setIsEditingCaption(false)}
                style={{
                  flex: 1,
                  padding: '0.375rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                ✓ Done Editing
              </button>
            </div>
          </div>
        )}

        {/* Enable Edit Mode Button */}
        {!isEditingCaption && caption && (
          <button
            onClick={() => setIsEditingCaption(true)}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.5rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '500',
              cursor: 'pointer',
              border: '1px solid #d1d5db',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          >
            ✏️ Edit Caption Style (Position, Size)
          </button>
        )}
      </div>
    </div>
  )
}

export default function Step4Review({ variants, captionStyle, demos, onUpdate, onBack }: Step4ReviewProps) {
  const [itemsPerPage, setItemsPerPage] = useState(6)
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 })
  const [exportError, setExportError] = useState<string | null>(null)

  // Helper to get caption style for a variant (uses override if present, otherwise global default)
  const getCaptionStyleForVariant = (variant: Variant): CaptionStyle => {
    return normalizeCaptionStyle(variant.captionStyleOverride || captionStyle)
  }

  const selectedCount = variants.filter(v => v.selected).length
  const totalPages = Math.ceil(variants.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const visibleVariants = variants.slice(startIndex, startIndex + itemsPerPage)

  const toggleSelection = (id: string) => {
    onUpdate(variants.map(v => v.id === id ? { ...v, selected: !v.selected } : v))
  }

  const updateVariant = (id: string, updates: Partial<Variant>) => {
    onUpdate(variants.map(v => v.id === id ? { ...v, ...updates } : v))
  }

  const renderVideoWithCaption = async (variant: Variant, demoVideo: DemoVideo, startTime?: number, duration?: number): Promise<Blob | null> => {
    if (!demoVideo.file) {
      console.error('No demo file found')
      return null
    }

    console.log(`Starting server-side render for ${variant.creatorName}`)

    try {
      // Get creator video if available
      const creatorTemplate = CREATOR_TEMPLATES.find(t => t.id === variant.creatorTemplateId)
      let creatorVideoFile: File | null = null
      
      if (creatorTemplate?.videoUrl) {
        try {
          const creatorResponse = await fetch(creatorTemplate.videoUrl)
          const creatorBlob = await creatorResponse.blob()
          creatorVideoFile = new File([creatorBlob], 'creator.mp4', { type: 'video/mp4' })
        } catch (e) {
          console.warn('Could not load creator video:', e)
        }
      }

      // Prepare form data
      const formData = new FormData()
      formData.append('video', demoVideo.file)
      if (creatorVideoFile) {
        formData.append('creatorVideo', creatorVideoFile)
      }
      formData.append('caption', variant.caption)

      // Use per-variant caption style
      const styleForVariant = getCaptionStyleForVariant(variant)
      console.log('📤 Sending captionStyle to backend:', styleForVariant)
      formData.append('captionStyle', JSON.stringify(styleForVariant))
      if (startTime !== undefined) {
        formData.append('startTime', startTime.toString())
      }
      if (duration !== undefined) {
        formData.append('duration', duration.toString())
      }

      // Call server-side rendering API
      const response = await fetch('/api/render-video', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to render video')
      }

      const blob = await response.blob()
      console.log(`✅ Server render complete: ${(blob.size / 1024 / 1024).toFixed(2)} MB`)
      return blob
    } catch (error) {
      console.error('Render error:', error)
      return null
    }
  }

  // Legacy client-side rendering (kept as fallback, but not used)
  const renderVideoWithCaption_Client = async (variant: Variant, demoVideo: DemoVideo): Promise<Blob | null> => {
    if (!demoVideo.file) {
      console.error('No demo file found')
      return null
    }

    console.log(`Starting render for ${variant.creatorName}`)

    // Get creator video URL if available
    const creatorTemplate = CREATOR_TEMPLATES.find(t => t.id === variant.creatorTemplateId)
    const creatorVideoUrl = creatorTemplate?.videoUrl

    return new Promise((resolve) => {
      // Create video elements
      const creatorVideo = creatorVideoUrl ? document.createElement('video') : null
      const demoVideo_elem = document.createElement('video')

      if (creatorVideo && creatorVideoUrl) {
        creatorVideo.src = creatorVideoUrl
        creatorVideo.muted = false
        creatorVideo.playsInline = true
        creatorVideo.crossOrigin = 'anonymous'
      }

      demoVideo_elem.src = demoVideo.url
      demoVideo_elem.muted = false
      demoVideo_elem.playsInline = true

      let canvas: HTMLCanvasElement
      let ctx: CanvasRenderingContext2D
      let mediaRecorder: MediaRecorder
      let chunks: Blob[] = []
      let currentPhase: 'creator' | 'demo' = creatorVideo ? 'creator' : 'demo'

      const setupCanvas = () => {
        const video = currentPhase === 'creator' ? creatorVideo! : demoVideo_elem

        if (!canvas) {
          // Force 9:16 aspect ratio (1080x1920 for vertical video)
          canvas = document.createElement('canvas')
          canvas.width = 1080
          canvas.height = 1920
          ctx = canvas.getContext('2d')!

          console.log(`Canvas created: ${canvas.width}x${canvas.height} (9:16 aspect ratio)`)

          // Setup MediaRecorder
          const stream = canvas.captureStream(30)

          // Add audio from current video
          try {
            // @ts-ignore
            const videoStream = video.captureStream ? video.captureStream() : null
            if (videoStream) {
              const audioTracks = videoStream.getAudioTracks()
              if (audioTracks.length > 0) {
                stream.addTrack(audioTracks[0])
                console.log('Audio track added')
              }
            }
          } catch (e) {
            console.warn('Could not add audio track:', e)
          }

          // Try H.264 MP4 first, fallback to WebM
          let options: MediaRecorderOptions
          if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
            options = {
              mimeType: 'video/mp4;codecs=h264',
              videoBitsPerSecond: 5000000
            }
            console.log('Using MP4 H.264 codec')
          } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
            options = {
              mimeType: 'video/webm;codecs=h264',
              videoBitsPerSecond: 5000000
            }
            console.log('Using WebM H.264 codec')
          } else {
            options = {
              mimeType: 'video/webm;codecs=vp9',
              videoBitsPerSecond: 5000000
            }
            console.log('Fallback to WebM VP9 codec')
          }

          mediaRecorder = new MediaRecorder(stream, options)

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data)
            }
          }

          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' })
            console.log(`✓ Recording complete. Blob size: ${blob.size} bytes`)
            if (creatorVideo) creatorVideo.remove()
            demoVideo_elem.remove()
            resolve(blob)
          }

          mediaRecorder.onerror = (e) => {
            console.error('MediaRecorder error:', e)
            if (creatorVideo) creatorVideo.remove()
            demoVideo_elem.remove()
            resolve(null)
          }
        }
      }

      const drawFrame = () => {
        const video = currentPhase === 'creator' ? creatorVideo! : demoVideo_elem

        if (video.ended || video.paused) {
          if (currentPhase === 'creator' && demoVideo_elem) {
            // Switch to demo phase
            console.log('Creator video ended, switching to demo')
            currentPhase = 'demo'

            // Update audio track for demo video
            try {
              // @ts-ignore
              const demoStream = demoVideo_elem.captureStream ? demoVideo_elem.captureStream() : null
              if (demoStream) {
                const audioTracks = demoStream.getAudioTracks()
                if (audioTracks.length > 0) {
                  const stream = canvas.captureStream(30)
                  // Remove old audio tracks
                  stream.getAudioTracks().forEach(track => track.stop())
                  // This is a limitation - we can't easily switch audio mid-recording
                  // For now, we'll just continue with creator audio
                }
              }
            } catch (e) {
              console.warn('Could not switch audio track:', e)
            }

            demoVideo_elem.currentTime = 0
            demoVideo_elem.play().then(() => {
              drawFrame()
            }).catch(err => {
              console.error('Failed to play demo video:', err)
              mediaRecorder.stop()
            })
            return
          } else {
            // All videos finished
            console.log('All videos ended, stopping recorder')
            mediaRecorder.stop()
            return
          }
        }

        // Draw current video frame with 9:16 aspect ratio (center crop)
        const videoAspect = video.videoWidth / video.videoHeight
        const canvasAspect = canvas.width / canvas.height // 9/16 = 0.5625

        let sx = 0, sy = 0, sWidth = video.videoWidth, sHeight = video.videoHeight

        if (videoAspect > canvasAspect) {
          // Video is wider than canvas - crop sides
          sWidth = video.videoHeight * canvasAspect
          sx = (video.videoWidth - sWidth) / 2
        } else {
          // Video is taller than canvas - crop top/bottom
          sHeight = video.videoWidth / canvasAspect
          sy = (video.videoHeight - sHeight) / 2
        }

        ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height)

        // Draw caption overlay THROUGHOUT ENTIRE VIDEO (both creator and demo phases)
        if (variant.caption) {
          const padding = 20
          const maxWidth = canvas.width - (padding * 2)

          // Scale font size relative to canvas height (for high-res videos)
          const scaledFontSize = Math.max(24, Math.floor(canvas.height * 0.04))

          // Set font
          ctx.font = `bold ${scaledFontSize}px Arial, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'

          // Wrap text
          const words = variant.caption.split(' ')
          const lines: string[] = []
          let currentLine = ''

          words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word
            const metrics = ctx.measureText(testLine)
            if (metrics.width > maxWidth && currentLine) {
              lines.push(currentLine)
              currentLine = word
            } else {
              currentLine = testLine
            }
          })
          if (currentLine) lines.push(currentLine)

          // Calculate position
          const lineHeight = scaledFontSize * 1.4
          const totalHeight = lines.length * lineHeight + (padding * 2)
          let y: number

          if (captionStyle.position === 'top') {
            y = 100
          } else if (captionStyle.position === 'center') {
            y = (canvas.height - totalHeight) / 2
          } else {
            y = canvas.height - totalHeight - 100
          }

          // Draw background with rounded corners
          ctx.fillStyle = captionStyle.backgroundColor
          const bgWidth = Math.min(canvas.width - 80, maxWidth + (padding * 2))
          const bgX = (canvas.width - bgWidth) / 2
          const cornerRadius = 12

          // Rounded rectangle
          ctx.beginPath()
          ctx.moveTo(bgX + cornerRadius, y)
          ctx.lineTo(bgX + bgWidth - cornerRadius, y)
          ctx.quadraticCurveTo(bgX + bgWidth, y, bgX + bgWidth, y + cornerRadius)
          ctx.lineTo(bgX + bgWidth, y + totalHeight - cornerRadius)
          ctx.quadraticCurveTo(bgX + bgWidth, y + totalHeight, bgX + bgWidth - cornerRadius, y + totalHeight)
          ctx.lineTo(bgX + cornerRadius, y + totalHeight)
          ctx.quadraticCurveTo(bgX, y + totalHeight, bgX, y + totalHeight - cornerRadius)
          ctx.lineTo(bgX, y + cornerRadius)
          ctx.quadraticCurveTo(bgX, y, bgX + cornerRadius, y)
          ctx.closePath()
          ctx.fill()

          // Draw text with shadow for better readability
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
          ctx.shadowBlur = 4
          ctx.shadowOffsetX = 2
          ctx.shadowOffsetY = 2

          ctx.fillStyle = captionStyle.textColor
          lines.forEach((line, index) => {
            const textY = y + padding + (index * lineHeight) + (lineHeight / 2)
            ctx.fillText(line, canvas.width / 2, textY)
          })

          // Reset shadow
          ctx.shadowColor = 'transparent'
          ctx.shadowBlur = 0
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 0

          // Log caption rendering for debugging
          if (Math.floor(video.currentTime * 2) % 30 === 0) {
            console.log(`📝 Caption rendered at ${video.currentTime.toFixed(1)}s: "${variant.caption.substring(0, 30)}..."`)
          }
        }

        requestAnimationFrame(drawFrame)
      }

      const startRecording = () => {
        const firstVideo = creatorVideo || demoVideo_elem

        firstVideo.onloadedmetadata = () => {
          console.log(`First video loaded: ${firstVideo.videoWidth}x${firstVideo.videoHeight}`)
          setupCanvas()

          console.log('Starting MediaRecorder and video playback')
          mediaRecorder.start()
          firstVideo.play().then(() => {
            console.log('First video playing')
            drawFrame()
          }).catch(err => {
            console.error('Failed to play video:', err)
            resolve(null)
          })
        }

        firstVideo.onerror = (e) => {
          console.error('Failed to load video:', e)
          resolve(null)
        }

        // Load the second video metadata too if it exists
        if (creatorVideo && demoVideo_elem) {
          demoVideo_elem.load()
        }

        // Load first video
        firstVideo.load()
      }

      // Timeout fallback
      setTimeout(() => {
        console.error('Video rendering timeout')
        if (creatorVideo) creatorVideo.remove()
        demoVideo_elem.remove()
        resolve(null)
      }, 60000) // 60 second timeout for stitched videos

      startRecording()
    })
  }

  const handleExport = async (captionsOnly: boolean = false) => {
    const selectedVariants = variants.filter(v => v.selected)

    console.log(`\n🎬 EXPORT STARTING`)
    console.log(`   Total variants in system: ${variants.length}`)
    console.log(`   Selected variants: ${selectedVariants.length}`)
    console.log(`   Selected variant details:`)
    selectedVariants.forEach((v, i) => {
      console.log(`   ${i + 1}. Demo: "${v.demoName}" | Creator: "${v.creatorName}" | Caption: "${v.caption.substring(0, 40)}..."`)
    })
    console.log(`\n`)

    if (captionsOnly) {
      // Export captions as CSV
      const csv = [
        ['Video Name', 'Creator', 'Caption', 'Hashtags', 'CTA'].join(','),
        ...selectedVariants.map(v => [
          v.demoName,
          v.creatorName,
          `"${v.caption.replace(/"/g, '""')}"`,
          `"${v.hashtags.replace(/"/g, '""')}"`,
          `"${v.cta.replace(/"/g, '""')}"`,
        ].join(','))
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ugc-captions-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      return
    }

    // Export videos with burned-in captions
    setIsExporting(true)
    setExportError(null)
    setExportProgress({ current: 0, total: selectedVariants.length })

    try {
      const zip = new JSZip()
      const metadata: any[] = []

      // IMPORTANT: Process videos ONE AT A TIME to avoid browser resource limits
      for (let i = 0; i < selectedVariants.length; i++) {
        const variant = selectedVariants[i]
        const demoVideo = demos.find(d => d.id === variant.demoId)

        if (!demoVideo?.file) {
          console.error(`⚠️  SKIPPING variant ${i + 1}/${selectedVariants.length} - No video file found`)
          console.error(`   Variant ID: ${variant.id}`)
          console.error(`   Demo ID: ${variant.demoId}`)
          console.error(`   Demo found: ${!!demoVideo}`)
          console.error(`   Demo file: ${demoVideo?.file}`)
          setExportError(`Skipped video ${i + 1}: missing file`)
          continue
        }

        console.log(`\n========================================`)
        console.log(`📹 Processing ${i + 1}/${selectedVariants.length}`)
        console.log(`   Demo: ${variant.demoName}`)
        console.log(`   Creator: ${variant.creatorName}`)
        console.log(`   Caption: ${variant.caption.substring(0, 50)}...`)
        console.log(`========================================\n`)

        setExportProgress({ current: i, total: selectedVariants.length })

        try {
          // Wait a bit between renders to give browser time to clean up resources AND ensure unique timestamps
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
          }

          const renderedBlob = await renderVideoWithCaption(
            variant, 
            demoVideo, 
            variant.startTime, 
            variant.duration
          )

          if (renderedBlob && renderedBlob.size > 1000) { // At least 1KB
            console.log(`✅ Successfully rendered variant ${i + 1}: ${(renderedBlob.size / 1024 / 1024).toFixed(2)} MB`)

            // Create unique filename with timestamp and random suffix
            const timestamp = Date.now()
            const randomSuffix = Math.random().toString(36).substring(2, 8)
            const safeCreatorName = variant.creatorName.replace(/[^a-z0-9]/gi, '_')
            const safeDemoName = variant.demoName.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/gi, '_').substring(0, 30)
            const filename = `${safeDemoName}_${safeCreatorName}_${timestamp}_${randomSuffix}.mp4`

            console.log(`   Filename: ${filename}`)

            zip.file(filename, renderedBlob)

            metadata.push({
              filename,
              demoName: variant.demoName,
              creator: variant.creatorName,
              caption: variant.caption,
              hashtags: variant.hashtags,
              cta: variant.cta,
            })
          } else {
            console.error(`❌ Failed to render variant ${i + 1}: Blob is ${renderedBlob ? renderedBlob.size : 0} bytes`)
            setExportError(`Failed to render video ${i + 1}. Continuing with others...`)
          }
        } catch (error) {
          console.error(`❌ Exception rendering variant ${i + 1}:`, error)
          setExportError(`Error on video ${i + 1}. Continuing with others...`)
        }
      }

      if (metadata.length === 0) {
        throw new Error('No videos were successfully rendered')
      }

      console.log(`\n✅ Successfully rendered ${metadata.length}/${selectedVariants.length} videos`)

      // Add metadata CSV to zip
      const csvContent = [
        ['Filename', 'Demo Name', 'Creator', 'Caption', 'Hashtags', 'CTA'].join(','),
        ...metadata.map(m => [
          m.filename,
          m.demoName,
          m.creator,
          `"${m.caption.replace(/"/g, '""')}"`,
          `"${m.hashtags.replace(/"/g, '""')}"`,
          `"${m.cta.replace(/"/g, '""')}"`,
        ].join(','))
      ].join('\n')

      zip.file('captions.csv', csvContent)

      // Generate and download zip
      console.log('📦 Creating ZIP file...')
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      console.log(`✅ ZIP created: ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`)

      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ugc-export-${Date.now()}.zip`
      a.click()
      URL.revokeObjectURL(url)

      setIsExporting(false)
      setExportProgress({ current: 0, total: 0 })
      setExportError(null)
    } catch (error) {
      console.error('❌ Export failed:', error)
      setExportError(error instanceof Error ? error.message : 'Failed to export videos. Please try again.')
      setIsExporting(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            Review & Export
          </h2>
          <p style={{ color: '#6b7280' }}>
            Preview all {variants.length} video variations (each demo × creator × caption combination).
            <br />
            Unselect any you don't want to export.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label style={{ fontSize: '0.875rem' }}>Show per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(parseInt(e.target.value))
              setCurrentPage(1)
            }}
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
            }}
          >
            <option value={6}>6</option>
            <option value={9}>9</option>
            <option value={12}>12</option>
          </select>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        {visibleVariants.map(variant => {
          const isExpanded = expandedId === variant.id
          const isEditing = editingId === variant.id
          const demoVideo = demos.find(d => d.id === variant.demoId)
          const creatorTemplate = CREATOR_TEMPLATES.find(t => t.id === variant.creatorTemplateId)

          return (
            <div
              key={variant.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: 'white',
              }}
            >
              {/* Canvas-Based Video Preview with Burned-In Captions */}
              <div style={{ position: 'relative' }}>
                <VideoCanvasPreview
                  creatorVideoUrl={creatorTemplate?.videoUrl}
                  demoVideoUrl={demoVideo?.url}
                  caption={variant.caption}
                  captionStyle={getCaptionStyleForVariant(variant)}
                  onCaptionStyleChange={(updates) => {
                    const currentStyle = getCaptionStyleForVariant(variant)
                    const newStyle = normalizeCaptionStyle({ ...currentStyle, ...updates })
                    updateVariant(variant.id, { captionStyleOverride: newStyle })
                    console.log('🎨 Caption style updated for variant:', variant.id, newStyle)
                  }}
                />

                {/* Info badges */}
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  left: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  pointerEvents: 'none',
                }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: '500',
                  }}>
                    {variant.creatorName}
                  </span>
                </div>
              </div>

              <div style={{ padding: '1rem' }}>
                {isEditing ? (
                  <div>
                    <textarea
                      value={variant.caption}
                      onChange={(e) => updateVariant(variant.id, { caption: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        minHeight: '60px',
                        fontSize: '0.875rem',
                        marginBottom: '0.5rem',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setEditingId(null)
                        }}
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      marginBottom: '0.5rem',
                      color: '#374151',
                      lineHeight: '1.5',
                      maxHeight: isExpanded ? 'none' : '3em',
                      overflow: isExpanded ? 'visible' : 'hidden',
                    }}>
                      {variant.caption}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : variant.id)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                        }}
                      >
                        {isExpanded ? 'Collapse' : 'View caption'}
                      </button>
                      <button
                        onClick={() => setEditingId(variant.id)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(variant.caption)
                        }}
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </>
                )}
                
                {/* Video Timing Controls */}
                <div style={{ 
                  marginTop: '0.75rem', 
                  padding: '0.75rem', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                }}>
                  <div style={{ fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Video Timing (optional)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', color: '#6b7280' }}>
                        Start (seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={variant.startTime ?? ''}
                        onChange={(e) => updateVariant(variant.id, { 
                          startTime: e.target.value ? parseFloat(e.target.value) : undefined 
                        })}
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '0.375rem',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.75rem',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', color: '#6b7280' }}>
                        Duration (seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={variant.duration ?? ''}
                        onChange={(e) => updateVariant(variant.id, { 
                          duration: e.target.value ? parseFloat(e.target.value) : undefined 
                        })}
                        placeholder="Full video"
                        style={{
                          width: '100%',
                          padding: '0.375rem',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.75rem',
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#9ca3af' }}>
                    Leave empty to use full video. Captions will appear for the entire duration.
                  </div>
                </div>

                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  cursor: 'pointer',
                  marginTop: '0.75rem',
                }}>
                  <input
                    type="checkbox"
                    checked={variant.selected}
                    onChange={() => toggleSelection(variant.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Include in export
                  </span>
                </label>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentPage === 1 ? '#f3f4f6' : '#3b82f6',
              color: currentPage === 1 ? '#9ca3af' : 'white',
              borderRadius: '6px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>
          <span style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentPage === totalPages ? '#f3f4f6' : '#3b82f6',
              color: currentPage === totalPages ? '#9ca3af' : 'white',
              borderRadius: '6px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '2rem',
        borderTop: '1px solid #e5e7eb',
      }}>
        <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Selected: <strong>{selectedCount} / {variants.length}</strong> variants
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={onBack}
            disabled={isExporting}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              borderRadius: '8px',
              fontWeight: '500',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              opacity: isExporting ? 0.5 : 1,
            }}
          >
            Back
          </button>
          <button
            onClick={() => handleExport(true)}
            disabled={selectedCount === 0 || isExporting}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: selectedCount === 0 || isExporting ? '#f3f4f6' : '#6b7280',
              color: selectedCount === 0 || isExporting ? '#9ca3af' : 'white',
              borderRadius: '8px',
              fontWeight: '500',
              cursor: selectedCount === 0 || isExporting ? 'not-allowed' : 'pointer',
            }}
          >
            Captions only
          </button>
          <button
            onClick={() => handleExport(false)}
            disabled={selectedCount === 0 || isExporting}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: selectedCount === 0 || isExporting ? '#d1d5db' : '#3b82f6',
              color: 'white',
              borderRadius: '8px',
              fontWeight: '500',
              cursor: selectedCount === 0 || isExporting ? 'not-allowed' : 'pointer',
            }}
          >
            {isExporting ? 'Rendering...' : 'Download videos + captions'}
          </button>
        </div>
      </div>

      {/* Export Progress Modal */}
      {isExporting && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '28rem',
            width: '100%',
            margin: '1rem',
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              Rendering Videos
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              Processing video {exportProgress.current + 1} of {exportProgress.total}...
              <br />
              <span style={{ fontSize: '0.75rem' }}>Stitching creator intro + demo video with captions. This may take a few minutes.</span>
              <br />
              <span style={{ fontSize: '0.75rem', fontWeight: '500', marginTop: '0.25rem', display: 'inline-block' }}>Please don't close this window.</span>
            </p>
            <div style={{
              width: '100%',
              backgroundColor: '#e5e7eb',
              borderRadius: '9999px',
              height: '0.5rem',
              overflow: 'hidden',
            }}>
              <div
                style={{
                  backgroundColor: '#3b82f6',
                  height: '100%',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease',
                  width: `${(exportProgress.current / exportProgress.total) * 100}%`,
                }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem', textAlign: 'center' }}>
              {Math.round((exportProgress.current / exportProgress.total) * 100)}%
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {exportError && !isExporting && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          maxWidth: '24rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 50,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h4 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Export Error</h4>
              <p style={{ fontSize: '0.875rem' }}>{exportError}</p>
            </div>
            <button
              onClick={() => setExportError(null)}
              style={{
                marginLeft: '1rem',
                color: '#991b1b',
                fontSize: '1.25rem',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


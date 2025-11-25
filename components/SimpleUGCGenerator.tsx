'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { DemoVideo, CreatorTemplate, Variant, CaptionStyle } from '@/types'
import { CREATOR_TEMPLATES } from '@/lib/constants'
import { Plus, X, RefreshCw, Pencil } from 'lucide-react'
import VideoCanvasPreview from './VideoCanvasPreview'
import { wrapText } from '@/lib/textUtils'
import JSZip from 'jszip'

// Caption Item Component
const CaptionItem = ({
  variant,
  isSelected,
  isRegenerating,
  onSelect,
  onUpdate,
  onRegenerate,
  onDelete,
}: {
  variant: Variant
  isSelected: boolean
  isRegenerating: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<Variant>) => void
  onRegenerate: () => void
  onDelete: () => void
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(variant.caption)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update edit value when variant caption changes
  useEffect(() => {
    setEditValue(variant.caption)
  }, [variant.caption])

  const handleSave = () => {
    onUpdate({ caption: editValue })
    setIsEditing(false)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.625rem',
        backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
        borderRadius: '8px',
        border: isSelected ? '1.5px solid #3B82F6' : '1px solid #E2E8F0',
        transition: 'all 0.2s',
        minHeight: '36px',
      }}
      onClick={onSelect}
    >
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
      }}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave()
              } else if (e.key === 'Escape') {
                setEditValue(variant.caption)
                setIsEditing(false)
              }
            }}
            style={{
              flex: 1,
              padding: '0.375rem 0.5rem',
              border: '1px solid #3B82F6',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              outline: 'none',
              backgroundColor: '#FFFFFF',
              fontFamily: 'inherit',
            }}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            style={{
              flex: 1,
              padding: '0.375rem 0',
              fontSize: '0.8125rem',
              color: '#1E293B',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: '1.4',
            }}
          >
            {variant.caption}
          </div>
        )}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        flexShrink: 0,
      }}>
        {/* Edit button - only show when not editing */}
        {!isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
              setTimeout(() => inputRef.current?.focus(), 0)
            }}
            style={{
              padding: '0.25rem',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              transition: 'all 0.15s',
              width: '20px',
              height: '20px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9'
              e.currentTarget.style.color = '#3B82F6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#64748B'
            }}
            title="Edit caption"
          >
            <Pencil size={12} />
          </button>
        )}
        {/* Regenerate button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRegenerate()
          }}
          disabled={isRegenerating}
          style={{
            padding: '0.25rem',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: isRegenerating ? 'not-allowed' : 'pointer',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B',
            transition: 'all 0.15s',
            width: '20px',
            height: '20px',
          }}
          onMouseEnter={(e) => {
            if (!isRegenerating) {
              e.currentTarget.style.backgroundColor = '#F1F5F9'
              e.currentTarget.style.color = '#10B981'
            }
          }}
          onMouseLeave={(e) => {
            if (!isRegenerating) {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#64748B'
            }
          }}
          title="Regenerate caption"
        >
          <RefreshCw 
            size={12} 
            style={{ 
              animation: isRegenerating ? 'spin 1s linear infinite' : 'none' 
            }} 
          />
        </button>
        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          style={{
            padding: '0.25rem',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B',
            transition: 'all 0.15s',
            width: '20px',
            height: '20px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FEF2F2'
            e.currentTarget.style.color = '#EF4444'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#64748B'
          }}
          title="Delete caption"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

// Canvas-based preview that burns captions into video frames
function CanvasVideoPreview({
  videoUrl,
  caption,
  captionStyle,
  onCaptionStyleChange,
  autoPlay = true,
  showControls = false,
  onDoubleClick,
}: {
  videoUrl: string
  caption: string
  captionStyle: CaptionStyle
  onCaptionStyleChange?: (updates: Partial<CaptionStyle>) => void
  autoPlay?: boolean
  showControls?: boolean
  onDoubleClick?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const animationRef = useRef<number>()
  const containerRef = useRef<HTMLDivElement>(null)

  const [localStyle, setLocalStyle] = useState(captionStyle)
  const [interactionMode, setInteractionMode] = useState<'none' | 'drag' | 'resize' | 'rotate'>('none')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMounted, setIsMounted] = useState(false)

  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0, startFontSize: 0, startRotation: 0 })

  // Mount check for hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Sync style from props
  useEffect(() => {
    if (interactionMode === 'none') {
      setLocalStyle(captionStyle)
    }
  }, [captionStyle, interactionMode])

  // Render video frame with caption burned in
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !video || !ctx) return

    const canvasWidth = 1080
    const canvasHeight = 1920

    // Clear and draw video
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    if (video.readyState >= 2) {
      const videoAspect = video.videoWidth / video.videoHeight
      const canvasAspect = canvasWidth / canvasHeight

      let drawWidth = canvasWidth
      let drawHeight = canvasHeight
      let offsetX = 0
      let offsetY = 0

      if (videoAspect > canvasAspect) {
        drawHeight = canvasHeight
        drawWidth = canvasHeight * videoAspect
        offsetX = -(drawWidth - canvasWidth) / 2
      } else {
        drawWidth = canvasWidth
        drawHeight = canvasWidth / videoAspect
        offsetY = -(drawHeight - canvasHeight) / 2
      }

      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight)
    }

    // Draw caption burned into the frame
    if (caption) {
      const charsPerLine = Math.round(35 * localStyle.widthPercent / 0.8) || 25
      const wrappedText = wrapText(caption, charsPerLine)
      const lines = wrappedText.split('\n')
      const fontSize = Math.max(24, Math.floor((localStyle.fontSize || 16) * 1.5))
      const lineSpacing = Math.max(12, Math.floor(fontSize * 0.5))
      const padding = localStyle.paddingPx || 20

      ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
      const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
      const textHeight = lines.length * fontSize + (lines.length - 1) * lineSpacing
      const boxWidth = maxLineWidth + padding * 2
      const boxHeight = textHeight + padding * 2

      const centerX = canvasWidth * localStyle.xPercent
      const centerY = canvasHeight * localStyle.yPercent
      const rotation = (localStyle.rotation || 0) * Math.PI / 180

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(rotation)

      // Draw background
      const bgOpacity = localStyle.backgroundOpacity ?? 0.7
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result
          ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
          : { r: 0, g: 0, b: 0 }
      }
      const rgb = hexToRgb(localStyle.backgroundColor || '#000000')
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${bgOpacity})`

      const radius = 12
      ctx.beginPath()
      ctx.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, radius)
      ctx.fill()

      // Draw text
      ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = localStyle.textColor || '#ffffff'

      const startY = -textHeight / 2 + fontSize / 2
      lines.forEach((line, i) => {
        ctx.fillText(line, 0, startY + i * (fontSize + lineSpacing))
      })

      ctx.restore()

      // Draw selection handles (only in edit mode, not burned into export)
      if (onCaptionStyleChange) {
        ctx.save()
        ctx.translate(centerX, centerY)
        ctx.rotate(rotation)

        // Border
        ctx.strokeStyle = '#3B82F6'
        ctx.lineWidth = 3
        ctx.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight)

        // Corner handles
        const handleSize = 12
        const corners = [
          { x: -boxWidth / 2, y: -boxHeight / 2 },
          { x: boxWidth / 2, y: -boxHeight / 2 },
          { x: -boxWidth / 2, y: boxHeight / 2 },
          { x: boxWidth / 2, y: boxHeight / 2 },
        ]
        corners.forEach(corner => {
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize)
          ctx.strokeStyle = '#3B82F6'
          ctx.lineWidth = 2
          ctx.strokeRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize)
        })

        // Rotation handle
        const rotateHandleY = boxHeight / 2 + 40
        ctx.beginPath()
        ctx.moveTo(0, boxHeight / 2)
        ctx.lineTo(0, rotateHandleY - handleSize / 2)
        ctx.strokeStyle = '#3B82F6'
        ctx.lineWidth = 2
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(0, rotateHandleY, handleSize / 2, 0, Math.PI * 2)
        ctx.fillStyle = '#FFFFFF'
        ctx.fill()
        ctx.strokeStyle = '#3B82F6'
        ctx.stroke()

        ctx.restore()
      }
    }

    // Don't schedule next frame here - let the useEffect handle the loop
  }, [caption, localStyle, onCaptionStyleChange])

  // Start animation loop when video is ready
  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    let isRunning = true

    const animate = () => {
      if (!isRunning) return
      renderFrame()
      animationRef.current = requestAnimationFrame(animate)
    }

    const startAnimation = () => {
      if (video.readyState >= 2) {
        animate()
      } else {
        const onLoadedData = () => {
          if (isRunning) animate()
        }
        video.addEventListener('loadeddata', onLoadedData, { once: true })
        video.addEventListener('canplay', onLoadedData, { once: true })
        // Also try to start if video metadata loads
        if (video.readyState >= 1) {
          animate()
        }
      }
    }

    startAnimation()

    return () => {
      isRunning = false
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [renderFrame, videoUrl])

  // Auto-play video
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (autoPlay) {
      video.muted = true
      video.loop = true
      video.play().catch(() => {})
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleLoadedMetadata = () => setDuration(video.duration)

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [videoUrl, autoPlay])

  // Get caption box dimensions for hit testing
  const getCaptionBounds = useCallback(() => {
    if (!caption || !canvasRef.current) return null

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = 1080 / rect.width
    const scaleY = 1920 / rect.height

    const charsPerLine = Math.round(35 * localStyle.widthPercent / 0.8) || 25
    const lines = wrapText(caption, charsPerLine).split('\n')
    const fontSize = Math.max(24, Math.floor((localStyle.fontSize || 16) * 1.5))
    const lineSpacing = Math.max(12, Math.floor(fontSize * 0.5))
    const padding = localStyle.paddingPx || 20

    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
    const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
    const textHeight = lines.length * fontSize + (lines.length - 1) * lineSpacing
    const boxWidth = maxLineWidth + padding * 2
    const boxHeight = textHeight + padding * 2

    return { boxWidth, boxHeight, scaleX, scaleY }
  }, [caption, localStyle])

  // Get interaction mode from mouse position
  const getInteractionMode = useCallback((mouseX: number, mouseY: number): 'none' | 'drag' | 'resize' | 'rotate' => {
    if (!caption || !onCaptionStyleChange) return 'none'

    const bounds = getCaptionBounds()
    if (!bounds) return 'none'

    const { boxWidth, boxHeight, scaleX, scaleY } = bounds
    const canvasX = mouseX * scaleX
    const canvasY = mouseY * scaleY

    const centerX = 1080 * localStyle.xPercent
    const centerY = 1920 * localStyle.yPercent
    const rotation = (localStyle.rotation || 0) * Math.PI / 180

    const dx = canvasX - centerX
    const dy = canvasY - centerY
    const localX = dx * Math.cos(-rotation) - dy * Math.sin(-rotation)
    const localY = dx * Math.sin(-rotation) + dy * Math.cos(-rotation)

    // Check rotation handle
    const rotateHandleY = boxHeight / 2 + 40
    if (Math.sqrt(localX ** 2 + (localY - rotateHandleY) ** 2) < 30) return 'rotate'

    // Check corners
    const corners = [
      { x: -boxWidth / 2, y: -boxHeight / 2 },
      { x: boxWidth / 2, y: -boxHeight / 2 },
      { x: -boxWidth / 2, y: boxHeight / 2 },
      { x: boxWidth / 2, y: boxHeight / 2 },
    ]
    for (const corner of corners) {
      if (Math.sqrt((localX - corner.x) ** 2 + (localY - corner.y) ** 2) < 30) return 'resize'
    }

    // Check inside box
    if (Math.abs(localX) < boxWidth / 2 && Math.abs(localY) < boxHeight / 2) return 'drag'

    return 'none'
  }, [caption, localStyle, getCaptionBounds, onCaptionStyleChange])

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current || !onCaptionStyleChange) return

    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const mode = getInteractionMode(mouseX, mouseY)
    if (mode === 'none') return

    e.preventDefault()
    e.stopPropagation()
    setInteractionMode(mode)

    const bounds = getCaptionBounds()
    if (!bounds) return

    dragStartRef.current = {
      x: mouseX * bounds.scaleX,
      y: mouseY * bounds.scaleY,
      startX: localStyle.xPercent,
      startY: localStyle.yPercent,
      startFontSize: localStyle.fontSize || 16,
      startRotation: localStyle.rotation || 0,
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (interactionMode === 'none' || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const bounds = getCaptionBounds()
    if (!bounds) return

    const mouseX = (e.clientX - rect.left) * bounds.scaleX
    const mouseY = (e.clientY - rect.top) * bounds.scaleY

    if (interactionMode === 'drag') {
      const deltaX = (mouseX - dragStartRef.current.x) / 1080
      const deltaY = (mouseY - dragStartRef.current.y) / 1920
      const newX = Math.max(0.1, Math.min(0.9, dragStartRef.current.startX + deltaX))
      const newY = Math.max(0.1, Math.min(0.9, dragStartRef.current.startY + deltaY))
      setLocalStyle(prev => ({ ...prev, xPercent: newX, yPercent: newY }))
    } else if (interactionMode === 'rotate') {
      const centerX = 1080 * dragStartRef.current.startX
      const centerY = 1920 * dragStartRef.current.startY
      const currentAngle = Math.atan2(mouseY - centerY, mouseX - centerX) * 180 / Math.PI
      const startAngle = Math.atan2(dragStartRef.current.y - centerY, dragStartRef.current.x - centerX) * 180 / Math.PI
      const newRotation = dragStartRef.current.startRotation + (currentAngle - startAngle)
      setLocalStyle(prev => ({ ...prev, rotation: newRotation }))
    } else if (interactionMode === 'resize') {
      const centerX = 1080 * dragStartRef.current.startX
      const centerY = 1920 * dragStartRef.current.startY
      const startDist = Math.sqrt((dragStartRef.current.x - centerX) ** 2 + (dragStartRef.current.y - centerY) ** 2)
      const currentDist = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2)
      const scale = startDist > 0 ? currentDist / startDist : 1
      const newFontSize = Math.max(12, Math.min(48, dragStartRef.current.startFontSize * scale))
      setLocalStyle(prev => ({ ...prev, fontSize: newFontSize }))
    }
  }, [interactionMode, getCaptionBounds])

  const handleMouseUp = useCallback(() => {
    if (interactionMode !== 'none') {
      onCaptionStyleChange?.(localStyle)
      setInteractionMode('none')
    }
  }, [interactionMode, localStyle, onCaptionStyleChange])

  // Global mouse listeners
  useEffect(() => {
    if (interactionMode !== 'none') {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [interactionMode, handleMouseMove, handleMouseUp])

  // Update cursor on hover
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (interactionMode !== 'none' || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mode = getInteractionMode(e.clientX - rect.left, e.clientY - rect.top)
    canvasRef.current.style.cursor = mode === 'drag' ? 'move' : mode === 'resize' ? 'nwse-resize' : mode === 'rotate' ? 'grab' : 'default'
  }

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) video.pause()
    else video.play()
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        aspectRatio: '9/16',
        position: 'relative',
        backgroundColor: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
      onDoubleClick={onDoubleClick}
    >
       {/* Hidden video element */}
       {isMounted && (
         <video
           ref={videoRef}
           src={videoUrl}
           style={{ display: 'none' }}
           playsInline
           muted={autoPlay}
           loop={autoPlay}
           preload="auto"
           crossOrigin="anonymous"
         />
       )}

      {/* Canvas with video + burned-in captions */}
      <canvas
        ref={canvasRef}
        width={1080}
        height={1920}
        onMouseDown={handleMouseDown}
        onMouseMove={handleCanvasMouseMove}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          backgroundColor: '#000',
        }}
      />

      {/* Subtle controls overlay */}
      {showControls && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
          padding: '20px 12px 12px',
          zIndex: 10,
        }}>
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={(e) => {
              const video = videoRef.current
              if (video) video.currentTime = parseFloat(e.target.value)
            }}
            style={{
              width: '100%',
              height: 4,
              appearance: 'none',
              background: `linear-gradient(to right, #3B82F6 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%)`,
              borderRadius: 2,
              marginBottom: 8,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={togglePlayPause}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                {isPlaying ? (
                  <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>
                ) : (
                  <polygon points="5,3 19,12 5,21" />
                )}
              </svg>
            </button>
            <span style={{ color: 'white', fontSize: 11, fontFamily: 'monospace' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      )}

      {/* Play button hint */}
      {!showControls && onDoubleClick && (
        <button
          onClick={(e) => { e.stopPropagation(); onDoubleClick() }}
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            zIndex: 20,
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
          title="Open full player"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </button>
      )}
    </div>
  )
}

// Full-screen modal player component
function VideoPlayerModal({
  isOpen,
  onClose,
  videoUrl,
  caption,
  captionStyle,
}: {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  caption: string
  captionStyle: CaptionStyle
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const animationRef = useRef<number>()
  const timelineRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubTime, setScrubTime] = useState(0)

  // Mount check for hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Helper to convert hex to rgb
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 0, b: 0 }
  }

  // Render frame with caption burned in
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !video || !ctx) return

    const canvasWidth = 1080
    const canvasHeight = 1920

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    if (video.readyState >= 2) {
      const videoAspect = video.videoWidth / video.videoHeight
      const canvasAspect = canvasWidth / canvasHeight

      let drawWidth = canvasWidth
      let drawHeight = canvasHeight
      let offsetX = 0
      let offsetY = 0

      if (videoAspect > canvasAspect) {
        drawHeight = canvasHeight
        drawWidth = canvasHeight * videoAspect
        offsetX = -(drawWidth - canvasWidth) / 2
      } else {
        drawWidth = canvasWidth
        drawHeight = canvasWidth / videoAspect
        offsetY = -(drawHeight - canvasHeight) / 2
      }

      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight)
    }

    // Draw caption
    if (caption) {
      const charsPerLine = Math.round(35 * captionStyle.widthPercent / 0.8) || 25
      const lines = wrapText(caption, charsPerLine).split('\n')
      const fontSize = Math.max(24, Math.floor((captionStyle.fontSize || 16) * 1.5))
      const lineSpacing = Math.max(12, Math.floor(fontSize * 0.5))
      const padding = captionStyle.paddingPx || 20

      ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
      const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
      const textHeight = lines.length * fontSize + (lines.length - 1) * lineSpacing
      const boxWidth = maxLineWidth + padding * 2
      const boxHeight = textHeight + padding * 2

      const centerX = canvasWidth * captionStyle.xPercent
      const centerY = canvasHeight * captionStyle.yPercent
      const rotation = (captionStyle.rotation || 0) * Math.PI / 180

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(rotation)

      const bgOpacity = captionStyle.backgroundOpacity ?? 0.7
      const rgb = hexToRgb(captionStyle.backgroundColor || '#000000')
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${bgOpacity})`
      ctx.beginPath()
      ctx.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 12)
      ctx.fill()

      ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = captionStyle.textColor || '#ffffff'

      const startY = -textHeight / 2 + fontSize / 2
      lines.forEach((line, i) => {
        ctx.fillText(line, 0, startY + i * (fontSize + lineSpacing))
      })

      ctx.restore()
    }

    animationRef.current = requestAnimationFrame(renderFrame)
  }, [caption, captionStyle])

  useEffect(() => {
    if (isOpen) {
      renderFrame()
      const video = videoRef.current
      if (video) {
        video.currentTime = 0
        video.play().catch(() => {})
      }
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [isOpen, renderFrame])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleLoadedMetadata = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => { setIsPlaying(false); video.currentTime = 0 }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [videoUrl])

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) video.pause()
    else video.play()
  }

  // Handle timeline scrubbing - smooth drag without stuttering
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration <= 0) return
    e.preventDefault()
    e.stopPropagation()
    setIsScrubbing(true)

    const rect = timelineRef.current.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = frac * duration
    setScrubTime(newTime)
  }

  useEffect(() => {
    if (!isScrubbing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current || duration <= 0) return
      const rect = timelineRef.current.getBoundingClientRect()
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const newTime = frac * duration
      setScrubTime(newTime)
    }

    const handleMouseUp = () => {
      setIsScrubbing(false)
      // Apply the seek when scrubbing ends
      const video = videoRef.current
      if (video) {
        video.currentTime = scrubTime
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isScrubbing, duration, scrubTime])

  // Click to seek (instant)
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration <= 0) return
    const rect = timelineRef.current.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = frac * duration

    const video = videoRef.current
    if (video) {
      video.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const newVolume = parseFloat(e.target.value)
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get caption lines
  const charsPerLine = Math.round(35 * captionStyle.widthPercent / 0.8) || 25
  const lines = caption ? wrapText(caption, charsPerLine).split('\n') : []

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '400px',
          width: '90%',
          aspectRatio: '9/16',
          backgroundColor: '#000',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 20,
            background: 'rgba(0,0,0,0.5)',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          <X size={18} />
        </button>

        {/* Hidden video for audio */}
        {isMounted && (
          <video
            ref={videoRef}
            src={videoUrl}
            style={{ display: 'none' }}
            playsInline
            preload="auto"
          />
        )}

        {/* Canvas with burned-in captions */}
        <canvas
          ref={canvasRef}
          width={1080}
          height={1920}
          onClick={togglePlayPause}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: 'pointer',
          }}
        />

        {/* Play/Pause overlay */}
        {!isPlaying && (
          <div
            onClick={togglePlayPause}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          </div>
        )}

        {/* Controls bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
            padding: '30px 16px 16px',
            zIndex: 15,
          }}
        >
          {/* Timeline - Custom div-based for smooth scrubbing */}
          <div style={{ marginBottom: 12 }}>
            <div
              ref={timelineRef}
              onMouseDown={handleTimelineMouseDown}
              onClick={!isScrubbing ? handleTimelineClick : undefined}
              style={{
                width: '100%',
                height: 8,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 4,
                cursor: 'pointer',
                position: 'relative',
                userSelect: 'none',
              }}
            >
              {/* Progress bar */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${duration > 0 ? ((isScrubbing ? scrubTime : currentTime) / duration) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
                  borderRadius: 4,
                  transition: isScrubbing ? 'none' : 'width 0.1s linear',
                  pointerEvents: 'none',
                }}
              />
              {/* Scrubber handle */}
              <div
                style={{
                  position: 'absolute',
                  left: `${duration > 0 ? ((isScrubbing ? scrubTime : currentTime) / duration) * 100 : 0}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'white',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  transition: isScrubbing ? 'none' : 'left 0.1s linear',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          {/* Controls row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <button
              onClick={togglePlayPause}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>

            <span style={{
              color: 'white',
              fontSize: 13,
              fontFamily: 'monospace',
            }}>
              {formatTime(isScrubbing ? scrubTime : currentTime)} / {formatTime(duration)}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={toggleMute}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isMuted || volume === 0 ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" stroke="white" strokeWidth="2" fill="none"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="white" strokeWidth="2" fill="none"/>
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{
                  width: 70,
                  height: 4,
                  appearance: 'none',
                  background: `linear-gradient(to right, white ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) ${(isMuted ? 0 : volume) * 100}%)`,
                  borderRadius: 2,
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Stitched video preview - plays creator video first, then demo video
function StitchedVideoPreview({
  creatorVideoUrl,
  demoVideoUrl,
  caption,
  captionStyle,
  onCaptionStyleChange,
  isModalOpen: externalModalOpen,
  onModalOpenChange,
}: {
  creatorVideoUrl: string | null | undefined
  demoVideoUrl: string
  caption: string
  captionStyle: CaptionStyle
  onCaptionStyleChange?: (updates: Partial<CaptionStyle>) => void
  isModalOpen?: boolean
  onModalOpenChange?: (open: boolean) => void
}) {
  const [internalModalOpen, setInternalModalOpen] = useState(false)
  const isModalOpen = externalModalOpen ?? internalModalOpen
  const setIsModalOpen = onModalOpenChange ?? setInternalModalOpen

  const [currentPhase, setCurrentPhase] = useState<'creator' | 'demo'>('creator')
  const creatorVideoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const demoVideoRef = useRef<HTMLVideoElement>(null)
  const animationRef = useRef<number>()
  const containerRef = useRef<HTMLDivElement>(null)

  const [localStyle, setLocalStyle] = useState(captionStyle)
  const [interactionMode, setInteractionMode] = useState<'none' | 'drag' | 'resize' | 'rotate'>('none')
  const [isMounted, setIsMounted] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0, startFontSize: 0, startRotation: 0 })

  // Mount check for hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Sync style from props
  useEffect(() => {
    if (interactionMode === 'none') {
      setLocalStyle(captionStyle)
    }
  }, [captionStyle, interactionMode])

  // Determine which video is currently active
  const activeVideoRef = currentPhase === 'creator' && creatorVideoUrl ? creatorVideoRef : demoVideoRef

  // Helper to convert hex to rgb
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 0, b: 0 }
  }

  // Render video frame with caption burned in - CAPTIONS ON ENTIRE VIDEO
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    const video = activeVideoRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !video || !ctx) return

    const canvasWidth = 1080
    const canvasHeight = 1920

    // Clear and draw video
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    if (video.readyState >= 2) {
      const videoAspect = video.videoWidth / video.videoHeight
      const canvasAspect = canvasWidth / canvasHeight

      let drawWidth = canvasWidth
      let drawHeight = canvasHeight
      let offsetX = 0
      let offsetY = 0

      if (videoAspect > canvasAspect) {
        drawHeight = canvasHeight
        drawWidth = canvasHeight * videoAspect
        offsetX = -(drawWidth - canvasWidth) / 2
      } else {
        drawWidth = canvasWidth
        drawHeight = canvasWidth / videoAspect
        offsetY = -(drawHeight - canvasHeight) / 2
      }

      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight)
    }

    // Draw caption burned into the frame - ON BOTH CREATOR AND DEMO
    if (caption) {
      const charsPerLine = Math.round(35 * localStyle.widthPercent / 0.8) || 25
      const wrappedText = wrapText(caption, charsPerLine)
      const lines = wrappedText.split('\n')
      const fontSize = Math.max(24, Math.floor((localStyle.fontSize || 16) * 1.5))
      const lineSpacing = Math.max(12, Math.floor(fontSize * 0.5))
      const padding = localStyle.paddingPx || 20

      ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
      const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
      const textHeight = lines.length * fontSize + (lines.length - 1) * lineSpacing
      const boxWidth = maxLineWidth + padding * 2
      const boxHeight = textHeight + padding * 2

      const centerX = canvasWidth * localStyle.xPercent
      const centerY = canvasHeight * localStyle.yPercent
      const rotation = (localStyle.rotation || 0) * Math.PI / 180

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(rotation)

      // Draw background
      const bgOpacity = localStyle.backgroundOpacity ?? 0.7
      const rgb = hexToRgb(localStyle.backgroundColor || '#000000')
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${bgOpacity})`

      const radius = 12
      ctx.beginPath()
      ctx.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, radius)
      ctx.fill()

      // Draw text
      ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = localStyle.textColor || '#ffffff'

      const startY = -textHeight / 2 + fontSize / 2
      lines.forEach((line, i) => {
        ctx.fillText(line, 0, startY + i * (fontSize + lineSpacing))
      })

      ctx.restore()

      // Draw selection handles (only in edit mode)
      if (onCaptionStyleChange) {
        ctx.save()
        ctx.translate(centerX, centerY)
        ctx.rotate(rotation)

        // Border
        ctx.strokeStyle = '#3B82F6'
        ctx.lineWidth = 3
        ctx.strokeRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight)

        // Corner handles
        const handleSize = 12
        const corners = [
          { x: -boxWidth / 2, y: -boxHeight / 2 },
          { x: boxWidth / 2, y: -boxHeight / 2 },
          { x: -boxWidth / 2, y: boxHeight / 2 },
          { x: boxWidth / 2, y: boxHeight / 2 },
        ]
        corners.forEach(corner => {
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize)
          ctx.strokeStyle = '#3B82F6'
          ctx.lineWidth = 2
          ctx.strokeRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize)
        })

        ctx.restore()
      }
    }
  }, [caption, localStyle, onCaptionStyleChange, activeVideoRef])

  // Animation loop - pause when modal is open
  useEffect(() => {
    if (isModalOpen) return // Don't animate when modal is open

    let isRunning = true

    const animate = () => {
      if (!isRunning) return
      renderFrame()
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      isRunning = false
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [renderFrame, isModalOpen])

  // Handle video transitions - pause videos when modal is open
  useEffect(() => {
    const creatorVideo = creatorVideoRef.current
    const demoVideo = demoVideoRef.current

    // Pause all videos when modal opens
    if (isModalOpen) {
      if (creatorVideo) creatorVideo.pause()
      if (demoVideo) demoVideo.pause()
      return
    }

    if (!creatorVideoUrl) {
      // No creator video, just play demo
      setCurrentPhase('demo')
      if (demoVideo) {
        demoVideo.muted = true
        demoVideo.loop = true
        demoVideo.play().catch(() => {})
      }
      return
    }

    // Start with creator video
    setCurrentPhase('creator')

    const handleCreatorEnded = () => {
      setCurrentPhase('demo')
      if (demoVideo) {
        demoVideo.currentTime = 0
        demoVideo.play().catch(() => {})
      }
    }

    const handleDemoEnded = () => {
      // Loop back to creator
      setCurrentPhase('creator')
      if (creatorVideo) {
        creatorVideo.currentTime = 0
        creatorVideo.play().catch(() => {})
      }
    }

    if (creatorVideo) {
      creatorVideo.muted = true
      creatorVideo.loop = false
      creatorVideo.addEventListener('ended', handleCreatorEnded)
      creatorVideo.play().catch(() => {})
    }

    if (demoVideo) {
      demoVideo.muted = true
      demoVideo.loop = false
      demoVideo.addEventListener('ended', handleDemoEnded)
    }

    return () => {
      if (creatorVideo) {
        creatorVideo.removeEventListener('ended', handleCreatorEnded)
      }
      if (demoVideo) {
        demoVideo.removeEventListener('ended', handleDemoEnded)
      }
    }
  }, [creatorVideoUrl, demoVideoUrl, isModalOpen])

  // Get caption bounds for hit testing
  const getCaptionBounds = useCallback(() => {
    if (!caption || !canvasRef.current) return null

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = 1080 / rect.width
    const scaleY = 1920 / rect.height

    const charsPerLine = Math.round(35 * localStyle.widthPercent / 0.8) || 25
    const lines = wrapText(caption, charsPerLine).split('\n')
    const fontSize = Math.max(24, Math.floor((localStyle.fontSize || 16) * 1.5))
    const lineSpacing = Math.max(12, Math.floor(fontSize * 0.5))
    const padding = localStyle.paddingPx || 20

    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
    const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
    const textHeight = lines.length * fontSize + (lines.length - 1) * lineSpacing
    const boxWidth = maxLineWidth + padding * 2
    const boxHeight = textHeight + padding * 2

    return { boxWidth, boxHeight, scaleX, scaleY }
  }, [caption, localStyle])

  // Get interaction mode from mouse position
  const getInteractionMode = useCallback((mouseX: number, mouseY: number): 'none' | 'drag' | 'resize' | 'rotate' => {
    if (!caption || !onCaptionStyleChange) return 'none'

    const bounds = getCaptionBounds()
    if (!bounds) return 'none'

    const { boxWidth, boxHeight, scaleX, scaleY } = bounds
    const canvasX = mouseX * scaleX
    const canvasY = mouseY * scaleY

    const centerX = 1080 * localStyle.xPercent
    const centerY = 1920 * localStyle.yPercent
    const rotation = (localStyle.rotation || 0) * Math.PI / 180

    const dx = canvasX - centerX
    const dy = canvasY - centerY
    const localX = dx * Math.cos(-rotation) - dy * Math.sin(-rotation)
    const localY = dx * Math.sin(-rotation) + dy * Math.cos(-rotation)

    // Check corners
    const corners = [
      { x: -boxWidth / 2, y: -boxHeight / 2 },
      { x: boxWidth / 2, y: -boxHeight / 2 },
      { x: -boxWidth / 2, y: boxHeight / 2 },
      { x: boxWidth / 2, y: boxHeight / 2 },
    ]
    for (const corner of corners) {
      if (Math.sqrt((localX - corner.x) ** 2 + (localY - corner.y) ** 2) < 30) return 'resize'
    }

    // Check inside box
    if (Math.abs(localX) < boxWidth / 2 && Math.abs(localY) < boxHeight / 2) return 'drag'

    return 'none'
  }, [caption, localStyle, getCaptionBounds, onCaptionStyleChange])

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current || !onCaptionStyleChange) return

    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const mode = getInteractionMode(mouseX, mouseY)
    if (mode === 'none') return

    e.preventDefault()
    e.stopPropagation()
    setInteractionMode(mode)

    const bounds = getCaptionBounds()
    if (!bounds) return

    dragStartRef.current = {
      x: mouseX * bounds.scaleX,
      y: mouseY * bounds.scaleY,
      startX: localStyle.xPercent,
      startY: localStyle.yPercent,
      startFontSize: localStyle.fontSize || 16,
      startRotation: localStyle.rotation || 0,
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (interactionMode === 'none' || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const bounds = getCaptionBounds()
    if (!bounds) return

    const mouseX = (e.clientX - rect.left) * bounds.scaleX
    const mouseY = (e.clientY - rect.top) * bounds.scaleY

    if (interactionMode === 'drag') {
      const deltaX = (mouseX - dragStartRef.current.x) / 1080
      const deltaY = (mouseY - dragStartRef.current.y) / 1920
      const newX = Math.max(0.1, Math.min(0.9, dragStartRef.current.startX + deltaX))
      const newY = Math.max(0.1, Math.min(0.9, dragStartRef.current.startY + deltaY))
      setLocalStyle(prev => ({ ...prev, xPercent: newX, yPercent: newY }))
    } else if (interactionMode === 'resize') {
      const centerX = 1080 * dragStartRef.current.startX
      const centerY = 1920 * dragStartRef.current.startY
      const startDist = Math.sqrt((dragStartRef.current.x - centerX) ** 2 + (dragStartRef.current.y - centerY) ** 2)
      const currentDist = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2)
      const scale = startDist > 0 ? currentDist / startDist : 1
      const newFontSize = Math.max(12, Math.min(48, dragStartRef.current.startFontSize * scale))
      setLocalStyle(prev => ({ ...prev, fontSize: newFontSize }))
    }
  }, [interactionMode, getCaptionBounds])

  const handleMouseUp = useCallback(() => {
    if (interactionMode !== 'none') {
      onCaptionStyleChange?.(localStyle)
      setInteractionMode('none')
    }
  }, [interactionMode, localStyle, onCaptionStyleChange])

  // Global mouse listeners
  useEffect(() => {
    if (interactionMode !== 'none') {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [interactionMode, handleMouseMove, handleMouseUp])

  return (
    <div style={{ width: '100%', maxWidth: '200px', margin: '0 auto' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          aspectRatio: '9/16',
          position: 'relative',
          backgroundColor: '#000',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
        onDoubleClick={() => setIsModalOpen(true)}
      >
        {/* Hidden video elements */}
        {isMounted && creatorVideoUrl && (
          <video
            ref={creatorVideoRef}
            src={creatorVideoUrl}
            style={{ display: 'none' }}
            playsInline
            muted
            preload="auto"
            crossOrigin="anonymous"
          />
        )}
        {isMounted && (
          <video
            ref={demoVideoRef}
            src={demoVideoUrl}
            style={{ display: 'none' }}
            playsInline
            muted
            preload="auto"
            crossOrigin="anonymous"
          />
        )}

        {/* Canvas with video + burned-in captions */}
        <canvas
          ref={canvasRef}
          width={1080}
          height={1920}
          onMouseDown={handleMouseDown}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            backgroundColor: '#000',
            cursor: onCaptionStyleChange ? 'pointer' : 'default',
          }}
        />

        {/* Phase indicator */}
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          padding: '4px 8px',
          backgroundColor: currentPhase === 'creator' ? 'rgba(59, 130, 246, 0.9)' : 'rgba(16, 185, 129, 0.9)',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '600',
          color: 'white',
          textTransform: 'uppercase',
        }}>
          {currentPhase === 'creator' ? 'Creator' : 'Demo'}
        </div>

        {/* REMOVED: Play button - no longer showing */}
      </div>

      {/* Full player modal - shows stitched video */}
      <StitchedVideoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        creatorVideoUrl={creatorVideoUrl}
        demoVideoUrl={demoVideoUrl}
        caption={caption}
        captionStyle={captionStyle}
      />
    </div>
  )
}

// Stitched video modal player - SIMPLIFIED VERSION
function StitchedVideoModal({
  isOpen,
  onClose,
  creatorVideoUrl,
  demoVideoUrl,
  caption,
  captionStyle,
}: {
  isOpen: boolean
  onClose: () => void
  creatorVideoUrl: string | null | undefined
  demoVideoUrl: string
  caption: string
  captionStyle: CaptionStyle
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const creatorVideoRef = useRef<HTMLVideoElement>(null)
  const demoVideoRef = useRef<HTMLVideoElement>(null)
  const animationRef = useRef<number | null>(null)

  // All state
  const [phase, setPhase] = useState<'creator' | 'demo'>(creatorVideoUrl ? 'creator' : 'demo')
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [creatorDur, setCreatorDur] = useState(0)
  const [demoDur, setDemoDur] = useState(0)
  const [muted, setMuted] = useState(false)
  const [vol, setVol] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Mount check for hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Refs to avoid stale closures in event handlers
  const mutedRef = useRef(muted)
  const volRef = useRef(vol)
  const creatorDurRef = useRef(creatorDur)

  // Keep refs in sync
  useEffect(() => { mutedRef.current = muted }, [muted])
  useEffect(() => { volRef.current = vol }, [vol])
  useEffect(() => { creatorDurRef.current = creatorDur }, [creatorDur])

  // Helper
  const hexToRgb = (hex: string) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : { r: 0, g: 0, b: 0 }
  }

  // Draw frame to canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const cVideo = creatorVideoRef.current
    const dVideo = demoVideoRef.current
    const video = (phase === 'creator' && creatorVideoUrl && cVideo) ? cVideo : dVideo

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, 1080, 1920)

    if (video && video.readyState >= 2) {
      const vAspect = video.videoWidth / video.videoHeight
      const cAspect = 1080 / 1920
      let dw = 1080, dh = 1920, ox = 0, oy = 0
      if (vAspect > cAspect) {
        dw = 1920 * vAspect
        ox = -(dw - 1080) / 2
      } else {
        dh = 1080 / vAspect
        oy = -(dh - 1920) / 2
      }
      ctx.drawImage(video, ox, oy, dw, dh)
    }

    // Caption on entire video
    if (caption) {
      const chars = Math.round(35 * captionStyle.widthPercent / 0.8) || 25
      const lines = wrapText(caption, chars).split('\n')
      const fs = Math.max(24, Math.floor((captionStyle.fontSize || 16) * 1.5))
      const ls = Math.max(12, Math.floor(fs * 0.5))
      const pad = captionStyle.paddingPx || 20

      ctx.font = `600 ${fs}px system-ui, -apple-system, sans-serif`
      const maxW = Math.max(...lines.map(l => ctx.measureText(l).width))
      const th = lines.length * fs + (lines.length - 1) * ls
      const bw = maxW + pad * 2, bh = th + pad * 2
      const cx = 1080 * captionStyle.xPercent, cy = 1920 * captionStyle.yPercent
      const rot = (captionStyle.rotation || 0) * Math.PI / 180

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rot)
      const rgb = hexToRgb(captionStyle.backgroundColor || '#000000')
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${captionStyle.backgroundOpacity ?? 0.7})`
      ctx.beginPath()
      ctx.roundRect(-bw/2, -bh/2, bw, bh, 12)
      ctx.fill()
      ctx.font = `600 ${fs}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = captionStyle.textColor || '#ffffff'
      const startY = -th/2 + fs/2
      lines.forEach((l, i) => ctx.fillText(l, 0, startY + i * (fs + ls)))
      ctx.restore()
    }
  }, [phase, creatorVideoUrl, caption, captionStyle])

  // Animation loop
  useEffect(() => {
    if (!isOpen) return
    let running = true
    const loop = () => {
      if (!running) return
      draw()
      animationRef.current = requestAnimationFrame(loop)
    }
    loop()
    return () => {
      running = false
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [isOpen, draw])

  // Time update
  useEffect(() => {
    if (!isOpen || dragging) return
    const interval = setInterval(() => {
      const cVideo = creatorVideoRef.current
      const dVideo = demoVideoRef.current
      if (phase === 'creator' && cVideo && creatorVideoUrl) {
        setTime(cVideo.currentTime)
      } else if (dVideo) {
        setTime(creatorDur + dVideo.currentTime)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [isOpen, phase, creatorDur, dragging, creatorVideoUrl])

  // Setup on open
  useEffect(() => {
    if (!isOpen) {
      setTime(0)
      setPlaying(false)
      setPhase(creatorVideoUrl ? 'creator' : 'demo')
      return
    }

    const cVideo = creatorVideoRef.current
    const dVideo = demoVideoRef.current

    const init = async () => {
      console.log('[Modal] Initializing video player...')
      // Get durations
      let cDur = 0, dDur = 0

      if (cVideo && creatorVideoUrl) {
        console.log('[Modal] Loading creator video:', creatorVideoUrl)
        await new Promise<void>(r => {
          if (cVideo.readyState >= 1) r()
          else cVideo.onloadedmetadata = () => r()
        })
        cDur = cVideo.duration || 0
        setCreatorDur(cDur)
        creatorDurRef.current = cDur
        console.log('[Modal] Creator duration:', cDur)
      }

      if (dVideo) {
        console.log('[Modal] Loading demo video:', demoVideoUrl)
        await new Promise<void>(r => {
          if (dVideo.readyState >= 1) r()
          else dVideo.onloadedmetadata = () => r()
        })
        dDur = dVideo.duration || 0
        setDemoDur(dDur)
        console.log('[Modal] Demo duration:', dDur)
      }

      setDuration(cDur + dDur)
      console.log('[Modal] Total duration:', cDur + dDur)

      // Start playback
      if (creatorVideoUrl && cVideo) {
        console.log('[Modal] Starting with creator video')
        setPhase('creator')
        cVideo.currentTime = 0
        cVideo.muted = false
        cVideo.volume = volRef.current
        if (dVideo) {
          dVideo.muted = true
          dVideo.pause()
        }
        try {
          await cVideo.play()
          console.log('[Modal] Creator video playing')
          setPlaying(true)
        } catch (err) {
          console.error('[Modal] Creator video play error:', err)
        }
      } else if (dVideo) {
        console.log('[Modal] Starting with demo video (no creator)')
        setPhase('demo')
        dVideo.currentTime = 0
        dVideo.muted = false
        dVideo.volume = volRef.current
        try {
          await dVideo.play()
          console.log('[Modal] Demo video playing')
          setPlaying(true)
        } catch (err) {
          console.error('[Modal] Demo video play error:', err)
        }
      }
    }

    // Ended handlers - use refs to avoid stale closures
    const onCreatorEnd = () => {
      console.log('[Modal] Creator video ended, transitioning to demo')
      const dVideo = demoVideoRef.current
      const cVideo = creatorVideoRef.current
      setPhase('demo')
      if (cVideo) {
        cVideo.muted = true
        cVideo.pause()
      }
      if (dVideo) {
        dVideo.currentTime = 0
        dVideo.muted = mutedRef.current
        dVideo.volume = volRef.current
        dVideo.play().then(() => {
          console.log('[Modal] Demo video started playing')
        }).catch(err => {
          console.error('[Modal] Demo video play error:', err)
        })
      }
    }

    const onDemoEnd = () => {
      setPlaying(false)
      setPhase(creatorVideoUrl ? 'creator' : 'demo')
      if (cVideo) cVideo.currentTime = 0
      if (dVideo) dVideo.currentTime = 0
      setTime(0)
    }

    if (cVideo && creatorVideoUrl) cVideo.addEventListener('ended', onCreatorEnd)
    if (dVideo) dVideo.addEventListener('ended', onDemoEnd)

    init()

    return () => {
      if (cVideo) {
        cVideo.removeEventListener('ended', onCreatorEnd)
        cVideo.pause()
      }
      if (dVideo) {
        dVideo.removeEventListener('ended', onDemoEnd)
        dVideo.pause()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, creatorVideoUrl])

  // Audio sync
  useEffect(() => {
    const cVideo = creatorVideoRef.current
    const dVideo = demoVideoRef.current
    if (cVideo) {
      cVideo.muted = phase !== 'creator' || muted
      cVideo.volume = vol
    }
    if (dVideo) {
      dVideo.muted = phase !== 'demo' || muted
      dVideo.volume = vol
    }
  }, [phase, muted, vol])

  const togglePlay = () => {
    const cVideo = creatorVideoRef.current
    const dVideo = demoVideoRef.current
    if (playing) {
      cVideo?.pause()
      dVideo?.pause()
      setPlaying(false)
    } else {
      const active = (phase === 'creator' && creatorVideoUrl && cVideo) ? cVideo : dVideo
      active?.play().catch(() => {})
      setPlaying(true)
    }
  }

  const seek = (t: number) => {
    const cVideo = creatorVideoRef.current
    const dVideo = demoVideoRef.current

    if (t < creatorDur && creatorVideoUrl && cVideo) {
      setPhase('creator')
      cVideo.currentTime = t
      cVideo.muted = muted
      cVideo.volume = vol
      if (dVideo) {
        dVideo.pause()
        dVideo.muted = true
      }
      if (playing) cVideo.play().catch(() => {})
    } else if (dVideo) {
      setPhase('demo')
      dVideo.currentTime = Math.max(0, t - creatorDur)
      dVideo.muted = muted
      dVideo.volume = vol
      if (cVideo) {
        cVideo.pause()
        cVideo.muted = true
      }
      if (playing) dVideo.play().catch(() => {})
    }
    setTime(t)
  }

  const fmt = (s: number) => `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`

  if (!isOpen) return null

  const pct = duration > 0 ? (time / duration) * 100 : 0

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <style>{`
        .mtl::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #3B82F6; cursor: pointer; border: 2px solid white; }
        .mtl::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #3B82F6; cursor: pointer; border: 2px solid white; }
        .mvl::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: white; cursor: pointer; }
        .mvl::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: white; cursor: pointer; border: none; }
      `}</style>
      <div
        style={{ position: 'relative', maxWidth: '400px', width: '90%', aspectRatio: '9/16', background: '#000', borderRadius: '16px', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, zIndex: 20, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
          <X size={18} />
        </button>

        {/* Phase */}
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 20, padding: '6px 12px', background: phase === 'creator' ? 'rgba(59,130,246,0.9)' : 'rgba(16,185,129,0.9)', borderRadius: 6, fontSize: 12, fontWeight: 600, color: 'white', textTransform: 'uppercase' }}>
          {phase === 'creator' ? 'Creator' : 'Demo'}
        </div>

        {/* Videos */}
        {isMounted && creatorVideoUrl && <video ref={creatorVideoRef} src={creatorVideoUrl} style={{ display: 'none' }} playsInline preload="auto" />}
        {isMounted && <video ref={demoVideoRef} src={demoVideoUrl} style={{ display: 'none' }} playsInline preload="auto" />}

        {/* Canvas */}
        <canvas ref={canvasRef} width={1080} height={1920} onClick={togglePlay} style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer' }} />

        {/* Play overlay */}
        {!playing && (
          <div onClick={togglePlay} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, cursor: 'pointer' }}>
            <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21" /></svg>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', padding: '30px 16px 16px', zIndex: 15 }}>
          {/* Timeline */}
          <input
            type="range"
            className="mtl"
            min={0}
            max={duration || 1}
            step={0.01}
            value={time}
            onInput={e => {
              const t = parseFloat((e.target as HTMLInputElement).value)
              setTime(t)
            }}
            onChange={e => {
              const t = parseFloat(e.target.value)
              seek(t)
            }}
            onMouseDown={() => setDragging(true)}
            onMouseUp={e => {
              setDragging(false)
              const t = parseFloat((e.target as HTMLInputElement).value)
              seek(t)
            }}
            onTouchStart={() => setDragging(true)}
            onTouchEnd={e => {
              setDragging(false)
              const t = parseFloat((e.target as HTMLInputElement).value)
              seek(t)
            }}
            style={{ width: '100%', height: 8, WebkitAppearance: 'none', appearance: 'none', background: `linear-gradient(to right, #3B82F6 ${pct}%, rgba(255,255,255,0.3) ${pct}%)`, borderRadius: 4, cursor: 'pointer', outline: 'none', marginBottom: 12 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Play/Pause */}
            <button onClick={togglePlay} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex' }}>
              {playing ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
              )}
            </button>

            {/* Time */}
            <span style={{ color: 'white', fontSize: 13, fontFamily: 'monospace', flex: 1 }}>{fmt(time)} / {fmt(duration)}</span>

            {/* Volume */}
            <button onClick={() => setMuted(!muted)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
              {muted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z" fill="white"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              )}
            </button>
            <input
              type="range"
              className="mvl"
              min={0}
              max={1}
              step={0.1}
              value={muted ? 0 : vol}
              onChange={e => { const v = parseFloat(e.target.value); setVol(v); setMuted(v === 0); }}
              style={{ width: 60, height: 4, WebkitAppearance: 'none', appearance: 'none', background: `linear-gradient(to right, white ${(muted ? 0 : vol) * 100}%, rgba(255,255,255,0.3) ${(muted ? 0 : vol) * 100}%)`, borderRadius: 2, cursor: 'pointer', outline: 'none' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Preview component with captions - uses canvas-based rendering
function PreviewWithCaptions({
  videoUrl,
  caption,
  captionStyle,
  onCaptionStyleChange,
  creatorVideoUrl,
}: {
  videoUrl: string
  caption: string
  captionStyle: CaptionStyle
  onCaptionStyleChange?: (updates: Partial<CaptionStyle>) => void
  creatorVideoUrl?: string | null
}) {
  // If there's a creator video, use the stitched preview
  if (creatorVideoUrl) {
    return (
      <StitchedVideoPreview
        creatorVideoUrl={creatorVideoUrl}
        demoVideoUrl={videoUrl}
        caption={caption}
        captionStyle={captionStyle}
        onCaptionStyleChange={onCaptionStyleChange}
      />
    )
  }

  // Otherwise use original single-video preview
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div style={{ width: '100%', maxWidth: '200px', margin: '0 auto' }}>
      <CanvasVideoPreview
        videoUrl={videoUrl}
        caption={caption}
        captionStyle={captionStyle}
        onCaptionStyleChange={onCaptionStyleChange}
        autoPlay={true}
        showControls={false}
        onDoubleClick={() => setIsModalOpen(true)}
      />

      {/* Full player modal */}
      <VideoPlayerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        videoUrl={videoUrl}
        caption={caption}
        captionStyle={captionStyle}
      />
    </div>
  )
}

// Normalize caption style to ensure required properties exist
const normalizeCaptionStyle = (style: CaptionStyle): CaptionStyle => {
  if (style.xPercent !== undefined && style.yPercent !== undefined && style.widthPercent !== undefined) {
    return {
      ...style,
      xPercent: style.xPercent ?? 0.5,
      yPercent: style.yPercent ?? 0.85,
      widthPercent: style.widthPercent ?? 0.8,
      paddingPx: style.paddingPx ?? 20,
    }
  }

  let xPercent = 0.5
  let yPercent = 0.85
  const widthPercent = 0.8
  const paddingPx = 20

  if (style.position === 'custom' && style.customX !== undefined && style.customY !== undefined) {
    xPercent = style.customX / 1080
    yPercent = style.customY / 1920
  } else if (style.position === 'top') {
    yPercent = 0.15
  } else if (style.position === 'center') {
    yPercent = 0.5
  } else {
    yPercent = 0.85
  }

  return { ...style, xPercent, yPercent, widthPercent, paddingPx }
}

// Thumbnail Canvas Component - Renders video frame with embedded caption
function ThumbnailCanvas({ 
  videoUrl, 
  caption, 
  captionStyle, 
  aspectRatio 
}: { 
  videoUrl?: string
  caption: string
  captionStyle: CaptionStyle
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5'
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Mount check for hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const getCanvasDimensions = () => {
    switch (aspectRatio) {
      case '16:9': return { width: 1920, height: 1080 }
      case '1:1': return { width: 1080, height: 1080 }
      case '4:5': return { width: 1080, height: 1350 }
      case '9:16':
      default: return { width: 1080, height: 1920 }
    }
  }

  const canvasDims = getCanvasDimensions()
  const canvasWidth = canvasDims.width
  const canvasHeight = canvasDims.height

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: false })
    const video = videoRef.current
    if (!canvas || !ctx || !video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const videoAspect = video.videoWidth / video.videoHeight
    const canvasAspect = canvasWidth / canvasHeight

    let drawWidth = canvasWidth
    let drawHeight = canvasHeight
    let offsetX = 0
    let offsetY = 0

    if (videoAspect > canvasAspect) {
      drawHeight = canvasHeight
      drawWidth = canvasHeight * videoAspect
      offsetX = -(drawWidth - canvasWidth) / 2
    } else {
      drawWidth = canvasWidth
      drawHeight = canvasWidth / videoAspect
      offsetY = -(drawHeight - canvasHeight) / 2
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight)

    if (caption) {
      const style = normalizeCaptionStyle(captionStyle)
      const charsPerLine = Math.round(35 * style.widthPercent / 0.8) || 25
      const wrappedText = wrapText(caption, charsPerLine)
      const lines = wrappedText.split('\n')
      const fontSize = Math.max(24, Math.floor((style.fontSize || 16) * 1.5))
      const lineSpacing = Math.max(12, Math.floor(fontSize * 0.5))
      const padding = style.paddingPx || 20

      ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
      const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
      const textHeight = lines.length * fontSize + (lines.length - 1) * lineSpacing
      const boxWidth = maxLineWidth + padding * 2
      const boxHeight = textHeight + padding * 2

      const centerX = canvasWidth * style.xPercent
      const centerY = canvasHeight * style.yPercent
      const rotation = (style.rotation || 0) * Math.PI / 180

      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(rotation)

      const bgOpacity = style.backgroundOpacity ?? 0.7
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result
          ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
          : { r: 0, g: 0, b: 0 }
      }
      const rgb = hexToRgb(style.backgroundColor || '#000000')
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${bgOpacity})`

      const radius = 12
      const x = -boxWidth / 2
      const y = -boxHeight / 2
      const w = boxWidth
      const h = boxHeight
      
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + w - radius, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
      ctx.lineTo(x + w, y + h - radius)
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
      ctx.lineTo(x + radius, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
      ctx.fill()

      ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = style.textColor || '#ffffff'

      const startY = -textHeight / 2 + fontSize / 2
      lines.forEach((line, i) => {
        ctx.fillText(line, 0, startY + i * (fontSize + lineSpacing))
      })

      ctx.restore()
    }
  }, [caption, captionStyle, canvasWidth, canvasHeight])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoUrl) return

    let hasRendered = false
    const attemptRender = () => {
      if (hasRendered) return
      if (video.readyState >= 2 && video.videoWidth > 0) {
        hasRendered = true
        renderFrame()
      }
    }

    const handleLoadedMetadata = () => {
      video.currentTime = 0.5
    }

    const handleLoadedData = () => {
      if (video.currentTime !== 0.5) {
        video.currentTime = 0.5
      } else {
        attemptRender()
      }
    }

    const handleSeeked = () => {
      attemptRender()
    }

    const handleCanPlay = () => {
      attemptRender()
    }

    // Add multiple event listeners to catch different loading states
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('seeked', handleSeeked)
    video.addEventListener('canplay', handleCanPlay)
    
    // If video is already loaded, try to render immediately
    if (video.readyState >= 2) {
      if (video.videoWidth > 0) {
        video.currentTime = 0.5
      } else {
        // Wait a bit for video dimensions to be available
        setTimeout(() => {
          if (video.videoWidth > 0) {
            video.currentTime = 0.5
          }
        }, 100)
      }
    }

    // Fallback: try rendering after a delay even if events don't fire
    const fallbackTimer = setTimeout(() => {
      attemptRender()
    }, 500)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('canplay', handleCanPlay)
      clearTimeout(fallbackTimer)
    }
  }, [videoUrl, renderFrame])

  useEffect(() => {
    renderFrame()
  }, [caption, captionStyle, renderFrame])

  return (
    <div
      style={{
        aspectRatio: '9/16',
        backgroundColor: '#000',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
      }}
    >
      {isMounted && videoUrl && (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            style={{ display: 'none' }}
            muted
            playsInline
            preload="auto"
          />
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </>
      )}
    </div>
  )
}

interface SimpleUGCGeneratorProps {
  onGenerate?: (variants: Variant[]) => void
}

const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  textColor: '#FFFFFF',
  backgroundColor: '#000000',
  backgroundOpacity: 0.7,
  fontSize: 24,
  xPercent: 0.5,
  yPercent: 0.85,
  widthPercent: 0.9,
  paddingPx: 12,
}

export default function SimpleUGCGenerator({ onGenerate }: SimpleUGCGeneratorProps) {
  // State
  const [demos, setDemos] = useState<DemoVideo[]>([])
  const [selectedCreators, setSelectedCreators] = useState<string[]>([])
  const [hook, setHook] = useState('')
  const [captionsPerCombo, setCaptionsPerCombo] = useState(3)
  const [variants, setVariants] = useState<Variant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(DEFAULT_CAPTION_STYLE)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 })
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set())
  const [isMounted, setIsMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isProcessingFilesRef = useRef(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Calculate total variants
  const totalVariants = demos.length * selectedCreators.length * captionsPerCombo

  // Get selected demo video
  const selectedDemo = selectedVariant 
    ? demos.find(d => d.id === selectedVariant.demoId) 
    : demos.length > 0 ? demos[0] : null

  // Handle file upload
  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return
    
    setUploading(true)
    const newDemos: DemoVideo[] = []

    for (const file of files) {
      const id = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const url = URL.createObjectURL(file)
      
      newDemos.push({
        id,
        name: file.name,
        url,
        file,
        uploadedAt: new Date(),
      })
    }

    setDemos(prev => [...prev, ...newDemos])
    setUploading(false)

    // Start async transcription
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const demoId = newDemos[i].id
      
      try {
        const formData = new FormData()
        formData.append('video', file)
        
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        })
        
        if (response.ok) {
          const { transcript } = await response.json()
          setDemos(prev => prev.map(d => 
            d.id === demoId ? { ...d, transcript } : d
          ))
        }
      } catch (error) {
        console.error('Transcription error:', error)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('video/')
    )
    await handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== FILE SELECT START ===')
    console.log('[Upload] Event type:', e.type)
    console.log('[Upload] Target:', e.target.tagName, e.target.id)
    console.log('[Upload] Files object:', e.target.files)
    console.log('[Upload] Files length:', e.target.files?.length)

    if (!e.target.files || e.target.files.length === 0) {
      console.log('[Upload] No files in event, returning')
      return
    }

    const files = Array.from(e.target.files)
    console.log('[Upload] Files array:', files.map(f => ({ name: f.name, type: f.type, size: f.size })))

    const videoFiles = files.filter(file => file.type.startsWith('video/'))
    console.log('[Upload] Video files after filter:', videoFiles.length)

    if (videoFiles.length === 0) {
      console.log('[Upload] No valid video files, resetting input')
      e.target.value = ''
      return
    }

    console.log('[Upload] Calling handleFiles with', videoFiles.length, 'files')
    handleFiles(videoFiles)

    // Reset input value after starting upload
    console.log('[Upload] Resetting input value')
    e.target.value = ''
    console.log('=== FILE SELECT END ===')
  }

  const triggerFileInput = () => {
    console.log('[Upload] triggerFileInput called')
    console.log('[Upload] fileInputRef.current:', fileInputRef.current)
    if (fileInputRef.current) {
      console.log('[Upload] Clicking file input')
      fileInputRef.current.click()
    } else {
      console.log('[Upload] fileInputRef is null!')
    }
  }

  // Toggle creator selection
  const toggleCreator = (id: string) => {
    if (selectedCreators.includes(id)) {
      setSelectedCreators(prev => prev.filter(c => c !== id))
    } else {
      if (selectedCreators.length < 3) {
        setSelectedCreators(prev => [...prev, id])
      }
    }
  }

  // Generate variants
  const handleGenerate = async () => {
    if (demos.length === 0 || selectedCreators.length === 0 || !hook.trim()) {
      alert('Please upload demos, select creators, and enter a hook')
      return
    }

    setIsGenerating(true)
    
    try {
      // Prepare demos for API
      const demosForAPI = demos.map(demo => ({
        id: demo.id,
        name: demo.name,
        transcript: demo.transcript || '',
      }))

      // Call the generate-captions API with the correct format
      const response = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demos: demosForAPI,
          creators: selectedCreators,
          productDescription: hook,
          audience: 'General audience',
          tone: 'Engaging and natural',
          captionsPerCombo: captionsPerCombo,
          captionLength: 'medium',
          subtitleEnabled: false,
          subtitleStyle: null,
        }),
      })

      if (response.ok) {
        const { variants: generatedVariants } = await response.json()
        
        // Update variants with caption style
        const newVariants = generatedVariants.map((v: Variant) => ({
          ...v,
          hook,
          captionStyleOverride: captionStyle,
        }))

        setVariants(newVariants)
        if (newVariants.length > 0) {
          setSelectedVariant(newVariants[0])
        }
        if (onGenerate) {
          onGenerate(newVariants)
        }
      } else {
        const errorData = await response.json()
        console.error('Generation error:', errorData)
        alert(`Failed to generate variants: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Generation error:', error)
      alert('Failed to generate variants')
    } finally {
      setIsGenerating(false)
    }
  }

  // Remove demo
  const removeDemo = (id: string) => {
    setDemos(prev => {
      const demo = prev.find(d => d.id === id)
      if (demo?.url) {
        URL.revokeObjectURL(demo.url)
      }
      return prev.filter(d => d.id !== id)
    })
    // Also remove variants using this demo
    setVariants(prev => prev.filter(v => v.demoId !== id))
    if (selectedVariant?.demoId === id) {
      setSelectedVariant(null)
    }
  }

  // Regenerate single caption
  const handleRegenerateCaption = async (variantId: string) => {
    const variant = variants.find(v => v.id === variantId)
    if (!variant) return

    setIsRegenerating(variantId)
    
    try {
      const demo = demos.find(d => d.id === variant.demoId)
      if (!demo) return

      const response = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demos: [{ id: demo.id, name: demo.name, transcript: demo.transcript || '' }],
          creators: [variant.creatorTemplateId || 'neutral'],
          productDescription: hook,
          audience: 'General audience',
          tone: 'Engaging and natural',
          captionsPerCombo: 1,
          captionLength: 'medium',
          subtitleEnabled: false,
          subtitleStyle: null,
        }),
      })

      if (response.ok) {
        const { variants: newVariants } = await response.json()
        if (newVariants && newVariants.length > 0) {
          const newCaption = newVariants[0].caption
          setVariants(prev => prev.map(v => 
            v.id === variantId ? { ...v, caption: newCaption } : v
          ))
          if (selectedVariant?.id === variantId) {
            setSelectedVariant({ ...selectedVariant, caption: newCaption })
          }
        }
      }
    } catch (error) {
      console.error('Regeneration error:', error)
    } finally {
      setIsRegenerating(null)
    }
  }

  // Update variant caption
  const handleCaptionUpdate = (variantId: string, updates: Partial<Variant>) => {
    setVariants(prev => prev.map(v => 
      v.id === variantId ? { ...v, ...updates } : v
    ))
    if (selectedVariant?.id === variantId) {
      setSelectedVariant({ ...selectedVariant, ...updates })
    }
  }

  // Helper function to fetch video file from URL
  const fetchVideoFile = async (url: string): Promise<File | null> => {
    try {
      const response = await fetch(url)
      if (!response.ok) return null
      const blob = await response.blob()
      const filename = url.split('/').pop() || 'video.mp4'
      return new File([blob], filename, { type: blob.type || 'video/mp4' })
    } catch (error) {
      console.error('Failed to fetch video:', error)
      return null
    }
  }

  // Toggle variant selection for export
  const toggleExportSelection = (variantId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedForExport(prev => {
      const newSet = new Set(prev)
      if (newSet.has(variantId)) {
        newSet.delete(variantId)
      } else {
        newSet.add(variantId)
      }
      return newSet
    })
  }

  // Select/deselect all variants for export
  const toggleSelectAll = () => {
    if (selectedForExport.size === variants.length) {
      setSelectedForExport(new Set())
    } else {
      setSelectedForExport(new Set(variants.map(v => v.id)))
    }
  }

  // Export videos with captions - all in one ZIP file
  const handleExport = async () => {
    const variantsToExport = selectedForExport.size > 0
      ? variants.filter(v => selectedForExport.has(v.id))
      : variants

    if (variantsToExport.length === 0) {
      alert('No variants selected for export')
      return
    }

    setIsExporting(true)
    setExportProgress({ current: 0, total: variantsToExport.length })

    try {
      const zip = new JSZip()
      const metadata: Array<{
        filename: string
        demoName: string
        creatorName: string
        caption: string
      }> = []

      // Process all variants and add to ZIP
      for (let i = 0; i < variantsToExport.length; i++) {
        const variant = variantsToExport[i]
        const demo = demos.find(d => d.id === variant.demoId)

        if (!demo?.file) {
          console.warn(`Demo not found for variant ${variant.id}`)
          continue
        }

        setExportProgress({ current: i + 1, total: variantsToExport.length })

        const formData = new FormData()
        formData.append('video', demo.file)
        formData.append('caption', variant.caption)
        formData.append('captionStyle', JSON.stringify(variant.captionStyleOverride || captionStyle))

        console.log('[Export] Processing variant:', variant.id)
        console.log('[Export] Demo file:', demo.file.name, demo.file.size)
        console.log('[Export] Caption:', variant.caption)
        console.log('[Export] Creator video URL:', variant.creatorVideoUrl)

        // If there's a creator video URL, fetch it and add to form data for stitching
        if (variant.creatorVideoUrl) {
          console.log('[Export] Fetching creator video from:', variant.creatorVideoUrl)
          try {
            const creatorVideoFile = await fetchVideoFile(variant.creatorVideoUrl)
            if (creatorVideoFile) {
              console.log('[Export] Creator video fetched successfully:', creatorVideoFile.name, creatorVideoFile.size)
              formData.append('creatorVideo', creatorVideoFile)
            } else {
              console.warn('[Export] Failed to fetch creator video, continuing without it')
            }
          } catch (error) {
            console.error('[Export] Error fetching creator video:', error)
            console.warn('[Export] Continuing without creator video')
          }
        } else {
          console.log('[Export] No creator video URL, exporting demo only')
        }

        console.log('[Export] Sending render request to API...')
        const response = await fetch('/api/render-video', {
          method: 'POST',
          body: formData,
        })

        console.log('[Export] API response status:', response.status, response.statusText)

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          console.error('[Export] API error response:', errorText)
          throw new Error(`Failed to render video ${i + 1}: ${response.statusText} - ${errorText}`)
        }

        console.log('[Export] Reading response blob...')
        const blob = await response.blob()
        console.log('[Export] Blob received, size:', blob.size)
        const safeDemoName = variant.demoName.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/gi, '_').substring(0, 30)
        const safeCreatorName = variant.creatorName.replace(/[^a-z0-9]/gi, '_')
        const filename = `${safeDemoName}_${safeCreatorName}_${i + 1}.mp4`

        // Add video to ZIP
        zip.file(filename, blob)

        // Add to metadata
        metadata.push({
          filename,
          demoName: variant.demoName,
          creatorName: variant.creatorName,
          caption: variant.caption,
        })

        // Small delay to prevent overwhelming the server
        if (i < variantsToExport.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      // Create CSV metadata file
      const csvContent = [
        ['Filename', 'Demo Name', 'Creator', 'Caption'].join(','),
        ...metadata.map(m => [
          m.filename,
          m.demoName,
          m.creatorName,
          `"${m.caption.replace(/"/g, '""')}"`,
        ].join(','))
      ].join('\n')

      zip.file('metadata.csv', csvContent)

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipUrl = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = zipUrl
      a.download = `ugc-videos-${Date.now()}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(zipUrl)

      alert(`Successfully exported ${variantsToExport.length} video(s) in ZIP file`)
    } catch (error) {
      console.error('Export error:', error)
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
      setExportProgress({ current: 0, total: 0 })
    }
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        /* Custom scrollbar styling */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #F1F5F9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
      `}</style>
      <div style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#F1F5F9',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        padding: '1.5rem',
        gap: '1.5rem',
      }}>
      {/* Left Panel - Controls */}
      <div style={{
        width: '360px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        flexShrink: 0,
      }}>

        {/* Scrollable Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
        }}
        className="custom-scrollbar"
        >
          {/* 1. Demos - First Step */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
              color: '#374151',
            }}>
              1. Demos
            </label>
            
            {/* Upload Area with Thumbnails */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={(e) => {
                console.log('[Upload] Container clicked')
                console.log('[Upload] Target element:', (e.target as HTMLElement).tagName)

                // Don't trigger if clicking on a thumbnail or its delete button
                const target = e.target as HTMLElement
                if (target.closest('[data-thumbnail]') || target.tagName === 'BUTTON' || target.closest('button')) {
                  console.log('[Upload] Clicked on thumbnail/button, ignoring')
                  return
                }

                // Prevent double-triggering from label
                if (target.tagName === 'LABEL' || target.closest('label')) {
                  console.log('[Upload] Clicked on label, letting label handle it')
                  return
                }

                console.log('[Upload] Triggering file input from container click')
                triggerFileInput()
              }}
              style={{
                border: `2px dashed ${isDragging ? '#3B82F6' : '#D1D5DB'}`,
                borderRadius: '6px',
                padding: demos.length > 0 ? '0.75rem' : '1.25rem',
                textAlign: demos.length > 0 ? 'left' : 'center',
                cursor: 'pointer',
                backgroundColor: isDragging ? '#EFF6FF' : 'transparent',
                transition: 'all 0.2s',
                minHeight: demos.length > 0 ? 'auto' : '80px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                position: 'relative',
              }}
            >
              {demos.length === 0 ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('[Upload] Empty state div clicked, triggering file input')
                    triggerFileInput()
                  }}
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
                >
                  <Plus style={{
                    width: '20px',
                    height: '20px',
                    color: '#9CA3AF',
                    marginBottom: '0.375rem',
                  }} />
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#6B7280',
                    margin: 0,
                  }}>
                    Click or drag to upload demos
                  </p>
                </div>
              ) : (
                <>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}>
                    {demos.map((demo) => (
                      <div
                        key={demo.id}
                        data-thumbnail="true"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'relative',
                          width: '60px',
                          height: '60px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid #E5E7EB',
                          flexShrink: 0,
                        }}
                      >
                        {isMounted && (
                          <video
                            src={demo.url}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            muted
                          />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeDemo(demo.id)
                          }}
                          style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            padding: '0.125rem',
                            border: 'none',
                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '18px',
                            height: '18px',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.9)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'
                          }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p style={{
                    fontSize: '0.6875rem',
                    color: '#9CA3AF',
                    margin: 0,
                    fontStyle: 'italic',
                  }}>
                    Click to add more videos
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                id="demo-video-upload"
                type="file"
                accept="video/*"
                multiple
                onChange={(e) => {
                  console.log('[Upload] Input onChange fired')
                  handleFileSelect(e)
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: -1,
                }}
              />
            </div>
          </div>

          {/* 2. Hook Input */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
              color: '#374151',
            }}>
              2. Hook
            </label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}>
              <input
                type="text"
                value={hook}
                onChange={(e) => setHook(e.target.value)}
                placeholder="Enter your hook text..."
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
              />
            </div>
          </div>

          {/* 3. AI Avatar Selection */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
              color: '#374151',
            }}>
              3. AI Avatar
            </label>
            
            {/* Avatar Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '0.375rem',
              marginBottom: '0.5rem',
            }}>
              {CREATOR_TEMPLATES.slice(0, 24).map((creator) => {
                const isSelected = selectedCreators.includes(creator.id)
                const maxReached = selectedCreators.length >= 3 && !isSelected
                
                return (
                  <div
                    key={creator.id}
                    onClick={() => !maxReached && toggleCreator(creator.id)}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      cursor: maxReached ? 'not-allowed' : 'pointer',
                      border: isSelected ? '2px solid #3B82F6' : '1px solid #E5E7EB',
                      opacity: maxReached ? 0.5 : 1,
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      if (!maxReached) {
                        e.currentTarget.style.borderColor = '#3B82F6'
                        e.currentTarget.style.transform = 'scale(1.05)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#E5E7EB'
                        e.currentTarget.style.transform = 'scale(1)'
                      }
                    }}
                  >
                    <video
                      src={creator.videoUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      muted
                      playsInline
                      preload="auto"
                    />
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        width: '12px',
                        height: '12px',
                        backgroundColor: '#3B82F6',
                        borderRadius: '50%',
                        border: '2px solid white',
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Pagination */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.6875rem',
              color: '#6B7280',
            }}>
              <span>‹</span>
              <span>1/10</span>
              <span>›</span>
            </div>
          </div>

          {/* Captions Per Combo Selector */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: '500',
              marginBottom: '0.375rem',
              color: '#374151',
            }}>
              4. Captions Per Combo
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.75rem',
            }}>
              <input
                type="number"
                min="1"
                max="10"
                value={captionsPerCombo}
                onChange={(e) => setCaptionsPerCombo(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                style={{
                  width: '60px',
                  padding: '0.375rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  outline: 'none',
                }}
              />
              <div style={{
                fontSize: '0.6875rem',
                color: '#6B7280',
                flex: 1,
              }}>
                {demos.length > 0 && selectedCreators.length > 0 && (
                  <span>
                    {demos.length} × {selectedCreators.length} × {captionsPerCombo} = <strong>{totalVariants}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || demos.length === 0 || selectedCreators.length === 0 || !hook.trim()}
            style={{
              width: '100%',
              padding: '0.625rem',
              backgroundColor: isGenerating || demos.length === 0 || selectedCreators.length === 0 || !hook.trim()
                ? '#D1D5DB'
                : '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: '500',
              cursor: isGenerating || demos.length === 0 || selectedCreators.length === 0 || !hook.trim()
                ? 'not-allowed'
                : 'pointer',
              transition: 'background-color 0.2s',
            }}
          >
            {isGenerating ? `Generating ${totalVariants}...` : `Generate ${totalVariants > 0 ? totalVariants : ''} Captions`}
          </button>

        </div>
      </div>

      {/* Right Panel - Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'transparent',
        gap: '1.5rem',
        overflow: 'hidden',
        minWidth: 0,
      }}>
        {/* Top Row - Preview, Middle Panel, and Editor */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 280px 280px',
          gap: '1.5rem',
          flexShrink: 0,
          height: 'calc(100vh - 420px)',
        }}>
          {/* Left - Preview Container */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.75rem',
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Preview
            </h3>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
              minHeight: 0,
            }}>
              {selectedVariant && selectedDemo ? (
                <PreviewWithCaptions
                  key={`${selectedVariant.id}-${selectedDemo.id}`}
                  videoUrl={selectedDemo.url}
                  caption={selectedVariant.caption}
                  captionStyle={selectedVariant.captionStyleOverride || captionStyle}
                  creatorVideoUrl={selectedVariant.creatorVideoUrl}
                  onCaptionStyleChange={(updates) => {
                    if (selectedVariant) {
                      handleCaptionUpdate(selectedVariant.id, {
                        captionStyleOverride: {
                          ...(selectedVariant.captionStyleOverride || captionStyle),
                          ...updates
                        }
                      })
                    }
                  }}
                />
              ) : selectedDemo ? (
                <div style={{
                  width: '100%',
                  maxWidth: '200px',
                  aspectRatio: '9/16',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  backgroundColor: '#000',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                }}>
                  {isMounted && (
                    <video
                      src={selectedDemo.url}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                      controls
                      muted
                    />
                  )}
                </div>
              ) : (
                <div style={{
                  color: '#94A3B8',
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  padding: '2rem',
                }}>
                  {variants.length === 0
                    ? 'Upload demos and generate captions to see preview'
                    : 'Select a variant to preview'}
                </div>
              )}
            </div>
          </div>

          {/* Middle Panel - Captions List */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            height: '100%',
          }}>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.75rem',
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Captions
            </h3>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              minHeight: 0,
            }} className="custom-scrollbar">
              {variants.length === 0 ? (
                <div style={{
                  color: '#94A3B8',
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  padding: '2rem 1rem',
                }}>
                  Generate captions to see them here
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}>
                  {variants.map((variant) => (
                    <CaptionItem
                      key={variant.id}
                      variant={variant}
                      isSelected={selectedVariant?.id === variant.id}
                      isRegenerating={isRegenerating === variant.id}
                      onSelect={() => setSelectedVariant(variant)}
                      onUpdate={(updates) => handleCaptionUpdate(variant.id, updates)}
                      onRegenerate={() => handleRegenerateCaption(variant.id)}
                      onDelete={() => {
                        if (confirm('Are you sure you want to delete this caption?')) {
                          setVariants(prev => prev.filter(v => v.id !== variant.id))
                          if (selectedVariant?.id === variant.id) {
                            setSelectedVariant(null)
                          }
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right - Caption Styling/Editing Panel (Thinner) */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}>
            <h3 style={{
              fontSize: '0.8125rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Caption Styling
            </h3>
            
            {selectedVariant ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                overflowY: 'auto',
              }}
              className="custom-scrollbar"
              >

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.6875rem',
                    fontWeight: '500',
                    marginBottom: '0.375rem',
                    color: '#64748B',
                  }}>
                    Font Size
                  </label>
                  <input
                    type="number"
                    value={Math.round((selectedVariant.captionStyleOverride || captionStyle).fontSize)}
                    onChange={(e) => handleCaptionUpdate(selectedVariant.id, {
                      captionStyleOverride: {
                        ...(selectedVariant.captionStyleOverride || captionStyle),
                        fontSize: parseInt(e.target.value) || 24
                      }
                    })}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.5rem',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                      outline: 'none',
                      backgroundColor: '#F8FAFC',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.6875rem',
                    fontWeight: '500',
                    marginBottom: '0.375rem',
                    color: '#64748B',
                  }}>
                    Text Color
                  </label>
                  <input
                    type="color"
                    value={(selectedVariant.captionStyleOverride || captionStyle).textColor}
                    onChange={(e) => handleCaptionUpdate(selectedVariant.id, {
                      captionStyleOverride: {
                        ...(selectedVariant.captionStyleOverride || captionStyle),
                        textColor: e.target.value
                      }
                    })}
                    style={{
                      width: '100%',
                      height: '32px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.6875rem',
                    fontWeight: '500',
                    marginBottom: '0.375rem',
                    color: '#64748B',
                  }}>
                    Background Color
                  </label>
                  <input
                    type="color"
                    value={(selectedVariant.captionStyleOverride || captionStyle).backgroundColor}
                    onChange={(e) => handleCaptionUpdate(selectedVariant.id, {
                      captionStyleOverride: {
                        ...(selectedVariant.captionStyleOverride || captionStyle),
                        backgroundColor: e.target.value
                      }
                    })}
                    style={{
                      width: '100%',
                      height: '32px',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.6875rem',
                    fontWeight: '500',
                    marginBottom: '0.375rem',
                    color: '#64748B',
                  }}>
                    Background Opacity
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(((selectedVariant.captionStyleOverride || captionStyle).backgroundOpacity ?? 0.7) * 100)}
                      onChange={(e) => handleCaptionUpdate(selectedVariant.id, {
                        captionStyleOverride: {
                          ...(selectedVariant.captionStyleOverride || captionStyle),
                          backgroundOpacity: parseFloat(e.target.value) / 100
                        }
                      })}
                      style={{
                        flex: 1,
                      }}
                    />
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#64748B',
                      minWidth: '40px',
                      textAlign: 'right',
                    }}>
                      {Math.round(((selectedVariant.captionStyleOverride || captionStyle).backgroundOpacity ?? 0.7) * 100)}%
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.6875rem',
                    fontWeight: '500',
                    marginBottom: '0.375rem',
                    color: '#64748B',
                  }}>
                    Position X (0-100%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(((selectedVariant.captionStyleOverride || captionStyle).xPercent ?? 0.5) * 100)}
                    onChange={(e) => {
                      const value = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                      handleCaptionUpdate(selectedVariant.id, {
                        captionStyleOverride: {
                          ...(selectedVariant.captionStyleOverride || captionStyle),
                          xPercent: value / 100
                        }
                      })
                    }}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.5rem',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                      outline: 'none',
                      backgroundColor: '#F8FAFC',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.6875rem',
                    fontWeight: '500',
                    marginBottom: '0.375rem',
                    color: '#64748B',
                  }}>
                    Position Y (0-100%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(((selectedVariant.captionStyleOverride || captionStyle).yPercent ?? 0.85) * 100)}
                    onChange={(e) => {
                      const value = Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                      handleCaptionUpdate(selectedVariant.id, {
                        captionStyleOverride: {
                          ...(selectedVariant.captionStyleOverride || captionStyle),
                          yPercent: value / 100
                        }
                      })
                    }}
                    style={{
                      width: '100%',
                      padding: '0.375rem 0.5rem',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                      outline: 'none',
                      backgroundColor: '#F8FAFC',
                    }}
                  />
                </div>
              </div>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94A3B8',
                fontSize: '0.875rem',
                textAlign: 'center',
              }}>
                Select a variant to edit
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row - Generated Captions Grid */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '2px solid #E2E8F0',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}>
          {variants.length > 0 ? (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                flexShrink: 0,
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #E2E8F0',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                }}>
                  <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: 0,
                  }}>
                    Generated Captions ({variants.length})
                  </h3>
                  {variants.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={toggleSelectAll}
                        style={{
                          padding: '0.5rem 0.75rem',
                          backgroundColor: selectedForExport.size === variants.length ? '#10B981' : '#F3F4F6',
                          color: selectedForExport.size === variants.length ? 'white' : '#374151',
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {selectedForExport.size === variants.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <button
                        onClick={handleExport}
                        disabled={isExporting}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: isExporting ? '#D1D5DB' : '#3B82F6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          cursor: isExporting ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        {isExporting ? (
                          <>
                            <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                            Exporting ({exportProgress.current}/{exportProgress.total})
                          </>
                        ) : (
                          `Export${selectedForExport.size > 0 ? ` (${selectedForExport.size})` : ' All'}`
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div 
                className="custom-scrollbar"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gridAutoRows: 'minmax(auto, max-content)',
                  gap: '1rem',
                  paddingRight: '0.75rem',
                  paddingBottom: '0.5rem',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#CBD5E1 #F1F5F9',
                  alignContent: 'start',
                }}
              >
                {variants.map((variant) => {
                  const demo = demos.find(d => d.id === variant.demoId)
                  const isSelected = selectedVariant?.id === variant.id
                  const isSelectedForExport = selectedForExport.has(variant.id)

                  return (
                    <div
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: isSelected ? '2px solid #3B82F6' : isSelectedForExport ? '2px solid #10B981' : '1px solid #E2E8F0',
                        transition: 'all 0.2s',
                        backgroundColor: isSelected ? '#EFF6FF' : isSelectedForExport ? '#ECFDF5' : '#FFFFFF',
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '9/16',
                        boxShadow: isSelected
                          ? '0 4px 16px rgba(59, 130, 246, 0.25)'
                          : isSelectedForExport
                            ? '0 4px 16px rgba(16, 185, 129, 0.25)'
                            : '0 2px 6px rgba(0,0,0,0.08)',
                        display: 'block',
                        minHeight: 0,
                        maxHeight: '100%',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#3B82F6'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.25)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !isSelectedForExport) {
                          e.currentTarget.style.borderColor = '#E2E8F0'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)'
                        } else if (isSelectedForExport && !isSelected) {
                          e.currentTarget.style.borderColor = '#10B981'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.25)'
                        }
                      }}
                    >
                      {demo && (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          position: 'relative',
                        }}>
                          <ThumbnailCanvas
                            videoUrl={demo.url}
                            caption={variant.caption}
                            captionStyle={variant.captionStyleOverride || captionStyle}
                            aspectRatio="9:16"
                          />
                        </div>
                      )}
                      {/* Export checkbox */}
                      <div
                        onClick={(e) => toggleExportSelection(variant.id, e)}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '4px',
                          border: isSelectedForExport ? '2px solid #10B981' : '2px solid rgba(255,255,255,0.8)',
                          backgroundColor: isSelectedForExport ? '#10B981' : 'rgba(0,0,0,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 15,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {isSelectedForExport && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      {/* Preview indicator */}
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          backgroundColor: '#3B82F6',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '11px',
                          fontWeight: '600',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          zIndex: 10,
                        }}>
                          ✓
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8',
              fontSize: '0.875rem',
              textAlign: 'center',
            }}>
              Generated captions will appear here
            </div>
          )}
        </div>
        
      </div>
    </div>
    </>
  )
}


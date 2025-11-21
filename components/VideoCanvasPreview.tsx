'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { CaptionStyle } from '@/types'
import { wrapText } from '@/lib/textUtils'

interface VideoCanvasPreviewProps {
  creatorVideoUrl: string | null | undefined
  demoVideoUrl: string | undefined
  caption: string
  captionStyle: CaptionStyle
  onCaptionStyleChange?: (style: Partial<CaptionStyle>) => void
  onCaptionChange?: (caption: string) => void
  width?: number
  height?: number
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5'
  play?: boolean // External control for play state
  onPlayStateChange?: (playing: boolean) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  seekTime?: number // External control for seeking
  creatorDuration?: number // Duration of creator video for timeline calculations
}

/**
 * Optimized VideoCanvasPreview with smooth dragging and resizing
 */
function VideoCanvasPreview({
  creatorVideoUrl,
  demoVideoUrl,
  caption,
  captionStyle,
  onCaptionStyleChange,
  onCaptionChange,
  width = 1080,
  height = 1920,
  aspectRatio = '9:16',
  play = false,
  onPlayStateChange,
  onTimeUpdate,
  seekTime,
  creatorDuration = 0,
}: VideoCanvasPreviewProps) {
  // Calculate dimensions based on aspect ratio
  const getAspectRatioDimensions = () => {
    switch (aspectRatio) {
      case '16:9':
        return { width: 1920, height: 1080 }
      case '1:1':
        return { width: 1080, height: 1080 }
      case '4:5':
        return { width: 1080, height: 1350 }
      case '9:16':
      default:
        return { width: 1080, height: 1920 }
    }
  }

  const dimensions = getAspectRatioDimensions()
  const canvasWidth = dimensions.width
  const canvasHeight = dimensions.height
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const creatorVideoRef = useRef<HTMLVideoElement>(null)
  const demoVideoRef = useRef<HTMLVideoElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPhase, setCurrentPhase] = useState<'creator' | 'demo'>('creator')
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null)
  const [isEditingText, setIsEditingText] = useState(false)
  const [editText, setEditText] = useState(caption)

  // Sync editText with caption prop
  useEffect(() => {
    if (!isEditingText) {
      setEditText(caption)
    }
  }, [caption, isEditingText])

  // Use local state for smooth dragging, update parent on release
  const [localStyle, setLocalStyle] = useState(captionStyle)
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0, startWidth: 0, startFontSize: 0 })

  // Sync local style with props when not dragging/resizing
  useEffect(() => {
    if (!isDragging && !isResizing) {
      setLocalStyle(captionStyle)
    }
  }, [captionStyle, isDragging, isResizing])

  // Render video frame to main canvas (optimized - only when playing)
  const renderVideoFrame = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: false })
    if (!canvas || !ctx) return

    const currentVideo =
      currentPhase === 'creator' && creatorVideoRef.current
        ? creatorVideoRef.current
        : demoVideoRef.current

    if (!currentVideo || currentVideo.readyState < 2) return

    // Clear and draw video
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const videoAspect = currentVideo.videoWidth / currentVideo.videoHeight
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

    ctx.drawImage(currentVideo, offsetX, offsetY, drawWidth, drawHeight)
  }, [currentPhase, canvasWidth, canvasHeight])

  // Render caption on overlay canvas (called frequently)
  const renderCaptionOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !ctx) return

    // Clear overlay
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    if (!caption) return

    // Calculate text dimensions
    const charsPerLine = Math.round(35 * localStyle.widthPercent / 0.8) || 25
    const wrappedText = wrapText(caption, charsPerLine)
    const lines = wrappedText.split('\n')
    const fontSize = Math.max(24, Math.floor((localStyle.fontSize || 16) * 1.5))
    const lineSpacing = Math.max(12, Math.floor(fontSize * 0.5))
    const padding = localStyle.paddingPx || 20

    ctx.font = `500 ${fontSize}px system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
    const textWidth = maxLineWidth
    const textHeight = lines.length * fontSize + (lines.length - 1) * lineSpacing

    const centerX = canvasWidth * localStyle.xPercent
    const centerY = canvasHeight * localStyle.yPercent

    const boxWidth = textWidth + padding * 2
    const boxHeight = textHeight + padding * 2
    const boxX = centerX - boxWidth / 2
    const boxY = centerY - boxHeight / 2

    // Draw background box with radial gradient
    const rgb = hexToRgb(localStyle.backgroundColor || '#000000')
    const bgOpacity = localStyle.backgroundOpacity ?? 0.7
    
    // Create radial gradient from bottom center (dark blue to blue)
    const gradientCenterX = centerX
    const gradientCenterY = boxY + boxHeight // Bottom center
    const gradientRadius = Math.max(boxWidth, boxHeight) * 1.2 // Slightly larger than box
    
    const gradient = ctx.createRadialGradient(
      gradientCenterX, gradientCenterY, 0, // Start at bottom center
      gradientCenterX, gradientCenterY, gradientRadius // Expand outward
    )
    
    // Dark blue at center (bottom)
    const darkBlue = `rgba(30, 58, 138, ${bgOpacity})` // Dark blue #1e3a8a
    // Blue at edges
    const blue = `rgba(59, 130, 246, ${bgOpacity * 0.6})` // Blue #3b82f6
    
    gradient.addColorStop(0, darkBlue)
    gradient.addColorStop(1, blue)
    
    ctx.fillStyle = gradient
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight)

    // Draw text
    ctx.fillStyle = localStyle.textColor || '#ffffff'
    const startY = centerY - (textHeight / 2) + (fontSize / 2)
    lines.forEach((line, i) => {
      const lineY = startY + i * (fontSize + lineSpacing)
      ctx.fillText(line, centerX, lineY)
    })

    // Always draw bounding box and handles (like a text box)
    ctx.strokeStyle = isDragging || isResizing ? '#3b82f6' : 'rgba(255, 255, 255, 0.6)'
    ctx.lineWidth = 2
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)

    // Draw resize handles at corners
    const handleSize = 10
    const handles = [
      { x: boxX, y: boxY },                           // Top-left
      { x: boxX + boxWidth, y: boxY },                // Top-right
      { x: boxX, y: boxY + boxHeight },               // Bottom-left
      { x: boxX + boxWidth, y: boxY + boxHeight },    // Bottom-right
    ]

    handles.forEach(handle => {
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = isDragging || isResizing ? '#3b82f6' : 'rgba(255, 255, 255, 0.9)'
      ctx.lineWidth = 2

      // Draw circular handles
      ctx.beginPath()
      ctx.arc(handle.x, handle.y, handleSize / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    })
  }, [caption, localStyle, isDragging, isResizing, canvasWidth, canvasHeight])

  // Main render loop
  useEffect(() => {
    const render = () => {
      if (isPlaying) {
        renderVideoFrame()
      }
      renderCaptionOverlay()

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(render)
      }
    }

    render()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, renderVideoFrame, renderCaptionOverlay])

  // Render caption when it changes (not playing)
  useEffect(() => {
    if (!isPlaying) {
      renderVideoFrame()
      renderCaptionOverlay()
    }
  }, [caption, localStyle, renderVideoFrame, renderCaptionOverlay, isPlaying])

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 0, b: 0 }
  }

  // Check if mouse is over resize handle
  const getResizeHandle = (mouseX: number, mouseY: number): 'tl' | 'tr' | 'bl' | 'br' | null => {
    const charsPerLine = Math.round(35 * localStyle.widthPercent / 0.8) || 25
    const wrappedText = wrapText(caption, charsPerLine)
    const lines = wrappedText.split('\n')
    const fontSize = Math.max(24, Math.floor((localStyle.fontSize || 16) * 1.5))
    const lineSpacing = Math.max(12, Math.floor(fontSize * 0.5))
    const padding = localStyle.paddingPx || 20

    const canvas = overlayCanvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.font = `500 ${fontSize}px system-ui, -apple-system, sans-serif`
    const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
    const textWidth = maxLineWidth
    const textHeight = lines.length * fontSize + (lines.length - 1) * lineSpacing

    const boxWidth = textWidth + padding * 2
    const boxHeight = textHeight + padding * 2

    const centerX = canvasWidth * localStyle.xPercent
    const centerY = canvasHeight * localStyle.yPercent
    const boxX = centerX - boxWidth / 2
    const boxY = centerY - boxHeight / 2

    const hitRadius = 15 // Larger hit area for easier interaction

    const handles = [
      { x: boxX, y: boxY, id: 'tl' as const },
      { x: boxX + boxWidth, y: boxY, id: 'tr' as const },
      { x: boxX, y: boxY + boxHeight, id: 'bl' as const },
      { x: boxX + boxWidth, y: boxY + boxHeight, id: 'br' as const },
    ]

    for (const handle of handles) {
      const distance = Math.sqrt(Math.pow(mouseX - handle.x, 2) + Math.pow(mouseY - handle.y, 2))
      if (distance < hitRadius) {
        return handle.id
      }
    }

    return null
  }

  const lastClickTimeRef = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvasWidth / rect.width
    const scaleY = canvasHeight / rect.height
    const mouseX = (e.clientX - rect.left) * scaleX
    const mouseY = (e.clientY - rect.top) * scaleY

    const handle = getResizeHandle(mouseX, mouseY)

    if (handle) {
      setIsResizing(true)
      setResizeHandle(handle)
      dragStartRef.current = {
        x: mouseX,
        y: mouseY,
        startX: localStyle.xPercent,
        startY: localStyle.yPercent,
        startWidth: localStyle.widthPercent,
        startFontSize: localStyle.fontSize || 16
      }
    } else {
      setIsDragging(true)
      dragStartRef.current = {
        x: mouseX,
        y: mouseY,
        startX: localStyle.xPercent,
        startY: localStyle.yPercent,
        startWidth: localStyle.widthPercent,
        startFontSize: localStyle.fontSize || 16
      }
    }

    renderCaptionOverlay()
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    console.log('🖱️ Double-click detected!')
    e.preventDefault()
    e.stopPropagation()
    console.log('Setting isEditingText to true, caption:', caption)
    setIsEditingText(true)
    setEditText(caption)
    setIsDragging(false)
    setIsResizing(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return

    const canvas = overlayCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvasWidth / rect.width
    const scaleY = canvasHeight / rect.height
    const mouseX = (e.clientX - rect.left) * scaleX
    const mouseY = (e.clientY - rect.top) * scaleY

    if (isDragging) {
      const deltaX = (mouseX - dragStartRef.current.x) / canvasWidth
      const deltaY = (mouseY - dragStartRef.current.y) / canvasHeight

      const newX = Math.max(0.1, Math.min(0.9, dragStartRef.current.startX + deltaX))
      const newY = Math.max(0.1, Math.min(0.9, dragStartRef.current.startY + deltaY))

      setLocalStyle(prev => ({ ...prev, xPercent: newX, yPercent: newY }))
    } else if (isResizing && resizeHandle) {
      const deltaX = mouseX - dragStartRef.current.x
      const deltaY = mouseY - dragStartRef.current.y

      let newWidth = dragStartRef.current.startWidth
      let newFontSize = dragStartRef.current.startFontSize

      if (resizeHandle === 'tr' || resizeHandle === 'br') {
        newWidth = dragStartRef.current.startWidth + (deltaX / canvasWidth)
      } else if (resizeHandle === 'tl' || resizeHandle === 'bl') {
        newWidth = dragStartRef.current.startWidth - (deltaX / canvasWidth)
      }

      if (resizeHandle === 'br' || resizeHandle === 'bl') {
        newFontSize = dragStartRef.current.startFontSize + (deltaY / 15)
      } else if (resizeHandle === 'tr' || resizeHandle === 'tl') {
        newFontSize = dragStartRef.current.startFontSize - (deltaY / 15)
      }

      newWidth = Math.max(0.3, Math.min(0.95, newWidth))
      newFontSize = Math.max(12, Math.min(48, newFontSize))

      setLocalStyle(prev => ({ ...prev, widthPercent: newWidth, fontSize: newFontSize }))
    }

    renderCaptionOverlay()
  }

  const handleMouseUp = () => {
    if (isDragging || isResizing) {
      // Save final position to parent
      if (onCaptionStyleChange) {
        onCaptionStyleChange({
          xPercent: localStyle.xPercent,
          yPercent: localStyle.yPercent,
          widthPercent: localStyle.widthPercent,
          fontSize: localStyle.fontSize
        })
      }
    }

    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle(null)
    renderCaptionOverlay()
  }

  const handlePlayPause = () => {
    const currentVideo =
      currentPhase === 'creator' ? creatorVideoRef.current : demoVideoRef.current

    if (!currentVideo) return

    if (isPlaying) {
      currentVideo.pause()
      setIsPlaying(false)
      onPlayStateChange?.(false)
    } else {
      currentVideo.play()
      setIsPlaying(true)
      onPlayStateChange?.(true)
    }
  }

  // Respond to external play control
  useEffect(() => {
    const currentVideo =
      currentPhase === 'creator' ? creatorVideoRef.current : demoVideoRef.current

    if (!currentVideo) return

    if (play && !isPlaying) {
      currentVideo.play()
      setIsPlaying(true)
    } else if (!play && isPlaying) {
      currentVideo.pause()
      setIsPlaying(false)
    }
  }, [play, isPlaying, currentPhase])

  // Handle external seek control
  useEffect(() => {
    if (seekTime === undefined) return
    
    const creatorVideo = creatorVideoRef.current
    const demoVideo = demoVideoRef.current
    
    if (!creatorVideo || !demoVideo) return
    
    if (seekTime <= creatorDuration) {
      // Seek in creator video
      creatorVideo.currentTime = seekTime
      demoVideo.currentTime = 0
      setCurrentPhase('creator')
    } else {
      // Seek in demo video
      creatorVideo.currentTime = creatorDuration
      demoVideo.currentTime = seekTime - creatorDuration
      setCurrentPhase('demo')
    }
  }, [seekTime, creatorDuration])

  // Expose play/pause control via callback
  useEffect(() => {
    // Notify parent of time updates
    const currentVideo =
      currentPhase === 'creator' ? creatorVideoRef.current : demoVideoRef.current

    if (!currentVideo) return

    const handleTimeUpdate = () => {
      const creatorVideo = creatorVideoRef.current
      const demoVideo = demoVideoRef.current
      
      if (!creatorVideo || !demoVideo) return
      
      let totalTime = 0
      if (currentPhase === 'creator') {
        totalTime = creatorVideo.currentTime
      } else {
        totalTime = creatorDuration + demoVideo.currentTime
      }
      
      const totalDuration = (creatorVideo.duration || 0) + (demoVideo.duration || 0)
      onTimeUpdate?.(totalTime, totalDuration)
    }

    currentVideo.addEventListener('timeupdate', handleTimeUpdate)
    return () => {
      currentVideo.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [currentPhase, onTimeUpdate, creatorDuration])

  // Video phase transitions
  useEffect(() => {
    const creatorVideo = creatorVideoRef.current
    const demoVideo = demoVideoRef.current

    if (!creatorVideo || !demoVideo) return

    const handleCreatorEnded = () => {
      setCurrentPhase('demo')
      demoVideo.currentTime = 0
      if (isPlaying) demoVideo.play()
    }

    const handleDemoEnded = () => {
      setIsPlaying(false)
      setCurrentPhase('creator')
      creatorVideo.currentTime = 0
      demoVideo.currentTime = 0
    }

    creatorVideo.addEventListener('ended', handleCreatorEnded)
    demoVideo.addEventListener('ended', handleDemoEnded)

    return () => {
      creatorVideo.removeEventListener('ended', handleCreatorEnded)
      demoVideo.removeEventListener('ended', handleDemoEnded)
    }
  }, [isPlaying])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Hidden videos */}
      {creatorVideoUrl && (
        <video
          ref={creatorVideoRef}
          src={creatorVideoUrl}
          style={{ display: 'none' }}
          playsInline
          preload="auto"
        />
      )}
      {demoVideoUrl && (
        <video
          ref={demoVideoRef}
          src={demoVideoUrl}
          style={{ display: 'none' }}
          playsInline
          preload="auto"
        />
      )}

      {/* Canvas layers */}
      <div style={{ position: 'relative', width: '100%', height: '100%', aspectRatio: aspectRatio.replace(':', '/') }}>
        {/* Video canvas (bottom layer) */}
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#000',
            borderRadius: '8px',
          }}
        />

        {/* Overlay canvas (top layer - captions + handles) */}
        <canvas
          ref={overlayCanvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            cursor: isDragging
              ? 'grabbing'
              : isResizing
              ? resizeHandle === 'tl' || resizeHandle === 'br'
                ? 'nwse-resize'
                : 'nesw-resize'
              : 'move',
            borderRadius: '8px',
            pointerEvents: 'auto',
          }}
        />

        {/* Inline Text Editor - Editable caption directly on video */}
        {isEditingText && (() => {
          console.log('✏️ Rendering text editor with text:', editText)

          // Calculate caption position for inline editing
          const charsPerLine = Math.round(35 * localStyle.widthPercent / 0.8) || 25
          const wrappedText = wrapText(editText, charsPerLine)
          const lines = wrappedText.split('\n')
          const fontSize = Math.max(24, Math.floor((localStyle.fontSize || 16) * 1.5))
          const lineSpacing = Math.max(12, Math.floor(fontSize * 0.5))
          const padding = localStyle.paddingPx || 20

          const rect = overlayCanvasRef.current?.getBoundingClientRect()
          if (!rect) {
            console.log('❌ No rect available for overlay canvas')
            return null
          }

          const scaleX = rect.width / canvasWidth
          const scaleY = rect.height / canvasHeight

          const centerX = rect.width * localStyle.xPercent
          const centerY = rect.height * localStyle.yPercent

          // Approximate text dimensions
          const textWidth = charsPerLine * (fontSize * 0.6) // rough estimate
          const textHeight = lines.length * fontSize + (lines.length - 1) * lineSpacing
          const boxWidth = textWidth + padding * 2
          const boxHeight = textHeight + padding * 2

          console.log('📐 Editor position:', { centerX, centerY, boxWidth, boxHeight })

          return (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => {
                onCaptionChange?.(editText)
                setIsEditingText(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsEditingText(false)
                } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  onCaptionChange?.(editText)
                  setIsEditingText(false)
                }
              }}
              autoFocus
              style={{
                position: 'absolute',
                left: `${centerX - boxWidth / 2}px`,
                top: `${centerY - boxHeight / 2}px`,
                width: `${boxWidth}px`,
                minHeight: `${boxHeight}px`,
                backgroundColor: `${localStyle.backgroundColor}${Math.round((localStyle.backgroundOpacity ?? 0.7) * 255).toString(16).padStart(2, '0')}`,
                color: localStyle.textColor || '#ffffff',
                fontSize: `${fontSize * scaleY}px`,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: '500',
                textAlign: 'center',
                border: '2px solid #3b82f6',
                borderRadius: '8px',
                padding: `${padding * scaleY}px`,
                outline: 'none',
                resize: 'none',
                zIndex: 1000,
                lineHeight: '1.4',
                boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )
        })()}
      </div>

    </div>
  )
}

export default VideoCanvasPreview

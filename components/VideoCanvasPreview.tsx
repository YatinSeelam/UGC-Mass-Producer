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
  width?: number
  height?: number
}

/**
 * Optimized VideoCanvasPreview with smooth dragging and resizing
 */
export default function VideoCanvasPreview({
  creatorVideoUrl,
  demoVideoUrl,
  caption,
  captionStyle,
  onCaptionStyleChange,
  width = 1080,
  height = 1920,
}: VideoCanvasPreviewProps) {
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
    ctx.fillRect(0, 0, width, height)

    const videoAspect = currentVideo.videoWidth / currentVideo.videoHeight
    const canvasAspect = width / height

    let drawWidth = width
    let drawHeight = height
    let offsetX = 0
    let offsetY = 0

    if (videoAspect > canvasAspect) {
      drawHeight = height
      drawWidth = height * videoAspect
      offsetX = -(drawWidth - width) / 2
    } else {
      drawWidth = width
      drawHeight = width / videoAspect
      offsetY = -(drawHeight - height) / 2
    }

    ctx.drawImage(currentVideo, offsetX, offsetY, drawWidth, drawHeight)
  }, [currentPhase, width, height])

  // Render caption on overlay canvas (called frequently)
  const renderCaptionOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !ctx) return

    // Clear overlay
    ctx.clearRect(0, 0, width, height)

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

    const centerX = width * localStyle.xPercent
    const centerY = height * localStyle.yPercent

    const boxWidth = textWidth + padding * 2
    const boxHeight = textHeight + padding * 2
    const boxX = centerX - boxWidth / 2
    const boxY = centerY - boxHeight / 2

    // Draw background box
    const rgb = hexToRgb(localStyle.backgroundColor || '#000000')
    const bgOpacity = localStyle.backgroundOpacity ?? 0.7
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${bgOpacity})`
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight)

    // Draw text
    ctx.fillStyle = localStyle.textColor || '#ffffff'
    const startY = centerY - (textHeight / 2) + (fontSize / 2)
    lines.forEach((line, i) => {
      const lineY = startY + i * (fontSize + lineSpacing)
      ctx.fillText(line, centerX, lineY)
    })

    // Draw bounding box and handles when dragging/resizing
    if (isDragging || isResizing) {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)
      ctx.setLineDash([])

      // Draw resize handles
      const handleSize = 12
      const handles = [
        { x: boxX, y: boxY },
        { x: boxX + boxWidth, y: boxY },
        { x: boxX, y: boxY + boxHeight },
        { x: boxX + boxWidth, y: boxY + boxHeight },
      ]

      handles.forEach(handle => {
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = '#3b82f6'
        ctx.lineWidth = 2
        ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
        ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
      })
    }
  }, [caption, localStyle, isDragging, isResizing, width, height])

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

    const centerX = width * localStyle.xPercent
    const centerY = height * localStyle.yPercent
    const boxX = centerX - boxWidth / 2
    const boxY = centerY - boxHeight / 2

    const hitSize = 20

    const handles = [
      { x: boxX, y: boxY, id: 'tl' as const },
      { x: boxX + boxWidth, y: boxY, id: 'tr' as const },
      { x: boxX, y: boxY + boxHeight, id: 'bl' as const },
      { x: boxX + boxWidth, y: boxY + boxHeight, id: 'br' as const },
    ]

    for (const handle of handles) {
      if (Math.abs(mouseX - handle.x) < hitSize && Math.abs(mouseY - handle.y) < hitSize) {
        return handle.id
      }
    }

    return null
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height
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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return

    const canvas = overlayCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    const mouseX = (e.clientX - rect.left) * scaleX
    const mouseY = (e.clientY - rect.top) * scaleY

    if (isDragging) {
      const deltaX = (mouseX - dragStartRef.current.x) / width
      const deltaY = (mouseY - dragStartRef.current.y) / height

      const newX = Math.max(0.1, Math.min(0.9, dragStartRef.current.startX + deltaX))
      const newY = Math.max(0.1, Math.min(0.9, dragStartRef.current.startY + deltaY))

      setLocalStyle(prev => ({ ...prev, xPercent: newX, yPercent: newY }))
    } else if (isResizing && resizeHandle) {
      const deltaX = mouseX - dragStartRef.current.x
      const deltaY = mouseY - dragStartRef.current.y

      let newWidth = dragStartRef.current.startWidth
      let newFontSize = dragStartRef.current.startFontSize

      if (resizeHandle === 'tr' || resizeHandle === 'br') {
        newWidth = dragStartRef.current.startWidth + (deltaX / width)
      } else if (resizeHandle === 'tl' || resizeHandle === 'bl') {
        newWidth = dragStartRef.current.startWidth - (deltaX / width)
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
    } else {
      currentVideo.play()
      setIsPlaying(true)
    }
  }

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
    <div style={{ position: 'relative', width: '100%' }}>
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
      <div style={{ position: 'relative', width: '100%', aspectRatio: '9/16' }}>
        {/* Video canvas (bottom layer) */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
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
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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
              : 'grab',
            borderRadius: '8px',
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
        <button
          onClick={handlePlayPause}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.875rem',
          }}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>

      <div
        style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          backgroundColor: '#f0f9ff',
          borderRadius: '6px',
          fontSize: '0.875rem',
          textAlign: 'center',
          color: '#0369a1',
          border: '1px solid #bae6fd',
        }}
      >
        <strong>💡 Tip:</strong> Drag caption to move • Drag corners to resize width & font
      </div>
    </div>
  )
}

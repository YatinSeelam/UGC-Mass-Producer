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
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5'
  play?: boolean
  onPlayStateChange?: (playing: boolean) => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  seekTime?: number
  creatorDuration?: number
  volume?: number
}

type InteractionMode = 'none' | 'drag' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | 'rotate'

export default function VideoCanvasPreview({
  creatorVideoUrl,
  demoVideoUrl,
  caption,
  captionStyle,
  onCaptionStyleChange,
  onCaptionChange,
  aspectRatio = '9:16',
  play = false,
  onPlayStateChange,
  onTimeUpdate,
  seekTime,
  creatorDuration: externalCreatorDuration = 0,
  volume = 1,
}: VideoCanvasPreviewProps) {
  const getAspectRatioDimensions = () => {
    switch (aspectRatio) {
      case '16:9': return { width: 1920, height: 1080 }
      case '1:1': return { width: 1080, height: 1080 }
      case '4:5': return { width: 1080, height: 1350 }
      case '9:16':
      default: return { width: 1080, height: 1920 }
    }
  }

  const dimensions = getAspectRatioDimensions()
  const canvasWidth = dimensions.width
  const canvasHeight = dimensions.height

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const creatorVideoRef = useRef<HTMLVideoElement>(null)
  const demoVideoRef = useRef<HTMLVideoElement>(null)
  const lastSeekRef = useRef<number | null>(null)

  const [currentPhase, setCurrentPhase] = useState<'creator' | 'demo'>('creator')
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('none')
  const [localStyle, setLocalStyle] = useState(captionStyle)
  const [internalCreatorDuration, setInternalCreatorDuration] = useState(0)
  const [internalDemoDuration, setInternalDemoDuration] = useState(0)
  const [captionBounds, setCaptionBounds] = useState({ x: 0, y: 0, width: 0, height: 0 })

  const dragStartRef = useRef({
    x: 0, y: 0,
    startX: 0, startY: 0,
    startWidth: 0, startFontSize: 0,
    startRotation: 0,
    centerX: 0, centerY: 0
  })

  // Sync local style with props when not interacting
  useEffect(() => {
    if (interactionMode === 'none') setLocalStyle(captionStyle)
  }, [captionStyle, interactionMode])

  // Render video frame to canvas
  const renderVideoFrame = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: false })
    if (!canvas || !ctx) return

    const creatorVideo = creatorVideoRef.current
    const demoVideo = demoVideoRef.current

    let currentVideo: HTMLVideoElement | null = null
    if (currentPhase === 'creator' && creatorVideo && creatorVideoUrl) {
      currentVideo = creatorVideo
    } else if (currentPhase === 'demo' && demoVideo && demoVideoUrl) {
      currentVideo = demoVideo
    } else if (demoVideo && demoVideoUrl) {
      currentVideo = demoVideo
    } else if (creatorVideo && creatorVideoUrl) {
      currentVideo = creatorVideo
    }

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    if (!currentVideo || currentVideo.readyState < 2) return

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

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(currentVideo, offsetX, offsetY, drawWidth, drawHeight)
  }, [currentPhase, canvasWidth, canvasHeight, creatorVideoUrl, demoVideoUrl])

  // Calculate caption box dimensions
  const calculateCaptionBounds = useCallback(() => {
    if (!caption) return { x: 0, y: 0, width: 0, height: 0 }

    const charsPerLine = Math.round(35 * localStyle.widthPercent / 0.8) || 25
    const wrappedText = wrapText(caption, charsPerLine)
    const lines = wrappedText.split('\n')
    const fontSize = Math.max(24, Math.floor((localStyle.fontSize || 16) * 1.5))
    const lineSpacing = Math.max(12, Math.floor(fontSize * 0.5))
    const padding = localStyle.paddingPx || 20

    const canvas = overlayCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return { x: 0, y: 0, width: 0, height: 0 }

    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
    const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
    const textHeight = lines.length * fontSize + (lines.length - 1) * lineSpacing

    const boxWidth = maxLineWidth + padding * 2
    const boxHeight = textHeight + padding * 2

    const centerX = canvasWidth * localStyle.xPercent
    const centerY = canvasHeight * localStyle.yPercent

    return {
      x: centerX - boxWidth / 2,
      y: centerY - boxHeight / 2,
      width: boxWidth,
      height: boxHeight
    }
  }, [caption, localStyle, canvasWidth, canvasHeight])

  // Render caption overlay with rotation support
  const renderCaptionOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    if (!caption) return

    const bounds = calculateCaptionBounds()
    setCaptionBounds(bounds)

    const centerX = canvasWidth * localStyle.xPercent
    const centerY = canvasHeight * localStyle.yPercent
    const rotation = (localStyle.rotation || 0) * Math.PI / 180

    const charsPerLine = Math.round(35 * localStyle.widthPercent / 0.8) || 25
    const wrappedText = wrapText(caption, charsPerLine)
    const lines = wrappedText.split('\n')
    const fontSize = Math.max(24, Math.floor((localStyle.fontSize || 16) * 1.5))
    const lineSpacing = Math.max(12, Math.floor(fontSize * 0.5))
    const padding = localStyle.paddingPx || 20

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(rotation)

    // Draw background with rounded corners
    const bgOpacity = localStyle.backgroundOpacity ?? 0.7
    const rgb = hexToRgb(localStyle.backgroundColor || '#000000')
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${bgOpacity})`

    const boxWidth = bounds.width
    const boxHeight = bounds.height
    const radius = 12

    ctx.beginPath()
    ctx.roundRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, radius)
    ctx.fill()

    // Draw text
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = localStyle.textColor || '#ffffff'

    const textHeight = lines.length * fontSize + (lines.length - 1) * lineSpacing
    const startY = -textHeight / 2 + fontSize / 2

    lines.forEach((line, i) => {
      ctx.fillText(line, 0, startY + i * (fontSize + lineSpacing))
    })

    ctx.restore()

    // Draw selection UI (not rotated for easier interaction)
    if (interactionMode !== 'none' || true) { // Always show handles for now
      drawSelectionUI(ctx, centerX, centerY, boxWidth, boxHeight, rotation)
    }
  }, [caption, localStyle, canvasWidth, canvasHeight, interactionMode, calculateCaptionBounds])

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 0, g: 0, b: 0 }
  }

  // Draw selection UI with handles and rotation
  const drawSelectionUI = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    rotation: number
  ) => {
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(rotation)

    // Draw border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.setLineDash([])
    ctx.strokeRect(-width / 2, -height / 2, width, height)

    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.strokeRect(-width / 2, -height / 2, width, height)

    // Draw corner handles
    const handleRadius = 8
    const corners = [
      { x: -width / 2, y: -height / 2, id: 'tl' },
      { x: width / 2, y: -height / 2, id: 'tr' },
      { x: -width / 2, y: height / 2, id: 'bl' },
      { x: width / 2, y: height / 2, id: 'br' },
    ]

    corners.forEach(corner => {
      // White fill
      ctx.beginPath()
      ctx.arc(corner.x, corner.y, handleRadius, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      // Blue border
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // Draw rotation handle (below the box)
    const rotateHandleDistance = 40
    const rotateHandleY = height / 2 + rotateHandleDistance

    // Line connecting to rotation handle
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(0, rotateHandleY - handleRadius)
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.stroke()

    // Rotation handle circle
    ctx.beginPath()
    ctx.arc(0, rotateHandleY, handleRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw rotation icon inside handle
    ctx.save()
    ctx.translate(0, rotateHandleY)
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(0, 0, 4, -Math.PI * 0.8, Math.PI * 0.5)
    ctx.stroke()
    // Arrow head
    ctx.beginPath()
    ctx.moveTo(3, 3)
    ctx.lineTo(4, -1)
    ctx.lineTo(0, 2)
    ctx.fillStyle = '#3b82f6'
    ctx.fill()
    ctx.restore()

    ctx.restore()
  }

  // Get interaction mode based on mouse position
  const getInteractionMode = (mouseX: number, mouseY: number): InteractionMode => {
    if (!caption) return 'none'

    const centerX = canvasWidth * localStyle.xPercent
    const centerY = canvasHeight * localStyle.yPercent
    const rotation = (localStyle.rotation || 0) * Math.PI / 180
    const bounds = calculateCaptionBounds()
    const width = bounds.width
    const height = bounds.height

    // Transform mouse position to local coordinates (accounting for rotation)
    const dx = mouseX - centerX
    const dy = mouseY - centerY
    const localX = dx * Math.cos(-rotation) - dy * Math.sin(-rotation)
    const localY = dx * Math.sin(-rotation) + dy * Math.cos(-rotation)

    const hitRadius = 20

    // Check rotation handle first
    const rotateHandleY = height / 2 + 40
    const rotateDistSq = localX * localX + (localY - rotateHandleY) * (localY - rotateHandleY)
    if (rotateDistSq < hitRadius * hitRadius) {
      return 'rotate'
    }

    // Check corner handles
    const corners: { x: number; y: number; mode: InteractionMode }[] = [
      { x: -width / 2, y: -height / 2, mode: 'resize-tl' },
      { x: width / 2, y: -height / 2, mode: 'resize-tr' },
      { x: -width / 2, y: height / 2, mode: 'resize-bl' },
      { x: width / 2, y: height / 2, mode: 'resize-br' },
    ]

    for (const corner of corners) {
      const distSq = (localX - corner.x) ** 2 + (localY - corner.y) ** 2
      if (distSq < hitRadius * hitRadius) {
        return corner.mode
      }
    }

    // Check if inside the box for dragging
    if (Math.abs(localX) < width / 2 && Math.abs(localY) < height / 2) {
      return 'drag'
    }

    return 'none'
  }

  // Animation loop
  useEffect(() => {
    let animationId: number | null = null

    const render = () => {
      renderVideoFrame()
      renderCaptionOverlay()
      animationId = requestAnimationFrame(render)
    }

    animationId = requestAnimationFrame(render)
    return () => { if (animationId) cancelAnimationFrame(animationId) }
  }, [renderVideoFrame, renderCaptionOverlay])

  // Load video durations
  useEffect(() => {
    const creatorVideo = creatorVideoRef.current
    const demoVideo = demoVideoRef.current

    const handleCreatorLoaded = () => {
      if (creatorVideo?.duration && isFinite(creatorVideo.duration)) {
        setInternalCreatorDuration(creatorVideo.duration)
      }
    }

    const handleDemoLoaded = () => {
      if (demoVideo?.duration && isFinite(demoVideo.duration)) {
        setInternalDemoDuration(demoVideo.duration)
      }
    }

    if (creatorVideo) {
      creatorVideo.addEventListener('loadedmetadata', handleCreatorLoaded)
      creatorVideo.addEventListener('durationchange', handleCreatorLoaded)
      if (creatorVideo.readyState >= 1) handleCreatorLoaded()
    }

    if (demoVideo) {
      demoVideo.addEventListener('loadedmetadata', handleDemoLoaded)
      demoVideo.addEventListener('durationchange', handleDemoLoaded)
      if (demoVideo.readyState >= 1) handleDemoLoaded()
    }

    return () => {
      creatorVideo?.removeEventListener('loadedmetadata', handleCreatorLoaded)
      creatorVideo?.removeEventListener('durationchange', handleCreatorLoaded)
      demoVideo?.removeEventListener('loadedmetadata', handleDemoLoaded)
      demoVideo?.removeEventListener('durationchange', handleDemoLoaded)
    }
  }, [creatorVideoUrl, demoVideoUrl])

  // Apply volume
  useEffect(() => {
    const clampedVolume = Math.min(1, Math.max(0, volume))
    if (creatorVideoRef.current) creatorVideoRef.current.volume = clampedVolume
    if (demoVideoRef.current) demoVideoRef.current.volume = clampedVolume
  }, [volume])

  // Handle play/pause
  useEffect(() => {
    const creatorVideo = creatorVideoRef.current
    const demoVideo = demoVideoRef.current

    if (!creatorVideo && !demoVideo) return

    const playVideo = async (video: HTMLVideoElement) => {
      try {
        if (video.readyState >= 2) {
          await video.play()
        } else {
          await new Promise<void>((resolve) => {
            const handler = () => { video.removeEventListener('canplay', handler); resolve() }
            video.addEventListener('canplay', handler)
          })
          await video.play()
        }
      } catch (err) { /* Autoplay restriction */ }
    }

    if (play) {
      if (currentPhase === 'creator' && creatorVideo && creatorVideoUrl) {
        playVideo(creatorVideo)
        demoVideo?.pause()
      } else if (currentPhase === 'demo' && demoVideo && demoVideoUrl) {
        playVideo(demoVideo)
        creatorVideo?.pause()
      } else if (creatorVideo && creatorVideoUrl) {
        setCurrentPhase('creator')
        creatorVideo.currentTime = 0
        playVideo(creatorVideo)
        demoVideo?.pause()
      } else if (demoVideo && demoVideoUrl) {
        setCurrentPhase('demo')
        demoVideo.currentTime = 0
        playVideo(demoVideo)
      }
    } else {
      creatorVideo?.pause()
      demoVideo?.pause()
    }
  }, [play, currentPhase, creatorVideoUrl, demoVideoUrl])

  // Handle video ended
  useEffect(() => {
    const creatorVideo = creatorVideoRef.current
    const demoVideo = demoVideoRef.current

    const handleCreatorEnded = () => {
      if (demoVideo && demoVideoUrl) {
        setCurrentPhase('demo')
        demoVideo.currentTime = 0
        if (play) demoVideo.play().catch(() => {})
      } else {
        onPlayStateChange?.(false)
      }
    }

    const handleDemoEnded = () => {
      onPlayStateChange?.(false)
      setCurrentPhase('creator')
      if (creatorVideo) creatorVideo.currentTime = 0
      if (demoVideo) demoVideo.currentTime = 0
    }

    creatorVideo?.addEventListener('ended', handleCreatorEnded)
    demoVideo?.addEventListener('ended', handleDemoEnded)

    return () => {
      creatorVideo?.removeEventListener('ended', handleCreatorEnded)
      demoVideo?.removeEventListener('ended', handleDemoEnded)
    }
  }, [play, demoVideoUrl, onPlayStateChange])

  // Handle time updates
  useEffect(() => {
    const creatorVideo = creatorVideoRef.current
    const demoVideo = demoVideoRef.current

    const handleTimeUpdate = () => {
      const creatorDur = creatorVideo?.duration || 0
      const demoDur = demoVideo?.duration || 0
      const totalDuration = creatorDur + demoDur

      let currentTime = 0
      if (currentPhase === 'creator' && creatorVideo) {
        currentTime = creatorVideo.currentTime
      } else if (currentPhase === 'demo' && demoVideo) {
        currentTime = creatorDur + demoVideo.currentTime
      }

      if (onTimeUpdate && totalDuration > 0) {
        onTimeUpdate(currentTime, totalDuration)
      }
    }

    creatorVideo?.addEventListener('timeupdate', handleTimeUpdate)
    demoVideo?.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      creatorVideo?.removeEventListener('timeupdate', handleTimeUpdate)
      demoVideo?.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [currentPhase, onTimeUpdate])

  // Handle seeking
  useEffect(() => {
    if (typeof seekTime !== 'number' || seekTime < 0) {
      lastSeekRef.current = null
      return
    }
    if (lastSeekRef.current === seekTime) return

    const creatorVideo = creatorVideoRef.current
    const demoVideo = demoVideoRef.current

    if (!creatorVideo && !demoVideo) return

    const creatorDur = creatorVideo?.duration || 0

    if (seekTime <= creatorDur && creatorVideo && creatorVideoUrl) {
      creatorVideo.currentTime = Math.min(seekTime, creatorDur)
      if (demoVideo) demoVideo.currentTime = 0
      setCurrentPhase('creator')
      if (play) creatorVideo.play().catch(() => {})
      else creatorVideo.pause()
      demoVideo?.pause()
    } else if (demoVideo && demoVideoUrl) {
      const demoTime = seekTime - creatorDur
      demoVideo.currentTime = Math.max(0, Math.min(demoTime, demoVideo.duration || 0))
      if (creatorVideo) {
        creatorVideo.currentTime = creatorDur
        creatorVideo.pause()
      }
      setCurrentPhase('demo')
      if (play) demoVideo.play().catch(() => {})
      else demoVideo.pause()
    }

    lastSeekRef.current = seekTime
  }, [seekTime, play, creatorVideoUrl, demoVideoUrl])

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvasWidth / rect.width
    const scaleY = canvasHeight / rect.height
    const mouseX = (e.clientX - rect.left) * scaleX
    const mouseY = (e.clientY - rect.top) * scaleY

    const mode = getInteractionMode(mouseX, mouseY)
    if (mode === 'none') return

    setInteractionMode(mode)

    const centerX = canvasWidth * localStyle.xPercent
    const centerY = canvasHeight * localStyle.yPercent

    dragStartRef.current = {
      x: mouseX,
      y: mouseY,
      startX: localStyle.xPercent,
      startY: localStyle.yPercent,
      startWidth: localStyle.widthPercent,
      startFontSize: localStyle.fontSize || 16,
      startRotation: localStyle.rotation || 0,
      centerX,
      centerY
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvasWidth / rect.width
    const scaleY = canvasHeight / rect.height
    const mouseX = (e.clientX - rect.left) * scaleX
    const mouseY = (e.clientY - rect.top) * scaleY

    // Update cursor based on hover
    if (interactionMode === 'none') {
      const hoverMode = getInteractionMode(mouseX, mouseY)
      canvas.style.cursor = getCursor(hoverMode)
      return
    }

    if (interactionMode === 'drag') {
      const deltaX = (mouseX - dragStartRef.current.x) / canvasWidth
      const deltaY = (mouseY - dragStartRef.current.y) / canvasHeight

      const newX = Math.max(0.05, Math.min(0.95, dragStartRef.current.startX + deltaX))
      const newY = Math.max(0.05, Math.min(0.95, dragStartRef.current.startY + deltaY))

      setLocalStyle(prev => ({ ...prev, xPercent: newX, yPercent: newY }))
    } else if (interactionMode === 'rotate') {
      const centerX = dragStartRef.current.centerX
      const centerY = dragStartRef.current.centerY

      // Calculate angle from center to current mouse position
      const currentAngle = Math.atan2(mouseY - centerY, mouseX - centerX) * 180 / Math.PI
      const startAngle = Math.atan2(dragStartRef.current.y - centerY, dragStartRef.current.x - centerX) * 180 / Math.PI

      // Calculate rotation delta from start position
      const deltaAngle = currentAngle - startAngle
      const newRotation = dragStartRef.current.startRotation + deltaAngle

      setLocalStyle(prev => ({ ...prev, rotation: newRotation }))
    } else if (interactionMode.startsWith('resize-')) {
      const deltaX = mouseX - dragStartRef.current.x
      const deltaY = mouseY - dragStartRef.current.y

      // Scale based on diagonal movement
      const scaleFactor = 1 + (deltaX + deltaY) / 500
      const newFontSize = Math.max(12, Math.min(48, dragStartRef.current.startFontSize * scaleFactor))

      setLocalStyle(prev => ({ ...prev, fontSize: newFontSize }))
    }
  }

  const handleMouseUp = () => {
    if (interactionMode !== 'none') {
      onCaptionStyleChange?.({
        xPercent: localStyle.xPercent,
        yPercent: localStyle.yPercent,
        widthPercent: localStyle.widthPercent,
        fontSize: localStyle.fontSize,
        rotation: localStyle.rotation
      })
    }
    setInteractionMode('none')
  }


  const getCursor = (mode: InteractionMode): string => {
    switch (mode) {
      case 'drag': return 'move'
      case 'rotate': return 'grab'
      case 'resize-tl':
      case 'resize-br': return 'nwse-resize'
      case 'resize-tr':
      case 'resize-bl': return 'nesw-resize'
      default: return 'default'
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Hidden videos */}
      {creatorVideoUrl && (
        <video
          ref={creatorVideoRef}
          src={creatorVideoUrl}
          style={{ display: 'none' }}
          playsInline
          muted={false}
          preload="auto"
        />
      )}
      {demoVideoUrl && (
        <video
          ref={demoVideoRef}
          src={demoVideoUrl}
          style={{ display: 'none' }}
          playsInline
          muted={false}
          preload="auto"
        />
      )}

      {/* Canvas layers */}
      <div style={{ position: 'relative', width: '100%', height: '100%', aspectRatio: aspectRatio.replace(':', '/') }}>
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

        <canvas
          ref={overlayCanvasRef}
          width={canvasWidth}
          height={canvasHeight}
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
            borderRadius: '8px',
            pointerEvents: 'auto',
          }}
        />

      </div>
    </div>
  )
}

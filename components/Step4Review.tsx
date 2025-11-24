'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Variant, CaptionStyle, DemoVideo } from '@/types'
import { CREATOR_TEMPLATES } from '@/lib/constants'
import { wrapText } from '@/lib/textUtils'
import JSZip from 'jszip'
import MiniEditor from './MiniEditor'
import { Play, Download, ChevronLeft, Check, Pencil } from 'lucide-react'

interface Step4ReviewProps {
  variants: Variant[]
  captionStyle: CaptionStyle
  demos: DemoVideo[]
  onUpdate: (variants: Variant[]) => void
  onBack: () => void
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5'
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Get canvas dimensions based on aspect ratio
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

  // Render video frame with caption
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { alpha: false })
    const video = videoRef.current
    if (!canvas || !ctx || !video || video.readyState < 2) return

    // Clear canvas
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Draw video frame
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

    // Draw caption if exists
    if (caption) {
      const style = captionStyle
      const charsPerLine = Math.round(35 * style.widthPercent / 0.8) || 25
      const wrappedText = wrapText(caption, charsPerLine)
      const lines = wrappedText.split('\n')
      const fontSize = Math.max(24, Math.floor((style.fontSize || 16) * 1.5))
      const lineSpacing = Math.max(12, Math.floor(fontSize * 0.5))
      const padding = style.paddingPx || 20

      // Calculate text dimensions
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

      // Draw background with rounded corners
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
      
      // Draw rounded rectangle manually
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

      // Draw text
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

  // Update canvas when video loads or caption changes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoUrl) return

    const handleLoadedData = () => {
      video.currentTime = 0.5 // Show frame at 0.5s
      setTimeout(renderFrame, 100)
    }

    const handleSeeked = () => {
      renderFrame()
    }

    video.addEventListener('loadeddata', handleLoadedData)
    video.addEventListener('seeked', handleSeeked)
    
    if (video.readyState >= 2) {
      video.currentTime = 0.5
    }

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData)
      video.removeEventListener('seeked', handleSeeked)
    }
  }, [videoUrl, renderFrame])

  // Re-render when caption or style changes
  useEffect(() => {
    renderFrame()
  }, [caption, captionStyle, renderFrame])

  return (
    <div
      ref={containerRef}
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
            preload="metadata"
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

export default function Step4Review({ variants, captionStyle, demos, onUpdate, onBack, aspectRatio = '9:16' }: Step4ReviewProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(variants[0]?.id || null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 })
  const [exportError, setExportError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null)
  const lastSelectedIdRef = useRef<string | null>(selectedVariantId)
  const isEditingRef = useRef(false)
  const lastSyncedCaptionRef = useRef<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Get the current caption from the selected variant directly
  const getCurrentCaption = () => {
    const variant = variants.find(v => v.id === selectedVariantId)
    return variant?.caption || ''
  }

  const getCaptionStyleForVariant = (variant: Variant): CaptionStyle => {
    return normalizeCaptionStyle(variant.captionStyleOverride || captionStyle)
  }

  // Get the current selected variant - this will update when variants array changes
  const selectedVariant = useMemo(() => {
    return variants.find(v => v.id === selectedVariantId) || null
  }, [variants, selectedVariantId])
  const selectedCount = useMemo(() => {
    return variants.filter(v => v.selected).length
  }, [variants])
  
  // Local state for editing caption - only sync when variant changes (not when we're editing)
  const [editingCaption, setEditingCaption] = useState(selectedVariant?.caption || '')
  
  // Sync when selected variant changes OR when the variant's caption changes externally
  useEffect(() => {
    if (selectedVariant) {
      // If variant ID changed, reset editing state
      if (selectedVariantId !== lastSelectedIdRef.current) {
        lastSelectedIdRef.current = selectedVariantId
        isEditingRef.current = false
        setEditingCaption(selectedVariant.caption)
        lastSyncedCaptionRef.current = selectedVariant.caption
      } 
      // If caption changed externally (not from our editing), sync it
      else if (!isEditingRef.current && selectedVariant.caption !== lastSyncedCaptionRef.current) {
        setEditingCaption(selectedVariant.caption)
        lastSyncedCaptionRef.current = selectedVariant.caption
      }
    } else if (selectedVariantId && !selectedVariant) {
      // Variant was deleted or not found, reset
      setEditingCaption('')
      lastSyncedCaptionRef.current = ''
    }
  }, [selectedVariantId, selectedVariant?.caption, selectedVariant])

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onUpdate(variants.map(v => v.id === id ? { ...v, selected: !v.selected } : v))
  }

  const updateVariant = (id: string, updates: Partial<Variant>) => {
    onUpdate(variants.map(v => v.id === id ? { ...v, ...updates } : v))
  }

  const handleExport = async () => {
    const selectedVariants = variants.filter(v => v.selected)
    if (selectedVariants.length === 0) return

    setIsExporting(true)
    setExportError(null)
    setExportProgress({ current: 0, total: selectedVariants.length })

    try {
      const zip = new JSZip()
      const metadata: any[] = []

      for (let i = 0; i < selectedVariants.length; i++) {
        const variant = selectedVariants[i]
        const demoVideo = demos.find(d => d.id === variant.demoId)
        if (!demoVideo?.file) continue

        setExportProgress({ current: i, total: selectedVariants.length })

        // Add video file
        const timestamp = Date.now()
        const safeCreatorName = variant.creatorName.replace(/[^a-z0-9]/gi, '_')
        const safeDemoName = variant.demoName.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/gi, '_').substring(0, 30)
        const filename = `${safeDemoName}_${safeCreatorName}_${timestamp}.mp4`

        zip.file(filename, demoVideo.file)
        metadata.push({
          filename,
          demoName: variant.demoName,
          creator: variant.creatorName,
          caption: variant.caption,
          hashtags: variant.hashtags,
          cta: variant.cta,
        })
      }

      if (metadata.length === 0) {
        throw new Error('No videos to export')
      }

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

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ugc-export-${Date.now()}.zip`
      a.click()
      URL.revokeObjectURL(url)

      setIsExporting(false)
      setExportProgress({ current: 0, total: 0 })
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed')
      setIsExporting(false)
    }
  }

  // Get video URLs for selected variant
  const selectedCreator = selectedVariant
    ? CREATOR_TEMPLATES.find(t => t.id === selectedVariant.creatorTemplateId)
    : null
  const selectedDemo = selectedVariant
    ? demos.find(d => d.id === selectedVariant.demoId)
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ marginBottom: '0.75rem', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '0.25rem', fontWeight: '600', color: '#111827' }}>
            Review & Export
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>
            {variants.length} clips generated • {selectedCount} selected for export
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={onBack}
            style={{
              padding: '0.5rem 1rem',
              background: 'white',
              color: '#374151',
              borderRadius: '8px',
              fontWeight: '500',
              fontSize: '0.75rem',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <button
            onClick={handleExport}
            disabled={selectedCount === 0 || isExporting}
            style={{
              padding: '0.5rem 1rem',
              background: selectedCount === 0 || isExporting ? '#e5e7eb' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: selectedCount === 0 || isExporting ? '#9ca3af' : 'white',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.75rem',
              border: 'none',
              cursor: selectedCount === 0 || isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              boxShadow: selectedCount > 0 && !isExporting ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 'none',
            }}
          >
            <Download size={14} />
            {isExporting ? 'Exporting...' : 'Download'}
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1.3fr 1fr',
        gap: '0.875rem',
        minHeight: 0,
        maxHeight: '100%',
        overflow: 'hidden',
      }}>
        {/* LEFT - Video Preview */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          maxHeight: '100%',
          overflow: 'hidden',
        }}>
          {selectedVariant ? (
            <MiniEditor
              key={`preview-${selectedVariantId}`}
              creatorVideoUrl={selectedCreator?.videoUrl || null}
              demoVideoUrl={selectedDemo?.url}
              caption={selectedVariant.caption}
              captionStyle={getCaptionStyleForVariant(selectedVariant)}
              aspectRatio={aspectRatio}
              onAspectRatioChange={() => {}}
              onCaptionChange={(newCaption) => {
                // Only update if the caption actually changed and we're not already syncing from textarea
                if (selectedVariant && newCaption !== selectedVariant.caption && !isEditingRef.current) {
                  updateVariant(selectedVariant.id, { caption: newCaption })
                  // Also update the textarea if it's not being actively edited
                  if (!isEditingRef.current) {
                    setEditingCaption(newCaption)
                    lastSyncedCaptionRef.current = newCaption
                  }
                }
              }}
              onCaptionStyleChange={(updates) => {
                const currentStyle = getCaptionStyleForVariant(selectedVariant)
                const newStyle = normalizeCaptionStyle({ ...currentStyle, ...updates })
                updateVariant(selectedVariant.id, { captionStyleOverride: newStyle })
              }}
              creatorDuration={0}
              totalDuration={totalDuration}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              onDurationUpdate={setTotalDuration}
              isPlaying={isPlaying}
              onPlayStateChange={setIsPlaying}
            />
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              color: '#9ca3af',
              fontSize: '0.875rem',
            }}>
              Select a clip to preview
            </div>
          )}
        </div>

        {/* RIGHT - Caption Editor + Clips List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          minHeight: 0,
          maxHeight: '100%',
          height: '100%',
          overflow: 'hidden',
        }}>
          {/* Caption Editor Section */}
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            padding: '0.625rem',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              marginBottom: '0.5rem',
            }}>
              <Pencil size={12} style={{ color: '#3b82f6' }} />
              <span style={{ fontWeight: '600', fontSize: '0.75rem', color: '#1f2937' }}>
                Edit Caption
              </span>
              {selectedVariant && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '0.6rem',
                  color: '#6b7280',
                  background: '#f3f4f6',
                  padding: '0.125rem 0.375rem',
                  borderRadius: '6px',
                }}>
                  Clip {variants.findIndex(v => v.id === selectedVariantId) + 1}
                </span>
              )}
            </div>
            <textarea
              ref={textareaRef}
              value={editingCaption}
              onChange={(e) => {
                const newCaption = e.target.value
                isEditingRef.current = true
                setEditingCaption(newCaption)
                // Immediately update the variant - syncs with preview and config
                if (selectedVariant) {
                  // Create a new variants array with updated caption
                  const updatedVariants = variants.map(v => 
                    v.id === selectedVariant.id 
                      ? { ...v, caption: newCaption }
                      : v
                  )
                  onUpdate(updatedVariants)
                  lastSyncedCaptionRef.current = newCaption
                }
              }}
              onFocus={(e) => {
                if (selectedVariant) {
                  isEditingRef.current = true
                  e.target.style.borderColor = '#3b82f6'
                  e.target.style.background = 'white'
                }
              }}
              onBlur={(e) => {
                isEditingRef.current = false
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.background = '#fafafa'
                // Ensure final value is saved
                if (selectedVariant && editingCaption !== selectedVariant.caption) {
                  updateVariant(selectedVariant.id, { caption: editingCaption })
                }
              }}
              onKeyDown={(e) => {
                // Allow all keys including delete, backspace, etc.
                e.stopPropagation()
                // Save on Enter (but allow Shift+Enter for new lines)
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  e.currentTarget.blur()
                }
              }}
              placeholder="Select a clip to edit its caption..."
              disabled={!selectedVariant}
              style={{
                width: '100%',
                minHeight: '50px',
                maxHeight: '70px',
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '0.7rem',
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.4,
                background: selectedVariant ? '#fafafa' : '#f3f4f6',
                color: selectedVariant ? '#374151' : '#9ca3af',
                transition: 'border-color 0.15s, background-color 0.15s',
              }}
            />
          </div>

          {/* Clips List Section */}
          <div style={{
            flex: '1 1 0',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            overflow: 'hidden',
            minHeight: 0,
          }}>
            {/* Header */}
            <div style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'white',
              flexShrink: 0,
            }}>
              <span style={{ fontWeight: '600', fontSize: '0.75rem', color: '#111827', letterSpacing: '-0.01em' }}>
                Generated Clips
              </span>
              <span style={{
                fontSize: '0.65rem',
                color: '#9ca3af',
                fontWeight: '500',
              }}>
                {variants.length}
              </span>
            </div>

            {/* Scrollable Clips Grid */}
            <div style={{
              flex: '1 1 0',
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '0.375rem',
              minHeight: 0,
              height: 0,
            }}>
            {variants.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                fontSize: '0.8rem',
                textAlign: 'center',
                padding: '2rem',
              }}>
                <Play size={32} style={{ color: '#d1d5db', marginBottom: '0.5rem' }} />
                <div>No clips generated yet</div>
                <div style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>Go back and generate some captions first</div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                padding: '0.75rem',
              }}>
                {variants.map(variant => {
                  const demoVideo = demos.find(d => d.id === variant.demoId)
                  const isSelected = selectedVariantId === variant.id
                  const variantStyle = getCaptionStyleForVariant(variant)

                  return (
                    <div
                      key={variant.id}
                      onClick={() => {
                        if (selectedVariantId !== variant.id) {
                          setIsPlaying(false)
                          setCurrentTime(0)
                          setSelectedVariantId(variant.id)
                        }
                      }}
                      style={{
                        cursor: 'pointer',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        backgroundColor: '#fff',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected 
                          ? '0 0 0 3px rgba(59, 130, 246, 0.1)' 
                          : '0 1px 2px rgba(0, 0, 0, 0.04)',
                      }}
                    >
                      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        {/* Video Thumbnail with Embedded Caption */}
                        <ThumbnailCanvas
                          videoUrl={demoVideo?.url}
                          caption={variant.caption}
                          captionStyle={variantStyle}
                          aspectRatio={aspectRatio}
                        />

                        {/* Minimal Checkbox - Top Left Corner */}
                        <div
                          onClick={(e) => toggleSelection(variant.id, e)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            backgroundColor: variant.selected ? '#3b82f6' : 'rgba(255, 255, 255, 0.9)',
                            border: variant.selected ? 'none' : '2px solid rgba(255, 255, 255, 0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            zIndex: 10,
                          }}
                        >
                          {variant.selected && <Check size={12} color="white" strokeWidth={2.5} />}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            </div>
          </div>
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
            padding: '1.5rem',
            maxWidth: '20rem',
            width: '100%',
            margin: '1rem',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              Exporting Videos
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem' }}>
              Processing {exportProgress.current + 1} of {exportProgress.total}...
            </p>
            <div style={{
              width: '100%',
              backgroundColor: '#e5e7eb',
              borderRadius: '9999px',
              height: '6px',
              overflow: 'hidden',
            }}>
              <div style={{
                backgroundColor: '#3b82f6',
                height: '100%',
                borderRadius: '9999px',
                transition: 'width 0.3s ease',
                width: `${exportProgress.total > 0 ? (exportProgress.current / exportProgress.total) * 100 : 0}%`,
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {exportError && !isExporting && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          maxWidth: '20rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 50,
          fontSize: '0.8rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>{exportError}</div>
            <button
              onClick={() => setExportError(null)}
              style={{
                marginLeft: '0.5rem',
                color: '#991b1b',
                fontSize: '1rem',
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

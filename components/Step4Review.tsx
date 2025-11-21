'use client'

import { useState, useRef } from 'react'
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
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5'
}

// Helper function to format time in MM:SS
const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds === 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Helper function to normalize CaptionStyle
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

  return {
    ...style,
    xPercent,
    yPercent,
    widthPercent,
    paddingPx,
  }
}

export default function Step4Review({ variants, captionStyle, demos, onUpdate, onBack, aspectRatio = '9:16' }: Step4ReviewProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(variants[0]?.id || null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 })
  const [exportError, setExportError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const videoPreviewRef = useRef<any>(null)

  const getCaptionStyleForVariant = (variant: Variant): CaptionStyle => {
    return normalizeCaptionStyle(variant.captionStyleOverride || captionStyle)
  }

  const selectedVariant = variants.find(v => v.id === selectedVariantId)
  const selectedCount = variants.filter(v => v.selected).length

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

    try {
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

      const formData = new FormData()
      formData.append('video', demoVideo.file)
      if (creatorVideoFile) {
        formData.append('creatorVideo', creatorVideoFile)
      }
      formData.append('caption', variant.caption)

      const styleForVariant = getCaptionStyleForVariant(variant)
      formData.append('captionStyle', JSON.stringify(styleForVariant))
      if (startTime !== undefined) {
        formData.append('startTime', startTime.toString())
      }
      if (duration !== undefined) {
        formData.append('duration', duration.toString())
      }

      const response = await fetch('/api/render-video', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to render video')
      }

      const blob = await response.blob()
      return blob
    } catch (error) {
      console.error('Render error:', error)
      return null
    }
  }

  const handleExport = async (captionsOnly: boolean = false) => {
    const selectedVariants = variants.filter(v => v.selected)

    if (captionsOnly) {
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

    setIsExporting(true)
    setExportError(null)
    setExportProgress({ current: 0, total: selectedVariants.length })

    try {
      const zip = new JSZip()
      const metadata: any[] = []

      for (let i = 0; i < selectedVariants.length; i++) {
        const variant = selectedVariants[i]
        const demoVideo = demos.find(d => d.id === variant.demoId)

        if (!demoVideo?.file) {
          setExportError(`Skipped video ${i + 1}: missing file`)
          continue
        }

        setExportProgress({ current: i, total: selectedVariants.length })

        try {
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

          const renderedBlob = await renderVideoWithCaption(
            variant,
            demoVideo,
            variant.startTime,
            variant.duration
          )

          if (renderedBlob && renderedBlob.size > 1000) {
            const timestamp = Date.now()
            const randomSuffix = Math.random().toString(36).substring(2, 8)
            const safeCreatorName = variant.creatorName.replace(/[^a-z0-9]/gi, '_')
            const safeDemoName = variant.demoName.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]/gi, '_').substring(0, 30)
            const filename = `${safeDemoName}_${safeCreatorName}_${timestamp}_${randomSuffix}.mp4`

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
            setExportError(`Failed to render video ${i + 1}. Continuing with others...`)
          }
        } catch (error) {
          setExportError(`Error on video ${i + 1}. Continuing with others...`)
        }
      }

      if (metadata.length === 0) {
        throw new Error('No videos were successfully rendered')
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
      setExportError(null)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Failed to export videos. Please try again.')
      setIsExporting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header - Fixed */}
      <div style={{
        padding: '0.5rem 1.5rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: 'white',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.125rem', color: '#111827' }}>
              Review & Export
            </h2>
            <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
              {variants.length} videos ready • {selectedCount} selected
            </p>
          </div>

          {/* Download Button - Moved to Top */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={onBack}
              disabled={isExporting}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'white',
                color: '#374151',
                borderRadius: '8px',
                fontWeight: '500',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                opacity: isExporting ? 0.5 : 1,
                border: '1px solid #e5e7eb',
                fontSize: '0.875rem',
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => handleExport(false)}
              disabled={selectedCount === 0 || isExporting}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: selectedCount === 0 || isExporting ? '#d1d5db' : '#3b82f6',
                color: 'white',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: selectedCount === 0 || isExporting ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                border: 'none',
              }}
            >
              {isExporting ? 'Rendering...' : 'Download Videos'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '550px 1fr',
        gap: 0,
        overflow: 'hidden',
      }}>
        {/* Left Side - Video Editor Preview */}
        <div style={{
          borderRight: '1px solid #e5e7eb',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {selectedVariant ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '0.75rem',
              gap: '0.5rem',
              overflow: 'hidden',
            }}>
              {/* Video Player Container */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '1rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #e5e7eb',
                position: 'relative',
                minHeight: 0,
                gap: '0.75rem',
              }}>
                {/* Video Canvas */}
                <div
                  style={{
                    width: aspectRatio === '16:9' ? '100%' : aspectRatio === '1:1' ? '70%' : aspectRatio === '4:5' ? '65%' : '45%',
                    aspectRatio: aspectRatio.replace(':', '/'),
                    borderRadius: '8px',
                    overflow: 'hidden',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  <VideoCanvasPreview
                    creatorVideoUrl={CREATOR_TEMPLATES.find(t => t.id === selectedVariant.creatorTemplateId)?.videoUrl}
                    demoVideoUrl={demos.find(d => d.id === selectedVariant.demoId)?.url}
                    caption={selectedVariant.caption}
                    captionStyle={getCaptionStyleForVariant(selectedVariant)}
                    aspectRatio={aspectRatio}
                    play={isPlaying}
                    onPlayStateChange={setIsPlaying}
                    onTimeUpdate={(time, dur) => {
                      setCurrentTime(time)
                      setDuration(dur)
                    }}
                    onCaptionChange={(newCaption) => {
                      updateVariant(selectedVariant.id, { caption: newCaption })
                    }}
                    onCaptionStyleChange={(updates) => {
                      const currentStyle = getCaptionStyleForVariant(selectedVariant)
                      const newStyle = normalizeCaptionStyle({ ...currentStyle, ...updates })
                      updateVariant(selectedVariant.id, { captionStyleOverride: newStyle })
                    }}
                  />
                </div>

                {/* Video Controls - Below Video */}
                <div style={{
                  width: aspectRatio === '16:9' ? '100%' : aspectRatio === '1:1' ? '70%' : aspectRatio === '4:5' ? '65%' : '45%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}>
                  {/* Timeline */}
                  <div style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '2px',
                    position: 'relative',
                    cursor: 'pointer',
                  }}>
                    <div style={{
                      height: '100%',
                      backgroundColor: '#3b82f6',
                      borderRadius: '2px',
                      width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                    }} />
                  </div>

                  {/* Controls Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}>
                    {/* Play/Pause Button */}
                    <button
                      onClick={() => {
                        // Toggle play state - the VideoCanvasPreview handles the actual playback
                        setIsPlaying(!isPlaying)
                      }}
                      style={{
                        padding: '0.4rem 0.6rem',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                      }}
                    >
                      {isPlaying ? '⏸' : '▶'}
                    </button>

                    {/* Time Display */}
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>

                    {/* Volume Control */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flex: 1,
                      maxWidth: '120px',
                    }}>
                      <span style={{ fontSize: '0.875rem' }}>🔊</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        style={{
                          flex: 1,
                          height: '4px',
                          borderRadius: '2px',
                          outline: 'none',
                          WebkitAppearance: 'none',
                          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${volume * 100}%, #e5e7eb ${volume * 100}%, #e5e7eb 100%)`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: '0.875rem',
            }}>
              Select a video to preview
            </div>
          )}
        </div>

        {/* Right Side - Video Grid */}
        <div style={{
          overflow: 'auto',
          padding: '0.5rem',
          backgroundColor: '#fafafa',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '0.625rem',
          }}>
            {variants.map(variant => {
              const demoVideo = demos.find(d => d.id === variant.demoId)
              const creatorTemplate = CREATOR_TEMPLATES.find(t => t.id === variant.creatorTemplateId)
              const isSelected = selectedVariantId === variant.id
              const variantStyle = getCaptionStyleForVariant(variant)

              return (
                <div
                  key={variant.id}
                  onClick={() => setSelectedVariantId(variant.id)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: isSelected ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                    backgroundColor: '#000',
                    transition: 'all 0.15s',
                    boxShadow: isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
                  }}
                >
                  {/* Video Thumbnail - 9:16 with Caption Overlay */}
                  <div style={{
                    aspectRatio: '9/16',
                    backgroundColor: '#000',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {demoVideo?.url && (
                      <video
                        src={demoVideo.url}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                        muted
                        playsInline
                      />
                    )}

                    {/* Caption Overlay - Positioned like in preview */}
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '85%',
                      [variantStyle.position === 'top' ? 'top' :
                       variantStyle.position === 'center' ? 'top' : 'bottom']:
                        variantStyle.position === 'top' ? '15%' :
                        variantStyle.position === 'center' ? '50%' : '15%',
                      ...(variantStyle.position === 'center' && { transform: 'translate(-50%, -50%)' }),
                      padding: '0.25rem 0.4rem',
                      backgroundColor: `${variantStyle.backgroundColor}${Math.round(variantStyle.backgroundOpacity * 255).toString(16).padStart(2, '0')}`,
                      borderRadius: '4px',
                      pointerEvents: 'none',
                    }}>
                      <div style={{
                        color: variantStyle.textColor,
                        fontSize: '0.45rem',
                        fontWeight: '600',
                        lineHeight: '1.2',
                        textAlign: 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {variant.caption}
                      </div>
                    </div>

                    {/* Creator Badge - Top Left */}
                    <div style={{
                      position: 'absolute',
                      top: '0.35rem',
                      left: '0.35rem',
                      padding: '0.2rem 0.4rem',
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '0.5rem',
                      fontWeight: '600',
                      backdropFilter: 'blur(4px)',
                    }}>
                      {variant.creatorName}
                    </div>

                    {/* Export Checkbox - Top Right */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSelection(variant.id)
                      }}
                      style={{
                        position: 'absolute',
                        top: '0.35rem',
                        right: '0.35rem',
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        backgroundColor: variant.selected ? '#3b82f6' : 'rgba(255,255,255,0.95)',
                        border: variant.selected ? 'none' : '2px solid rgba(255,255,255,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {variant.selected && (
                        <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: '700' }}>✓</span>
                      )}
                    </div>

                    {/* Playing Indicator */}
                    {isSelected && (
                      <div style={{
                        position: 'absolute',
                        bottom: '0.35rem',
                        right: '0.35rem',
                        padding: '0.25rem 0.35rem',
                        borderRadius: '4px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        fontSize: '0.5rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                      }}>
                        ▶ Now Playing
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
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

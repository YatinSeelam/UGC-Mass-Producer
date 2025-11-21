'use client'

import { useState, useRef, useEffect } from 'react'
import { ExperimentData } from '@/types'
import VideoCanvasPreview from './VideoCanvasPreview'
import { CREATOR_TEMPLATES } from '@/lib/constants'

interface Step3ConfigProps {
  data: ExperimentData
  onUpdate: (config: Partial<ExperimentData>) => void
  onNext: () => void
  onBack: () => void
  onGenerate: (variants: ExperimentData['variants']) => void
}

export default function Step3Config({ data, onUpdate, onNext, onBack, onGenerate }: Step3ConfigProps) {
  const [generating, setGenerating] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isEditingCaption, setIsEditingCaption] = useState(false)
  const [editCaptionText, setEditCaptionText] = useState('This is how your captions will look')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [creatorDuration, setCreatorDuration] = useState(0)
  const [demoDuration, setDemoDuration] = useState(0)
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false)
  const creatorVideoRef = useRef<HTMLVideoElement>(null)
  const demoVideoRef = useRef<HTMLVideoElement>(null)

  const totalVariants =
    data.demos.length *
    Math.max(data.selectedCreators.length || 1, 1) *
    data.captionsPerCombo

  // Calculate preview dimensions based on aspect ratio
  const getPreviewDimensions = () => {
    const baseSize = 180 // Base size for 1:1
    const ratio = data.aspectRatio || '9:16'
    
    switch (ratio) {
      case '9:16':
        return { width: baseSize * 0.5625, height: baseSize } // 9:16 = 0.5625:1 (tall)
      case '16:9':
        return { width: baseSize, height: baseSize * 0.5625 } // 16:9 = 1:0.5625 (wide)
      case '1:1':
        return { width: baseSize, height: baseSize } // 1:1 ratio
      case '4:5':
        return { width: baseSize * 0.8, height: baseSize } // 4:5 = 0.8:1 (tall)
      default:
        return { width: baseSize, height: baseSize }
    }
  }

  const previewDims = getPreviewDimensions()

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - previewPosition.x, y: e.clientY - previewPosition.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPreviewPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 50))
  }

  const handleReset = () => {
    setZoom(100)
    setPreviewPosition({ x: 0, y: 0 })
  }

  // Get creator video URL
  const selectedCreator = data.selectedCreators.length > 0 
    ? CREATOR_TEMPLATES.find(t => t.id === data.selectedCreators[0])
    : null
  const creatorVideoUrl = selectedCreator?.videoUrl || null
  const demoVideoUrl = data.demos[0]?.url

  // Load video durations
  useEffect(() => {
    const creatorVideo = creatorVideoRef.current
    const demoVideo = demoVideoRef.current

    const updateDurations = () => {
      let creatorDur = 0
      let demoDur = 0
      
      if (creatorVideo && creatorVideo.duration) {
        creatorDur = creatorVideo.duration
        setCreatorDuration(creatorDur)
      }
      
      if (demoVideo && demoVideo.duration) {
        demoDur = demoVideo.duration
        setDemoDuration(demoDur)
      }
      
      if (creatorDur > 0 || demoDur > 0) {
        setTotalDuration(creatorDur + demoDur)
      }
    }

    if (creatorVideo && creatorVideoUrl) {
      creatorVideo.addEventListener('loadedmetadata', updateDurations)
      if (creatorVideo.readyState >= 1) updateDurations()
    }

    if (demoVideo && demoVideoUrl) {
      demoVideo.addEventListener('loadedmetadata', updateDurations)
      if (demoVideo.readyState >= 1) updateDurations()
    }

    return () => {
      if (creatorVideo) creatorVideo.removeEventListener('loadedmetadata', updateDurations)
      if (demoVideo) demoVideo.removeEventListener('loadedmetadata', updateDurations)
    }
  }, [creatorVideoUrl, demoVideoUrl])

  // Handle timeline drag
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingTimeline(true)
    handleTimelineClick(e)
  }

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingTimeline) {
      handleTimelineClick(e)
    }
  }

  const handleTimelineMouseUp = () => {
    setIsDraggingTimeline(false)
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (totalDuration === 0) return
    
    const timeline = e.currentTarget
    const rect = timeline.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    
    const newTime = percentage * totalDuration
    setCurrentTime(newTime)
    
    // Update video playback based on timeline position
    if (newTime <= creatorDuration) {
      // In creator video segment
      if (creatorVideoRef.current) {
        creatorVideoRef.current.currentTime = newTime
      }
      if (demoVideoRef.current) {
        demoVideoRef.current.currentTime = 0
      }
    } else {
      // In demo video segment
      if (creatorVideoRef.current) {
        creatorVideoRef.current.currentTime = creatorDuration
      }
      if (demoVideoRef.current) {
        demoVideoRef.current.currentTime = newTime - creatorDuration
      }
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demos: data.demos.map(d => ({ id: d.id, name: d.name, transcript: d.transcript || '' })),
          creators: data.selectedCreators.length > 0
            ? data.selectedCreators
            : ['neutral'],
          productDescription: data.productDescription,
          audience: data.audience,
          tone: data.tone,
          captionsPerCombo: data.captionsPerCombo,
          captionLength: data.captionLength || 'medium',
          subtitleEnabled: data.subtitleEnabled,
          subtitleStyle: data.subtitleStyle,
        }),
      })

      if (response.ok) {
        const { variants } = await response.json()
        onGenerate(variants)
        onNext()
      } else {
        alert('Failed to generate captions. Please try again.')
      }
    } catch (error) {
      console.error('Generation error:', error)
      alert('Failed to generate captions. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '0' }}>
      {/* Header with Stats */}
      <div style={{ marginBottom: '0.75rem', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.125rem', fontWeight: '600', color: '#111827' }}>
            Step 3 – Configure & Generate
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>
            Configure your product details and caption preferences
          </p>
        </div>
        <div style={{
          padding: '0.375rem 0.75rem',
          backgroundColor: '#eff6ff',
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: '#1e40af',
          fontWeight: '600'
        }}>
          {data.demos.length}D · {data.selectedCreators.length || 1}C · {data.captionsPerCombo}V = <span style={{ color: '#3b82f6', fontSize: '0.9rem' }}>{totalVariants}</span>
        </div>
      </div>

      {/* Main Content Area - New Layout: Video Preview + Caption Editor */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        marginBottom: '0.5rem',
        display: 'grid',
        gridTemplateColumns: '400px 1fr',
        gap: '1rem',
        minHeight: 0,
        maxHeight: '500px',
      }}>
        {/* Left Side - Video Preview with Caption Overlay */}
        <div style={{
          backgroundColor: '#000',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          minHeight: 0,
          height: '100%',
        }}>
          {/* Controls Bar - Top */}
          <div style={{
            position: 'absolute',
            top: '0.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '0.5rem',
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: '0.5rem',
            borderRadius: '6px',
            backdropFilter: 'blur(10px)',
            zIndex: 10,
            alignItems: 'center',
          }}>
            {/* Aspect Ratio Buttons */}
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {[
                { label: '9:16', value: '9:16' },
                { label: '16:9', value: '16:9' },
                { label: '1:1', value: '1:1' },
                { label: '4:5', value: '4:5' },
              ].map(aspect => (
                <button
                  key={aspect.value}
                  onClick={() => {
                    onUpdate({ aspectRatio: aspect.value })
                    setPreviewPosition({ x: 0, y: 0 })
                  }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    border: (data.aspectRatio || '9:16') === aspect.value ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.3)',
                    backgroundColor: (data.aspectRatio || '9:16') === aspect.value ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {aspect.label}
                </button>
              ))}
            </div>
            
            {/* Zoom Controls */}
            <div style={{ 
              display: 'flex', 
              gap: '0.25rem', 
              marginLeft: '0.5rem',
              paddingLeft: '0.5rem',
              borderLeft: '1px solid rgba(255,255,255,0.2)'
            }}>
              <button
                onClick={handleZoomOut}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                }}
              >
                −
              </button>
              <div style={{
                padding: '0.25rem 0.5rem',
                color: 'white',
                fontSize: '0.7rem',
                minWidth: '45px',
                textAlign: 'center',
              }}>
                {zoom}%
              </div>
              <button
                onClick={handleZoomIn}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                }}
              >
                +
              </button>
              <button
                onClick={handleReset}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  marginLeft: '0.25rem',
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Video Preview Container - Draggable and Zoomable */}
          <div 
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: `translate(calc(-50% + ${previewPosition.x}px), calc(-50% + ${previewPosition.y}px))`,
              width: `${previewDims.width * (zoom / 100)}px`,
              height: `${previewDims.height * (zoom / 100)}px`,
              backgroundColor: '#1a1a1a',
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Hidden video refs for duration calculation */}
            {creatorVideoUrl && (
              <video
                ref={creatorVideoRef}
                src={creatorVideoUrl}
                style={{ display: 'none' }}
                preload="metadata"
              />
            )}
            {demoVideoUrl && (
              <video
                ref={demoVideoRef}
                src={demoVideoUrl}
                style={{ display: 'none' }}
                preload="metadata"
              />
            )}

            {/* Video Preview with both creator and demo */}
            {demoVideoUrl ? (
              <VideoCanvasPreview
                creatorVideoUrl={creatorVideoUrl}
                demoVideoUrl={demoVideoUrl}
                caption={editCaptionText}
                captionStyle={data.captionStyle}
                aspectRatio={(data.aspectRatio || '9:16') as '9:16' | '16:9' | '1:1' | '4:5'}
                play={isPlaying}
                onPlayStateChange={setIsPlaying}
                seekTime={currentTime}
                creatorDuration={creatorDuration}
                onTimeUpdate={(time, duration) => {
                  if (!isDraggingTimeline) {
                    setCurrentTime(time)
                    setTotalDuration(duration)
                  }
                }}
                onCaptionChange={(newCaption) => {
                  setEditCaptionText(newCaption)
                }}
              />
            ) : (
              <div style={{
                color: '#666',
                fontSize: '0.65rem',
                textAlign: 'center',
                padding: '0.75rem',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                Upload a demo video<br />to preview
              </div>
            )}

          </div>

          {/* Timeline - Shows creator and demo videos separately */}
          {totalDuration > 0 && (
            <div style={{
              position: 'absolute',
              bottom: '0.5rem',
              left: '0.5rem',
              right: '0.5rem',
              height: '60px',
              backgroundColor: 'rgba(0,0,0,0.8)',
              borderRadius: '6px',
              padding: '0.5rem',
              zIndex: 10,
            }}>
              <div style={{
                fontSize: '0.65rem',
                color: 'white',
                marginBottom: '0.25rem',
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span>Timeline</span>
                <span>{Math.floor(currentTime)}s / {Math.floor(totalDuration)}s</span>
              </div>
              
              {/* Timeline Track */}
              <div
                style={{
                  width: '100%',
                  height: '32px',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '4px',
                  position: 'relative',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
                onMouseDown={handleTimelineMouseDown}
                onMouseMove={handleTimelineMouseMove}
                onMouseUp={handleTimelineMouseUp}
                onMouseLeave={handleTimelineMouseUp}
              >
                {/* Creator Video Segment */}
                {creatorDuration > 0 && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    width: `${(creatorDuration / totalDuration) * 100}%`,
                    height: '100%',
                    backgroundColor: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                    color: 'white',
                    fontWeight: '500',
                  }}>
                    Creator
                  </div>
                )}
                
                {/* Demo Video Segment */}
                {demoDuration > 0 && (
                  <div style={{
                    position: 'absolute',
                    left: `${(creatorDuration / totalDuration) * 100}%`,
                    width: `${(demoDuration / totalDuration) * 100}%`,
                    height: '100%',
                    backgroundColor: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6rem',
                    color: 'white',
                    fontWeight: '500',
                  }}>
                    Demo
                  </div>
                )}

                {/* Timeline Cursor/Progress */}
                <div style={{
                  position: 'absolute',
                  left: `${(currentTime / totalDuration) * 100}%`,
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  backgroundColor: '#ffffff',
                  transform: 'translateX(-50%)',
                  zIndex: 20,
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 0 4px rgba(255,255,255,0.5)',
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Instruction Text */}
          <div style={{
            position: 'absolute',
            bottom: totalDuration > 0 ? '4.5rem' : '0.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '0.375rem 0.625rem',
            borderRadius: '4px',
            fontSize: '0.65rem',
            backdropFilter: 'blur(10px)',
            zIndex: 10,
          }}>
            💡 Drag to move • Zoom: {zoom}% • Drag timeline to scrub
          </div>
        </div>

        {/* Right Side - Caption Editor & Product Details */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: '0.25rem',
          minHeight: 0,
        }}>
          {/* Product Details */}
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#475569',
              marginBottom: '0.5rem'
            }}>
              Product Details
            </div>

            {/* Product Description */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <label style={{
                fontSize: '0.65rem',
                color: '#64748b',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.025em'
              }}>
                What's your product?
              </label>
              <input
                type="text"
                value={data.productDescription}
                onChange={(e) => onUpdate({ productDescription: e.target.value })}
                placeholder="e.g., Smart fitness tracker..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontFamily: 'inherit',
                  fontSize: '0.75rem',
                  backgroundColor: 'white',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            {/* Audience */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
              <label style={{
                fontSize: '0.65rem',
                color: '#64748b',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.025em'
              }}>
                Who's it for?
              </label>
              <input
                type="text"
                value={data.audience}
                onChange={(e) => onUpdate({ audience: e.target.value })}
                placeholder="e.g., Fitness enthusiasts..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontFamily: 'inherit',
                  fontSize: '0.75rem',
                  backgroundColor: 'white',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            {/* Tone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{
                fontSize: '0.65rem',
                color: '#64748b',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.025em'
              }}>
                What's the vibe?
              </label>
              <input
                type="text"
                value={data.tone}
                onChange={(e) => onUpdate({ tone: e.target.value })}
                placeholder="e.g., Casual, playful..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontFamily: 'inherit',
                  fontSize: '0.75rem',
                  backgroundColor: 'white',
                  transition: 'border-color 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
          </div>

          {/* Caption Settings */}
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#475569',
              marginBottom: '0.5rem'
            }}>
              Caption Settings
            </div>

            {/* Caption Length */}
            <div style={{ marginBottom: '0.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.65rem',
                color: '#64748b',
                marginBottom: '0.25rem',
                fontWeight: '500'
              }}>
                Caption Length
              </label>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {(['short', 'medium', 'long'] as const).map(length => (
                  <button
                    key={length}
                    onClick={() => onUpdate({ captionLength: length })}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: `1px solid ${data.captionLength === length ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '6px',
                      backgroundColor: data.captionLength === length ? '#3b82f6' : 'white',
                      color: data.captionLength === length ? 'white' : '#475569',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s'
                    }}
                  >
                    {length}
                  </button>
                ))}
              </div>
            </div>

            {/* Variants */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.65rem',
                color: '#64748b',
                marginBottom: '0.25rem',
                fontWeight: '500'
              }}>
                Variants per Combo
              </label>
              <input
                type="number"
                value={data.captionsPerCombo}
                onChange={(e) => onUpdate({ captionsPerCombo: parseInt(e.target.value) || 3 })}
                min={1}
                max={8}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontFamily: 'inherit',
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  backgroundColor: 'white'
                }}
              />
            </div>
          </div>

          {/* Caption Style Editor */}
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gridColumn: 'span 2',
          }}>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#475569',
              marginBottom: '0.5rem'
            }}>
              Caption Style
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              {/* Colors */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.65rem',
                  color: '#64748b',
                  marginBottom: '0.25rem',
                  fontWeight: '500'
                }}>
                  Text Color
                </label>
                <input
                  type="color"
                  value={data.captionStyle.textColor}
                  onChange={(e) => onUpdate({
                    captionStyle: { ...data.captionStyle, textColor: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.65rem',
                  color: '#64748b',
                  marginBottom: '0.25rem',
                  fontWeight: '500'
                }}>
                  Background
                </label>
                <input
                  type="color"
                  value={data.captionStyle.backgroundColor}
                  onChange={(e) => onUpdate({
                    captionStyle: { ...data.captionStyle, backgroundColor: e.target.value }
                  })}
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Position */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.65rem',
                  color: '#64748b',
                  marginBottom: '0.25rem',
                  fontWeight: '500'
                }}>
                  Position
                </label>
                <select
                  value={data.captionStyle.position}
                  onChange={(e) => onUpdate({
                    captionStyle: { ...data.captionStyle, position: e.target.value as 'top' | 'center' | 'bottom' }
                  })}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.75rem',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
            </div>

            {/* Sliders */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.65rem',
                  color: '#64748b',
                  marginBottom: '0.25rem',
                  fontWeight: '500'
                }}>
                  BG Opacity: {Math.round(data.captionStyle.backgroundOpacity * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={data.captionStyle.backgroundOpacity * 100}
                  onChange={(e) => onUpdate({
                    captionStyle: { ...data.captionStyle, backgroundOpacity: parseInt(e.target.value) / 100 }
                  })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.65rem',
                  color: '#64748b',
                  marginBottom: '0.25rem',
                  fontWeight: '500'
                }}>
                  Font Size: {data.captionStyle.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={data.captionStyle.fontSize}
                  onChange={(e) => onUpdate({
                    captionStyle: { ...data.captionStyle, fontSize: parseInt(e.target.value) }
                  })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        paddingTop: '0.5rem',
        marginTop: 'auto',
        borderTop: '1px solid #e5e7eb',
        flexShrink: 0
      }}>
        <button
          onClick={onBack}
          disabled={generating}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            borderRadius: '6px',
            fontWeight: '500',
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.6 : 1,
            fontSize: '0.75rem',
            border: 'none',
          }}
        >
          Back
        </button>
        <button
          onClick={handleGenerate}
          disabled={generating || !data.productDescription.trim()}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: generating || !data.productDescription.trim() ? '#d1d5db' : '#3b82f6',
            color: 'white',
            borderRadius: '6px',
            fontWeight: '500',
            cursor: generating || !data.productDescription.trim() ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem',
            border: 'none',
          }}
        >
          {generating ? `Generating ${totalVariants}...` : 'Generate Captions'}
        </button>
      </div>
    </div>
  )
}

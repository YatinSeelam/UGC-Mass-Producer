'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { DemoVideo } from '@/types'

interface Step1UploadProps {
  demos: DemoVideo[]
  onUpdate: (demos: DemoVideo[]) => void
  onNext: () => void
}

// Video Thumbnail Component with aspect ratio detection and full player controls
function VideoThumbnail({ demo, isHovered, onRemove }: { demo: DemoVideo, isHovered: boolean, onRemove: () => void }) {
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false) // Start with sound enabled
  const [showControls, setShowControls] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const thumbnailVideoRef = useRef<HTMLVideoElement>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!demo.url || !videoRef.current) return

    const video = videoRef.current
    const handleLoadedMetadata = () => {
      const ratio = video.videoWidth / video.videoHeight
      setAspectRatio(ratio > 1 ? '16:9' : '9:16')
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    if (video.readyState >= 1) handleLoadedMetadata()

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [demo.url])

  useEffect(() => {
    const video = thumbnailVideoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      video.currentTime = 0
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('ended', handleEnded)
    }
  }, [demo.url])

  const handlePlayClick = () => {
    if (thumbnailVideoRef.current) {
      if (isPlaying) {
        thumbnailVideoRef.current.pause()
        setIsPlaying(false)
      } else {
        thumbnailVideoRef.current.muted = isMuted
        thumbnailVideoRef.current.play()
        setIsPlaying(true)
        setShowControls(true)
        resetControlsTimeout()
      }
    }
  }

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (thumbnailVideoRef.current) {
      thumbnailVideoRef.current.muted = !thumbnailVideoRef.current.muted
      setIsMuted(!thumbnailVideoRef.current.muted)
    }
  }

  const handleSeek = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!progressBarRef.current || !thumbnailVideoRef.current) return
    
    const rect = progressBarRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration
    
    thumbnailVideoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }

  const handleMouseMove = () => {
    if (isPlaying) {
      setShowControls(true)
      resetControlsTimeout()
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid rgba(229, 231, 235, 0.5)',
        transition: 'all 0.3s ease',
        boxShadow: isHovered 
          ? '0 8px 24px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.05)' 
          : '0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Hidden video for aspect ratio detection */}
      <video
        ref={videoRef}
        src={demo.url}
        style={{ display: 'none' }}
        preload="metadata"
      />
      
      {/* Video player */}
      <div 
        style={{
          width: '100%',
          aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '9:16' ? '9/16' : '16/9',
          backgroundColor: 'transparent',
          position: 'relative',
          cursor: isPlaying ? 'default' : 'pointer',
          overflow: 'hidden',
        }}
        onClick={handlePlayClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          if (isPlaying) {
            resetControlsTimeout()
          }
        }}
      >
        <video
          ref={thumbnailVideoRef}
          src={demo.url}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            margin: 0,
            padding: 0,
            verticalAlign: 'top',
          }}
          preload="metadata"
          playsInline
          muted={isMuted}
          onLoadedMetadata={() => {
            if (thumbnailVideoRef.current) {
              thumbnailVideoRef.current.muted = isMuted
            }
          }}
        />
        
        {/* Play icon overlay - clean and minimal */}
        {!isPlaying && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isHovered ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.25)',
            pointerEvents: 'none',
            transition: 'background-color 0.2s',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transition: 'all 0.2s',
              transform: isHovered ? 'scale(1.1)' : 'scale(1)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
              color: '#1f2937',
            }}>
              ▶
            </div>
          </div>
        )}

        {/* Video Controls - ultra clean */}
        {(isPlaying || showControls) && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
            padding: '0.625rem 0.75rem',
            pointerEvents: 'auto',
          }}>
            {/* Progress Bar / Timeline - cleaner */}
            <div
              ref={progressBarRef}
              onClick={handleSeek}
              style={{
                width: '100%',
                height: '3px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
                cursor: 'pointer',
                marginBottom: '0.5rem',
                position: 'relative',
              }}
            >
              <div style={{
                height: '100%',
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                backgroundColor: '#ffffff',
                borderRadius: '2px',
                transition: 'width 0.1s linear',
              }} />
              {/* Scrubber handle - minimal */}
              <div style={{
                position: 'absolute',
                left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                cursor: 'grab',
                opacity: 0,
                transition: 'opacity 0.2s',
              }} 
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0'
              }}
              />
            </div>

            {/* Minimal Controls Row - cleaner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePlayClick()
                }}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button
                onClick={handleMuteToggle}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                }}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <span style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: '0.625rem',
                fontWeight: '400',
                fontFamily: 'monospace',
                letterSpacing: '0.025em',
              }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        )}
        
        {/* Filename on hover - clean and minimal */}
        {isHovered && !isPlaying && (
          <div style={{
            position: 'absolute',
            bottom: '0.625rem',
            left: '0.625rem',
            right: '0.625rem',
            padding: '0.375rem 0.5rem',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            color: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '6px',
            fontSize: '0.625rem',
            fontWeight: '400',
            pointerEvents: 'none',
            backdropFilter: 'blur(12px)',
            maxWidth: 'calc(100% - 1.25rem)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
          }}>
            {demo.name}
          </div>
        )}
      </div>

      {/* Remove button (X) - ultra clean */}
      {isHovered && !isPlaying && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          style={{
            position: 'absolute',
            top: '0.625rem',
            right: '0.625rem',
            width: '24px',
            height: '24px',
            padding: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            color: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '50%',
            fontSize: '0.75rem',
            fontWeight: '400',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
            backdropFilter: 'blur(10px)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)'
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.35)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)'
          }}
        >
          ×
        </button>
      )}

    </div>
  )
}

// Wrapper component to track aspect ratio for grid layout
function VideoGridItem({ 
  demo, 
  isHovered, 
  onRemove, 
  onAspectRatioDetected,
  onMouseEnter,
  onMouseLeave
}: { 
  demo: DemoVideo, 
  isHovered: boolean, 
  onRemove: () => void,
  onAspectRatioDetected: (id: string, aspectRatio: '9:16' | '16:9' | null) => void,
  onMouseEnter: () => void,
  onMouseLeave: () => void
}) {
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!demo.url || !videoRef.current) return

    const video = videoRef.current
    const handleLoadedMetadata = () => {
      const ratio = video.videoWidth / video.videoHeight
      const detected = ratio > 1 ? '16:9' : '9:16'
      setAspectRatio(detected)
      onAspectRatioDetected(demo.id, detected)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    if (video.readyState >= 1) handleLoadedMetadata()

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [demo.url, demo.id, onAspectRatioDetected])

  // Grid row span logic:
  // - 9:16 video = 1 column × 3 rows (full height)
  // - 16:9 video = 1 column × 1 row
  // - 3 × 16:9 videos = 3 rows = same height as 1 × 9:16 video
  const gridRowSpan = aspectRatio === '9:16' ? 3 : aspectRatio === '16:9' ? 1 : 1

  return (
    <div 
      style={{ 
        display: 'block',
        height: 'fit-content',
        gridRow: `span ${gridRowSpan}`,
        width: '100%',
        minWidth: 0,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <video ref={videoRef} src={demo.url} style={{ display: 'none' }} preload="metadata" />
      <VideoThumbnail
        demo={demo}
        isHovered={isHovered}
        onRemove={onRemove}
      />
    </div>
  )
}

export default function Step1Upload({ demos, onUpdate, onNext }: Step1UploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [hoveredDemoId, setHoveredDemoId] = useState<string | null>(null)
  const [aspectRatios, setAspectRatios] = useState<Record<string, '9:16' | '16:9' | null>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleAspectRatioDetected = useCallback((id: string, aspectRatio: '9:16' | '16:9' | null) => {
    setAspectRatios(prev => ({ ...prev, [id]: aspectRatio }))
  }, [])

  // Sort demos: 9:16 videos first (normal spacing), then group 16:9 videos together
  // This allows 16:9 videos to stack vertically in columns when there are multiple
  const sortedDemos = useMemo(() => {
    return [...demos].sort((a, b) => {
      const aRatio = aspectRatios[a.id]
      const bRatio = aspectRatios[b.id]
      
      // If aspect ratio not detected yet, keep original order (by upload time)
      if (!aRatio && !bRatio) {
        return (a.uploadedAt?.getTime() || 0) - (b.uploadedAt?.getTime() || 0)
      }
      if (!aRatio) return 1 // Unknown goes after
      if (!bRatio) return -1 // Known goes before
      
      // 9:16 videos come first (normal spacing, no stacking)
      if (aRatio === '9:16' && bRatio === '16:9') return -1
      if (aRatio === '16:9' && bRatio === '9:16') return 1
      
      // Both are 16:9 - keep them together in upload order so they stack
      if (aRatio === '16:9' && bRatio === '16:9') {
        return (a.uploadedAt?.getTime() || 0) - (b.uploadedAt?.getTime() || 0)
      }
      
      // Both are 9:16 - keep original order (normal spacing)
      return (a.uploadedAt?.getTime() || 0) - (b.uploadedAt?.getTime() || 0)
    })
  }, [demos, aspectRatios])

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      file => file.type.startsWith('video/')
    )
    await handleFiles(files)
  }

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return
    
    setUploading(true)
    const newDemos: DemoVideo[] = []

    // First, add all files immediately
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

    // Update demos immediately (don't wait for transcription)
    const updatedDemos = [...demos, ...newDemos]
    onUpdate(updatedDemos)
    setUploading(false)

    // Start async transcription in the background (non-blocking)
    // Store mapping of file to demo ID
    const fileToDemoId = new Map<File, string>()
    files.forEach((file, index) => {
      fileToDemoId.set(file, newDemos[index].id)
    })

    // Process transcription for each file
    files.forEach(async (file) => {
      const demoId = fileToDemoId.get(file)
      if (!demoId) return

      try {
        const formData = new FormData()
        formData.append('video', file)
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        })
        if (response.ok) {
          const { transcript } = await response.json()
          // Note: Transcript will be added later when we have better state management
          // For now, transcription is optional and doesn't block the upload
          console.log('Transcript received for', demoId)
        }
      } catch (error) {
        console.error('Transcription error:', error)
        // Don't block on transcription errors
      }
    })
  }

  const removeDemo = (id: string) => {
    const updated = demos.filter(demo => demo.id !== id)
    onUpdate(updated)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {demos.length === 0 ? (
        /* Initial Upload Area */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? '#3b82f6' : 'rgba(229, 231, 235, 0.8)'}`,
            borderRadius: '16px',
            padding: '4rem 2rem',
            textAlign: 'center',
            background: isDragging 
              ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(248,250,252,0.5) 100%)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: isDragging
              ? '0 8px 24px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255,255,255,0.9)'
              : '0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.6 }}>📹</div>
          <p style={{ fontSize: '0.9375rem', marginBottom: '0.375rem', fontWeight: '500', color: '#374151' }}>
            Drop videos here or click to browse
          </p>
          <p style={{ color: '#9ca3af', marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
            MP4/MOV, up to 2 mins each
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
            style={{
              padding: '0.625rem 1.25rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
              color: 'white',
              borderRadius: '8px',
              fontWeight: '500',
              fontSize: '0.8125rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
          >
            Browse Files
          </button>
        </div>
      ) : (
        /* Gallery View with Subtle Import Button */
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {/* Header with subtle import button and metrics */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1.75rem',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: '400' }}>
              {demos.length} video{demos.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '0.5rem 0.875rem',
                  border: `1px solid ${isDragging ? '#3b82f6' : 'rgba(229, 231, 235, 0.8)'}`,
                  borderRadius: '8px',
                  background: isDragging 
                    ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '0.8125rem',
                  fontWeight: '500',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  boxShadow: isDragging 
                    ? '0 2px 8px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255,255,255,0.8)'
                    : '0 1px 3px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)',
                }}
              >
                <span style={{ fontSize: '0.875rem' }}>+</span>
                <span>Add</span>
              </div>
              <button
                onClick={onNext}
                disabled={uploading}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: '500',
                  fontSize: '0.8125rem',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  border: 'none',
                  transition: 'all 0.2s',
                  opacity: uploading ? 0.6 : 1,
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                }}
                onMouseEnter={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!uploading) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }
                }}
              >
                {uploading ? 'Uploading...' : 'Next'}
              </button>
            </div>
          </div>

          {/* Video Gallery Grid - scrollable container */}
          <div style={{ 
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: '0.5rem',
            minHeight: 0,
            maxHeight: '100%',
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
              gap: '1.5rem', // Increased spacing
              rowGap: '1.5rem', // Bigger gap between top and bottom (rows)
              columnGap: '1.5rem', // Gap between columns
              alignContent: 'start',
              // Each row = height of one 16:9 video
              // 9:16 video spans 3 rows (1 column × 3 rows)
              // 16:9 video spans 1 row (1 column × 1 row)
              // 3 × 16:9 = 3 rows = 1 × 9:16 height
              gridAutoRows: 'calc((180px * 9) / 16)',
              alignItems: 'start',
              // Row dense allows 16:9 videos to stack in same column
              gridAutoFlow: 'row dense',
              width: '100%',
            }}>
            {sortedDemos.map((demo, index) => (
              <VideoGridItem
                key={`${demo.id}-${aspectRatios[demo.id] || 'unknown'}-${index}`}
                demo={demo}
                isHovered={hoveredDemoId === demo.id}
                onRemove={() => removeDemo(demo.id)}
                onAspectRatioDetected={handleAspectRatioDetected}
                onMouseEnter={() => setHoveredDemoId(demo.id)}
                onMouseLeave={() => setHoveredDemoId(null)}
              />
            ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


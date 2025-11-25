'use client'

import { useState, useRef } from 'react'
import { Scissors, Upload, Play, Download, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface Clip {
  id: number
  start_time: number
  end_time: number
  duration: number
}

export default function ClipVideosPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('video/')) {
        setError('Please select a video file')
        return
      }
      setVideoFile(file)
      setError(null)
      setSuccess(false)
      setClips([])
      
      // Create preview URL
      const url = URL.createObjectURL(file)
      setVideoPreview(url)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file)
      setError(null)
      setSuccess(false)
      setClips([])
      
      const url = URL.createObjectURL(file)
      setVideoPreview(url)
    } else {
      setError('Please drop a video file')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleClipVideo = async () => {
    if (!videoFile) {
      setError('Please select a video file first')
      return
    }

    setIsProcessing(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('video', videoFile)

      const response = await fetch('/api/clip-video', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clip video')
      }

      if (data.error) {
        throw new Error(data.error)
      }

      setClips(data.clips || [])
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'An error occurred while clipping the video')
      console.error('Clipping error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownloadClip = async (clip: Clip) => {
    // This would require additional backend implementation to extract clips
    // For now, just show the clip info
    alert(`Clip ${clip.id}\nStart: ${formatTime(clip.start_time)}\nEnd: ${formatTime(clip.end_time)}\nDuration: ${formatTime(clip.duration)}`)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f7fb',
      padding: '32px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto 32px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <Link href="/" style={{
          textDecoration: 'none',
          color: '#6b7280',
          fontSize: '14px',
        }}>
          ← Back to Dashboard
        </Link>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '24px',
        boxShadow: '0 6px 14px rgba(15, 23, 42, 0.04)',
        padding: '40px',
      }}>
        {/* Title */}
        <div style={{
          marginBottom: '32px',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Scissors size={24} color="white" />
            </div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#111827',
              margin: 0,
            }}>
              Clip Long Videos
            </h1>
          </div>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            margin: 0,
          }}>
            Automatically segment your long videos into clips using AI-powered transcription
          </p>
        </div>

        {/* Upload Section */}
        <div style={{
          marginBottom: '32px',
        }}>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
              border: '2px dashed #d1d5db',
              borderRadius: '16px',
              padding: '48px',
              textAlign: 'center',
              background: '#f9fafb',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => fileInputRef.current?.click()}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2563eb'
              e.currentTarget.style.background = '#eff6ff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db'
              e.currentTarget.style.background = '#f9fafb'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <Upload size={48} color="#6b7280" style={{ marginBottom: '16px' }} />
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '8px',
            }}>
              {videoFile ? videoFile.name : 'Drop your video here or click to upload'}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#6b7280',
            }}>
              Supports MP4, MOV, AVI, and other video formats
            </div>
          </div>

          {videoPreview && (
            <div style={{
              marginTop: '24px',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#000',
            }}>
              <video
                src={videoPreview}
                controls
                style={{
                  width: '100%',
                  maxHeight: '400px',
                }}
              />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#dc2626',
          }}>
            <AlertCircle size={20} />
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>Error</div>
              <div style={{ fontSize: '14px' }}>{error}</div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && clips.length > 0 && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#16a34a',
          }}>
            <CheckCircle2 size={20} />
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>Success!</div>
              <div style={{ fontSize: '14px' }}>
                Found {clips.length} clip{clips.length !== 1 ? 's' : ''} in your video
              </div>
            </div>
          </div>
        )}

        {/* Process Button */}
        {videoFile && (
          <div style={{
            marginBottom: '32px',
            textAlign: 'center',
          }}>
            <button
              onClick={handleClipVideo}
              disabled={isProcessing}
              style={{
                background: isProcessing ? '#9ca3af' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 32px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.background = '#1d4ed8'
                }
              }}
              onMouseLeave={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.background = '#2563eb'
                }
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  Processing...
                </>
              ) : (
                <>
                  <Scissors size={20} />
                  Find Clips
                </>
              )}
            </button>
          </div>
        )}

        {/* Clips Results */}
        {clips.length > 0 && (
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#111827',
              marginBottom: '20px',
            }}>
              Found Clips ({clips.length})
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
            }}>
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  style={{
                    background: '#f9fafb',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#111827',
                    }}>
                      Clip {clip.id}
                    </div>
                    <button
                      onClick={() => handleDownloadClip(clip)}
                      style={{
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #d1e0ff',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      <Download size={14} style={{ display: 'inline', marginRight: '4px' }} />
                      Info
                    </button>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}>
                    <div>Start: {formatTime(clip.start_time)}</div>
                    <div>End: {formatTime(clip.end_time)}</div>
                    <div>Duration: {formatTime(clip.duration)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div style={{
          marginTop: '40px',
          padding: '24px',
          background: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '12px',
          }}>
            How it works
          </h3>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <li style={{
              display: 'flex',
              gap: '12px',
              fontSize: '14px',
              color: '#6b7280',
            }}>
              <span style={{ color: '#2563eb', fontWeight: '600' }}>1.</span>
              <span>Upload your long-form video (podcasts, interviews, speeches, etc.)</span>
            </li>
            <li style={{
              display: 'flex',
              gap: '12px',
              fontSize: '14px',
              color: '#6b7280',
            }}>
              <span style={{ color: '#2563eb', fontWeight: '600' }}>2.</span>
              <span>Our AI transcribes the video using WhisperX</span>
            </li>
            <li style={{
              display: 'flex',
              gap: '12px',
              fontSize: '14px',
              color: '#6b7280',
            }}>
              <span style={{ color: '#2563eb', fontWeight: '600' }}>3.</span>
              <span>Clips AI analyzes the transcript to identify natural clip segments</span>
            </li>
            <li style={{
              display: 'flex',
              gap: '12px',
              fontSize: '14px',
              color: '#6b7280',
            }}>
              <span style={{ color: '#2563eb', fontWeight: '600' }}>4.</span>
              <span>Review and download your automatically generated clips</span>
            </li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}





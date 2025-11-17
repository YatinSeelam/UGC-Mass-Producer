'use client'

import { useState, useRef } from 'react'
import { DemoVideo } from '@/types'

interface Step1UploadProps {
  demos: DemoVideo[]
  onUpdate: (demos: DemoVideo[]) => void
  onNext: () => void
}

export default function Step1Upload({ demos, onUpdate, onNext }: Step1UploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          Step 1 – Upload Product Demos
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
          Upload one or more product demo videos (MP4/MOV, up to 2 mins each)
        </p>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? '#3b82f6' : '#d1d5db'}`,
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: isDragging ? '#eff6ff' : '#f9fafb',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📹</div>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontWeight: '500' }}>
            Drop product demo videos here
          </p>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            or click to browse files
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
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '8px',
              fontWeight: '500',
            }}
          >
            Browse Files
          </button>
        </div>

        {demos.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Uploaded Videos:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {demos.map(demo => (
                <div
                  key={demo.id}
                  style={{
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  {/* Video thumbnail */}
                  <div style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    backgroundColor: '#000',
                    position: 'relative',
                  }}>
                    <video
                      src={demo.url + '#t=0.5'}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      preload="metadata"
                      playsInline
                      muted
                    />
                    {/* Play icon overlay */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      pointerEvents: 'none',
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                      }}>
                        ▶
                      </div>
                    </div>
                  </div>

                  {/* Filename and remove button */}
                  <div style={{
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}>
                    <span style={{
                      fontSize: '0.875rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {demo.name}
                    </span>
                    <button
                      onClick={() => removeDemo(demo.id)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        width: '100%',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ width: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            padding: '1rem',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
              {demos.length}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {demos.length === 1 ? 'video' : 'videos'} selected
            </div>
          </div>
        </div>

        <button
          onClick={onNext}
          disabled={demos.length === 0 || uploading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: demos.length === 0 ? '#d1d5db' : '#3b82f6',
            color: 'white',
            borderRadius: '8px',
            fontWeight: '500',
            width: '100%',
            cursor: demos.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {uploading ? 'Uploading...' : 'Next'}
        </button>
      </div>
    </div>
  )
}


'use client'

import { useState } from 'react'
import { ExperimentData } from '@/types'
import MiniEditor from './MiniEditor'
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
  const [editCaptionText, setEditCaptionText] = useState('This is how your captions will look')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)

  const totalVariants =
    data.demos.length *
    Math.max(data.selectedCreators.length || 1, 1) *
    data.captionsPerCombo

  // Get creator video URL
  const selectedCreator = data.selectedCreators.length > 0
    ? CREATOR_TEMPLATES.find(t => t.id === data.selectedCreators[0])
    : null
  const creatorVideoUrl = selectedCreator?.videoUrl || null
  const demoVideoUrl = data.demos[0]?.url


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

      {/* Main Content Area - New Layout: Mini Editor + Caption Editor */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        marginBottom: '0.5rem',
        display: 'grid',
        gridTemplateColumns: 'minmax(350px, 500px) 1fr',
        gap: '0.75rem',
        minHeight: 0,
      }}>
        {/* Left Side - Mini Editor */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          width: '100%',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }}>
          <MiniEditor
            creatorVideoUrl={creatorVideoUrl}
            demoVideoUrl={demoVideoUrl}
            caption={editCaptionText}
            captionStyle={data.captionStyle}
            aspectRatio={(data.aspectRatio || '9:16') as '9:16' | '16:9' | '1:1' | '4:5'}
            onAspectRatioChange={(ratio) => {
              onUpdate({ aspectRatio: ratio })
            }}
            onCaptionChange={(newCaption) => {
              setEditCaptionText(newCaption)
            }}
            onCaptionStyleChange={(style) => {
              onUpdate({
                captionStyle: { ...data.captionStyle, ...style }
              })
            }}
            creatorDuration={0}
            totalDuration={totalDuration}
            currentTime={currentTime}
            onTimeUpdate={setCurrentTime}
            onDurationUpdate={setTotalDuration}
            isPlaying={isPlaying}
            onPlayStateChange={setIsPlaying}
          />
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

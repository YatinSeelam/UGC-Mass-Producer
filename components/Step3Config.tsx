'use client'

import { useState } from 'react'
import { ExperimentData } from '@/types'

interface Step3ConfigProps {
  data: ExperimentData
  onUpdate: (config: Partial<ExperimentData>) => void
  onNext: () => void
  onBack: () => void
  onGenerate: (variants: ExperimentData['variants']) => void
}

const SUBTITLE_STYLES = [
  { id: 'clean-white', name: 'Clean White', description: 'White text, subtle shadow' },
  { id: 'yellow-highlight', name: 'Yellow Highlight', description: 'Yellow fill, black stroke' },
  { id: 'brand-color', name: 'Brand Color', description: 'Colored word highlights' },
]

export default function Step3Config({ data, onUpdate, onNext, onBack, onGenerate }: Step3ConfigProps) {
  const [generating, setGenerating] = useState(false)

  const totalVariants = 
    data.demos.length * 
    Math.max(data.selectedCreators.length || 1, 1) * 
    data.captionsPerCombo

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
    <div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
        Step 3 – Subtitles & Caption Generation
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Configure your product details and subtitle preferences
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Left Column */}
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              What are you promoting?
            </label>
            <textarea
              value={data.productDescription}
              onChange={(e) => onUpdate({ productDescription: e.target.value })}
              placeholder="Hydrating serum for acne-prone, sensitive skin. Under $30, reduces redness and breakouts within 2 weeks."
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                minHeight: '80px',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Who is this for?
            </label>
            <input
              type="text"
              value={data.audience}
              onChange={(e) => onUpdate({ audience: e.target.value })}
              placeholder="Gen-Z women with acne, heavy TikTok users"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Tone you want?
            </label>
            <input
              type="text"
              value={data.tone}
              onChange={(e) => onUpdate({ tone: e.target.value })}
              placeholder="Casual, playful, trustworthy"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Caption Length
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['short', 'medium', 'long'] as const).map(length => (
                <button
                  key={length}
                  onClick={() => onUpdate({ captionLength: length })}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: `2px solid ${data.captionLength === length ? '#3b82f6' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    backgroundColor: data.captionLength === length ? '#eff6ff' : 'white',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: '500', marginBottom: '0.25rem', textTransform: 'capitalize' }}>
                    {length}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {length === 'short' ? '3-6 words' : length === 'medium' ? '6-9 words' : '9-15 words'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              How many captions per creator per demo?
            </label>
            <input
              type="number"
              value={data.captionsPerCombo}
              onChange={(e) => onUpdate({ captionsPerCombo: parseInt(e.target.value) || 3 })}
              min={1}
              max={8}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Right Column */}
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Subtitles on video
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <button
                onClick={() => onUpdate({ subtitleEnabled: !data.subtitleEnabled })}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: data.subtitleEnabled ? '#3b82f6' : '#e5e7eb',
                  color: data.subtitleEnabled ? 'white' : '#6b7280',
                  borderRadius: '8px',
                  fontWeight: '500',
                }}
              >
                {data.subtitleEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {data.subtitleEnabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {SUBTITLE_STYLES.map(style => (
                  <button
                    key={style.id}
                    onClick={() => onUpdate({ subtitleStyle: style.id })}
                    style={{
                      padding: '0.75rem',
                      border: `2px solid ${data.subtitleStyle === style.id ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      backgroundColor: data.subtitleStyle === style.id ? '#eff6ff' : 'white',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {style.name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {style.description}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Caption Style
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                    Text Color
                  </label>
                  <input
                    type="color"
                    value={data.captionStyle.textColor}
                    onChange={(e) => onUpdate({ 
                      captionStyle: { ...data.captionStyle, textColor: e.target.value }
                    })}
                    style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                    Background Color
                  </label>
                  <input
                    type="color"
                    value={data.captionStyle.backgroundColor}
                    onChange={(e) => onUpdate({
                      captionStyle: { ...data.captionStyle, backgroundColor: e.target.value }
                    })}
                    style={{ width: '100%', height: '40px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                    Background Opacity: {Math.round(data.captionStyle.backgroundOpacity * 100)}%
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
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    0% = fully transparent, 100% = fully opaque
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
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
                <div>
                  <label style={{ fontSize: '0.875rem', display: 'block', marginBottom: '0.25rem' }}>
                    Position
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['top', 'center', 'bottom'] as const).map(pos => (
                      <button
                        key={pos}
                        onClick={() => onUpdate({ 
                          captionStyle: { ...data.captionStyle, position: pos }
                        })}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          border: `2px solid ${data.captionStyle.position === pos ? '#3b82f6' : '#e5e7eb'}`,
                          borderRadius: '6px',
                          backgroundColor: data.captionStyle.position === pos ? '#eff6ff' : 'white',
                          textTransform: 'capitalize',
                          fontSize: '0.875rem',
                        }}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            padding: '1.5rem',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontWeight: '600', marginBottom: '1rem' }}>Summary</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.8' }}>
              <div>Demos: <strong>{data.demos.length}</strong></div>
              <div>
                Creators: <strong>
                  {data.selectedCreators.length > 0 
                    ? data.selectedCreators.length 
                    : 'Neutral only'}
                </strong>
              </div>
              <div>Captions per combo: <strong>{data.captionsPerCombo}</strong></div>
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
                Total variants: <strong>{totalVariants}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        paddingTop: '2rem',
        marginTop: '2rem',
        borderTop: '1px solid #e5e7eb',
      }}>
        <button
          onClick={onBack}
          disabled={generating}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            borderRadius: '8px',
            fontWeight: '500',
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.6 : 1,
          }}
        >
          Back
        </button>
        <button
          onClick={handleGenerate}
          disabled={generating || !data.productDescription.trim()}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: generating || !data.productDescription.trim() ? '#d1d5db' : '#3b82f6',
            color: 'white',
            borderRadius: '8px',
            fontWeight: '500',
            cursor: generating || !data.productDescription.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {generating ? `Generating captions (${totalVariants} variants)...` : 'Generate captions with AI'}
        </button>
      </div>
    </div>
  )
}


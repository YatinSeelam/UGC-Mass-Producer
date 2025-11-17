'use client'

import { useState } from 'react'

interface Step2CreatorsProps {
  selectedCreators: string[]
  onUpdate: (creators: string[]) => void
  onNext: () => void
  onBack: () => void
}

const CREATOR_TEMPLATES = [
  {
    id: 'female-hype',
    name: 'Female – Hype',
    description: 'Energetic, enthusiastic, Gen-Z friendly',
    videoUrl: '/20251101_2126_01k90xds88f2wvxddmd5tv94f0.mp4',
    persona: 'Energetic female creator with high energy, uses trending slang, very enthusiastic about products',
  },
  {
    id: 'female-calm',
    name: 'Female – Calm Aesthetic',
    description: 'Minimalist, soothing, trustworthy',
    videoUrl: '/20251108_0024_01k9gyqb2jfrd92yxf21ty31vk.mp4',
    persona: 'Calm, aesthetic-focused female creator with minimalist style, trustworthy and soothing tone',
  },
  {
    id: 'male-gym',
    name: 'Male – Gym Bro',
    description: 'Fitness-focused, direct, results-driven',
    videoUrl: '/3c8254e1-62d1-4c2c-8d73-5f8b70843cc5.mp4',
    persona: 'Fitness-focused male creator, direct and results-driven, uses gym/fitness terminology',
  },
  {
    id: 'neutral',
    name: 'Neutral Brand Voice',
    description: 'Professional, balanced, brand-focused',
    videoUrl: null,
    persona: 'Professional, balanced brand voice without specific persona',
  },
]

export default function Step2Creators({ selectedCreators, onUpdate, onNext, onBack }: Step2CreatorsProps) {
  const toggleCreator = (id: string) => {
    if (id === 'neutral') {
      // Neutral can't be toggled with others
      onUpdate(selectedCreators.includes('neutral') ? [] : ['neutral'])
      return
    }

    if (selectedCreators.includes(id)) {
      onUpdate(selectedCreators.filter(c => c !== id))
    } else {
      // Remove neutral if selecting a specific creator
      const filtered = selectedCreators.filter(c => c !== 'neutral')
      if (filtered.length < 3) {
        onUpdate([...filtered, id])
      }
    }
  }

  const maxReached = selectedCreators.filter(c => c !== 'neutral').length >= 3

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
        Step 2 – Choose UGC Creators
      </h2>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Pick 0–3 creator styles to test. You can skip to use a neutral tone.
      </p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {CREATOR_TEMPLATES.map(template => {
          const isSelected = selectedCreators.includes(template.id)
          const isNeutral = template.id === 'neutral'
          const canSelect = !isNeutral && (isSelected || !maxReached)

          return (
            <div
              key={template.id}
              onClick={() => canSelect && toggleCreator(template.id)}
              style={{
                border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
                borderRadius: '12px',
                padding: '0.75rem',
                backgroundColor: isSelected ? '#eff6ff' : 'white',
                cursor: canSelect ? 'pointer' : 'not-allowed',
                opacity: canSelect ? 1 : 0.6,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ marginBottom: '0.75rem' }}>
                {template.videoUrl ? (
                  <video
                    src={template.videoUrl}
                    style={{
                      width: '100%',
                      aspectRatio: '9/16',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      backgroundColor: '#f3f4f6',
                      maxHeight: '120px',
                    }}
                    muted
                    loop
                    playsInline
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause()
                      e.currentTarget.currentTime = 0
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    aspectRatio: '9/16',
                    maxHeight: '120px',
                    borderRadius: '8px',
                    backgroundColor: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                  }}>
                    📱
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.125rem' }}>
                    {template.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {template.description}
                  </div>
                </div>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: `2px solid ${isSelected ? '#3b82f6' : '#d1d5db'}`,
                  borderRadius: '4px',
                  backgroundColor: isSelected ? '#3b82f6' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}>
                  {isSelected ? '✓' : ''}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedCreators.length === 0 && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          marginBottom: '2rem',
          fontSize: '0.875rem',
          color: '#92400e',
        }}>
          No creator selected – we'll use a neutral voice.
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        paddingTop: '2rem',
        borderTop: '1px solid #e5e7eb',
      }}>
        <button
          onClick={onBack}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            borderRadius: '8px',
            fontWeight: '500',
          }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '8px',
            fontWeight: '500',
          }}
        >
          Next
        </button>
      </div>
    </div>
  )
}


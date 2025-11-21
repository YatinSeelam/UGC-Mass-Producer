'use client'

import { useState } from 'react'
import { CreatorTemplateCarousel } from '@/components/ui/creator-template-carousel'
import { CREATOR_TEMPLATES } from '@/lib/constants'

interface Step2CreatorsProps {
  selectedCreators: string[]
  onUpdate: (creators: string[]) => void
  onNext: () => void
  onBack: () => void
}

export default function Step2Creators({ selectedCreators, onUpdate, onNext, onBack }: Step2CreatorsProps) {
  const toggleCreator = (id: string) => {
    if (selectedCreators.includes(id)) {
      onUpdate(selectedCreators.filter(c => c !== id))
    } else {
      if (selectedCreators.length < 3) {
        onUpdate([...selectedCreators, id])
      }
    }
  }

  const maxReached = selectedCreators.length >= 3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem', fontWeight: '600' }}>
          Step 2 – Choose UGC Creators
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Select 1–3 creator styles to personalize your UGC videos
        </p>
      </div>

      {/* Creator Template Carousel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <CreatorTemplateCarousel
          templates={CREATOR_TEMPLATES}
          selectedCreators={selectedCreators}
          onToggleCreator={toggleCreator}
          maxReached={maxReached}
        />
      </div>


      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        paddingTop: '1rem',
        marginTop: '1rem',
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


'use client'

import { useState } from 'react'
import Step1Upload from '@/components/Step1Upload'
import Step2Creators from '@/components/Step2Creators'
import Step3Config from '@/components/Step3Config'
import Step4Review from '@/components/Step4Review'
import { ExperimentData, DemoVideo } from '@/types'

export default function Home() {
  const [currentStep, setCurrentStep] = useState(1)
  const [experimentData, setExperimentData] = useState<ExperimentData>({
    demos: [],
    selectedCreators: [],
    productDescription: '',
    audience: '',
    tone: '',
    captionsPerCombo: 3,
    captionLength: 'medium', // Default caption length
    subtitleEnabled: false,
    subtitleStyle: null,
    captionStyle: {
      textColor: '#ffffff',
      backgroundColor: '#000000',
      backgroundOpacity: 0.7,
      fontSize: 16,
      xPercent: 0.5, // Center horizontally
      yPercent: 0.85, // Near bottom (85% down)
      widthPercent: 0.8, // 80% of video width
      paddingPx: 20,
      position: 'bottom', // Legacy field
    },
    variants: [],
  })

  const updateDemos = (demos: DemoVideo[]) => {
    setExperimentData(prev => ({ ...prev, demos }))
  }

  const updateSelectedCreators = (creators: string[]) => {
    setExperimentData(prev => ({ ...prev, selectedCreators: creators }))
  }

  const updateConfig = (config: Partial<ExperimentData>) => {
    console.log('📊 updateConfig called with:', config)
    if (config.captionStyle) {
      console.log('  → captionStyle update:', config.captionStyle)
    }
    setExperimentData(prev => {
      const updated = { ...prev, ...config }
      console.log('  → New experimentData.captionStyle:', updated.captionStyle)
      return updated
    })
  }

  const updateVariants = (variants: ExperimentData['variants']) => {
    setExperimentData(prev => ({ ...prev, variants }))
  }

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <main style={{ minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            UGC Generator
          </h1>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            {[1, 2, 3, 4].map(step => (
              <div
                key={step}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: currentStep >= step ? '#3b82f6' : '#e5e7eb',
                  color: currentStep >= step ? 'white' : '#6b7280',
                  fontWeight: currentStep === step ? 'bold' : 'normal',
                }}
              >
                Step {step}
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '2rem',
          minHeight: '600px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          {currentStep === 1 && (
            <Step1Upload
              demos={experimentData.demos}
              onUpdate={updateDemos}
              onNext={handleNext}
            />
          )}
          {currentStep === 2 && (
            <Step2Creators
              selectedCreators={experimentData.selectedCreators}
              onUpdate={updateSelectedCreators}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {currentStep === 3 && (
            <Step3Config
              data={experimentData}
              onUpdate={updateConfig}
              onNext={handleNext}
              onBack={handleBack}
              onGenerate={updateVariants}
            />
          )}
          {currentStep === 4 && (
            <Step4Review
              variants={experimentData.variants}
              captionStyle={experimentData.captionStyle}
              demos={experimentData.demos}
              onUpdate={updateVariants}
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    </main>
  )
}


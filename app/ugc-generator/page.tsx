'use client'

import { useState } from 'react'
import Link from 'next/link'
import Step1Upload from '@/components/Step1Upload'
import Step2Creators from '@/components/Step2Creators'
import Step3Config from '@/components/Step3Config'
import Step4Review from '@/components/Step4Review'
import { ExperimentData, DemoVideo } from '@/types'
import { 
  Home, 
  Folder, 
  FileText, 
  Scissors, 
  Search, 
} from 'lucide-react'

export default function UGCGeneratorPage() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
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
    <main style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
      display: 'flex',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      position: 'relative',
    }}>
      {/* Sidebar - Fixed */}
      <aside style={{
        width: '80px',
        background: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 0',
        flexShrink: 0,
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        zIndex: 10,
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '20px',
            background: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: '700',
            color: 'white',
            cursor: 'pointer',
          }}>
            C
          </div>
        </Link>

        {/* Nav Icons */}
        <div style={{
          marginTop: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          alignItems: 'center',
        }}>
          {[
            { icon: Home, active: false, href: '/' },
            { icon: Folder, active: false, href: '#' },
            { icon: FileText, active: false, href: '#' },
            { icon: Scissors, active: true, href: '/ugc-generator' },
          ].map((item, i) => {
            const IconComponent = item.icon
            return (
              <Link key={i} href={item.href} style={{ textDecoration: 'none' }}>
                <button
                  style={{
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: item.active ? '#111827' : '#6b7280',
                    padding: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#111827'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = item.active ? '#111827' : '#6b7280'
                  }}
                >
                  <IconComponent size={22} strokeWidth={item.active ? 2.5 : 2} />
                </button>
              </Link>
            )
          })}
        </div>

        {/* Search */}
        <div style={{
          marginTop: 'auto',
          marginBottom: '10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}>
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#111827'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6b7280'
            }}
          >
            <Search size={20} strokeWidth={2} />
          </button>
          <div style={{
            fontSize: '10px',
            color: '#9ca3af',
            fontWeight: '500',
          }}>
            ⌘K
          </div>
        </div>
      </aside>

      {/* Search Modal */}
      {isSearchOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '15vh',
          }}
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '600px',
              background: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              margin: '0 1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="text"
              placeholder="Search..."
              autoFocus
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                fontSize: '1rem',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                outline: 'none',
                color: '#111827',
              }}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ 
        flex: 1,
        padding: '2rem',
        marginLeft: '80px',
        width: 'calc(100% - 80px)',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'auto',
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}>
        <div style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', letterSpacing: '-0.025em' }}>
              UGC Generator
            </h1>
          </div>
          {/* Breadcrumbs Navigation */}
          <nav style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            padding: '0.75rem 0',
            borderBottom: '1px solid #e5e7eb',
          }}>
            {[
              { num: 1, label: 'Upload' },
              { num: 2, label: 'Creators' },
              { num: 3, label: 'Config' },
              { num: 4, label: 'Review' },
            ].map((step, index) => (
              <div key={step.num} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    background: currentStep === step.num 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)'
                      : 'transparent',
                    color: currentStep === step.num ? 'white' : currentStep > step.num ? '#3b82f6' : '#9ca3af',
                    fontWeight: currentStep === step.num ? '600' : '500',
                    fontSize: '0.875rem',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    boxShadow: currentStep === step.num 
                      ? '0 4px 12px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                      : 'none',
                  }}
                >
                  {step.label}
                </div>
                {index < 3 && (
                  <span style={{ color: '#d1d5db', fontSize: '0.875rem' }}>/</span>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 50%, #f8fafc 100%)',
          borderRadius: '16px', 
          padding: '2rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 0,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
          border: '1px solid rgba(229, 231, 235, 0.5)',
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
              aspectRatio={experimentData.aspectRatio}
              onUpdate={updateVariants}
              onBack={handleBack}
            />
          )}
        </div>
        </div>
      </div>
    </main>
  )
}


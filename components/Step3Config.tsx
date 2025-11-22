'use client'

import { useState, useEffect, useRef } from 'react'
import { ExperimentData, GeneratedCaption } from '@/types'
import MiniEditor from './MiniEditor'
import { CREATOR_TEMPLATES } from '@/lib/constants'
import { Pencil, RefreshCw, X, Sparkles } from 'lucide-react'

interface Step3ConfigProps {
  data: ExperimentData
  onUpdate: (config: Partial<ExperimentData>) => void
  onNext: () => void
  onBack: () => void
  onGenerate: (variants: ExperimentData['variants']) => void
}

export default function Step3Config({ data, onUpdate, onNext, onBack, onGenerate }: Step3ConfigProps) {
  const [generating, setGenerating] = useState(false)
  // Use captions from parent state if available, otherwise empty
  const [captions, setCaptions] = useState<GeneratedCaption[]>(data.generatedCaptions || [])
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(
    data.generatedCaptions?.[0]?.id || null
  )
  const [previewCaption, setPreviewCaption] = useState(
    data.generatedCaptions?.[0]?.text || 'Your caption preview'
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [prompt, setPrompt] = useState(data.captionPrompt || '')
  const [numCaptions, setNumCaptions] = useState(3)
  const [hasBackground, setHasBackground] = useState(true)
  const lastSyncedVariantsRef = useRef<string>('')

  // Sync captions to parent state whenever they change
  useEffect(() => {
    onUpdate({ generatedCaptions: captions })
  }, [captions])

  // Sync prompt to parent state
  useEffect(() => {
    if (prompt !== data.captionPrompt) {
      onUpdate({ captionPrompt: prompt })
    }
  }, [prompt])

  // Sync captions from variants when coming back from Step 4 (even if captions exist)
  useEffect(() => {
    if (data.variants.length > 0) {
      // Create a signature of variant captions to detect changes
      const variantSignature = data.variants.map(v => v.caption).join('|||')
      
      // Only sync if variants have changed since last sync
      if (variantSignature !== lastSyncedVariantsRef.current) {
        lastSyncedVariantsRef.current = variantSignature
        
        // If variant count matches caption count, sync them (captions might have changed in Review)
        if (data.variants.length === captions.length && captions.length > 0) {
          // Update existing captions with variant captions
          setCaptions(prevCaptions => {
            const updated = prevCaptions.map((caption, i) => ({
              ...caption,
              text: data.variants[i]?.caption || caption.text,
            }))
            // Update preview if we have a selected caption
            const currentSelectedId = selectedCaptionId
            if (currentSelectedId) {
              const selectedIndex = prevCaptions.findIndex(c => c.id === currentSelectedId)
              if (selectedIndex >= 0 && data.variants[selectedIndex]) {
                setPreviewCaption(data.variants[selectedIndex].caption)
              }
            }
            return updated
          })
        } 
        // If no captions exist, create them from variants
        else if (captions.length === 0) {
          const restoredCaptions: GeneratedCaption[] = data.variants.map((v, i) => ({
            id: `caption-restored-${Date.now()}-${i}`,
            text: v.caption,
            isEditing: false,
            isRegenerating: false,
          }))
          setCaptions(restoredCaptions)
          if (restoredCaptions.length > 0) {
            setSelectedCaptionId(restoredCaptions[0].id)
            setPreviewCaption(restoredCaptions[0].text)
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.variants]) // Only depend on variants - use ref to prevent unnecessary updates

  // Get creator video URL
  const selectedCreator = data.selectedCreators.length > 0
    ? CREATOR_TEMPLATES.find(t => t.id === data.selectedCreators[0])
    : null
  const creatorVideoUrl = selectedCreator?.videoUrl || null
  const demoVideoUrl = data.demos[0]?.url

  const handleGenerateCaptions = async () => {
    if (!prompt.trim()) return

    setGenerating(true)
    try {
      const response = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demos: data.demos.map(d => ({ id: d.id, name: d.name, transcript: d.transcript || '' })),
          creators: data.selectedCreators.length > 0 ? data.selectedCreators : ['neutral'],
          productDescription: prompt,
          audience: '',
          tone: '',
          captionsPerCombo: numCaptions,
          captionLength: 'medium',
          subtitleEnabled: false,
          subtitleStyle: null,
        }),
      })

      if (response.ok) {
        const { variants } = await response.json()
        const newCaptions: GeneratedCaption[] = variants.slice(0, numCaptions).map((v: any, i: number) => ({
          id: `caption-${Date.now()}-${i}`,
          text: v.caption || `Generated caption ${i + 1}`,
          isEditing: false,
          isRegenerating: false,
        }))
        setCaptions(newCaptions)
        if (newCaptions.length > 0) {
          setSelectedCaptionId(newCaptions[0].id)
          setPreviewCaption(newCaptions[0].text)
        }
      }
    } catch (error) {
      console.error('Generation error:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleSelectCaption = (caption: GeneratedCaption) => {
    setSelectedCaptionId(caption.id)
    setPreviewCaption(caption.text)
  }

  const handleEditCaption = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    // First select this caption, then enable editing
    const caption = captions.find(c => c.id === id)
    if (caption) {
      setSelectedCaptionId(id)
      setPreviewCaption(caption.text)
    }
    setCaptions(captions.map(c =>
      c.id === id ? { ...c, isEditing: true } : { ...c, isEditing: false }
    ))
  }

  const handleSaveCaption = (id: string, newText: string) => {
    setCaptions(captions.map(c =>
      c.id === id ? { ...c, text: newText, isEditing: false } : c
    ))
    // Update preview if this is the selected caption
    if (selectedCaptionId === id) {
      setPreviewCaption(newText)
    }
  }

  const handleDeleteCaption = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newCaptions = captions.filter(c => c.id !== id)
    setCaptions(newCaptions)
    // If deleted caption was selected, select the first available
    if (selectedCaptionId === id && newCaptions.length > 0) {
      setSelectedCaptionId(newCaptions[0].id)
      setPreviewCaption(newCaptions[0].text)
    }
  }

  const handleRegenerateCaption = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()

    // Mark as regenerating
    setCaptions(captions.map(c =>
      c.id === id ? { ...c, isRegenerating: true } : c
    ))

    try {
      const response = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demos: data.demos.map(d => ({ id: d.id, name: d.name, transcript: d.transcript || '' })),
          creators: data.selectedCreators.length > 0 ? data.selectedCreators : ['neutral'],
          productDescription: prompt,
          audience: '',
          tone: '',
          captionsPerCombo: 1,
          captionLength: 'medium',
          subtitleEnabled: false,
          subtitleStyle: null,
        }),
      })

      if (response.ok) {
        const { variants } = await response.json()
        if (variants && variants.length > 0) {
          const newText = variants[0].caption || 'Regenerated caption'
          setCaptions(captions.map(c =>
            c.id === id ? { ...c, text: newText, isRegenerating: false } : c
          ))
          // Update preview if this was selected
          if (selectedCaptionId === id) {
            setPreviewCaption(newText)
          }
        }
      }
    } catch (error) {
      console.error('Regeneration error:', error)
      setCaptions(captions.map(c =>
        c.id === id ? { ...c, isRegenerating: false } : c
      ))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ marginBottom: '0.75rem', flexShrink: 0 }}>
        <h2 style={{ fontSize: '1.125rem', marginBottom: '0.25rem', fontWeight: '600', color: '#111827' }}>
          Configure & Generate
        </h2>
        <p style={{ color: '#6b7280', fontSize: '0.8rem' }}>
          Generate captions and customize styling for your video
        </p>
      </div>

      {/* Main 3-Column Layout */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.9fr 240px',
        gap: '0.875rem',
        minHeight: 0,
        maxHeight: '100%',
        overflow: 'hidden',
      }}>
        {/* LEFT - Video Preview */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          maxHeight: '100%',
          overflow: 'hidden',
        }}>
          <MiniEditor
            creatorVideoUrl={creatorVideoUrl}
            demoVideoUrl={demoVideoUrl}
            caption={previewCaption}
            captionStyle={{
              ...data.captionStyle,
              backgroundOpacity: hasBackground ? data.captionStyle.backgroundOpacity : 0,
            }}
            aspectRatio={(data.aspectRatio || '9:16') as '9:16' | '16:9' | '1:1' | '4:5'}
            onAspectRatioChange={(ratio) => onUpdate({ aspectRatio: ratio })}
            onCaptionChange={setPreviewCaption}
            onCaptionStyleChange={(style) => {
              onUpdate({ captionStyle: { ...data.captionStyle, ...style } })
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

        {/* CENTER - Captions Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          overflow: 'hidden',
          minHeight: 0,
          maxHeight: '100%',
          height: '100%',
        }}>
          {/* Header */}
          <div style={{
            padding: '0.625rem 0.875rem',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            background: 'white',
            flexShrink: 0,
          }}>
            <Sparkles size={14} style={{ color: '#3b82f6' }} />
            <span style={{ fontWeight: '600', fontSize: '0.8rem', color: '#1f2937' }}>
              Generated Captions
            </span>
            {captions.length > 0 && (
              <span style={{
                marginLeft: 'auto',
                fontSize: '0.65rem',
                color: '#6b7280',
                background: '#f3f4f6',
                padding: '0.125rem 0.375rem',
                borderRadius: '8px',
              }}>
                {captions.length}
              </span>
            )}
          </div>

          {/* Scrollable Captions List */}
          <div style={{
            flex: '1 1 0',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
            minHeight: 0,
            height: 0,
          }}>
            {captions.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                fontSize: '0.8rem',
                textAlign: 'center',
                padding: '1.5rem',
                gap: '0.5rem',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Sparkles size={20} style={{ color: '#d1d5db' }} />
                </div>
                <div>
                  <div style={{ fontWeight: '500', color: '#6b7280', marginBottom: '0.125rem', fontSize: '0.75rem' }}>No captions yet</div>
                  <div style={{ fontSize: '0.7rem' }}>Enter a prompt and click Generate</div>
                </div>
              </div>
            ) : (
              captions.map((caption) => (
                <div
                  key={caption.id}
                  onClick={() => handleSelectCaption(caption)}
                  style={{
                    padding: '0.5rem 0.625rem',
                    background: selectedCaptionId === caption.id
                      ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                      : 'white',
                    borderRadius: '8px',
                    border: `1px solid ${selectedCaptionId === caption.id ? '#3b82f6' : '#e5e7eb'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: selectedCaptionId === caption.id
                      ? '0 1px 4px rgba(59, 130, 246, 0.15)'
                      : 'none',
                    flexShrink: 0,
                  }}
                >
                  {caption.isEditing ? (
                    <textarea
                      defaultValue={caption.text}
                      autoFocus
                      onBlur={(e) => handleSaveCaption(caption.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSaveCaption(caption.id, e.currentTarget.value)
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        padding: '0.375rem',
                        border: '1px solid #3b82f6',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        outline: 'none',
                        resize: 'none',
                        minHeight: '45px',
                        fontFamily: 'inherit',
                        lineHeight: 1.4,
                      }}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{
                        flex: 1,
                        fontSize: '0.7rem',
                        color: '#374151',
                        lineHeight: 1.4,
                        opacity: caption.isRegenerating ? 0.5 : 1,
                      }}>
                        {caption.isRegenerating ? 'Regenerating...' : caption.text}
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '0.125rem',
                        flexShrink: 0,
                        opacity: 0.5,
                      }}>
                        <button
                          onClick={(e) => handleDeleteCaption(caption.id, e)}
                          style={{
                            padding: '0.25rem',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#9ca3af',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#fee2e2'
                            e.currentTarget.style.color = '#ef4444'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none'
                            e.currentTarget.style.color = '#9ca3af'
                          }}
                          title="Delete"
                        >
                          <X size={12} />
                        </button>
                        <button
                          onClick={(e) => handleEditCaption(caption.id, e)}
                          style={{
                            padding: '0.25rem',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#9ca3af',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#e0e7ff'
                            e.currentTarget.style.color = '#6366f1'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none'
                            e.currentTarget.style.color = '#9ca3af'
                          }}
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={(e) => handleRegenerateCaption(caption.id, e)}
                          disabled={caption.isRegenerating}
                          style={{
                            padding: '0.25rem',
                            background: 'none',
                            border: 'none',
                            cursor: caption.isRegenerating ? 'not-allowed' : 'pointer',
                            color: '#9ca3af',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            if (!caption.isRegenerating) {
                              e.currentTarget.style.background = '#dcfce7'
                              e.currentTarget.style.color = '#22c55e'
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none'
                            e.currentTarget.style.color = '#9ca3af'
                          }}
                          title="Regenerate"
                        >
                          <RefreshCw size={12} className={caption.isRegenerating ? 'animate-spin' : ''} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT - Settings Panel */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          overflowY: 'auto',
          paddingRight: '0.25rem',
        }}>
          {/* Prompt Input Card */}
          <div style={{
            padding: '0.75rem',
            background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.375rem',
            }}>
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your product..."
              style={{
                width: '100%',
                minHeight: '55px',
                padding: '0.5rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '0.75rem',
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.4,
                background: '#fafafa',
                transition: 'all 0.15s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#3b82f6'
                e.target.style.background = 'white'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.background = '#fafafa'
              }}
            />
            <button
              onClick={handleGenerateCaptions}
              disabled={generating || !prompt.trim()}
              style={{
                marginTop: '0.5rem',
                width: '100%',
                padding: '0.5rem',
                background: generating || !prompt.trim()
                  ? '#e5e7eb'
                  : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: generating || !prompt.trim() ? '#9ca3af' : 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.75rem',
                cursor: generating || !prompt.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
                boxShadow: generating || !prompt.trim() ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.15s',
              }}
            >
              <Sparkles size={12} />
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {/* Settings Row */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {/* Num Captions */}
            <div style={{
              flex: 1,
              padding: '0.625rem',
              background: 'white',
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
            }}>
              <label style={{
                display: 'block',
                fontSize: '0.65rem',
                fontWeight: '500',
                color: '#6b7280',
                marginBottom: '0.375rem',
              }}>
                # Captions
              </label>
              <input
                type="number"
                value={numCaptions}
                onChange={(e) => setNumCaptions(parseInt(e.target.value) || 1)}
                min={1}
                max={10}
                style={{
                  width: '100%',
                  padding: '0.375rem',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.8rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  color: '#374151',
                }}
              />
            </div>

            {/* Text Color */}
            <div style={{
              flex: 1,
              padding: '0.625rem',
              background: 'white',
              borderRadius: '10px',
              border: '1px solid #e5e7eb',
            }}>
              <label style={{
                display: 'block',
                fontSize: '0.65rem',
                fontWeight: '500',
                color: '#6b7280',
                marginBottom: '0.25rem',
              }}>
                Text Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  border: '2px solid #e5e7eb',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative',
                }}>
                  <input
                    type="color"
                    value={data.captionStyle.textColor}
                    onChange={(e) => onUpdate({
                      captionStyle: { ...data.captionStyle, textColor: e.target.value }
                    })}
                    style={{
                      position: 'absolute',
                      inset: '-4px',
                      width: 'calc(100% + 8px)',
                      height: 'calc(100% + 8px)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.65rem', color: '#6b7280', fontFamily: 'monospace' }}>
                  {data.captionStyle.textColor.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Font Picker */}
          <div style={{
            padding: '0.625rem',
            background: 'white',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
          }}>
            <label style={{
              display: 'block',
              fontSize: '0.65rem',
              fontWeight: '500',
              color: '#6b7280',
              marginBottom: '0.25rem',
            }}>
              Font
            </label>
            <select
              style={{
                width: '100%',
                padding: '0.375rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '0.75rem',
                background: 'white',
                color: '#374151',
                cursor: 'pointer',
              }}
            >
              <option>System Default</option>
              <option>Arial</option>
              <option>Helvetica</option>
              <option>Georgia</option>
            </select>
          </div>

          {/* Background Settings */}
          <div style={{
            padding: '0.625rem',
            background: 'white',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: hasBackground ? '0.5rem' : 0,
            }}>
              <input
                type="checkbox"
                id="hasBackground"
                checked={hasBackground}
                onChange={(e) => setHasBackground(e.target.checked)}
                style={{
                  width: '14px',
                  height: '14px',
                  cursor: 'pointer',
                  accentColor: '#3b82f6',
                }}
              />
              <label htmlFor="hasBackground" style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#374151',
                cursor: 'pointer',
              }}>
                Background
              </label>
            </div>

            {hasBackground && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Background Color */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.65rem',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '0.25rem',
                  }}>
                    Color
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      border: '2px solid #e5e7eb',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                    }}>
                      <input
                        type="color"
                        value={data.captionStyle.backgroundColor}
                        onChange={(e) => onUpdate({
                          captionStyle: { ...data.captionStyle, backgroundColor: e.target.value }
                        })}
                        style={{
                          position: 'absolute',
                          inset: '-4px',
                          width: 'calc(100% + 8px)',
                          height: 'calc(100% + 8px)',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#6b7280', fontFamily: 'monospace' }}>
                      {data.captionStyle.backgroundColor.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Opacity */}
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.25rem',
                  }}>
                    <label style={{
                      fontSize: '0.65rem',
                      fontWeight: '500',
                      color: '#6b7280',
                    }}>
                      Opacity
                    </label>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: '600',
                      color: '#374151',
                      background: '#f3f4f6',
                      padding: '0.125rem 0.25rem',
                      borderRadius: '4px',
                    }}>
                      {Math.round(data.captionStyle.backgroundOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={data.captionStyle.backgroundOpacity * 100}
                    onChange={(e) => onUpdate({
                      captionStyle: { ...data.captionStyle, backgroundOpacity: parseInt(e.target.value) / 100 }
                    })}
                    style={{
                      width: '100%',
                      height: '4px',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      accentColor: '#3b82f6',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        paddingTop: '0.75rem',
        marginTop: '0.75rem',
        borderTop: '1px solid #e5e7eb',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            padding: '0.625rem 1.25rem',
            background: 'white',
            color: '#374151',
            borderRadius: '10px',
            fontWeight: '500',
            fontSize: '0.8rem',
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f9fafb'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white'
          }}
        >
          Back
        </button>
        <button
          onClick={() => {
            // If variants already exist and match caption count, update them
            // Otherwise create new variants
            let variants

            if (data.variants.length === captions.length && data.variants.length > 0) {
              // Update existing variants with current caption text
              variants = data.variants.map((v, index) => ({
                ...v,
                caption: captions[index]?.text || v.caption,
              }))
            } else {
              // Create new variants from captions
              variants = captions.map((caption, index) => {
                const demo = data.demos[0] // Use first demo for now
                const creator = data.selectedCreators[0] || 'neutral'
                const creatorTemplate = CREATOR_TEMPLATES.find(t => t.id === creator)

                return {
                  id: `variant-${Date.now()}-${index}`,
                  demoId: demo?.id || '',
                  demoName: demo?.name || 'Demo',
                  creatorTemplateId: creatorTemplate?.id || null,
                  creatorName: creatorTemplate?.name || 'Creator',
                  subtitleStyle: null,
                  subtitleEnabled: false,
                  hook: '',
                  caption: caption.text,
                  hashtags: '',
                  cta: '',
                  selected: true, // Select all by default
                  captionStyleOverride: undefined,
                }
              })
            }

            // Pass variants to parent
            onGenerate(variants)
            onNext()
          }}
          disabled={captions.length === 0}
          style={{
            padding: '0.625rem 1.5rem',
            background: captions.length === 0
              ? '#e5e7eb'
              : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: captions.length === 0 ? '#9ca3af' : 'white',
            borderRadius: '10px',
            fontWeight: '600',
            fontSize: '0.8rem',
            border: 'none',
            cursor: captions.length === 0 ? 'not-allowed' : 'pointer',
            boxShadow: captions.length === 0 ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.15s',
          }}
        >
          Next
        </button>
      </div>
    </div>
  )
}

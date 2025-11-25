'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import VideoCanvasPreview from './VideoCanvasPreview'
import { CaptionStyle } from '@/types'

interface MiniEditorProps {
  creatorVideoUrl: string | null
  demoVideoUrl: string | undefined
  caption: string
  captionStyle: CaptionStyle
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5'
  onAspectRatioChange: (ratio: '9:16' | '16:9' | '1:1' | '4:5') => void
  onCaptionChange?: (caption: string) => void
  onCaptionStyleChange?: (style: Partial<CaptionStyle>) => void
  creatorDuration: number
  totalDuration: number
  currentTime: number
  onTimeUpdate: (time: number) => void
  onDurationUpdate?: (duration: number) => void
  isPlaying: boolean
  onPlayStateChange: (playing: boolean) => void
}

export default function MiniEditor({
  creatorVideoUrl,
  demoVideoUrl,
  caption,
  captionStyle,
  aspectRatio,
  onAspectRatioChange,
  onCaptionChange,
  onCaptionStyleChange,
  creatorDuration,
  totalDuration,
  currentTime,
  onTimeUpdate,
  onDurationUpdate,
  isPlaying,
  onPlayStateChange,
}: MiniEditorProps) {
  const [volume, setVolume] = useState(70)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [scrubPreviewTime, setScrubPreviewTime] = useState<number | null>(null)

  // this is what we actually send to VideoCanvasPreview as "seekTime"
  // it is ONLY set when the user scrubs/clicks the timeline
  const [seekTarget, setSeekTarget] = useState<number | null>(null)

  const [captionText, setCaptionText] = useState(caption)
  const lastPropCaptionRef = useRef(caption)

  const previewAreaRef = useRef<HTMLDivElement>(null)
  const previewBoxRef = useRef<HTMLDivElement>(null)
  const timelineContainerRef = useRef<HTMLDivElement>(null)
  const pendingSeekRef = useRef<number | null>(null)
  const rafSeekRef = useRef<number | null>(null)

  // sync caption text with prop (when prop changes from parent)
  useEffect(() => {
    if (caption !== lastPropCaptionRef.current) {
      lastPropCaptionRef.current = caption
      setCaptionText(caption)
    }
  }, [caption])

  // resize preview based on aspect ratio
  const resizePreviewForContainer = useCallback(
    (area: HTMLDivElement, box: HTMLDivElement) => {
      const rect = area.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      const maxW = rect.width * 0.85
      const maxH = rect.height * 0.85

      let w = 9,
        h = 16
      if (aspectRatio === '1:1') {
        w = 1
        h = 1
      } else if (aspectRatio === '16:9') {
        w = 16
        h = 9
      } else if (aspectRatio === '4:5') {
        w = 4
        h = 5
      } else {
        w = 9
        h = 16
      }

      const ratio = h / w
      let width = maxW
      let height = width * ratio

      if (height > maxH) {
        height = maxH
        width = height * (w / h)
      }

      width = Math.min(width, maxW)
      height = Math.min(height, maxH)

      box.style.width = `${width}px`
      box.style.height = `${height}px`
    },
    [aspectRatio]
  )

  // apply zoom
  useEffect(() => {
    if (previewBoxRef.current) {
      previewBoxRef.current.style.transformOrigin = '50% 50%'
      previewBoxRef.current.style.transform = `scale(${zoomLevel})`
    }
  }, [zoomLevel])

  useEffect(() => {
    if (previewAreaRef.current && previewBoxRef.current) {
      resizePreviewForContainer(previewAreaRef.current, previewBoxRef.current)
    }
  }, [resizePreviewForContainer])

  useEffect(() => {
    const handleResize = () => {
      if (previewAreaRef.current && previewBoxRef.current) {
        resizePreviewForContainer(previewAreaRef.current, previewBoxRef.current)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [resizePreviewForContainer])

  useEffect(() => {
    return () => {
      if (rafSeekRef.current) {
        cancelAnimationFrame(rafSeekRef.current)
        rafSeekRef.current = null
      }
    }
  }, [])

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = Math.floor(sec % 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(
      s
    ).padStart(2, '0')}`
  }

  // ---- timeline scrubbing ----
  const flushPendingSeek = useCallback(() => {
    if (pendingSeekRef.current === null) return
    if (totalDuration <= 0) {
      pendingSeekRef.current = null
      return
    }
    const target = Math.max(0, Math.min(totalDuration || 0, pendingSeekRef.current))
    pendingSeekRef.current = null
    setSeekTarget(target)
    onTimeUpdate(target)
  }, [onTimeUpdate, totalDuration])

  const scheduleSeek = useCallback((time: number) => {
    pendingSeekRef.current = time
    if (rafSeekRef.current !== null) return
    rafSeekRef.current = requestAnimationFrame(() => {
      rafSeekRef.current = null
      flushPendingSeek()
    })
  }, [flushPendingSeek])

  const timeFromClientX = useCallback((clientX: number) => {
    if (!timelineContainerRef.current || totalDuration <= 0) return null
    const rect = timelineContainerRef.current.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return frac * totalDuration
  }, [totalDuration])

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (totalDuration <= 0) return
    e.preventDefault()
    e.stopPropagation()
    const newTime = timeFromClientX(e.clientX)
    if (newTime === null) return
    setIsScrubbing(true)
    setScrubPreviewTime(newTime)
    scheduleSeek(newTime)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScrubbing) return
      const newTime = timeFromClientX(e.clientX)
      if (newTime === null) return
      setScrubPreviewTime(newTime)
      scheduleSeek(newTime)
    }

    const handleMouseUp = () => {
      if (!isScrubbing) return
      setIsScrubbing(false)
      flushPendingSeek()
      setScrubPreviewTime(null)
    }

    if (isScrubbing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [flushPendingSeek, isScrubbing, scheduleSeek, timeFromClientX])

  // ---- zoom with scroll (center zoom only) ----
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    setZoomLevel(prev => Math.min(2.0, Math.max(0.8, prev + delta)))
  }, [])

  // push caption text up to parent when it changes (from VideoCanvasPreview editing)
  useEffect(() => {
    // Only call onCaptionChange if captionText changed from user editing (not from prop update)
    if (onCaptionChange && captionText !== lastPropCaptionRef.current) {
      onCaptionChange(captionText)
    }
  }, [captionText, onCaptionChange])

  const displayTime = scrubPreviewTime ?? currentTime
  const progressPercent =
    totalDuration > 0
      ? Math.min(100, Math.max(0, (displayTime / totalDuration) * 100))
      : 0

  return (
    <>
      <div className="w-full h-full rounded-[18px] bg-gradient-to-b from-[#0b0c10] to-[#151821] text-white shadow-[0_18px_40px_rgba(0,0,0,0.45)] border border-white/5 px-4 pt-4 pb-3 flex flex-col transition-colors">
        {/* Preview Area */}
        <div
          ref={previewAreaRef}
          className="mb-3 flex flex-1 items-center justify-center rounded-[14px] bg-[#050607] border border-white/5 overflow-hidden min-h-0"
          onWheel={handleWheel}
        >
          <div
            ref={previewBoxRef}
            className="relative flex items-center justify-center rounded-[14px] bg-black text-white text-lg tracking-wide shadow-[0_12px_34px_rgba(0,0,0,0.65)] border border-white/10 transition-all duration-200 ease-out overflow-hidden"
          >
            {creatorVideoUrl || demoVideoUrl ? (
              <div style={{ width: '100%', height: '100%' }}>
                <VideoCanvasPreview
                  creatorVideoUrl={creatorVideoUrl || undefined}
                  demoVideoUrl={demoVideoUrl}
                  caption={captionText}
                  captionStyle={captionStyle}
                  onCaptionStyleChange={onCaptionStyleChange}
                  aspectRatio={aspectRatio}
                  play={isPlaying}
                  onPlayStateChange={onPlayStateChange}
                  // IMPORTANT: only send a seek value when the user actually scrubbed
                  seekTime={seekTarget ?? undefined}
                  creatorDuration={creatorDuration || 0}
                  volume={volume / 100}
                  onTimeUpdate={(time, duration) => {
                    // Update time during natural playback (not while scrubbing)
                    if (!isScrubbing) {
                      onTimeUpdate(time)

                      // Clear seek target once we've reached it
                      if (seekTarget !== null && Math.abs(seekTarget - time) < 0.1) {
                        setSeekTarget(null)
                      }
                    }

                    // Always update duration when it changes
                    if (duration > 0 && onDurationUpdate) {
                      onDurationUpdate(duration)
                    }
                  }}
                  onCaptionChange={setCaptionText}
                />
              </div>
            ) : (
              <div className="text-white text-sm">Upload videos to preview</div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-3 px-1">
          <div
            ref={timelineContainerRef}
            className="group relative h-2 cursor-pointer rounded-full bg-[#1b1d21] transition-all duration-200 ease-out hover:h-[10px]"
            onMouseDown={handleTimelineMouseDown}
            style={{
              background: 'linear-gradient(90deg, #111316 0%, #1f232b 100%)',
            }}
          >
            <div
              className="pointer-events-none absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-white to-[#dfe2e7] transition-all duration-75 ease-linear shadow-[0_4px_15px_rgba(255,255,255,0.25)]"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-black shadow-[0_3px_10px_rgba(0,0,0,0.5)] transition-all duration-200 ease-out group-hover:scale-110 group-hover:shadow-[0_6px_16px_rgba(0,0,0,0.6)]"
              style={{ left: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 text-center font-mono text-[11px] font-semibold text-white/70 tracking-wide">
            <span className="text-white">{formatTime(Math.max(0, displayTime))}</span>
            <span className="mx-1.5 text-white/40">/</span>
            <span className="text-white/60">{formatTime(Math.max(0, totalDuration))}</span>
          </div>
        </div>

        {/* Control Bar */}
        <div className="flex items-center justify-between rounded-2xl bg-[#0f1116] px-4 py-2 gap-3 overflow-hidden border border-white/10 shadow-[0_12px_28px_rgba(0,0,0,0.45)]">
          <button
            onClick={() => onPlayStateChange(!isPlaying)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-md transition-all duration-200 ease-out hover:scale-110 hover:shadow-lg flex-shrink-0 border border-white/40"
            type="button"
          >
            {isPlaying ? (
              <div className="flex gap-1">
                <div className="h-3.5 w-0.5 bg-black rounded-full" />
                <div className="h-3.5 w-0.5 bg-black rounded-full" />
              </div>
            ) : (
              <span className="ml-0.5 inline-block border-l-[8px] border-y-[5px] border-l-black border-y-transparent" />
            )}
          </button>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Volume */}
            <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-2.5 py-1.5 shadow-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-white"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9 4.25a.75.75 0 0 1 1.2-.6l3.5 2.8H16a1 1 0 0 1 1 1v4.1a1 1 0 0 1-1 1h-2.3l-3.5 2.8A.75.75 0 0 1 9 15.75v-11.5Z" />
                <path d="M4 8h2.25a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-.75.75H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
              </svg>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                className="volume-range"
                style={{
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  width: '65px',
                  height: '4px',
                  borderRadius: '999px',
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.8) 100%)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Ratio select */}
            <div className="relative">
              <select
                value={aspectRatio.replace(':', 'x')}
                onChange={e => {
                  const val = e.target.value
                  if (val === '1x1') onAspectRatioChange('1:1')
                  else if (val === '16x9') onAspectRatioChange('16:9')
                  else if (val === '4x5') onAspectRatioChange('4:5')
                  else onAspectRatioChange('9:16')
                }}
                className="appearance-none rounded-full border border-white/20 bg-[#0b0c10] px-3 py-1.5 pr-7 text-[11px] font-semibold text-white outline-none transition-all duration-200 ease-out hover:border-white/50 hover:bg-black hover:shadow-sm cursor-pointer"
              >
                <option value="1x1">1:1</option>
                <option value="16x9">16:9</option>
                <option value="9x16">9:16</option>
                <option value="4x5">4:5</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-white/70">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .volume-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ffffff 0%, #d4d7de 100%);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35), 0 0 0 3px rgba(255, 255, 255, 0.2);
          border: 2.5px solid white;
          transition: all 0.2s ease;
        }
        .volume-range::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.45), 0 0 0 4px rgba(255, 255, 255, 0.25);
        }
        .volume-range::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ffffff 0%, #d4d7de 100%);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35), 0 0 0 3px rgba(255, 255, 255, 0.2);
          border: 2.5px solid white;
          transition: all 0.2s ease;
        }
        .volume-range::-moz-range-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.45), 0 0 0 4px rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </>
  )
}

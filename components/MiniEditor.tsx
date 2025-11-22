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

  // this is what we actually send to VideoCanvasPreview as "seekTime"
  // it is ONLY set when the user scrubs/clicks the timeline
  const [seekTarget, setSeekTarget] = useState<number | null>(null)

  const [captionText, setCaptionText] = useState(caption)

  const previewAreaRef = useRef<HTMLDivElement>(null)
  const previewBoxRef = useRef<HTMLDivElement>(null)
  const timelineContainerRef = useRef<HTMLDivElement>(null)

  // sync caption text with prop
  useEffect(() => {
    setCaptionText(caption)
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

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = Math.floor(sec % 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(
      s
    ).padStart(2, '0')}`
  }

  // ---- timeline scrubbing ----
  const seekToClientX = (clientX: number) => {
    if (!timelineContainerRef.current || totalDuration <= 0) return
    const rect = timelineContainerRef.current.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const newTime = frac * totalDuration

    // tell parent time should change (for timeline display)
    onTimeUpdate(newTime)
    // tell the player to seek once
    setSeekTarget(newTime)
  }

  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (totalDuration <= 0) return
    e.preventDefault()
    e.stopPropagation()
    setIsScrubbing(true)
    seekToClientX(e.clientX)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScrubbing) return
      seekToClientX(e.clientX)
    }

    const handleMouseUp = () => {
      setIsScrubbing(false)
    }

    if (isScrubbing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isScrubbing, totalDuration])

  // ---- zoom with scroll (center zoom only) ----
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    setZoomLevel(prev => Math.min(2.0, Math.max(0.8, prev + delta)))
  }, [])

  // push caption text up to parent if needed
  useEffect(() => {
    if (onCaptionChange) onCaptionChange(captionText)
  }, [captionText, onCaptionChange])

  const progressPercent =
    totalDuration > 0
      ? Math.min(100, Math.max(0, (currentTime / totalDuration) * 100))
      : 0

  return (
    <>
      <div className="w-full max-w-[500px] rounded-[16px] bg-white shadow-sm border border-slate-200/50 px-4 pt-4 pb-3">
        {/* Preview Area */}
        <div
          ref={previewAreaRef}
          className="mb-3 flex h-[20rem] items-center justify-center rounded-[12px] bg-slate-100 overflow-hidden"
          onWheel={handleWheel}
        >
          <div
            ref={previewBoxRef}
            className="relative flex items-center justify-center rounded-[12px] bg-black text-slate-100 text-lg tracking-wide shadow-sm transition-all duration-200 ease-out overflow-hidden"
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
        <div className="mb-2.5 px-0.5">
          <div
            ref={timelineContainerRef}
            className="group relative h-2 cursor-pointer rounded-full bg-slate-200 transition-all duration-150 ease-out hover:h-2.5"
            onMouseDown={handleTimelineMouseDown}
          >
            <div
              className="pointer-events-none absolute left-0 top-0 h-full rounded-full bg-blue-500 transition-all duration-75 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.4)] transition-transform duration-150 ease-out group-hover:scale-110"
              style={{ left: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-1.5 text-center font-mono text-[10px] text-slate-500">
            {formatTime(Math.max(0, currentTime))} / {formatTime(Math.max(0, totalDuration))}
          </div>
        </div>

        {/* Control Bar */}
        <div className="flex items-center justify-between rounded-[12px] bg-slate-200 px-3 py-1.5 gap-2 overflow-hidden border border-slate-300/40">
          <button
            onClick={() => onPlayStateChange(!isPlaying)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-150 ease-out hover:scale-105 flex-shrink-0"
            type="button"
          >
            {isPlaying ? (
              <div className="flex gap-0.5">
                <div className="h-3 w-0.5 bg-slate-900" />
                <div className="h-3 w-0.5 bg-slate-900" />
              </div>
            ) : (
              <span className="ml-0.5 inline-block border-l-[7px] border-y-[4px] border-l-slate-900 border-y-transparent" />
            )}
          </button>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Volume */}
            <div className="flex items-center gap-1 rounded-full border border-slate-300/60 bg-slate-50 px-2 py-0.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 text-slate-700"
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
                  width: '60px',
                  height: '3px',
                  borderRadius: '999px',
                  background: 'rgb(209, 213, 219)',
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
                className="appearance-none rounded-full border border-slate-300/60 bg-slate-50 px-2.5 py-1 pr-6 text-[11px] font-medium text-slate-800 outline-none transition-colors duration-150 ease-out hover:border-blue-500 hover:bg-slate-100"
              >
                <option value="1x1">1:1</option>
                <option value="16x9">16:9</option>
                <option value="9x16">9:16</option>
                <option value="4x5">4:5</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-500">
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
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: rgb(37, 99, 235);
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.25);
          border: 2px solid white;
        }
        .volume-range::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          background: rgb(37, 99, 235);
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.25);
          border: 2px solid white;
        }
      `}</style>
    </>
  )
}

'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CreatorTemplate } from '@/types'

interface CreatorTemplateCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  templates: CreatorTemplate[]
  selectedCreators: string[]
  onToggleCreator: (id: string) => void
  maxReached: boolean
}

type ViewMode = 'carousel' | 'grid'

export const CreatorTemplateCarousel = React.forwardRef<HTMLDivElement, CreatorTemplateCarouselProps>(
  ({ templates, selectedCreators, onToggleCreator, maxReached, className, ...props }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(Math.floor(templates.length / 2))
    const [isMounted, setIsMounted] = React.useState(false)
    const [viewMode, setViewMode] = React.useState<ViewMode>('grid')
    const [currentPage, setCurrentPage] = React.useState(1)
    const prevViewModeRef = React.useRef<ViewMode>('grid')

    const ITEMS_PER_PAGE = 20
    const totalPages = Math.ceil(templates.length / ITEMS_PER_PAGE)

    React.useEffect(() => {
      setIsMounted(true)
    }, [])

    React.useEffect(() => {
      // Reset to page 1 only when switching FROM carousel TO grid view
      if (prevViewModeRef.current === 'carousel' && viewMode === 'grid') {
        setCurrentPage(1)
      }
      prevViewModeRef.current = viewMode
    }, [viewMode])

    const handleNext = React.useCallback(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % templates.length)
    }, [templates.length])

    const handlePrev = React.useCallback(() => {
      if (viewMode === 'carousel') {
        setViewMode('grid')
      } else {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + templates.length) % templates.length)
      }
    }, [templates.length, viewMode])

    React.useEffect(() => {
      if (viewMode === 'carousel') {
        const timer = setInterval(() => {
          handleNext()
        }, 4000)
        return () => clearInterval(timer)
      }
    }, [handleNext, viewMode])

    const renderCarouselView = () => (
      <div className="relative w-full h-[280px] md:h-[360px] flex items-center justify-center">
        {/* Carousel Wrapper */}
        <div className="relative w-full h-full flex items-center justify-center [perspective:1000px]">
          {templates.map((template, index) => {
            const offset = index - currentIndex
            const total = templates.length
            let pos = (offset + total) % total

            if (pos > Math.floor(total / 2)) {
              pos = pos - total
            }

            const isCenter = pos === 0
            const isAdjacent = Math.abs(pos) === 1
            const isSelected = selectedCreators.includes(template.id)
            const canSelect = isSelected || !maxReached

            return (
              <div
                key={template.id}
                className={cn(
                  'absolute w-40 h-72 md:w-52 md:h-[360px] transition-all duration-500 ease-in-out',
                  'flex items-center justify-center cursor-pointer',
                  canSelect && 'hover:scale-105'
                )}
                style={{
                  transform: `
                    translateX(${(pos) * 45}%)
                    scale(${isCenter ? 1 : isAdjacent ? 0.85 : 0.7})
                    rotateY(${(pos) * -10}deg)
                  `,
                  zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                  opacity: isCenter ? 1 : isAdjacent ? 0.4 : 0,
                  filter: isCenter ? 'blur(0px)' : 'blur(4px)',
                  visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
                }}
                onClick={() => canSelect && onToggleCreator(template.id)}
              >
                <div
                  className={cn(
                    'w-full h-full border-2 shadow-2xl overflow-hidden transition-all duration-300 relative',
                    isSelected
                      ? 'border-blue-500 ring-4 ring-blue-200 shadow-blue-200'
                      : 'border-foreground/10',
                    !canSelect && 'opacity-60 cursor-not-allowed',
                    canSelect && !isSelected && 'hover:border-blue-300 hover:shadow-xl'
                  )}
                  style={{ borderRadius: '28px', clipPath: 'inset(0 round 28px)' }}
                >
                  <div className="w-full h-full relative" style={{ borderRadius: '26px' }}>
                    {isMounted && template.videoUrl ? (
                      <video
                        src={template.videoUrl}
                        className="object-cover w-full h-full"
                        style={{ borderRadius: '26px' }}
                        muted
                        loop
                        playsInline
                        suppressHydrationWarning
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause()
                          e.currentTarget.currentTime = 0
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200" style={{ borderRadius: '26px' }}>
                        <div className="text-7xl">📱</div>
                      </div>
                    )}
                  </div>
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10">
                      ✓
                    </div>
                  )}
                  {/* Info Overlay */}
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-4 pb-5"
                    style={{ borderBottomLeftRadius: '26px', borderBottomRightRadius: '26px' }}
                  >
                    <h3 className="font-bold text-lg mb-1 text-white">
                      {template.name}
                    </h3>
                    <p className="text-sm text-white/90 line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Navigation Buttons */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 z-20 bg-background/50 backdrop-blur-sm"
          onClick={handlePrev}
          title="View all templates"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 z-20 bg-background/50 backdrop-blur-sm"
          onClick={handleNext}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    )

    const handlePageChange = React.useCallback((newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage)
      }
    }, [totalPages])

    const renderGridView = () => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
      const endIndex = startIndex + ITEMS_PER_PAGE
      const currentTemplates = templates.slice(startIndex, endIndex)

      return (
        <div className="w-full h-full flex flex-col p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">All Templates</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('carousel')}
              className="flex items-center gap-2"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Back to Carousel
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {currentTemplates.map((template) => {
                const isSelected = selectedCreators.includes(template.id)
                const canSelect = isSelected || !maxReached

                return (
                  <div
                    key={template.id}
                    className={cn(
                      'relative aspect-[9/16] rounded-2xl overflow-hidden border-2 transition-all duration-300 cursor-pointer',
                      isSelected
                        ? 'border-blue-500 ring-4 ring-blue-200 shadow-blue-200'
                        : 'border-foreground/10',
                      !canSelect && 'opacity-60 cursor-not-allowed',
                      canSelect && !isSelected && 'hover:border-blue-300 hover:shadow-xl hover:scale-105'
                    )}
                    onClick={() => canSelect && onToggleCreator(template.id)}
                  >
                    <div className="w-full h-full relative">
                      {isMounted && template.videoUrl ? (
                        <video
                          src={template.videoUrl}
                          className="object-cover w-full h-full"
                          muted
                          loop
                          playsInline
                          suppressHydrationWarning
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause()
                            e.currentTarget.currentTime = 0
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <div className="text-4xl">📱</div>
                        </div>
                      )}
                    </div>
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10 text-sm">
                        ✓
                      </div>
                    )}
                    {/* Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-2">
                      <h4 className="font-semibold text-sm text-white truncate">
                        {template.name}
                      </h4>
                      <p className="text-xs text-white/90 line-clamp-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-foreground/10">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handlePageChange(currentPage - 1)
                }}
                disabled={currentPage === 1}
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-full transition-all",
                  "text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed",
                  "hover:bg-gray-100 active:bg-gray-200"
                )}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium text-gray-400 min-w-[3rem] text-center">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handlePageChange(currentPage + 1)
                }}
                disabled={currentPage === totalPages}
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-full transition-all",
                  "text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed",
                  "hover:bg-gray-100 active:bg-gray-200"
                )}
                aria-label="Next page"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-background text-foreground',
          className
        )}
        {...props}
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 z-0 opacity-20" aria-hidden="true">
          <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(59,130,246,0.15),rgba(255,255,255,0))]"></div>
          <div className="absolute bottom-0 right-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(37,99,235,0.15),rgba(255,255,255,0))]"></div>
        </div>

        {/* Content */}
        <div className="z-10 flex w-full flex-col items-center text-center flex-1">
          {viewMode === 'carousel' ? renderCarouselView() : renderGridView()}
        </div>
      </div>
    )
  }
)

CreatorTemplateCarousel.displayName = 'CreatorTemplateCarousel'





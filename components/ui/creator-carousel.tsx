'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CreatorTemplate } from '@/types'

interface CreatorCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  templates: CreatorTemplate[]
  selectedCreators: string[]
  onToggleCreator: (id: string) => void
  maxReached: boolean
}

export const CreatorCarousel = React.forwardRef<HTMLDivElement, CreatorCarouselProps>(
  ({ templates, selectedCreators, onToggleCreator, maxReached, className, ...props }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(Math.floor(templates.length / 2))

    const handleNext = React.useCallback(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % templates.length)
    }, [templates.length])

    const handlePrev = React.useCallback(() => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + templates.length) % templates.length)
    }, [templates.length])

    React.useEffect(() => {
      const timer = setInterval(() => {
        handleNext()
      }, 4000)
      return () => clearInterval(timer)
    }, [handleNext])

    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full flex flex-col items-center justify-center overflow-x-hidden',
          className
        )}
        {...props}
      >
        {/* Carousel Container */}
        <div className="relative w-full h-[450px] md:h-[550px] flex items-center justify-center">
          {/* Carousel Wrapper with Perspective */}
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
              const isNeutral = template.id === 'neutral'
              const canSelect = !isNeutral && (isSelected || !maxReached)

              return (
                <div
                  key={template.id}
                  className={cn(
                    'absolute transition-all duration-500 ease-in-out',
                    'flex items-center justify-center cursor-pointer',
                    'w-48 h-96 md:w-64 md:h-[450px]'
                  )}
                  style={{
                    transform: `
                      translateX(${pos * 50}%) 
                      scale(${isCenter ? 1 : isAdjacent ? 0.85 : 0.7})
                      rotateY(${pos * -15}deg)
                    `,
                    zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                    opacity: isCenter ? 1 : isAdjacent ? 0.5 : 0.2,
                    filter: isCenter ? 'blur(0px)' : 'blur(6px)',
                    visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
                  }}
                  onClick={() => canSelect && onToggleCreator(template.id)}
                >
                  {/* Creator Card */}
                  <div
                    className={cn(
                      'w-full h-full rounded-3xl border-2 shadow-2xl overflow-hidden transition-all duration-300',
                      isSelected
                        ? 'border-blue-500 ring-4 ring-blue-200 shadow-blue-200'
                        : 'border-gray-200/50',
                      !canSelect && 'opacity-60 cursor-not-allowed',
                      canSelect && !isSelected && 'hover:border-blue-300 hover:shadow-xl'
                    )}
                  >
                    {/* Video/Image Container */}
                    <div className="relative w-full h-full bg-gray-100">
                      {template.videoUrl ? (
                        <video
                          src={template.videoUrl}
                          className="w-full h-full object-cover"
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
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <div className="text-7xl">📱</div>
                        </div>
                      )}
                      {/* Selection Checkbox Overlay */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10">
                          ✓
                        </div>
                      )}
                      {/* Info Overlay at Bottom */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-4">
                        <h3 className="font-bold text-lg mb-1 text-white">
                          {template.name}
                        </h3>
                        <p className="text-sm text-white/90 line-clamp-2">
                          {template.description}
                        </p>
                      </div>
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
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full h-12 w-12 z-20 bg-white/90 backdrop-blur-md border-gray-300 hover:bg-white shadow-lg"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full h-12 w-12 z-20 bg-white/90 backdrop-blur-md border-gray-300 hover:bg-white shadow-lg"
            onClick={handleNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
    )
  }
)

CreatorCarousel.displayName = 'CreatorCarousel'


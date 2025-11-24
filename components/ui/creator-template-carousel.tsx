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

export const CreatorTemplateCarousel = React.forwardRef<HTMLDivElement, CreatorTemplateCarouselProps>(
  ({ templates, selectedCreators, onToggleCreator, maxReached, className, ...props }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(Math.floor(templates.length / 2))
    const [isMounted, setIsMounted] = React.useState(false)

    React.useEffect(() => {
      setIsMounted(true)
    }, [])

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
        <div className="z-10 flex w-full flex-col items-center text-center">
          {/* Main Showcase Section */}
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
                      {isMounted && template.videoUrl ? (
                        <video
                          src={template.videoUrl}
                          className="object-cover w-full h-full"
                          style={{ borderRadius: '26px' }}
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
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200" style={{ borderRadius: '26px' }}>
                          <div className="text-7xl">📱</div>
                        </div>
                      )}
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
        </div>
      </div>
    )
  }
)

CreatorTemplateCarousel.displayName = 'CreatorTemplateCarousel'





'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CardTrackProps {
  label: string
  count: number
  children: React.ReactNode
}

export function CardTrack({ label, count, children }: CardTrackProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 2)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    const observer = new ResizeObserver(checkScroll)
    observer.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      observer.disconnect()
    }
  }, [checkScroll])

  return (
    <div className="mb-3">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[0.5625rem] uppercase tracking-[0.2em] text-muted-foreground/40 font-medium">
          {label}
        </span>
        <span className="text-[0.5625rem] text-muted-foreground/25 tabular-nums">
          {count}
        </span>
        {(canScrollLeft || canScrollRight) && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="ml-auto text-[0.5625rem] text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors flex items-center gap-0.5"
          >
            View all
            <ChevronDown className="size-2.5" />
          </button>
        )}
        {expanded && (
          <button
            onClick={() => setExpanded(false)}
            className="ml-auto text-[0.5625rem] text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors flex items-center gap-0.5"
          >
            Collapse
            <ChevronDown className="size-2.5 rotate-180" />
          </button>
        )}
      </div>

      {/* Scroll container or expanded grid */}
      {expanded ? (
        <div className="flex flex-wrap gap-2">
          {children}
        </div>
      ) : (
        <div className="relative">
          {/* Left fade */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          )}

          {/* Scrollable track */}
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide"
            style={{
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
            }}
          >
            {children}
          </div>

          {/* Right fade */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          )}
        </div>
      )}
    </div>
  )
}

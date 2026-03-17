'use client'

import { useState } from 'react'
import { Check, Clock, X, ChevronDown } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { cn } from '@/lib/utils'
import { FormattedContent } from '@/components/chat-messages'

interface SurfacedItem {
  id: string
  title: string
  priority: 'high' | 'medium' | 'low'
  context: string
}

interface GreetingCardProps {
  greeting: string | null
  items: SurfacedItem[]
  onItemHandled?: (itemId: string) => void
}

const PRIORITY_LABEL: Record<string, { text: string; color: string }> = {
  overdue: { text: 'Overdue', color: 'text-red-400' },
  due_today: { text: 'Due today', color: 'text-amber-400' },
  active: { text: '', color: '' },
}

export function GreetingCard({ greeting, items, onItemHandled }: GreetingCardProps) {
  const [handledIds, setHandledIds] = useState<Set<string>>(new Set())
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState(false)

  const visibleItems = items.filter(i => !handledIds.has(i.id))

  // Show first 4 items, rest behind expand
  const INITIAL_COUNT = 4
  const displayItems = expanded ? visibleItems : visibleItems.slice(0, INITIAL_COUNT)
  const hiddenCount = visibleItems.length - INITIAL_COUNT

  // Group: urgent first (overdue + due_today), then rest
  const urgent = displayItems.filter(i => i.context === 'overdue' || i.context === 'due_today')
  const rest = displayItems.filter(i => i.context !== 'overdue' && i.context !== 'due_today')

  async function handleAction(itemId: string, action: 'done' | 'skip' | 'later') {
    const supabase = getSupabaseBrowser()
    setAnimatingIds(prev => new Set(prev).add(itemId))

    if (action === 'done') {
      await supabase
        .from('action_items')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', itemId)
    } else if (action === 'skip') {
      await supabase
        .from('action_items')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('id', itemId)
    } else if (action === 'later') {
      const snoozeUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      await supabase
        .from('action_items')
        .update({ snoozed_until: snoozeUntil, updated_at: new Date().toISOString() })
        .eq('id', itemId)
    }

    setTimeout(() => {
      setHandledIds(prev => new Set(prev).add(itemId))
      onItemHandled?.(itemId)
    }, 300)
  }

  const now = new Date()
  const timeLabel = now.toLocaleDateString('en-US', { weekday: 'long' })
  const hour = now.getHours()
  const timeOfDay = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

  return (
    <div className="py-5 animate-in-up">
      <div className="border border-border/60 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border/40">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-[0.5625rem] uppercase tracking-[0.2em] text-muted-foreground/40 font-medium">
                {timeLabel} {timeOfDay}
              </span>
            </div>
            {visibleItems.length > 0 && (
              <span className="text-[0.5625rem] uppercase tracking-[0.15em] text-muted-foreground/30 tabular-nums">
                {visibleItems.length} item{visibleItems.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Message */}
        <div className="px-5 py-4">
          {greeting ? (
            <div className="text-[0.875rem] leading-[1.8] text-foreground/80 font-light animate-in-fade">
              <FormattedContent content={greeting} />
            </div>
          ) : (
            <div className="flex items-center gap-2 py-1">
              <span className="inline-block size-1 bg-muted-foreground/30 rounded-full" style={{ animation: 'pulse-subtle 1.5s ease-in-out infinite' }} />
              <span className="inline-block size-1 bg-muted-foreground/30 rounded-full" style={{ animation: 'pulse-subtle 1.5s ease-in-out infinite 0.2s' }} />
              <span className="inline-block size-1 bg-muted-foreground/30 rounded-full" style={{ animation: 'pulse-subtle 1.5s ease-in-out infinite 0.4s' }} />
            </div>
          )}
        </div>

        {/* Action items */}
        {visibleItems.length > 0 && (
          <div className="border-t border-border/40">
            {urgent.length > 0 && (
              <div className="px-5 py-3">
                <div className="text-[0.5625rem] uppercase tracking-[0.2em] text-red-400/60 font-medium mb-2">
                  Needs attention
                </div>
                <div>
                  {urgent.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      animating={animatingIds.has(item.id)}
                      onAction={handleAction}
                    />
                  ))}
                </div>
              </div>
            )}

            {rest.length > 0 && (
              <div className={cn("px-5 py-3", urgent.length > 0 && "border-t border-border/20")}>
                {urgent.length > 0 && (
                  <div className="text-[0.5625rem] uppercase tracking-[0.2em] text-muted-foreground/30 font-medium mb-2">
                    On deck
                  </div>
                )}
                <div>
                  {rest.map(item => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      animating={animatingIds.has(item.id)}
                      onAction={handleAction}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Expand/collapse toggle */}
            {hiddenCount > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-5 py-2 flex items-center justify-center gap-1.5 text-[0.625rem] text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors border-t border-border/20"
              >
                <span>{expanded ? 'Show less' : `${hiddenCount} more`}</span>
                <ChevronDown className={cn("size-2.5 transition-transform", expanded && "rotate-180")} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ItemRow({ item, animating, onAction }: {
  item: SurfacedItem
  animating: boolean
  onAction: (id: string, action: 'done' | 'skip' | 'later') => void
}) {
  const meta = PRIORITY_LABEL[item.context] || PRIORITY_LABEL.active

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 py-1.5 transition-all duration-300",
        animating && "opacity-0 -translate-x-2"
      )}
    >
      {/* Priority indicator */}
      <div className={cn(
        "w-0.5 self-stretch shrink-0 rounded-full",
        item.priority === 'high' ? 'bg-red-500/70' :
        item.priority === 'medium' ? 'bg-amber-500/50' :
        'bg-muted-foreground/20'
      )} />

      {/* Title + context */}
      <div className="flex-1 min-w-0">
        <span className="text-[0.75rem] text-foreground/70 leading-snug">{item.title}</span>
        {meta.text && (
          <span className={cn("ml-2 text-[0.5625rem] uppercase tracking-wider", meta.color)}>
            {meta.text}
          </span>
        )}
      </div>

      {/* Actions - hover overlay, doesn't affect text layout */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-background/90 pl-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onAction(item.id, 'done')}
          className="p-1 text-muted-foreground/30 hover:text-emerald-500 transition-colors"
          title="Done"
        >
          <Check className="size-3" />
        </button>
        <button
          onClick={() => onAction(item.id, 'later')}
          className="p-1 text-muted-foreground/30 hover:text-blue-400 transition-colors"
          title="Snooze 3 days"
        >
          <Clock className="size-3" />
        </button>
        <button
          onClick={() => onAction(item.id, 'skip')}
          className="p-1 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
          title="Dismiss"
        >
          <X className="size-2.5" />
        </button>
      </div>
    </div>
  )
}

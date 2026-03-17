'use client'

import { useState } from 'react'
import { Check, X, Clock } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { cn } from '@/lib/utils'

interface SurfacedItem {
  id: string
  title: string
  priority: 'high' | 'medium' | 'low'
  context: string
}

interface InlineActionButtonsProps {
  items: SurfacedItem[]
  onItemHandled?: (itemId: string) => void
}

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-muted-foreground/40',
}

export function InlineActionButtons({ items, onItemHandled }: InlineActionButtonsProps) {
  const [handledIds, setHandledIds] = useState<Set<string>>(new Set())
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set())

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

    // Animate out then mark handled
    setTimeout(() => {
      setHandledIds(prev => new Set(prev).add(itemId))
      onItemHandled?.(itemId)
    }, 300)
  }

  const visibleItems = items.filter(i => !handledIds.has(i.id))
  if (visibleItems.length === 0) return null

  return (
    <div className="mt-3 space-y-1">
      {visibleItems.map(item => (
        <div
          key={item.id}
          className={cn(
            "flex items-center gap-2 text-[0.6875rem] border border-border px-3 py-1.5 transition-all duration-300",
            animatingIds.has(item.id) && "opacity-0 -translate-x-2"
          )}
        >
          <div className={cn('size-1.5 shrink-0 rounded-full', PRIORITY_DOT[item.priority])} />
          <span className="text-foreground/80 truncate flex-1">{item.title}</span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleAction(item.id, 'done')}
              className="p-1 text-muted-foreground/40 hover:text-emerald-500 transition-colors"
              title="Done"
            >
              <Check className="size-3" />
            </button>
            <button
              onClick={() => handleAction(item.id, 'skip')}
              className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              title="Skip"
            >
              <X className="size-3" />
            </button>
            <button
              onClick={() => handleAction(item.id, 'later')}
              className="p-1 text-muted-foreground/40 hover:text-blue-400 transition-colors"
              title="Later (+3 days)"
            >
              <Clock className="size-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

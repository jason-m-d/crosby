'use client'

import { useState } from 'react'
import { Check, Clock, X } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { cn } from '@/lib/utils'
import type { ActionItem } from '@/lib/types'

interface ActionItemDataCardProps {
  item: ActionItem
  onHandled?: (itemId: string) => void
}

export function ActionItemDataCard({ item, onHandled }: ActionItemDataCardProps) {
  const [status, setStatus] = useState(item.status)
  const [animating, setAnimating] = useState(false)

  const isHandled = status === 'completed' || status === 'dismissed'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = item.due_date ? new Date(item.due_date) : null
  const dueDateStr = item.due_date?.split('T')[0]
  const todayStr = today.toISOString().split('T')[0]
  const isOverdue = dueDateStr ? dueDateStr < todayStr : false
  const isDueToday = dueDateStr === todayStr

  async function handleAction(action: 'done' | 'snooze' | 'dismiss') {
    const supabase = getSupabaseBrowser()
    setAnimating(true)

    if (action === 'done') {
      await supabase
        .from('action_items')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', item.id)
      setStatus('completed')
    } else if (action === 'snooze') {
      const snoozeUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      await supabase
        .from('action_items')
        .update({ snoozed_until: snoozeUntil, updated_at: new Date().toISOString() })
        .eq('id', item.id)
      setStatus('dismissed') // visually hide
    } else if (action === 'dismiss') {
      await supabase
        .from('action_items')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('id', item.id)
      setStatus('dismissed')
    }

    setTimeout(() => onHandled?.(item.id), 300)
  }

  if (isHandled && !animating) return null

  return (
    <div
      className={cn(
        'group relative min-w-[220px] max-w-[260px] flex-shrink-0 scroll-snap-align-start',
        'border border-border/40 rounded-sm p-3 transition-all duration-300',
        'hover:border-border/70',
        animating && 'opacity-0 scale-95',
      )}
    >
      {/* Priority left border */}
      <div className={cn(
        'absolute left-0 top-2 bottom-2 w-0.5 rounded-full',
        item.priority === 'high' ? 'bg-red-500/70' :
        item.priority === 'medium' ? 'bg-amber-500/50' :
        'bg-muted-foreground/20',
      )} />

      {/* Title */}
      <div className="pl-2.5">
        <p className="text-[0.8125rem] text-foreground/80 font-light leading-snug line-clamp-2">
          {item.title}
        </p>

        {/* Due date badge */}
        {dueDate && (
          <span className={cn(
            'inline-block mt-1.5 text-[0.625rem] uppercase tracking-wider',
            isOverdue ? 'text-red-400' :
            isDueToday ? 'text-amber-400' :
            'text-muted-foreground/50',
          )}>
            {isOverdue ? 'Overdue' :
             isDueToday ? 'Due today' :
             `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </span>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-0.5 pl-2.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => handleAction('done')}
          className="p-1 text-muted-foreground/30 hover:text-emerald-500 transition-colors"
          title="Mark done"
        >
          <Check className="size-3" />
        </button>
        <button
          onClick={() => handleAction('snooze')}
          className="p-1 text-muted-foreground/30 hover:text-blue-400 transition-colors"
          title="Snooze 3 days"
        >
          <Clock className="size-3" />
        </button>
        <button
          onClick={() => handleAction('dismiss')}
          className="p-1 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
          title="Dismiss"
        >
          <X className="size-2.5" />
        </button>
      </div>
    </div>
  )
}

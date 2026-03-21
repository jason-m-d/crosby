'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SuggestedAction } from '@/lib/types'

interface SuggestedActionsProps {
  actions: SuggestedAction[]
  onSendMessage: (text: string) => void
}

export function SuggestedActions({ actions, onSendMessage }: SuggestedActionsProps) {
  const [clickedIndex, setClickedIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleClick(action: SuggestedAction, index: number) {
    setClickedIndex(index)

    if (action.action_type === 'send_message' && action.message) {
      onSendMessage(action.message)
    } else if (action.action_type === 'api_call' && action.endpoint) {
      setLoading(true)
      try {
        await fetch(action.endpoint, {
          method: action.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: action.body ? JSON.stringify(action.body) : undefined,
        })
      } catch {}
      setLoading(false)
    }
  }

  if (actions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {actions.map((action, i) => {
        const isClicked = clickedIndex === i
        const isDimmed = clickedIndex !== null && clickedIndex !== i

        return (
          <button
            key={i}
            onClick={() => handleClick(action, i)}
            disabled={clickedIndex !== null}
            className={cn(
              'px-3 py-1.5 text-[0.75rem] font-light rounded-sm border transition-all',
              isClicked
                ? 'border-emerald-500/40 text-emerald-400/80 bg-emerald-500/5'
                : isDimmed
                ? 'border-border/20 text-muted-foreground/20 cursor-default'
                : 'border-border/40 text-muted-foreground/60 hover:border-foreground/20 hover:text-foreground/70',
            )}
          >
            {isClicked && loading ? (
              <Loader2 className="size-3 animate-spin inline mr-1.5" />
            ) : isClicked ? (
              <Check className="size-3 inline mr-1.5" />
            ) : null}
            {action.label}
          </button>
        )
      })}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { CronMessageType, CRON_TYPE_CONFIG } from '@/components/cron-message-card'

const TYPE_PRIORITY: Record<string, number> = {
  alert: 0,
  email_heads_up: 1,
  watch_match: 2,
  nudge: 3,
  briefing: 4,
  bridge_status: 5,
}

function formatTime(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function getOneLiner(message: any): string {
  const content = (message.content || '') as string
  const lines = content.split('\n').filter((l: string) => l.trim())
  const start = lines[0]?.match(/^[⚡📌☀️👀📧🔌]\s*(Alert|Nudge|Briefing|Watch Match|Heads Up|Bridge Status|Morning Briefing)/i) ? 1 : 0
  const firstLine = lines[start] || lines[0] || content.slice(0, 120)
  return firstLine.replace(/^\*\*.*?\*\*\s*[-–—]?\s*/, '').replace(/^#+\s*/, '').replace(/^[-*]\s*/, '').slice(0, 100)
}

interface CronMessageGroupProps {
  messages: any[]
  resolveType: (msg: any) => string | null
  renderExpanded: (msg: any, i: number) => React.ReactNode
}

export function CronMessageGroup({ messages, resolveType, renderExpanded }: CronMessageGroupProps) {
  const [expanded, setExpanded] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const sorted = [...messages].sort((a, b) => {
    const aType = resolveType(a) || 'bridge_status'
    const bType = resolveType(b) || 'bridge_status'
    return (TYPE_PRIORITY[aType] ?? 99) - (TYPE_PRIORITY[bType] ?? 99)
  })

  if (dismissed) {
    return (
      <div className="py-3 text-center">
        <span className="text-[0.75rem] text-muted-foreground/30 italic">
          {messages.length} update{messages.length > 1 ? 's' : ''} dismissed
        </span>
      </div>
    )
  }

  if (expanded) {
    return (
      <div className="py-2">
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-[0.5625rem] uppercase tracking-[0.2em] text-muted-foreground/40 font-medium">
            {messages.length} update{messages.length > 1 ? 's' : ''} while you were away
          </span>
          <div className="flex items-center gap-3">
            <button onClick={() => setExpanded(false)} className="text-[0.6875rem] text-muted-foreground/35 hover:text-muted-foreground/60 transition-colors">
              Collapse
            </button>
            <button onClick={() => setDismissed(true)} className="text-[0.6875rem] text-muted-foreground/35 hover:text-muted-foreground/60 transition-colors">
              Dismiss all
            </button>
          </div>
        </div>
        <div>
          {sorted.map((msg, i) => renderExpanded(msg, i))}
        </div>
      </div>
    )
  }

  return (
    <div className="py-4 animate-in-up">
      <div className="border border-border/50 overflow-hidden">

        {/* Header */}
        <div className="px-4 py-2.5 border-b border-border/30 flex items-center justify-between bg-muted/10">
          <span className="text-[0.75rem] text-foreground/60 font-light">
            {messages.length} update{messages.length > 1 ? 's' : ''} while you were away
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="text-[0.6875rem] text-muted-foreground/35 hover:text-muted-foreground/55 transition-colors"
          >
            Dismiss
          </button>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/20">
          {sorted.map((msg, i) => {
            const type = (resolveType(msg) || 'bridge_status') as CronMessageType
            const config = CRON_TYPE_CONFIG[type]
            const oneLiner = getOneLiner(msg)
            const time = formatTime(msg.created_at)
            return (
              <button
                key={msg.id || i}
                onClick={() => setExpanded(true)}
                className="w-full text-left px-4 py-2.5 hover:bg-muted/10 transition-colors flex items-center gap-3"
              >
                {/* Color bar */}
                <div className={cn("w-0.5 self-stretch shrink-0 opacity-70", config.barColor)} />
                {/* Label */}
                <span className={cn("text-[0.5625rem] uppercase tracking-[0.15em] font-semibold shrink-0 w-14", config.accentText)}>
                  {config.shortLabel}
                </span>
                {/* One-liner */}
                <span className="text-[0.875rem] text-foreground/70 font-light truncate flex-1">
                  {oneLiner}
                </span>
                {/* Time */}
                {time && (
                  <span className="text-[0.6875rem] text-muted-foreground/30 tabular-nums shrink-0 ml-2">
                    {time}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Expand footer */}
        <div className="px-4 py-2 border-t border-border/20">
          <button
            onClick={() => setExpanded(true)}
            className="text-[0.6875rem] text-muted-foreground/40 hover:text-muted-foreground/65 transition-colors w-full text-center"
          >
            Expand all
          </button>
        </div>

      </div>
    </div>
  )
}

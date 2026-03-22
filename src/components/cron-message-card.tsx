'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Eye, Inbox, Mail, Pin, Plug, Send, Sun, X, Zap } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { FormattedContent } from '@/components/chat-messages'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CronMessageType =
  | 'briefing'
  | 'alert'
  | 'nudge'
  | 'email_heads_up'
  | 'watch_match'
  | 'bridge_status'

interface TypeConfig {
  label: string
  shortLabel: string
  icon: React.ElementType
  accentText: string
  barColor: string  // the left vertical bar color
}

export const CRON_TYPE_CONFIG: Record<CronMessageType, TypeConfig> = {
  briefing: {
    label: 'Briefing',
    shortLabel: 'BRIEFING',
    icon: Sun,
    accentText: 'text-amber-400',
    barColor: 'bg-amber-500',
  },
  alert: {
    label: 'Alert',
    shortLabel: 'ALERT',
    icon: Zap,
    accentText: 'text-red-400',
    barColor: 'bg-red-500',
  },
  nudge: {
    label: 'Nudge',
    shortLabel: 'NUDGE',
    icon: Pin,
    accentText: 'text-pink-400',
    barColor: 'bg-pink-500',
  },
  email_heads_up: {
    label: 'Heads Up',
    shortLabel: 'HEADS UP',
    icon: Mail,
    accentText: 'text-blue-400',
    barColor: 'bg-blue-500',
  },
  watch_match: {
    label: 'Watch',
    shortLabel: 'MATCH',
    icon: Eye,
    accentText: 'text-blue-300',
    barColor: 'bg-blue-400',
  },
  bridge_status: {
    label: 'Bridge',
    shortLabel: 'BRIDGE',
    icon: Plug,
    accentText: 'text-muted-foreground/60',
    barColor: 'bg-muted-foreground/40',
  },
}

// ─── Prefix stripping ─────────────────────────────────────────────────────────

function stripCronPrefix(content: string): string {
  let text = content.trim()
  // Remove outer cron wrapper line: emoji + label on its own line followed by blank line
  text = text.replace(/^[^\w\n]*(?:Morning Briefing|Briefing|Alert|Nudge|Heads up|Heads Up|Possible match|Watch Match|Bridge Status)[^\n]*\n\n?/i, '')
  // Remove AI-generated bold heading if it's the first line (e.g. "⚡ **Alert**")
  text = text.replace(/^[^\w\n]*\*{1,2}(?:Morning Briefing|Briefing|Alert|Nudge|Heads up|Heads Up|Possible match|Watch Match|Bridge Status)\*{1,2}[^\n]*\n\n?/i, '')
  // Remove old-format inline bold prefix (e.g. "**Heads up** - " or "**Possible match** - ")
  text = text.replace(/^\*{1,2}(?:Heads up|Possible match)\*{1,2}\s*[-–—]\s*/i, '')
  return text.trim()
}

// ─── Briefing content splitter ────────────────────────────────────────────────

function splitBriefingContent(raw: string): { intro: string; sections: string } {
  const sectionStart = raw.search(/^##\s|\*\*(?:Sales|Action Items|Calendar|Email)/m)
  if (sectionStart === -1) return { intro: raw, sections: '' }
  return {
    intro: raw.slice(0, sectionStart).trim(),
    sections: raw.slice(sectionStart).trim(),
  }
}

// ─── Count extractor for nudge header ────────────────────────────────────────

function extractNudgeCount(content: string): number | null {
  // Count bullet lines
  const bullets = content.match(/^[-*]\s/gm)
  return bullets ? bullets.length : null
}

// ─── Time formatter ───────────────────────────────────────────────────────────

function formatTime(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// ─── Proactive Feedback ───────────────────────────────────────────────────────

function ProactiveFeedback({ messageType }: { messageType: CronMessageType }) {
  const [showInput, setShowInput] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [sent, setSent] = useState(false)
  const config = CRON_TYPE_CONFIG[messageType]

  async function handleSubmit() {
    if (!feedback.trim()) return
    await getSupabaseBrowser().from('memories').insert({
      content: `${config.label} feedback: ${feedback.trim()}`,
      category: 'preference',
    })
    setSent(true)
    setShowInput(false)
    setFeedback('')
  }

  if (sent) return <span className="text-[0.6875rem] text-muted-foreground/35">Preference saved</span>

  if (showInput) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="What should change?"
          className="flex-1 bg-transparent border border-border px-2.5 py-1 text-[0.75rem] outline-none placeholder:text-muted-foreground/30 focus:border-foreground/30 transition-colors"
          autoFocus
        />
        <button onClick={handleSubmit} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          <Send className="size-3" />
        </button>
        <button onClick={() => setShowInput(false)} className="p-1 text-muted-foreground/40 hover:text-foreground transition-colors">
          <X className="size-3" />
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setShowInput(true)} className="text-[0.6875rem] text-muted-foreground/35 hover:text-muted-foreground/60 transition-colors">
      Adjust this
    </button>
  )
}

// ─── Per-type body renderers ──────────────────────────────────────────────────

function BriefingBody({ content, barColor }: { content: string; barColor: string }) {
  const { intro, sections } = splitBriefingContent(content)
  return (
    <div className="flex gap-3.5">
      <div className={cn("w-0.5 shrink-0 self-stretch opacity-60", barColor)} />
      <div className="space-y-3 flex-1 min-w-0">
        {intro && (
          <div className="text-[1rem] leading-[1.8] text-foreground/90 font-light">
            <FormattedContent content={intro} />
          </div>
        )}
        {sections && (
          <div className="text-[0.875rem] leading-[1.75] text-foreground/70 font-light border-t border-border/20 pt-3">
            <FormattedContent content={sections} />
          </div>
        )}
      </div>
    </div>
  )
}

function AlertBody({ content, barColor }: { content: string; barColor: string }) {
  return (
    <div className="flex gap-3.5">
      <div className={cn("w-0.5 shrink-0 self-stretch opacity-70", barColor)} />
      <div className="text-[1rem] leading-[1.8] text-foreground/90 font-light flex-1 min-w-0">
        <FormattedContent content={content} />
      </div>
    </div>
  )
}

function NudgeBody({ content, barColor, accentText }: { content: string; barColor: string; accentText: string }) {
  const count = extractNudgeCount(content)
  // Split off any intro paragraph before the bullet list
  const firstBullet = content.search(/^[-*]\s/m)
  const intro = firstBullet > 0 ? content.slice(0, firstBullet).trim() : ''
  const bullets = firstBullet >= 0 ? content.slice(firstBullet) : content

  return (
    <div className="flex gap-3.5">
      <div className={cn("w-0.5 shrink-0 self-stretch opacity-60", barColor)} />
      <div className="flex-1 min-w-0 space-y-2.5">
        {count !== null && (
          <div className={cn("text-[0.6875rem] uppercase tracking-[0.18em] font-semibold", accentText)}>
            {count} item{count !== 1 ? 's' : ''} need{count === 1 ? 's' : ''} attention
          </div>
        )}
        {intro && (
          <div className="text-[0.9375rem] leading-[1.8] text-foreground/80 font-light">
            <FormattedContent content={intro} />
          </div>
        )}
        <div className="text-[0.9375rem] leading-[1.8] text-foreground/78 font-light">
          <FormattedContent content={bullets} />
        </div>
      </div>
    </div>
  )
}

function EmailHeadsUpBody({ content, barColor, accentText }: { content: string; barColor: string; accentText: string }) {
  // Try to extract sender name, subject, quote from content
  // The AI prose typically mentions sender name and subject explicitly
  // We render structured + prose together
  const lines = content.split('\n').filter(l => l.trim())

  // Look for a blockquote line (starts with ">")
  const quoteIdx = lines.findIndex(l => l.trim().startsWith('>'))
  const hasQuote = quoteIdx !== -1

  return (
    <div className="flex gap-3.5">
      <div className={cn("w-0.5 shrink-0 self-stretch opacity-70", barColor)} />
      <div className="flex-1 min-w-0 space-y-2.5">
        <div className={cn("text-[0.625rem] uppercase tracking-[0.2em] font-semibold", accentText)}>
          Email
        </div>
        {hasQuote ? (
          <>
            <div className="text-[0.9375rem] leading-[1.8] text-foreground/85 font-light">
              <FormattedContent content={lines.slice(0, quoteIdx).join('\n')} />
            </div>
            <div className="border-l-2 border-border/40 pl-3 text-[0.875rem] leading-[1.75] text-foreground/55 font-light italic">
              <FormattedContent content={lines[quoteIdx].replace(/^>\s*/, '')} />
            </div>
            {lines.length > quoteIdx + 1 && (
              <div className="text-[0.875rem] leading-[1.75] text-foreground/70 font-light">
                <FormattedContent content={lines.slice(quoteIdx + 1).join('\n')} />
              </div>
            )}
          </>
        ) : (
          <div className="text-[0.9375rem] leading-[1.8] text-foreground/85 font-light">
            <FormattedContent content={content} />
          </div>
        )}
      </div>
    </div>
  )
}

function WatchBody({ content, barColor }: { content: string; barColor: string }) {
  return (
    <div className="flex gap-3.5">
      <div className={cn("w-0.5 shrink-0 self-stretch opacity-50", barColor)} />
      <div className="text-[0.9375rem] leading-[1.8] text-foreground/80 font-light flex-1 min-w-0">
        <FormattedContent content={content} />
      </div>
    </div>
  )
}

function BridgeBody({ content, barColor }: { content: string; barColor: string }) {
  return (
    <div className="flex gap-3.5">
      <div className={cn("w-0.5 shrink-0 self-stretch opacity-40", barColor)} />
      <div className="text-[0.9375rem] leading-[1.8] text-foreground/65 font-light flex-1 min-w-0">
        <FormattedContent content={content} />
      </div>
    </div>
  )
}

function renderBody(content: string, type: CronMessageType) {
  const config = CRON_TYPE_CONFIG[type]
  switch (type) {
    case 'briefing':       return <BriefingBody content={content} barColor={config.barColor} />
    case 'alert':          return <AlertBody content={content} barColor={config.barColor} />
    case 'nudge':          return <NudgeBody content={content} barColor={config.barColor} accentText={config.accentText} />
    case 'email_heads_up': return <EmailHeadsUpBody content={content} barColor={config.barColor} accentText={config.accentText} />
    case 'watch_match':    return <WatchBody content={content} barColor={config.barColor} />
    case 'bridge_status':  return <BridgeBody content={content} barColor={config.barColor} />
  }
}

// ─── Footer action ────────────────────────────────────────────────────────────

function FooterAction({ type, onSendMessage }: { type: CronMessageType; onSendMessage?: (text: string) => void }) {
  if (!onSendMessage) return null
  if (type === 'alert') {
    return (
      <button onClick={() => onSendMessage('Tell me more about this alert')} className="text-[0.6875rem] text-muted-foreground/35 hover:text-muted-foreground/60 transition-colors">
        Ask about this
      </button>
    )
  }
  if (type === 'nudge') {
    return (
      <button onClick={() => onSendMessage('Show me all pending action items')} className="text-[0.6875rem] text-muted-foreground/35 hover:text-muted-foreground/60 transition-colors">
        See full list
      </button>
    )
  }
  return null
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface CronMessageCardProps {
  message: any
  messageType: CronMessageType
  isLatest?: boolean
  onSendMessage?: (text: string) => void
}

export function CronMessageCard({ message, messageType, isLatest, onSendMessage }: CronMessageCardProps) {
  const config = CRON_TYPE_CONFIG[messageType]
  const rawContent = message.content || ''
  const content = stripCronPrefix(rawContent)
  const time = formatTime(message.created_at)

  return (
    <div className={cn("py-4", isLatest && "animate-in-up")}>
      <div className="border border-border/50 overflow-hidden">

        {/* Header */}
        <div className="px-4 py-2 border-b border-border/30 flex items-center justify-between bg-muted/10">
          <span className={cn("text-[0.5625rem] uppercase tracking-[0.22em] font-semibold", config.accentText)}>
            {config.shortLabel}
          </span>
          <span className="text-[0.5625rem] text-muted-foreground/30 tabular-nums">{time}</span>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {renderBody(content, messageType)}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-border/20 flex items-center justify-between">
          <ProactiveFeedback messageType={messageType} />
          <FooterAction type={messageType} onSendMessage={onSendMessage} />
        </div>

      </div>
    </div>
  )
}

// ─── Exports for group card ───────────────────────────────────────────────────

export { Inbox }

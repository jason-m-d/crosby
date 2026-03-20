'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { cn } from '@/lib/utils'

interface ActionItemCheckboxProps {
  itemId: string
  initialStatus: string
  onCheckedChange?: (checked: boolean) => void
}

export function ActionItemCheckbox({ itemId, initialStatus, onCheckedChange }: ActionItemCheckboxProps) {
  const [checked, setChecked] = useState(initialStatus === 'completed')
  const [previousStatus, setPreviousStatus] = useState(initialStatus)
  const [pending, setPending] = useState(false)

  // Fetch current status on mount — the initialStatus is from tool-call time and may be stale
  useEffect(() => {
    const supabase = getSupabaseBrowser()
    supabase
      .from('action_items')
      .select('status')
      .eq('id', itemId)
      .single()
      .then(({ data }) => {
        if (data) {
          const isCompleted = data.status === 'completed'
          setChecked(isCompleted)
          setPreviousStatus(data.status)
          onCheckedChange?.(isCompleted)
        }
      })
  }, [itemId])

  async function toggle() {
    if (pending) return
    const nextChecked = !checked
    const nextStatus = nextChecked ? 'completed' : previousStatus === 'completed' ? 'approved' : previousStatus

    // Optimistic update
    setChecked(nextChecked)
    onCheckedChange?.(nextChecked)
    setPending(true)

    const supabase = getSupabaseBrowser()
    const { error } = await supabase
      .from('action_items')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', itemId)

    if (error) {
      // Revert on failure
      setChecked(!nextChecked)
      onCheckedChange?.(!nextChecked)
    } else {
      // Update previousStatus for next toggle
      if (!nextChecked) {
        setPreviousStatus(nextStatus)
      }
    }
    setPending(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={cn(
        "mt-[1px] size-3.5 shrink-0 rounded-[3px] border transition-all duration-150 flex items-center justify-center",
        checked
          ? "border-border/60 bg-muted-foreground/20"
          : "border-border/60 hover:border-muted-foreground/60 active:scale-95",
        pending && "opacity-50"
      )}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && <Check className="size-2.5 text-muted-foreground" />}
    </button>
  )
}

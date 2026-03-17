'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { settingsNav } from './nav'
import { ChevronRight } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()

  // On desktop (md+), redirect to first settings page like before
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    if (mql.matches) {
      router.replace('/settings/memory')
    }
  }, [router])

  return (
    <div className="md:hidden animate-in-fade">
      <span className="text-[0.625rem] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium block mb-4">
        Settings
      </span>
      <div className="border border-border divide-y divide-border">
        {settingsNav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3.5 text-[0.8125rem] text-muted-foreground hover:text-foreground transition-colors active:bg-muted/30"
          >
            <item.icon className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            <ChevronRight className="size-3.5 text-muted-foreground/30" />
          </Link>
        ))}
      </div>
    </div>
  )
}

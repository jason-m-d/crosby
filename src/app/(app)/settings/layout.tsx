'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { settingsNav } from './nav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full">
      {/* Desktop sidebar — hidden on mobile */}
      <nav className="hidden md:block w-48 border-r border-border p-4 space-y-0.5">
        <span className="text-[0.625rem] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium block px-3 mb-4">
          Settings
        </span>
        {settingsNav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 text-[0.8125rem] transition-colors",
              pathname === item.href
                ? "text-foreground font-medium border-l-2 border-foreground -ml-px"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="size-3.5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex-1 overflow-auto">
        <div className="p-5 md:p-6">{children}</div>
      </div>
    </div>
  )
}

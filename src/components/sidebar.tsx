'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { cn } from '@/lib/utils'
import {
  Home,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#6B7280', '#06B6D4']

export function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newColor, setNewColor] = useState('#3B82F6')
  const [newPrompt, setNewPrompt] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    function refresh() {
      const supabase = getSupabaseBrowser()
      supabase
        .from('projects')
        .select('id, name, color')
        .order('name')
        .then(({ data }) => setProjects(data || []))
    }

    refresh()
    window.addEventListener('sidebar-refresh', refresh)
    window.addEventListener('projects-changed', refresh)
    return () => {
      window.removeEventListener('sidebar-refresh', refresh)
      window.removeEventListener('projects-changed', refresh)
    }
  }, [])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), description: newDescription, color: newColor, system_prompt: newPrompt }),
    })
    setCreating(false)
    setShowCreate(false)
    setNewName(''); setNewDescription(''); setNewColor('#3B82F6'); setNewPrompt('')
    window.dispatchEvent(new Event('sidebar-refresh'))
  }

  return (
    <div className={cn(
      "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
      collapsed ? "w-14" : "w-48"
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4">
        {!collapsed && (
          <Link href="/dashboard" className="text-sm font-semibold tracking-widest uppercase">
            J.DRG
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                isActive
                  ? "text-foreground font-medium border-l-2 border-foreground -ml-px"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}

        {/* Experts */}
        {!collapsed && (
          <div className="pt-6">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-[0.625rem] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium">Experts</span>
              <button
                onClick={() => setShowCreate(true)}
                className="p-0.5 text-muted-foreground/40 hover:text-foreground transition-colors"
              >
                <Plus className="size-3" />
              </button>
            </div>
            <div className="space-y-0.5">
              {projects.map((project) => {
                const isActive = pathname === `/projects/${project.id}`
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-[0.8125rem] transition-colors",
                      isActive
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div
                      className="size-2 shrink-0"
                      style={{ backgroundColor: project.color || '#6B7280' }}
                    />
                    <span className="truncate">{project.name}</span>
                  </Link>
                )
              })}
              {projects.length === 0 && (
                <p className="px-3 py-1.5 text-[0.75rem] text-muted-foreground/30">No experts yet</p>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Sign out */}
      <div className="p-2">
        <button
          onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="size-4" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Create expert dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-background/80" onClick={() => setShowCreate(false)} />
          <div className="relative bg-background border border-border w-full max-w-md p-6 space-y-5 animate-in-up">
            <div className="flex items-center justify-between">
              <h2 className="text-[0.8125rem] font-medium uppercase tracking-[0.1em]">New Expert</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-muted-foreground/40 hover:text-foreground transition-colors">
                <X className="size-3.5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[0.625rem] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium">Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Expert name"
                  className="w-full bg-transparent border border-border px-3 py-2 text-[0.8125rem] outline-none placeholder:text-muted-foreground/30 focus:border-foreground/30 transition-colors"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[0.625rem] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium">Description</label>
                <input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief description"
                  className="w-full bg-transparent border border-border px-3 py-2 text-[0.8125rem] outline-none placeholder:text-muted-foreground/30 focus:border-foreground/30 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[0.625rem] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "size-7 border-2 transition-colors",
                        newColor === c ? 'border-foreground' : 'border-transparent'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[0.625rem] uppercase tracking-[0.15em] text-muted-foreground/50 font-medium">
                  System Prompt <span className="normal-case tracking-normal text-muted-foreground/30">(optional)</span>
                </label>
                <textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="Custom instructions for AI..."
                  className="w-full bg-transparent border border-border px-3 py-2 text-[0.8125rem] outline-none placeholder:text-muted-foreground/30 focus:border-foreground/30 transition-colors min-h-[80px] resize-none"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="w-full bg-foreground text-background py-2.5 text-[0.8125rem] font-medium disabled:opacity-30 transition-opacity"
              >
                {creating ? 'Creating...' : 'Create Expert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

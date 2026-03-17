import { AuthProvider } from '@/components/auth-provider'
import { Sidebar } from '@/components/sidebar'
import { MobileNav } from '@/components/mobile-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div
        className="flex overflow-hidden"
        style={{
          height: '100dvh',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        <main
          className="flex-1 overflow-auto min-h-0 md:!pb-0"
          style={{
            paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))',
          }}
        >
          {children}
        </main>
        <MobileNav />
      </div>
    </AuthProvider>
  )
}

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ensureStandardTemplates } from '@/lib/standard-templates'
import { DashboardProviders } from '@/components/layout/DashboardProviders'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { FloatingAction } from '@/components/layout/FloatingAction'
import { DemoModeBanner } from '@/components/dashboard/DemoModeBanner'
import { isDemoTestUserEmail } from '@/lib/is-demo-user'
import { ToastProvider } from '@/components/ui'

export const metadata: Metadata = {
  title: {
    template: '%s | Bärenwald CRM',
    default: 'Dashboard | Bärenwald CRM',
  },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    await ensureStandardTemplates()

    const showDemoBanner = isDemoTestUserEmail(user.email)

    return (
      <DashboardProviders>
        <div className="flex h-screen overflow-hidden bg-bw-bg">
          <Sidebar />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:ml-0">
            <TopBar user={user} />

            <main className="flex-1 overflow-y-auto px-4 pb-24 pt-2 md:px-6 md:pb-6 md:pt-4">
              {showDemoBanner ? <DemoModeBanner /> : null}
              {children}
            </main>
          </div>

          <BottomNav />
          <FloatingAction />
          <GlobalSearch />
          <ToastProvider />
        </div>
      </DashboardProviders>
    )
  } catch {
    redirect('/login')
  }
}

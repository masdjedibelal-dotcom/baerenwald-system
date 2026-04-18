import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { ensureStandardTemplates } from '@/lib/standard-templates'
import { DesktopSidebar } from '@/components/dashboard/DesktopSidebar'
import { MobileBottomNav } from '@/components/dashboard/MobileBottomNav'
import { DashboardProviders } from '@/components/layout/DashboardProviders'
import { DashboardTopBar } from '@/components/layout/DashboardTopBar'
import { DemoModeBanner } from '@/components/dashboard/DemoModeBanner'
import { isDemoTestUserEmail } from '@/lib/is-demo-user'

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
        <div className="min-h-dvh overflow-x-hidden bg-canvas text-ink">
          <DesktopSidebar user={user} />
          <div className="flex min-h-dvh flex-col md:ml-[220px]">
            <div className="flex min-h-0 flex-1 flex-col px-4 pb-28 pt-2 md:px-8 md:pb-8 md:pt-6">
              <DashboardTopBar />
              {showDemoBanner ? <DemoModeBanner /> : null}
              {children}
            </div>
            <MobileBottomNav />
          </div>
        </div>
      </DashboardProviders>
    )
  } catch {
    redirect('/login')
  }
}

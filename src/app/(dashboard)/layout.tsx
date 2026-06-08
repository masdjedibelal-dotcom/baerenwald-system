import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect'
import { createClient } from '@/lib/supabase-server'
import { ensureStandardTemplates } from '@/lib/standard-templates'
import { DashboardProviders } from '@/components/layout/DashboardProviders'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopBar } from '@/components/layout/TopBar'
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

    let datenschutzHintDismissed = false
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('datenschutz_hint_bestaetigt_am')
      .eq('id', user.id)
      .maybeSingle()
    if (!profileErr) {
      datenschutzHintDismissed = Boolean(
        (profile as { datenschutz_hint_bestaetigt_am?: string | null } | null)?.datenschutz_hint_bestaetigt_am
      )
    }

    return (
      <DashboardProviders datenschutzHintDismissed={datenschutzHintDismissed}>
        <div className="flex h-dvh max-h-dvh overflow-hidden bg-bw-bg">
          <Sidebar />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:ml-0">
            <TopBar user={user} />

            <main className="relative flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-app-grouped px-4 max-md:scroll-pb-mobile-nav max-md:pb-mobile-nav has-[[data-app-master-detail]]:min-[900px]:px-0 md:bg-bw-bg md:px-6 md:pb-6">
              {showDemoBanner ? <DemoModeBanner /> : null}
              <div className="pt-2 md:pt-4 has-[[data-list-filter-sticky]]:pt-0">
                {children}
              </div>
            </main>
          </div>

          <BottomNav />
          <FloatingAction />
          <ToastProvider />
        </div>
      </DashboardProviders>
    )
  } catch (e) {
    if (isRedirectError(e)) throw e
    redirect('/login')
  }
}

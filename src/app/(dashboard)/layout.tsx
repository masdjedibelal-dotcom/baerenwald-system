import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureUnifiedTeamAccount } from '@/lib/auth/unified-team-account'
import { ensureStandardTemplatesCached } from '@/lib/standard-templates'
import { isDevAuthSkipEnabled } from '@/lib/dev-auth'
import { DashboardProviders } from '@/components/layout/DashboardProviders'
import { DashboardShell } from '@/components/layout/DashboardShell'
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
      if (isDevAuthSkipEnabled()) {
        const path = headers().get('x-pathname') || '/'
        redirect(`/api/dev/auto-login?next=${encodeURIComponent(path)}`)
      }
      redirect('/login')
    }

    let { data: crmProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!crmProfile) {
      const meta = (user.user_metadata ?? {}) as { name?: string; role?: string }
      const rolle = meta.role === 'admin' ? 'admin' : meta.role === 'manager' ? 'manager' : null
      if (rolle && user.email) {
        await ensureUnifiedTeamAccount(supabaseAdmin, {
          authUserId: user.id,
          email: user.email,
          name: meta.name?.trim() || user.email.split('@')[0] || 'Team',
          rolle,
        })
        const refetch = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()
        crmProfile = refetch.data
      }
    }

    if (!crmProfile) {
      redirect('/login?error=portal_only')
    }

    await ensureStandardTemplatesCached()

    const showDemoBanner = isDemoTestUserEmail(user.email)

    return (
      <DashboardProviders>
        <DashboardShell user={user} showDemoBanner={showDemoBanner}>
          {children}
        </DashboardShell>
      </DashboardProviders>
    )
  } catch (e) {
    if (isRedirectError(e)) throw e
    redirect('/login')
  }
}

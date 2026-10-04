import { logDbError } from '@/lib/errors/log-db-error'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ensureUnifiedTeamAccount } from '@/lib/auth/unified-team-account'
import { isDevAuthSkipEnabled } from '@/lib/dev-auth'
import { DashboardProviders } from '@/components/layout/DashboardProviders'
import { DashboardShell } from '@/components/layout/DashboardShell'

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
    let {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    // Kurzes Anmelde-Limit (429) ist keine abgelaufene Sitzung — einmal nachfassen statt ausloggen.
    if (!user && authError?.status === 429) {
      await new Promise((r) => setTimeout(r, 900))
      const retry = await supabase.auth.getUser()
      user = retry.data.user
      authError = retry.error
      if (!user && authError?.status === 429) {
        return (
          <div className="p-6 text-[length:var(--fs-text)]">
            Gerade sehr viele Anfragen. Bitte laden Sie die Seite in ein paar Sekunden neu.
          </div>
        )
      }
    }

    if (!user) {
      if (isDevAuthSkipEnabled()) {
        const path = headers().get('x-pathname') || '/'
        redirect(`/api/dev/auto-login?next=${encodeURIComponent(path)}`)
      }
      redirect('/login')
    }

    let {data: crmProfile, error} = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    if (error) logDbError('app/layout:user_profiles', error)

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

    return (
      <DashboardProviders>
        <DashboardShell user={user}>
          {children}
        </DashboardShell>
      </DashboardProviders>
    )
  } catch (e) {
    if (isRedirectError(e)) throw e
    redirect('/login')
  }
}

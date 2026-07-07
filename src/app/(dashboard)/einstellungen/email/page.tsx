import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmailTemplatesClient } from '@/components/einstellungen/EmailTemplatesClient'
import { loadEmailTemplates } from '@/app/(dashboard)/einstellungen/email/actions'
import { createClient } from '@/lib/supabase-server'
import { loadEmailPreviewVars } from '@/lib/email-template-preview-vars'

export const metadata: Metadata = {
  title: 'E-Mail Templates',
}

export default async function EinstellungenEmailPage() {
  const supabase = createClient()
  const [templates, previewVars] = await Promise.all([
    loadEmailTemplates(),
    loadEmailPreviewVars(supabase),
  ])
  return (
    <div>
      <PageHeader description="Automatische System-E-Mails und CRM-Textbausteine." />
      <p className="mb-4 text-sm text-bw-text-muted">
        <Link href="/einstellungen/kommunikation" className="text-bw-link hover:underline">
          Textbausteine für manuelle E-Mails bearbeiten →
        </Link>
      </p>
      <EmailTemplatesClient templates={templates} previewVars={previewVars} />
    </div>
  )
}

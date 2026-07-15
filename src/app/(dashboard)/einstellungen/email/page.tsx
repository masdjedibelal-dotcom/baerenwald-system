import type { Metadata } from 'next'
import Link from 'next/link'
import { EmailTemplatesClient } from '@/components/einstellungen/EmailTemplatesClient'
import { EinstellungenMeta } from '@/components/einstellungen/EinstellungenUi'
import { EinstellungenBenachrichtigungenCard } from '@/components/einstellungen/EinstellungenMockToggles'
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
      <EinstellungenMeta className="mb-4">Automatische System-E-Mails und CRM-Textbausteine.</EinstellungenMeta>
      <div className="mb-6">
        <EinstellungenBenachrichtigungenCard />
      </div>
      <p className="mb-4 text-sm text-bw-text-muted">
        <Link href="/einstellungen/kommunikation" className="text-bw-link hover:underline">
          Textbausteine für manuelle E-Mails bearbeiten →
        </Link>
      </p>
      <EmailTemplatesClient templates={templates} previewVars={previewVars} />
    </div>
  )
}

import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmailTemplatesClient } from '@/components/einstellungen/EmailTemplatesClient'
import { loadEmailTemplates } from '@/app/(dashboard)/einstellungen/email/actions'

export const metadata: Metadata = {
  title: 'E-Mail Templates',
}

export default async function EinstellungenEmailPage() {
  const templates = await loadEmailTemplates()
  return (
    <div>
      <PageHeader
        title="E-Mail Templates"
        breadcrumbs={[
          { label: 'Einstellungen', href: '/einstellungen/firma' },
          { label: 'E-Mail Templates' },
        ]}
        description="Texte für automatische E-Mails anpassen."
      />
      <EmailTemplatesClient templates={templates} />
    </div>
  )
}

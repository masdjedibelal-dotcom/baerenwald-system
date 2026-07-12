import { PageHeader } from '@/components/layout/PageHeader'
import { KommunikationVorlagenClient } from '@/components/kommunikation/KommunikationVorlagenClient'
import type { KommunikationMailVorlage } from '@/app/(dashboard)/kommunikation/actions'
import { supabaseAdmin } from '@/lib/supabase-admin'

export default async function KommunikationVorlagenPage() {
  const { data } = await supabaseAdmin
    .from('kommunikation_mail_vorlagen')
    .select('id, name, kontext_typ, betreff, body_text, sort_order')
    .order('kontext_typ')
    .order('sort_order')
    .order('name')

  return (
    <div>
      <PageHeader description="Textbausteine für „E-Mail schreiben“ in Anfragen, Angeboten, Aufträgen und Rechnungen." />
      <KommunikationVorlagenClient initial={(data ?? []) as KommunikationMailVorlage[]} />
    </div>
  )
}

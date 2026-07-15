import { KommunikationVorlagenClient } from '@/components/kommunikation/KommunikationVorlagenClient'
import { EinstellungenMeta } from '@/components/einstellungen/EinstellungenUi'
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
      <EinstellungenMeta className="mb-4">Textbausteine für „E-Mail schreiben“ in Anfragen, Angeboten, Aufträgen und Rechnungen.</EinstellungenMeta>
      <KommunikationVorlagenClient initial={(data ?? []) as KommunikationMailVorlage[]} />
    </div>
  )
}

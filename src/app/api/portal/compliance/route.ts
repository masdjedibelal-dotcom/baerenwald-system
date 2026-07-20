import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { loadComplianceTypen } from '@/app/(dashboard)/einstellungen/compliance/actions'
import { loadGewerkeAusfuehrung } from '@/lib/gewerke-ausfuehrung'
import {
  buildPortalComplianceAuftrag,
  buildPortalComplianceStamm,
} from '@/lib/handwerker/compliance-portal-payload'
import { gewerkSlugsAusPositionen } from '@/lib/handwerker/compliance-partner-profile'
import { projektvertragErfuellt } from '@/lib/handwerker/compliance-vertrag-status'
import { loadRahmenVertragForHandwerker } from '@/app/(dashboard)/vertraege/wizard-actions'
import type { PartnerDokument } from '@/lib/types'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'

export const dynamic = 'force-dynamic'

async function portalHandwerkerId(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('handwerker')
    .select('id, name, gewerke')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return data as { id: string; name: string; gewerke: string[] | null } | null
}

/** GET: Compliance-Übersicht für Partner-Portal (Stamm + offene Aufträge) */
export async function GET() {
  const supabase = createClient()
  const hw = await portalHandwerkerId(supabase)
  if (!hw) {
    return NextResponse.json({ error: 'Nicht angemeldet oder kein Partner-Konto.' }, { status: 401 })
  }

  const [typen, gewerke, rahmenVertrag, docsRes, auftraegeRes, vertraegeRes] = await Promise.all([
    loadComplianceTypen(),
    loadGewerkeAusfuehrung(supabase),
    loadRahmenVertragForHandwerker(hw.id),
    supabase
      .from('partner_dokumente')
      .select('*')
      .eq('handwerker_id', hw.id)
      .order('hochgeladen_am', { ascending: false }),
    supabase
      .from('auftrag_handwerker')
      .select('auftrag_id, projektvertrag_bestaetigt_am, compliance_pflicht_slugs, auftraege(id, titel, status, ist_bauprojekt)')
      .eq('handwerker_id', hw.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('handwerker_vertraege')
      .select('*')
      .eq('handwerker_id', hw.id)
      .eq('typ', 'projekt'),
  ])

  const dokumente = (docsRes.data ?? []) as PartnerDokument[]
  const vertraege = (vertraegeRes.data ?? []) as HandwerkerVertragRow[]

  const stamm = buildPortalComplianceStamm({
    typen,
    dokumente,
    handwerkerGewerke: hw.gewerke,
    alleGewerke: gewerke,
    rahmenVertrag,
  })

  const auftragRows = auftraegeRes.data ?? []
  const auftragIds = auftragRows.map((r) => r.auftrag_id as string).filter(Boolean)

  let positionenByAuftrag = new Map<string, string[]>()
  if (auftragIds.length) {
    const { data: posData } = await supabase
      .from('auftrag_positionen')
      .select('auftrag_id, gewerk_slug')
      .in('auftrag_id', auftragIds)
    for (const row of posData ?? []) {
      const aid = row.auftrag_id as string
      const slug = (row.gewerk_slug as string | null)?.trim()
      if (!slug) continue
      const list = positionenByAuftrag.get(aid) ?? []
      if (!list.includes(slug)) list.push(slug)
      positionenByAuftrag.set(aid, list)
    }
  }

  const auftraege = auftragRows
    .map((row) => {
      const raw = row.auftraege as
        | { id: string; titel: string; status: string; ist_bauprojekt?: boolean | null }
        | { id: string; titel: string; status: string; ist_bauprojekt?: boolean | null }[]
        | null
      const auftrag = Array.isArray(raw) ? raw[0] : raw
      if (!auftrag?.id) return null
      if (auftrag.status === 'storniert') return null
      const projektGewerkSlugs =
        positionenByAuftrag.get(auftrag.id) ??
        gewerkSlugsAusPositionen(
          (positionenByAuftrag.get(auftrag.id) ?? []).map((slug) => ({ gewerk_slug: slug }))
        )

      return buildPortalComplianceAuftrag({
        auftragId: auftrag.id,
        titel: auftrag.titel,
        projektGewerkSlugs,
        typen,
        dokumente,
        handwerkerId: hw.id,
        handwerkerGewerke: hw.gewerke,
        alleGewerke: gewerke,
        projektvertragOk: projektvertragErfuellt(
          vertraege,
          auftrag.id,
          hw.id,
          row.projektvertrag_bestaetigt_am as string | null,
          { istBauprojekt: auftrag.ist_bauprojekt ?? null }
        ),
        compliancePflichtSlugs: (row.compliance_pflicht_slugs as string[] | null) ?? null,
        istBauprojekt: auftrag.ist_bauprojekt ?? null,
      })
    })
    .filter(Boolean)

  const fehlendStamm = [...stamm.allgemein, ...stamm.meister].filter(
    (z) => z.pflicht && (z.status === 'fehlend' || z.status === 'abgelaufen')
  ).length

  const fehlendLeistung = auftraege.reduce(
    (sum, a) => sum + a!.leistung.filter((z) => z.pflicht && z.status === 'fehlend').length,
    0
  )

  return NextResponse.json({
    partner_name: hw.name,
    stamm,
    auftraege,
    zusammenfassung: {
      fehlend_stamm: fehlendStamm,
      fehlend_leistung: fehlendLeistung,
      ablauf_warnung: [...stamm.allgemein, ...stamm.meister].some((z) => z.status === 'warnung'),
    },
  })
}

import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  fotosAusMelderFunnel,
  istMelderKanal,
  leadHatMelderPersonenbezogeneDaten,
} from '@/lib/datenschutz/melder-leads'
import { deleteStorageObjectsFromUrls } from '@/lib/datenschutz/storage'

const BLOCKED = new Set([
  'eingangsrechnungen',
  'rechnungen_ausgehend',
  'dokumente_compliance',
  'abnahmeprotokolle',
])

export function isLoeschungGesperrt(kategorie: string): boolean {
  return BLOCKED.has(kategorie)
}

export async function insertLoeschlog(input: {
  typ: string
  referenz_id: string | null
  referenz_typ: string | null
  grund: string
  geloescht_von: string | null
}) {
  await supabaseAdmin.from('datenschutz_loeschlog').insert({
    typ: input.typ,
    referenz_id: input.referenz_id,
    referenz_typ: input.referenz_typ,
    grund: input.grund,
    geloescht_von: input.geloescht_von,
  })
}

function kundenAnonName(kundeId: string, jahr: number): string {
  const nr = kundeId.replace(/-/g, '').slice(0, 6).toUpperCase()
  return `Kunde-${jahr}-${nr}`
}

export async function hatKundeSteuerlicheAnhaenge(kundeId: string): Promise<{ block: boolean; detail?: string }> {
  const { count: rCount } = await supabaseAdmin
    .from('rechnungen')
    .select('id', { count: 'exact', head: true })
    .eq('kunde_id', kundeId)
  if ((rCount ?? 0) > 0) {
    return { block: true, detail: 'Ausgehende Rechnungen (10 Jahre Aufbewahrung)' }
  }

  const { data: auf } = await supabaseAdmin.from('auftraege').select('id').eq('kunde_id', kundeId)
  const aufIds = (auf ?? []).map((a) => String((a as { id: string }).id))
  if (aufIds.length) {
    const { count: eCount } = await supabaseAdmin
      .from('eingangsrechnungen')
      .select('id', { count: 'exact', head: true })
      .in('auftrag_id', aufIds)
    if ((eCount ?? 0) > 0) {
      return { block: true, detail: 'Eingangsrechnungen / Belege vorhanden' }
    }
  }

  return { block: false }
}

export async function anonymisiereKunde(kundeId: string, userId: string | null, grund: string) {
  const { count: aufCount } = await supabaseAdmin
    .from('auftraege')
    .select('id', { count: 'exact', head: true })
    .eq('kunde_id', kundeId)
  if ((aufCount ?? 0) > 0) {
    return {
      ok: false as const,
      message:
        'Anonymisierung des Kundenstamms nicht möglich: Es existieren noch Aufträge zu dieser Kundin. Bitte zuerst Aufträge abschließen bzw. Daten bereinigen.',
    }
  }

  const steuer = await hatKundeSteuerlicheAnhaenge(kundeId)
  if (steuer.block) {
    return {
      ok: false as const,
      message: `Gesetzliche Aufbewahrungspflicht — Anonymisierung derzeit nicht möglich (${steuer.detail ?? 'steuerrelevante Daten'}).`,
    }
  }

  const { data: kunde } = await supabaseAdmin.from('kunden').select('created_at').eq('id', kundeId).maybeSingle()
  const created = (kunde as { created_at?: string } | null)?.created_at
  const jahr = created ? new Date(created).getFullYear() : new Date().getFullYear()

  const { error } = await supabaseAdmin
    .from('kunden')
    .update({
      name: kundenAnonName(kundeId, jahr),
      email: null,
      telefon: null,
      adresse: null,
      ort: null,
      notizen: null,
    })
    .eq('id', kundeId)
  if (error) return { ok: false as const, message: error.message }

  await insertLoeschlog({
    typ: 'kunde',
    referenz_id: kundeId,
    referenz_typ: 'kunden',
    grund,
    geloescht_von: userId,
  })
  return { ok: true as const }
}

async function leadHatVerknuepftenAuftrag(leadId: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from('angebote')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .not('auftrag_id', 'is', null)
  return (count ?? 0) > 0
}

async function loadMelderLead(leadId: string) {
  const { data } = await supabaseAdmin
    .from('leads')
    .select(
      'id, kanal, melder_name, melder_email, melder_telefon, melder_einheit, funnel_daten, kontakt_name, kontakt_email'
    )
    .eq('id', leadId)
    .maybeSingle()
  return data as {
    id: string
    kanal: string
    melder_name?: string | null
    melder_email?: string | null
    melder_telefon?: string | null
    melder_einheit?: string | null
    funnel_daten?: unknown
    kontakt_name?: string | null
    kontakt_email?: string | null
  } | null
}

function funnelOhneFotos(funnelDaten: unknown): Record<string, unknown> | null {
  if (!funnelDaten || typeof funnelDaten !== 'object' || Array.isArray(funnelDaten)) return null
  const next = { ...(funnelDaten as Record<string, unknown>) }
  delete next.fotos
  return Object.keys(next).length ? next : null
}

async function anonymisiereMelderLeadFelder(
  leadId: string,
  opts: { fotosOnly?: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const lead = await loadMelderLead(leadId)
  if (!lead) return { ok: false, message: 'Lead nicht gefunden' }
  if (!istMelderKanal(lead.kanal)) {
    return { ok: false, message: 'Kein Melder-Lead (Kanal nicht hv_melder_link / hv_einladung).' }
  }

  if (opts.fotosOnly) {
    const urls = fotosAusMelderFunnel(lead.funnel_daten)
    if (!urls.length) return { ok: false, message: 'Keine Melder-Fotos vorhanden.' }
    await deleteStorageObjectsFromUrls(urls)
    const { error } = await supabaseAdmin
      .from('leads')
      .update({ funnel_daten: funnelOhneFotos(lead.funnel_daten) })
      .eq('id', leadId)
    if (error) return { ok: false, message: error.message }
    return { ok: true }
  }

  if (await leadHatVerknuepftenAuftrag(leadId)) {
    return {
      ok: false,
      message: 'Lead hat einen verknüpften Auftrag — Melderdaten werden nicht gelöscht.',
    }
  }

  const urls = fotosAusMelderFunnel(lead.funnel_daten)
  if (urls.length) await deleteStorageObjectsFromUrls(urls)

  const { error } = await supabaseAdmin
    .from('leads')
    .update({
      melder_name: null,
      melder_email: null,
      melder_telefon: null,
      melder_einheit: null,
      kontakt_name: 'Anonymisiert',
      kontakt_email: null,
      kontakt_telefon: null,
      kontakt_nachricht: null,
      notizen: null,
      funnel_daten: null,
      plz: null,
      strasse: null,
      hausnummer: null,
      ort: null,
    })
    .eq('id', leadId)
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

async function clearFotosForAuftrag(auftragId: string): Promise<{ urls: string[]; cleared: number }> {
  const urls: string[] = []

  const { data: fe } = await supabaseAdmin.from('formular_eintraege').select('id, foto_urls').eq('auftrag_id', auftragId)
  for (const row of fe ?? []) {
    const arr = (row as { foto_urls: string[] | null }).foto_urls
    if (Array.isArray(arr)) urls.push(...arr.filter(Boolean))
    await supabaseAdmin.from('formular_eintraege').update({ foto_urls: [] }).eq('id', (row as { id: string }).id)
  }

  const { data: pl } = await supabaseAdmin.from('punch_list').select('id, foto_urls, foto_nachher_urls').eq('auftrag_id', auftragId)
  for (const row of pl ?? []) {
    const a = (row as { foto_urls: string[] | null }).foto_urls
    const b = (row as { foto_nachher_urls: string[] | null }).foto_nachher_urls
    if (Array.isArray(a)) urls.push(...a.filter(Boolean))
    if (Array.isArray(b)) urls.push(...b.filter(Boolean))
    await supabaseAdmin
      .from('punch_list')
      .update({ foto_urls: [], foto_nachher_urls: [] })
      .eq('id', (row as { id: string }).id)
  }

  const { data: vb } = await supabaseAdmin.from('vor_baubeginn_protokolle').select('id, foto_urls').eq('auftrag_id', auftragId)
  for (const row of vb ?? []) {
    const a = (row as { foto_urls: string[] | null }).foto_urls
    if (Array.isArray(a)) urls.push(...a.filter(Boolean))
    await supabaseAdmin.from('vor_baubeginn_protokolle').update({ foto_urls: [] }).eq('id', (row as { id: string }).id)
  }

  const { data: ns } = await supabaseAdmin.from('nachtraege').select('id, foto_urls').eq('auftrag_id', auftragId)
  for (const row of ns ?? []) {
    const fu = (row as { foto_urls?: string[] | null }).foto_urls
    if (Array.isArray(fu)) urls.push(...fu.filter(Boolean))
    if (fu !== undefined) {
      await supabaseAdmin.from('nachtraege').update({ foto_urls: [] }).eq('id', (row as { id: string }).id)
    }
  }

  const uniq = Array.from(new Set(urls))
  await deleteStorageObjectsFromUrls(uniq)
  return { urls: uniq, cleared: uniq.length }
}

export async function executeDatenschutzLoeschung(input: {
  kategorie: string
  referenz_id: string
  grund: string
  userId: string | null
}): Promise<{ ok: true } | { ok: false; message: string; code?: number }> {
  const { kategorie, referenz_id, grund, userId } = input

  if (isLoeschungGesperrt(kategorie)) {
    return {
      ok: false,
      code: 400,
      message:
        'Gesetzliche Aufbewahrungspflicht — Löschung hier nicht möglich. Bitte nur nach Ablauf der Frist oder durch steuerliche Freigabe.',
    }
  }

  if (kategorie === 'fotos_auftraege') {
    await clearFotosForAuftrag(referenz_id)
    await insertLoeschlog({
      typ: 'foto',
      referenz_id,
      referenz_typ: 'auftrag',
      grund,
      geloescht_von: userId,
    })
    return { ok: true }
  }

  if (kategorie === 'fotos_formulare') {
    const { data: row } = await supabaseAdmin.from('formular_eintraege').select('id, foto_urls').eq('id', referenz_id).maybeSingle()
    if (!row) return { ok: false, message: 'Eintrag nicht gefunden' }
    const arr = (row as { foto_urls: string[] | null }).foto_urls
    const urls = Array.isArray(arr) ? arr.filter(Boolean) : []
    await deleteStorageObjectsFromUrls(urls)
    await supabaseAdmin.from('formular_eintraege').update({ foto_urls: [] }).eq('id', referenz_id)
    await insertLoeschlog({
      typ: 'foto',
      referenz_id,
      referenz_typ: 'formular_eintrag',
      grund,
      geloescht_von: userId,
    })
    return { ok: true }
  }

  if (kategorie === 'melder_fotos') {
    const r = await anonymisiereMelderLeadFelder(referenz_id, { fotosOnly: true })
    if (!r.ok) return r
    await insertLoeschlog({
      typ: 'melder_foto',
      referenz_id,
      referenz_typ: 'leads',
      grund,
      geloescht_von: userId,
    })
    return { ok: true }
  }

  if (kategorie === 'melder_leads_offen' || kategorie === 'melder_leads_abgeschlossen') {
    const lead = await loadMelderLead(referenz_id)
    if (!lead) return { ok: false, message: 'Lead nicht gefunden' }
    if (!leadHatMelderPersonenbezogeneDaten(lead)) {
      return { ok: false, message: 'Melderdaten bereits anonymisiert.' }
    }
    const r = await anonymisiereMelderLeadFelder(referenz_id, { fotosOnly: false })
    if (!r.ok) return r
    await insertLoeschlog({
      typ: 'melder_lead',
      referenz_id,
      referenz_typ: 'leads',
      grund,
      geloescht_von: userId,
    })
    return { ok: true }
  }

  if (kategorie === 'leads_abgebrochen' || kategorie === 'leads_abgeschlossen') {
    const { data: lead } = await supabaseAdmin.from('leads').select('id, kunde_id').eq('id', referenz_id).maybeSingle()
    if (!lead) return { ok: false, message: 'Lead nicht gefunden' }
    const kid = (lead as { kunde_id: string | null }).kunde_id

    await supabaseAdmin
      .from('leads')
      .update({
        kontakt_name: 'Anonymisiert',
        kontakt_email: null,
        kontakt_telefon: null,
        kontakt_nachricht: null,
        situation: null,
        bereiche: null,
        funnel_daten: null,
        notizen: null,
        plz: null,
        zeitraum: null,
      })
      .eq('id', referenz_id)

    await insertLoeschlog({
      typ: 'lead',
      referenz_id,
      referenz_typ: 'leads',
      grund,
      geloescht_von: userId,
    })

    if (kid) {
      const { count: otherLeads } = await supabaseAdmin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('kunde_id', kid)
        .neq('id', referenz_id)
      if ((otherLeads ?? 0) === 0) {
        const { count: aufCount } = await supabaseAdmin
          .from('auftraege')
          .select('id', { count: 'exact', head: true })
          .eq('kunde_id', kid)
        if ((aufCount ?? 0) === 0) {
          const anon = await anonymisiereKunde(kid, userId, `${grund} (Kunde ohne weitere Leads/Aufträge)`)
          if (!anon.ok) {
            /* Kunde bleibt bei Rechnungen — nur Lead bereinigt */
          }
        }
      }
    }

    return { ok: true }
  }

  if (kategorie === 'kunden_daten') {
    return anonymisiereKunde(referenz_id, userId, grund)
  }

  return { ok: false, message: 'Kategorie wird noch nicht unterstützt' }
}

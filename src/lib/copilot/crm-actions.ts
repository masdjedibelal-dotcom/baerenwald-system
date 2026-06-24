import 'server-only'

import { randomUUID } from 'crypto'

import { sendAngebotToKunde } from '@/app/(dashboard)/angebote/actions'
import { summenAusPositionen, normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { nextAngebotsnummerJahr } from '@/lib/angebot-utils'
import { defaultAngebotZahlungsbedingungen } from '@/lib/angebote/angebot-wizard-types'
import { resolveAngebotKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { copilotAlertAlreadySent, recordCopilotAlert } from '@/lib/copilot/alerts'
import { sendTelegram } from '@/lib/copilot/telegram'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { AngebotPosition, LeadStatus } from '@/lib/types'

function escapeIlike(q: string): string {
  return q.replace(/[%_\\]/g, '\\$&')
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

function kundeSuchbegriffe(raw: string): string[] {
  const t = raw.trim()
  if (!t) return []
  const ausSlug = t.replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
  const teile = ausSlug.split(' ').filter(Boolean)
  const varianten = new Set<string>([t, ausSlug])
  if (teile.length === 2) {
    varianten.add(`${teile[1]} ${teile[0]}`)
  }
  return Array.from(varianten).filter((v) => v.length >= 2)
}

export async function resolveKundeId(input: {
  kunde_id?: string
  suche?: string
}): Promise<{ id: string; name: string | null } | { error: string; treffer?: CrmSearchHit[] }> {
  const raw = (input.kunde_id ?? input.suche ?? '').trim()
  if (!raw) return { error: 'kunde_id oder suche erforderlich' }

  if (isUuid(raw)) {
    const { data } = await supabaseAdmin.from('kunden').select('id, name').eq('id', raw).maybeSingle()
    if (data) return { id: data.id, name: data.name }
    return { error: 'Kunde nicht gefunden' }
  }

  const byNr = await supabaseAdmin
    .from('kunden')
    .select('id, name')
    .ilike('kundennummer', raw)
    .limit(2)
  if (byNr.data?.length === 1) {
    return { id: byNr.data[0].id, name: byNr.data[0].name }
  }
  if ((byNr.data?.length ?? 0) > 1) {
    return {
      error: 'Mehrere Kunden mit dieser Nummer — bitte genauer angeben',
      treffer: byNr.data!.map((r) => ({
        typ: 'kunde' as const,
        id: r.id,
        titel: r.name ?? 'Kunde',
      })),
    }
  }

  let lastHits: CrmSearchHit[] = []
  for (const q of kundeSuchbegriffe(raw)) {
    const hits = await searchCrm(q, ['kunde'])
    lastHits = hits
    if (hits.length === 1) {
      return { id: hits[0].id, name: hits[0].titel }
    }
    if (hits.length > 1) {
      return {
        error: `Mehrere Kunden für „${raw}" — bitte Name oder Kundennummer genauer nennen`,
        treffer: hits,
      }
    }
  }

  if (lastHits.length > 1) {
    return { error: `Mehrere Kunden für „${raw}"`, treffer: lastHits }
  }

  return {
    error: `Kein Kunde gefunden für „${raw}". Zuerst search_crm nutzen, dann die echte UUID verwenden.`,
  }
}

// ── Termine ──

export async function getTermine(von: string, bis: string) {
  const vonDate = von.trim().slice(0, 10)
  const bisDate = bis.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(vonDate) || !/^\d{4}-\d{2}-\d{2}$/.test(bisDate)) {
    throw new Error('von und bis müssen ISO-Datum yyyy-mm-dd sein')
  }
  const { data, error } = await supabaseAdmin
    .from('kalender_termine')
    .select(
      `
      id, titel, datum, uhrzeit_von, uhrzeit_bis, typ,
      adresse, beschreibung, erledigt,
      leads(kontakt_name, plz),
      kunden(name)
    `
    )
    .gte('datum', vonDate)
    .lte('datum', bisDate)
    .order('datum', { ascending: true })
    .order('uhrzeit_von', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

// ── Suche ──

export type CrmSearchHit = {
  typ: 'lead' | 'kunde' | 'angebot' | 'termin' | 'rechnung'
  id: string
  titel: string
  untertitel?: string | null
  status?: string | null
}

export async function searchCrm(query: string, types?: string[]): Promise<CrmSearchHit[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const pattern = `%${escapeIlike(q)}%`
  const allowed = new Set(
    (types?.length ? types : ['lead', 'kunde', 'angebot', 'termin', 'rechnung']).map((t) =>
      t.toLowerCase()
    )
  )
  const hits: CrmSearchHit[] = []

  const tasks: Promise<void>[] = []

  if (allowed.has('lead')) {
    tasks.push(
      (async () => {
        const { data } = await supabaseAdmin
          .from('leads')
          .select('id, kontakt_name, kontakt_email, status, plz')
          .or(
            `kontakt_name.ilike.${pattern},kontakt_email.ilike.${pattern},kontakt_telefon.ilike.${pattern}`
          )
          .order('created_at', { ascending: false })
          .limit(8)
        for (const row of data ?? []) {
          hits.push({
            typ: 'lead',
            id: row.id,
            titel: row.kontakt_name ?? 'Anfrage',
            untertitel: [row.kontakt_email, row.plz].filter(Boolean).join(' · ') || null,
            status: row.status,
          })
        }
      })()
    )
  }

  if (allowed.has('kunde')) {
    tasks.push(
      (async () => {
        const { data } = await supabaseAdmin
          .from('kunden')
          .select('id, name, email, telefon, plz, kundennummer')
          .or(
            `name.ilike.${pattern},email.ilike.${pattern},telefon.ilike.${pattern},kundennummer.ilike.${pattern}`
          )
          .order('created_at', { ascending: false })
          .limit(8)
        for (const row of data ?? []) {
          hits.push({
            typ: 'kunde',
            id: row.id,
            titel: row.name ?? 'Kunde',
            untertitel: [row.email, row.telefon].filter(Boolean).join(' · ') || null,
          })
        }
      })()
    )
  }

  if (allowed.has('angebot')) {
    tasks.push(
      (async () => {
        const { data } = await supabaseAdmin
          .from('angebote')
          .select(
            `
            id, angebotsnr, leistungsumfang, status_einfach, gesamt_fix,
            leads(kontakt_name, kunden!kunde_id(name))
          `
          )
          .or(`angebotsnr.ilike.${pattern},leistungsumfang.ilike.${pattern}`)
          .order('created_at', { ascending: false })
          .limit(8)
        for (const row of data ?? []) {
          const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads
          const kundeRaw = lead?.kunden as { name?: string } | { name?: string }[] | null | undefined
          const kundeName = Array.isArray(kundeRaw) ? kundeRaw[0]?.name : kundeRaw?.name
          hits.push({
            typ: 'angebot',
            id: row.id,
            titel: row.angebotsnr ? `Angebot ${row.angebotsnr}` : 'Angebot',
            untertitel: kundeName ?? lead?.kontakt_name ?? row.leistungsumfang,
            status: row.status_einfach,
          })
        }
      })()
    )
  }

  if (allowed.has('termin')) {
    tasks.push(
      (async () => {
        const { data } = await supabaseAdmin
          .from('kalender_termine')
          .select('id, titel, datum, uhrzeit_von, adresse')
          .or(`titel.ilike.${pattern},adresse.ilike.${pattern},beschreibung.ilike.${pattern}`)
          .order('datum', { ascending: false })
          .limit(8)
        for (const row of data ?? []) {
          hits.push({
            typ: 'termin',
            id: row.id,
            titel: row.titel ?? 'Termin',
            untertitel: [row.datum, row.uhrzeit_von?.slice(0, 5), row.adresse]
              .filter(Boolean)
              .join(' · '),
          })
        }
      })()
    )
  }

  if (allowed.has('rechnung')) {
    tasks.push(
      (async () => {
        const { data } = await supabaseAdmin
          .from('rechnungen')
          .select('id, rechnungsnummer, brutto, status, kunden(name)')
          .ilike('rechnungsnummer', pattern)
          .order('created_at', { ascending: false })
          .limit(8)
        for (const row of data ?? []) {
          const kunde = Array.isArray(row.kunden) ? row.kunden[0] : row.kunden
          hits.push({
            typ: 'rechnung',
            id: row.id,
            titel: row.rechnungsnummer ? `Rechnung ${row.rechnungsnummer}` : 'Rechnung',
            untertitel: kunde?.name ?? null,
            status: row.status,
          })
        }
      })()
    )
  }

  await Promise.all(tasks)
  return hits.slice(0, 20)
}

// ── Entity-Detail ──

export async function getEntity(typ: string, id: string): Promise<unknown> {
  const t = typ.toLowerCase()
  switch (t) {
    case 'lead': {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select(
          `
          id, kontakt_name, kontakt_email, kontakt_telefon, kontakt_nachricht,
          status, situation, bereiche, plz, preis_min, preis_max, created_at,
          kunde_id, kunden!kunde_id(name, email, telefon)
        `
        )
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data ?? { error: 'Lead nicht gefunden' }
    }
    case 'kunde': {
      let kundeId = id
      if (!isUuid(id)) {
        const resolved = await resolveKundeId({ kunde_id: id })
        if ('error' in resolved) return resolved
        kundeId = resolved.id
      }
      const { data, error } = await supabaseAdmin
        .from('kunden')
        .select('id, name, email, telefon, typ, plz, ort, adresse, notizen, kundennummer, created_at')
        .eq('id', kundeId)
        .maybeSingle()
      if (error) throw error
      return data ?? { error: 'Kunde nicht gefunden' }
    }
    case 'angebot': {
      const { data, error } = await supabaseAdmin
        .from('angebote')
        .select(
          `
          id, angebotsnr, status, status_einfach, leistungsumfang,
          gesamt_fix, gesamt_min, gesamt_max, gueltig_bis, gesendet_kunde_at,
          lead_id, kunde_id,
          leads(kontakt_name, kontakt_email),
          kunden(name, email)
        `
        )
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data ?? { error: 'Angebot nicht gefunden' }
    }
    case 'termin': {
      const { data, error } = await supabaseAdmin
        .from('kalender_termine')
        .select(
          `
          id, titel, datum, uhrzeit_von, uhrzeit_bis, typ, adresse, beschreibung, erledigt,
          lead_id, kunde_id,
          leads(kontakt_name),
          kunden(name)
        `
        )
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data ?? { error: 'Termin nicht gefunden' }
    }
    case 'rechnung': {
      const { data, error } = await supabaseAdmin
        .from('rechnungen')
        .select(
          `
          id, rechnungsnummer, brutto, netto, status, faellig_am, rechnungsdatum,
          kunden(name, email)
        `
        )
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data ?? { error: 'Rechnung nicht gefunden' }
    }
    default:
      return { error: `Unbekannter Typ: ${typ}. Erlaubt: lead, kunde, angebot, termin, rechnung` }
  }
}

// ── Kunde anlegen ──

export async function createKundeCopilot(input: {
  name: string
  email?: string
  telefon?: string
  typ?: string
  plz?: string
  ort?: string
}) {
  const name = input.name.trim()
  if (!name) throw new Error('name ist erforderlich')
  const { data, error } = await supabaseAdmin
    .from('kunden')
    .insert({
      name,
      email: input.email?.trim() || null,
      telefon: input.telefon?.trim() || null,
      typ: input.typ?.trim() || 'privat',
      plz: input.plz?.trim() || null,
      ort: input.ort?.trim() || null,
      adresse: null,
      notizen: null,
    })
    .select('id, name')
    .single()
  if (error) throw error
  return data
}

// ── Angebot-Entwurf ──

function minimalPosition(beschreibung: string, netto: number): AngebotPosition {
  const preis = Math.max(0, netto)
  return {
    id: randomUUID(),
    gewerk_id: '',
    gewerk_name: 'Sonstiges',
    leistung: 'sonstiges',
    beschreibung: beschreibung.trim() || 'Leistung',
    lohn_netto: preis,
    material_netto: 0,
    gesamt_min: preis,
    gesamt_max: preis,
    menge: 1,
    einheit: 'Stk',
  }
}

export async function createAngebotEntwurfCopilot(input: {
  lead_id?: string
  kunde_id?: string
  leistungsumfang?: string
  position_beschreibung?: string
  preis_netto?: number
}) {
  let kundeId = input.kunde_id?.trim() || null
  let leadId = input.lead_id?.trim() || null

  if (kundeId && !isUuid(kundeId)) {
    const resolved = await resolveKundeId({ kunde_id: kundeId })
    if ('error' in resolved) throw new Error(resolved.error)
    kundeId = resolved.id
  }

  if (!kundeId && leadId) {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('kunde_id, kontakt_name, kontakt_email, kontakt_telefon, kundentyp')
      .eq('id', leadId)
      .maybeSingle()
    if (!lead) throw new Error('Lead nicht gefunden')
    kundeId = lead.kunde_id
    if (!kundeId) {
      const kunde = await createKundeCopilot({
        name: lead.kontakt_name ?? 'Kunde',
        email: lead.kontakt_email ?? undefined,
        telefon: lead.kontakt_telefon ?? undefined,
      })
      kundeId = kunde.id as string
      await supabaseAdmin.from('leads').update({ kunde_id: kundeId }).eq('id', leadId)
    }
  }

  if (!kundeId) throw new Error('kunde_id oder lead_id erforderlich')

  const leistungsumfang = input.leistungsumfang?.trim() || input.position_beschreibung?.trim() || 'Angebot'
  const positionen = normalizeAngebotPositionen([
    minimalPosition(
      input.position_beschreibung?.trim() || leistungsumfang,
      input.preis_netto ?? 0
    ),
  ])
  const summen = summenAusPositionen(positionen, 19)

  let kundeTyp: string | null = null
  let leadKundentyp: string | null = null
  const { data: kundeRow } = await supabaseAdmin.from('kunden').select('typ').eq('id', kundeId).maybeSingle()
  kundeTyp = (kundeRow as { typ?: string } | null)?.typ ?? null
  if (leadId) {
    const { data: leadRow } = await supabaseAdmin
      .from('leads')
      .select('kundentyp, status')
      .eq('id', leadId)
      .maybeSingle()
    leadKundentyp = (leadRow as { kundentyp?: string } | null)?.kundentyp ?? null
  }
  const zahlungsbedingungen = defaultAngebotZahlungsbedingungen(
    resolveAngebotKundeTyp(kundeTyp, leadKundentyp)
  )
  const angebotsnr = await nextAngebotsnummerJahr()

  const { data: row, error } = await supabaseAdmin
    .from('angebote')
    .insert({
      lead_id: leadId,
      kunde_id: kundeId,
      status: 'entwurf',
      status_einfach: 'entwurf',
      positionen,
      gesamt_min: summen.nettoMin,
      gesamt_max: summen.nettoMax,
      gesamt_fix: summen.nettoMin,
      notizen: null,
      pdf_url: null,
      preis_typ: 'fix',
      angebotsnr,
      leistungsumfang,
      zahlungsbedingungen,
      dokument_typ: 'einfach',
      fotos_urls: [],
    })
    .select('id, angebotsnr, gesamt_min')
    .single()

  if (error) throw error

  if (leadId) {
    const { data: leadStatus } = await supabaseAdmin
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .maybeSingle()
    const ls = (leadStatus?.status ?? 'neu') as LeadStatus
    if (['neu', 'kontaktiert', 'termin'].includes(ls)) {
      await supabaseAdmin
        .from('leads')
        .update({ status: 'angebot', updated_at: new Date().toISOString() })
        .eq('id', leadId)
    }
  }

  return row
}

// ── Angebot auflösen & senden ──

export async function resolveAngebotId(input: {
  angebot_id?: string
  suche?: string
}): Promise<{ id: string; angebotsnr: string | null } | { error: string; treffer?: CrmSearchHit[] }> {
  const direct = input.angebot_id?.trim()
  if (direct) {
    if (isUuid(direct)) {
      const { data } = await supabaseAdmin.from('angebote').select('id, angebotsnr').eq('id', direct).maybeSingle()
      if (data) return { id: data.id, angebotsnr: data.angebotsnr }
    }
    const byNr = await supabaseAdmin
      .from('angebote')
      .select('id, angebotsnr')
      .ilike('angebotsnr', direct)
      .limit(2)
    if (byNr.data?.length === 1) {
      return { id: byNr.data[0].id, angebotsnr: byNr.data[0].angebotsnr }
    }
  }

  const suche = (input.suche ?? direct ?? '').trim()
  if (!suche) return { error: 'angebot_id oder suche erforderlich' }

  if (isUuid(suche)) {
    const { data } = await supabaseAdmin.from('angebote').select('id, angebotsnr').eq('id', suche).maybeSingle()
    if (data) return { id: data.id, angebotsnr: data.angebotsnr }
  }

  const nrHits = await supabaseAdmin
    .from('angebote')
    .select('id, angebotsnr')
    .ilike('angebotsnr', `%${escapeIlike(suche)}%`)
    .limit(3)
  if (nrHits.data?.length === 1) {
    return { id: nrHits.data[0].id, angebotsnr: nrHits.data[0].angebotsnr }
  }
  if ((nrHits.data?.length ?? 0) > 1) {
    return {
      error: 'Mehrere Angebote mit dieser Nummer — bitte genauer angeben',
      treffer: nrHits.data!.map((r) => ({
        typ: 'angebot' as const,
        id: r.id,
        titel: `Angebot ${r.angebotsnr}`,
      })),
    }
  }

  const kundeHits = await searchCrm(suche, ['kunde'])
  if (kundeHits.length === 1) {
    const { data: byKunde } = await supabaseAdmin
      .from('angebote')
      .select('id, angebotsnr')
      .eq('kunde_id', kundeHits[0].id)
      .in('status_einfach', ['entwurf', 'gesendet'])
      .order('created_at', { ascending: false })
      .limit(3)
    if (byKunde?.length === 1) {
      return { id: byKunde[0].id, angebotsnr: byKunde[0].angebotsnr }
    }
    if ((byKunde?.length ?? 0) > 1) {
      return {
        error: 'Mehrere Angebote für diesen Kunden — bitte Angebotsnr. nennen',
        treffer: byKunde!.map((r) => ({
          typ: 'angebot' as const,
          id: r.id,
          titel: `Angebot ${r.angebotsnr}`,
        })),
      }
    }
  }

  const leadHits = await searchCrm(suche, ['lead'])
  if (leadHits.length === 1) {
    const { data: byLead } = await supabaseAdmin
      .from('angebote')
      .select('id, angebotsnr')
      .eq('lead_id', leadHits[0].id)
      .order('created_at', { ascending: false })
      .limit(3)
    if (byLead?.length === 1) {
      return { id: byLead[0].id, angebotsnr: byLead[0].angebotsnr }
    }
    if ((byLead?.length ?? 0) > 1) {
      return {
        error: 'Mehrere Angebote für diese Anfrage — bitte Angebotsnr. nennen',
        treffer: byLead!.map((r) => ({
          typ: 'angebot' as const,
          id: r.id,
          titel: `Angebot ${r.angebotsnr}`,
        })),
      }
    }
  }

  const angebotHits = await searchCrm(suche, ['angebot'])
  if (angebotHits.length === 1) {
    return { id: angebotHits[0].id, angebotsnr: angebotHits[0].titel.replace(/^Angebot\s*/, '') || null }
  }
  if (angebotHits.length > 1) {
    return { error: 'Mehrere Treffer — bitte Angebotsnr. oder ID nennen', treffer: angebotHits }
  }

  return { error: `Kein Angebot gefunden für „${suche}"` }
}

export async function previewSendAngebot(angebotId: string) {
  const { data, error } = await supabaseAdmin
    .from('angebote')
    .select(
      `
      id, angebotsnr, leistungsumfang, status, status_einfach, gesendet_kunde_at,
      gesamt_fix, gesamt_min, gesamt_max, positionen,
      kunden(name, email),
      leads(kontakt_name, kontakt_email)
    `
    )
    .eq('id', angebotId)
    .maybeSingle()
  if (error) throw error
  if (!data) return { error: 'Angebot nicht gefunden' }

  const kunde = Array.isArray(data.kunden) ? data.kunden[0] : data.kunden
  const lead = Array.isArray(data.leads) ? data.leads[0] : data.leads
  const email = kunde?.email?.trim() || lead?.kontakt_email?.trim() || null
  const name = kunde?.name || lead?.kontakt_name || 'Kunde'
  const pos = normalizeAngebotPositionen(data.positionen)
  const summen = summenAusPositionen(pos, 19)

  return {
    vorschau: true,
    angebot_id: data.id,
    angebotsnr: data.angebotsnr,
    kunde: name,
    email,
    leistungsumfang: data.leistungsumfang,
    status: data.status_einfach ?? data.status,
    bereits_gesendet: Boolean(data.gesendet_kunde_at),
    brutto: summen.bruttoMin,
    hinweis:
      'Zum Versand sende_angebot mit gleicher angebot_id/suche und bestaetigt: true aufrufen.',
  }
}

export async function sendeAngebotCopilot(input: {
  angebot_id?: string
  suche?: string
  bestaetigt?: boolean
}) {
  const resolved = await resolveAngebotId(input)
  if ('error' in resolved) return resolved

  if (!input.bestaetigt) {
    return previewSendAngebot(resolved.id)
  }

  const result = await sendAngebotToKunde(resolved.id, { asSystem: true })
  if (!result.ok) return { ok: false, error: result.message }
  return {
    ok: true,
    angebot_id: resolved.id,
    angebotsnr: resolved.angebotsnr,
    gesendet: true,
  }
}

// ── Proaktive Alerts ──

export async function notifyNewLeadAlert(leadId: string): Promise<{ sent: boolean; reason?: string }> {
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim() || !process.env.TELEGRAM_CHAT_ID?.trim()) {
    return { sent: false, reason: 'Telegram nicht konfiguriert' }
  }
  if (await copilotAlertAlreadySent('neue_anfrage', 'lead', leadId)) {
    return { sent: false, reason: 'bereits gesendet' }
  }

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select('id, kontakt_name, kontakt_email, kontakt_telefon, situation, bereiche, plz, preis_min, preis_max, status, kanal')
    .eq('id', leadId)
    .maybeSingle()
  if (error) throw error
  if (!lead || lead.status !== 'neu') {
    return { sent: false, reason: 'Lead nicht neu oder nicht gefunden' }
  }

  const bereiche = Array.isArray(lead.bereiche) ? lead.bereiche.join(', ') : ''
  const budget =
    lead.preis_min != null || lead.preis_max != null
      ? `${lead.preis_min ?? '?'} – ${lead.preis_max ?? '?'} €`
      : ''
  const lines = [
    '🆕 <b>Neue Anfrage</b>',
    `<b>${lead.kontakt_name ?? 'Unbekannt'}</b>`,
    [lead.kontakt_telefon, lead.kontakt_email].filter(Boolean).join(' · '),
    lead.plz ? `PLZ ${lead.plz}` : '',
    bereiche ? `Bereiche: ${bereiche}` : '',
    lead.situation ? lead.situation.slice(0, 200) : '',
    budget ? `Preisrahmen: ${budget}` : '',
    `Kanal: ${lead.kanal ?? '—'}`,
    `ID: <code>${lead.id}</code>`,
  ].filter(Boolean)

  await sendTelegram(lines.join('\n'))
  await recordCopilotAlert('neue_anfrage', 'lead', leadId)
  return { sent: true }
}

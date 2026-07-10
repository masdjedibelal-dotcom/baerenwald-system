import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMailBranding } from '@/lib/get-mail-branding'
import { mailBesichtigungTermin } from '@/lib/mail-templates'
import {
  anfrageAdresseAusPayload,
  formatAnfrageAdresseZeile,
  vorOrtRueckfragen,
} from '@/lib/anfrage-adresse'
import { getCrmTeamMitglied } from '@/lib/crm-team'
import { projektOderStatusLink } from '@/lib/mail/versand-helpers'
import { buildPortalLoginLink } from '@/lib/portal-utils'
import { resolveAngebotKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { VOR_ORT_TERMIN_TITEL } from '@/lib/kalender-styles'
import {
  mergeTerminMailBodyText,
  parseTerminMailIntroFromEditor,
  resolveTerminMailAnrede,
  terminMailBodyForEditor,
  terminMailIntroToHtml,
} from '@/lib/mail/termin-mail-editor'

export type BesichtigungTerminMailInput = {
  leadId: string
  name: string
  terminTitel?: string
  datum: string
  uhrzeitVon: string | null
  uhrzeitBis?: string | null
  adresse?: string | null
  notiz?: string | null
  /** Leer = Vorschau ohne Vor-Ort-Block; zum Versand Pflicht. */
  zugewiesenAn?: string
  defaultTo?: string | null
  /** Bearbeitbarer Plain-Text (Einleitung vor Auto-Marker). */
  bodyText?: string | null
}

function formatDeDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${d}.${m}.${y}`
}

function formatUhrzeitKurz(raw: string | null | undefined): string {
  if (!raw?.trim()) return ''
  const s = raw.trim()
  return s.length >= 5 ? s.slice(0, 5) : s
}

function formatZeitText(uhrzeitVon: string | null, uhrzeitBis: string | null): string {
  const v = formatUhrzeitKurz(uhrzeitVon)
  const bZeit = formatUhrzeitKurz(uhrzeitBis)
  if (v && bZeit) return `${v} – ${bZeit} Uhr`
  if (v) return `${v} Uhr`
  if (bZeit) return `bis ${bZeit} Uhr`
  return ''
}

export async function buildBesichtigungTerminMail(
  input: BesichtigungTerminMailInput
): Promise<
  | { ok: true; betreff: string; html: string; bodyText: string; defaultTo: string[]; kundeId: string | null }
  | { ok: false; message: string }
> {
  const zugewiesenAn = (input.zugewiesenAn ?? '').trim()
  let kollege: { name: string; telefon: string } | null = null
  if (zugewiesenAn) {
    const ma = await getCrmTeamMitglied(zugewiesenAn)
    if (!ma?.name?.trim()) {
      return { ok: false, message: 'Mitarbeiter für den Vor-Ort-Termin nicht gefunden.' }
    }
    kollege = { name: ma.name, telefon: ma.telefon }
  }

  const { data: lead, error } = await supabaseAdmin
    .from('leads')
    .select(
      'id, kunde_id, plz, funnel_daten, kundentyp, kunden!kunde_id(adresse, strasse, hausnummer, plz, ort, typ)'
    )
    .eq('id', input.leadId)
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  if (!lead) return { ok: false, message: 'Lead nicht gefunden oder keine Berechtigung.' }

  const branding = await getMailBranding(supabaseAdmin)
  const statusLink = await projektOderStatusLink(input.leadId)
  const portalLink = buildPortalLoginLink()
  const d = input.datum.trim().slice(0, 10)
  const datumFmt = formatDeDate(d)
  const zeitText = formatZeitText(input.uhrzeitVon, input.uhrzeitBis ?? null)

  const row = lead as {
    plz?: string | null
    funnel_daten?: unknown
    kunden?: {
      adresse?: string | null
      strasse?: string | null
      hausnummer?: string | null
      plz?: string | null
      ort?: string | null
      typ?: string | null
    } | null
  }
  const fd =
    row.funnel_daten && typeof row.funnel_daten === 'object' && !Array.isArray(row.funnel_daten)
      ? (row.funnel_daten as Record<string, unknown>)
      : null
  const kunde = row.kunden
  const addrFelder = anfrageAdresseAusPayload({
    plz: row.plz ?? undefined,
    strasse: kunde?.strasse,
    hausnummer: kunde?.hausnummer,
    ort: kunde?.ort,
    funnel_daten: fd,
  })
  const adresseManuell = (input.adresse ?? '').trim()
  const adresse =
    adresseManuell || formatAnfrageAdresseZeile(addrFelder, kunde)
  const fehlendeRueckfragen = vorOrtRueckfragen({
    addr: addrFelder,
    adresseZeile: adresse,
    kunde,
    funnel_daten: fd,
  })

  const kundeTyp = resolveAngebotKundeTyp(
    (lead as { kunden?: { typ?: string | null } | null }).kunden?.typ,
    (lead as { kundentyp?: string | null }).kundentyp
  )
  const anrede = resolveTerminMailAnrede(kundeTyp)
  const terminTitel = (input.terminTitel ?? VOR_ORT_TERMIN_TITEL).trim() || VOR_ORT_TERMIN_TITEL
  const kontaktName = input.name.trim() || 'Kundin/Kunde'
  const bodyText = mergeTerminMailBodyText(
    input.bodyText ?? undefined,
    anrede,
    kontaktName,
    terminTitel
  )
  const introHtml = terminMailIntroToHtml(parseTerminMailIntroFromEditor(bodyText))
  const tpl = mailBesichtigungTermin(
    {
      name: kontaktName,
      terminTitel,
      datumFmt,
      zeitText,
      adresse,
      notiz: (input.notiz ?? '').trim(),
      statusLink,
      portalLink,
      kollege,
      kundeTyp,
      fehlendeRueckfragen,
      introHtml,
    },
    branding
  )

  const toDefault = (input.defaultTo ?? '').trim()
  const defaultTo = toDefault ? [toDefault] : []

  return {
    ok: true,
    betreff: tpl.betreff,
    html: tpl.html,
    bodyText,
    defaultTo,
    kundeId: (lead as { kunde_id?: string | null }).kunde_id ?? null,
  }
}

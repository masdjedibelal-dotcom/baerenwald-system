'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { nextAngebotsnummerJahr } from '@/lib/angebot-utils'
import { loadGewerkeAusfuehrung } from '@/lib/gewerke-ausfuehrung'
import { filterHandwerkerFuerGewerkSlug } from '@/lib/handwerker/gewerk-match'
import { renderAngebotPdfForDetail } from '@/lib/angebote/render-angebot-pdf-for-detail'
import { sendMail } from '@/lib/mail-service'
import { getMailBranding } from '@/lib/get-mail-branding'
import {
  mailAngebot,
  mailAngebotAnnahmeBestaetigung,
  mailHandwerkerAnfrage,
} from '@/lib/mail-templates'
import {
  angebotMailBetreff,
  buildAngebotMail,
  parseWizardMetaFromNotizen,
  parseAngebotAnrede,
} from '@/lib/templates/angebot-mail'
import { formatDatumDeFromIso, projektOderStatusLink } from '@/lib/mail/versand-helpers'
import { projektUrlFromToken } from '@/lib/projekt/projekt-url'
import {
  angebotDarfImWizardBearbeitetWerden,
  defaultAngebotZahlungsbedingungen,
  resolveAngebotKundeTyp,
} from '@/lib/angebote/angebot-wizard-types'
import { getPublicAppUrl } from '@/lib/utils'
import { isKundeAblehnungGrund } from '@/lib/angebote/ablehnung-labels'
import { sendHandwerkerAnfrageFuerZuweisung } from '@/lib/angebote/send-handwerker-anfrage'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import { auftragErfordertProjektvertrag } from '@/lib/auftraege/auftrag-erfordert-projektvertrag'
import { updateLeadStatus } from '@/app/(dashboard)/anfragen/actions'
import { syncAngebotLeistungenToLead } from '@/lib/angebote/sync-angebot-leistungen-to-lead'
import { syncNeueLeistungenToPreisliste } from '@/app/(dashboard)/preislisten/actions'
import { syncInputsFromAngebotPositionen } from '@/lib/preislisten/sync-neue-leistungen'
import { buildPartnerLoginLink, buildPortalLoginLink, portalAudienceFromKunde } from '@/lib/portal-utils'
import {
  buildGewerkEkMap,
  ekNettoFromHwEinreichung,
  hasHwEinreichung,
} from '@/lib/partner/handwerker-einreichung'
import {
  angebotPositionenFromRaw,
  applyLegacyGewerkZeileToAngebotPositionen,
  applyVereinbarteKonditionenToAngebotPositionen,
  parseHwKonditionen,
  resolveAuftragPositionId,
  zeileNettoAusEinkaufspreis,
} from '@/lib/partner/hw-konditionen'
import { signedHandwerkerUploadUrl } from '@/lib/partner/handwerker-uploads'
import { parseHwAnhangStoragePaths } from '@/lib/partner/partner-hw-dokument-typen'
import {
  darfAngebotAnKundeSenden,
  handwerkerSendenBlockierHinweis,
} from '@/lib/angebote/angebot-handwerker-flow'
import { notifyPartnerHandwerkerAngebotBestaetigt } from '@/lib/partner/notify-partner-angebot-bestaetigt'
import { notifyPartnerHandwerkerAngebotAntwort } from '@/lib/partner/notify-partner-angebot-antwort'
import { parseZahlungsplan, zahlungsplanVorlage50_50 } from '@/lib/rechnungen/zahlungsplan'
import { loadHandwerkerAcceptWizardBootstrap } from '@/app/(dashboard)/vertraege/wizard-actions'
import { loadKiVizMailPreviewUrl } from '@/lib/visualize/pdf-data'
import {
  parseHwPreisEuro,
  uploadHwAngebotPdfFromCrm,
} from '@/lib/partner/upload-hw-angebot-pdf'
import {
  kundeAnredeKontextFromEmpfaenger,
  kundeRechnungsempfaengerAusStammdaten,
} from '@/lib/kunde-rechnungsempfaenger'
import { leadStatusVorAngebot } from '@/lib/lead-angebot-funnel'
import { syncAngebotMitOrgFreigabe } from '@/lib/org/hv-lead-actions'
import { resolveStatusEinfach } from '@/lib/angebot-einfach'
import { insertLeadTimelineEvent } from '@/lib/lead-timeline'
import { auftragsbestaetigungMailFromEmpfaenger } from '@/lib/mail/auftragsbestaetigung-mail'
import type { LeadStatus } from '@/lib/types'
import type {
  AngebotDetail,
  AngebotHandwerkerZuweisungInput,
  AngebotPosition,
  AngebotStatus,
  AngebotVorlage,
  Kunde,
  PreisTyp,
} from '@/lib/types'
import {
  handwerkerZuweisungenFromPositionen,
  normalizeAngebotPositionen,
  summenAusPositionen,
  summenKostenaufstellungAusPositionen,
} from '@/lib/angebot-positionen'
import { angebotPositionenToAuftragRows } from '@/lib/auftrag-positionen-map'
import { insertKalenderAutoTermine } from '@/lib/kalender-auto-termine'
import { sendAngebotNachfassMailById } from '@/lib/angebote/send-angebot-nachfass-mail'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import type { AngebotVariantenPersistJson } from '@/lib/angebote/angebot-wizard-types'
import { provisionProjektVertraegeFuerAuftrag, provisionProjektvertragFireAndForget } from '@/lib/vertraege/provision-projektvertrag'

function parsePositionen(raw: unknown): AngebotPosition[] {
  return normalizeAngebotPositionen(raw)
}

function parseVariantenRow(raw: unknown): AngebotVariantenPersistJson | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as AngebotVariantenPersistJson
  if (!r.b || !Array.isArray(r.b.positionen)) return null
  return r
}

const ANGEBOT_DETAIL_SELECT = `
      *,
      kunden(*),
      leads(*),
      kunden_objekte(*),
      angebot_handwerker(
        *,
        handwerker(id, name, email, telefon, gewerke, aktiv),
        gewerke(id, name, slug)
      )
    `

async function loadAngebotDetail(id: string): Promise<AngebotDetail | null> {
  const { data, error } = await withCrmReadFallback(async (db) =>
    db.from('angebote').select(ANGEBOT_DETAIL_SELECT).eq('id', id).maybeSingle()
  )

  if (error || !data) return null
  const row = data as AngebotDetail
  return {
    ...row,
    positionen: parsePositionen(row.positionen),
  }
}

export async function loadAngebotDetailAdmin(id: string): Promise<AngebotDetail | null> {
  const { data, error } = await supabaseAdmin
    .from('angebote')
    .select(
      `
      *,
      kunden(*),
      leads(*),
      kunden_objekte(*),
      angebot_handwerker(
        *,
        handwerker(id, name, email, telefon, gewerke, aktiv),
        gewerke(id, name, slug)
      )
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  const row = data as AngebotDetail
  return {
    ...row,
    positionen: parsePositionen(row.positionen),
  }
}

export async function searchKunden(q: string) {
  const term = q.trim()
  if (term.length < 2) return { kunden: [] as Kunde[] }
  const esc = term.replace(/%/g, '\\%').replace(/_/g, '\\_')
  const pattern = `%${esc}%`
  const { data } = await withCrmReadFallback(async (db) =>
    db
      .from('kunden')
      .select('id, name, vorname, nachname, typ, email, telefon, plz, ort, strasse, hausnummer, adresse, notizen, created_at')
      .or(
        `name.ilike.${pattern},vorname.ilike.${pattern},nachname.ilike.${pattern},email.ilike.${pattern},ort.ilike.${pattern}`
      )
      .order('name')
      .limit(12)
  )

  return { kunden: (data ?? []) as Kunde[] }
}

export async function createKundeQuick(input: {
  name: string
  email: string | null
  telefon: string | null
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const { data, error } = await withCrmReadFallback(async (db) =>
    db
      .from('kunden')
      .insert({
        name: input.name.trim(),
        email: input.email?.trim() || null,
        telefon: input.telefon?.trim() || null,
        typ: 'privat',
        adresse: null,
        plz: null,
        ort: null,
        notizen: null,
      })
      .select('id')
      .single()
  )

  if (error || !data) return { ok: false, message: error?.message ?? 'Fehler' }
  return { ok: true, id: (data as { id: string }).id }
}

export type CreateAngebotInput = {
  lead_id: string | null
  kunde_id: string
  positionen: AngebotPosition[]
  gesamt_min: number
  gesamt_max: number
  notizen: string | null
  preis_typ?: PreisTyp | null
  vorlage_id?: string | null
  /** CRM-Dokumentfelder (Wizard / Editor) */
  leistungsumfang?: string | null
  einleitung?: string | null
  hinweise?: string | null
  zahlungsbedingungen?: string | null
  /** ISO-Datum yyyy-mm-dd */
  gueltig_bis?: string | null
  dokument_typ?: 'einfach' | 'projekt' | null
  projektbeschreibung?: string | null
  /** JSON-Array: URL-Strings (legacy) oder { url, beschreibung } */
  fotos_urls?: unknown
  varianten?: AngebotVariantenPersistJson | null
  wichtige_hinweise?: string | null
  kunde_objekt_id?: string | null
  /** Notizen pro gewerk_id für angebot_handwerker.aufgabe_notiz */
  handwerker_aufgabe_notizen?: Record<string, string | null | undefined>
  zahlungsplan?: import('@/lib/rechnungen/zahlungsplan').Zahlungsplan | null
}

async function zahlungsbedingungenFuerSpeichern(
  supabase: ReturnType<typeof createClient>,
  input: Pick<CreateAngebotInput, 'zahlungsbedingungen' | 'kunde_id' | 'lead_id'>
): Promise<string> {
  const explicit = input.zahlungsbedingungen?.trim()
  if (explicit) return explicit

  let kundeTyp: string | null = null
  if (input.kunde_id) {
    const { data } = await supabase.from('kunden').select('typ').eq('id', input.kunde_id).maybeSingle()
    kundeTyp = (data as { typ?: string | null } | null)?.typ ?? null
  }
  let leadKundentyp: string | null = null
  if (input.lead_id) {
    const { data } = await supabase
      .from('leads')
      .select('kundentyp')
      .eq('id', input.lead_id)
      .maybeSingle()
    leadKundentyp = (data as { kundentyp?: string | null } | null)?.kundentyp ?? null
  }
  return defaultAngebotZahlungsbedingungen(resolveAngebotKundeTyp(kundeTyp, leadKundentyp))
}

async function markLeadAngeboteErsetzt(
  supabase: ReturnType<typeof createClient> | typeof supabaseAdmin,
  leadId: string,
  activeAngebotId: string
): Promise<void> {
  const { data: others } = await supabase
    .from('angebote')
    .select('id, status, status_einfach, gueltig_bis')
    .eq('lead_id', leadId)
    .neq('id', activeAngebotId)

  const now = new Date().toISOString()
  for (const row of others ?? []) {
    const st = resolveStatusEinfach(row as { status: string; status_einfach?: string | null; gueltig_bis?: string | null })
    if (st !== 'entwurf' && st !== 'gesendet') continue
    await supabase
      .from('angebote')
      .update({
        status_einfach: 'ersetzt',
        status: 'abgelehnt',
        updated_at: now,
      })
      .eq('id', row.id as string)
  }
}

export async function markLeadAngeboteAbgelehnt(
  supabase: ReturnType<typeof createClient> | typeof supabaseAdmin,
  leadId: string,
  activeAngebotId: string
): Promise<void> {
  const { data: others } = await supabase
    .from('angebote')
    .select('id, status, status_einfach, gueltig_bis')
    .eq('lead_id', leadId)
    .neq('id', activeAngebotId)

  const now = new Date().toISOString()
  for (const row of others ?? []) {
    const st = resolveStatusEinfach(row as { status: string; status_einfach?: string | null; gueltig_bis?: string | null })
    if (st === 'abgelehnt' || st === 'ersetzt' || st === 'angenommen') continue
    await supabase
      .from('angebote')
      .update({
        status_einfach: 'abgelehnt',
        status: 'abgelehnt',
        updated_at: now,
      })
      .eq('id', row.id as string)
  }
}

export async function createAngebot(
  input: CreateAngebotInput,
  opts?: { asSystem?: boolean }
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = opts?.asSystem ? supabaseAdmin : createClient()
  const positionen = normalizeAngebotPositionen(input.positionen)
  const summen = summenAusPositionen(positionen, 19)
  const zahlungsbedingungen = await zahlungsbedingungenFuerSpeichern(supabase, input)

  const preislisteSync = syncInputsFromAngebotPositionen(positionen)
  const bPos = input.varianten?.b?.positionen
  if (Array.isArray(bPos) && bPos.length) {
    preislisteSync.push(...syncInputsFromAngebotPositionen(normalizeAngebotPositionen(bPos)))
  }
  await syncNeueLeistungenToPreisliste(preislisteSync)

  const angebotsnr = await nextAngebotsnummerJahr()

  const { data: row, error } = await supabase
    .from('angebote')
    .insert({
      lead_id: input.lead_id,
      kunde_id: input.kunde_id,
      status: 'entwurf' as AngebotStatus,
      status_einfach: 'entwurf',
      positionen,
      gesamt_min: summen.nettoMin,
      gesamt_max: summen.nettoMax,
      notizen: input.notizen,
      pdf_url: null,
      preis_typ: input.preis_typ ?? 'fix',
      vorlage_id: input.vorlage_id ?? null,
      angebotsnr,
      leistungsumfang: input.leistungsumfang?.trim() || null,
      einleitung: input.einleitung?.trim() || null,
      hinweise: input.hinweise?.trim() || null,
      zahlungsbedingungen,
      gueltig_bis: input.gueltig_bis?.trim() || null,
      zahlungsplan: input.zahlungsplan ?? null,
      dokument_typ: input.dokument_typ ?? 'einfach',
      projektbeschreibung: input.projektbeschreibung?.trim() || null,
      fotos_urls: Array.isArray(input.fotos_urls) && input.fotos_urls.length > 0 ? input.fotos_urls : [],
      varianten: input.varianten ?? null,
      wichtige_hinweise: input.wichtige_hinweise?.trim() || null,
      kunde_objekt_id: input.kunde_objekt_id?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !row) {
    return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  }

  const id = row.id as string

  const hwQuelle = (): AngebotPosition[] => {
    const b = input.varianten?.b?.positionen
    const bNorm = Array.isArray(b) ? normalizeAngebotPositionen(b) : []
    if (bNorm.length) return [...positionen, ...bNorm]
    return positionen
  }
  const hwZu = handwerkerZuweisungenFromPositionen(hwQuelle(), input.handwerker_aufgabe_notizen)
  for (const z of hwZu) {
    if (!z.handwerker_id || !z.gewerk_id) continue
    await supabase.from('angebot_handwerker').insert({
      angebot_id: id,
      gewerk_id: z.gewerk_id,
      handwerker_id: z.handwerker_id,
      status: z.status ?? 'ausstehend',
      aufgabe_notiz: z.aufgabe_notiz?.trim() || null,
    })
  }

  if (input.lead_id) {
    await markLeadAngeboteErsetzt(supabase, input.lead_id, id)

    const syncLead = await syncAngebotLeistungenToLead(input.lead_id, positionen)
    if (!syncLead.ok) return syncLead

    void syncAngebotMitOrgFreigabe({
      leadId: input.lead_id,
      angebotId: id,
      betragEur: summen.nettoMax,
    })

    const { data: leadRow } = await supabase
      .from('leads')
      .select('status')
      .eq('id', input.lead_id)
      .maybeSingle()
    const ls = (leadRow?.status ?? 'neu') as LeadStatus
    if (leadStatusVorAngebot(ls)) {
      if (opts?.asSystem) {
        const now = new Date().toISOString()
        await supabaseAdmin
          .from('leads')
          .update({ status: 'angebot', updated_at: now })
          .eq('id', input.lead_id)
        await supabaseAdmin.from('leads_status_history').insert({
          lead_id: input.lead_id,
          status_alt: ls,
          status_neu: 'angebot',
          user_id: null,
          notiz: 'Angebot erstellt',
        })
      } else {
        const leadUpd = await updateLeadStatus(input.lead_id, 'angebot', 'Angebot erstellt')
        if (!leadUpd.ok) return leadUpd
      }
    }
  }

  if (!opts?.asSystem) {
    revalidatePath('/angebote')
    if (input.lead_id) revalidatePath(`/anfragen/${input.lead_id}`)
  }
  return { ok: true, id }
}

export async function updateAngebot(
  angebotId: string,
  input: Omit<CreateAngebotInput, 'lead_id'> & { lead_id: string | null },
  opts?: { asSystem?: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = opts?.asSystem ? supabaseAdmin : createClient()
  const user = opts?.asSystem
    ? null
    : (
        await supabase.auth.getUser()
      ).data.user
  const { data: current, error: loadErr } = await supabase
    .from('angebote')
    .select('id, status, varianten, gesendet_kunde_at, status_einfach, lead_id')
    .eq('id', angebotId)
    .maybeSingle()

  if (loadErr || !current) return { ok: false, message: 'Angebot nicht gefunden' }
  if (!angebotDarfImWizardBearbeitetWerden(current.status)) {
    return { ok: false, message: 'Dieses Angebot kann nicht mehr bearbeitet werden' }
  }

  const positionen = normalizeAngebotPositionen(input.positionen)
  const summen = summenAusPositionen(positionen, 19)

  const preislisteSyncUpd = syncInputsFromAngebotPositionen(positionen)
  if (input.varianten !== undefined) {
    const bPos = input.varianten?.b?.positionen
    if (Array.isArray(bPos) && bPos.length) {
      preislisteSyncUpd.push(...syncInputsFromAngebotPositionen(normalizeAngebotPositionen(bPos)))
    }
  }
  await syncNeueLeistungenToPreisliste(preislisteSyncUpd)

  let variantenNorm: AngebotVariantenPersistJson | null = null
  if (input.varianten !== undefined) {
    variantenNorm = input.varianten
      ? {
          a: {
            name: input.varianten.a?.name ?? 'Variante A',
            positionen: normalizeAngebotPositionen(input.varianten.a?.positionen ?? []),
          },
          b: {
            name: input.varianten.b?.name ?? 'Variante B',
            positionen: normalizeAngebotPositionen(input.varianten.b?.positionen ?? []),
          },
        }
      : null
  }

  const docPatch: Record<string, unknown> = {}
  if (input.dokument_typ !== undefined) {
    docPatch.dokument_typ = input.dokument_typ ?? 'einfach'
  }
  if (input.projektbeschreibung !== undefined) {
    docPatch.projektbeschreibung = input.projektbeschreibung?.trim() ?? null
  }
  if (input.fotos_urls !== undefined) {
    docPatch.fotos_urls = Array.isArray(input.fotos_urls) && input.fotos_urls.length ? input.fotos_urls : []
  }
  if (input.varianten !== undefined) {
    docPatch.varianten = variantenNorm
  }
  if (input.wichtige_hinweise !== undefined) {
    docPatch.wichtige_hinweise = input.wichtige_hinweise?.trim() ?? null
  }

  const zahlungsbedingungen = await zahlungsbedingungenFuerSpeichern(supabase, input)

  const { error } = await supabase
    .from('angebote')
    .update({
      lead_id: input.lead_id,
      kunde_id: input.kunde_id,
      positionen,
      gesamt_min: summen.nettoMin,
      gesamt_max: summen.nettoMax,
      notizen: input.notizen,
      preis_typ: input.preis_typ ?? 'fix',
      vorlage_id: input.vorlage_id ?? null,
      leistungsumfang: input.leistungsumfang?.trim() ?? null,
      einleitung: input.einleitung?.trim() ?? null,
      hinweise: input.hinweise?.trim() ?? null,
      zahlungsbedingungen,
      gueltig_bis: input.gueltig_bis?.trim() || null,
      ...(input.zahlungsplan !== undefined ? { zahlungsplan: input.zahlungsplan } : {}),
      ...(input.kunde_objekt_id !== undefined
        ? { kunde_objekt_id: input.kunde_objekt_id?.trim() || null }
        : {}),
      updated_at: new Date().toISOString(),
      ...docPatch,
    })
    .eq('id', angebotId)

  if (error) return { ok: false, message: error.message }

  const warBereitsGesendet = Boolean(
    current.gesendet_kunde_at ||
      current.status === 'gesendet_kunde' ||
      current.status_einfach === 'gesendet'
  )
  const leadId = input.lead_id ?? (current.lead_id as string | null)
  if (warBereitsGesendet && leadId) {
    const tl = await insertLeadTimelineEvent(supabase, {
      lead_id: leadId,
      angebot_id: angebotId,
      typ: 'angebot',
      titel: 'Angebot bearbeitet',
      beschreibung: input.leistungsumfang?.trim() || null,
      erstellt_von: user?.id ?? null,
    })
    if (!tl.ok) console.warn('[updateAngebot] timeline:', tl.message)
    revalidatePath(`/anfragen/${leadId}`)
  }

  const variantenForHw =
    input.varianten !== undefined ? variantenNorm : parseVariantenRow(current.varianten)

  const { data: prevHw } = await supabase
    .from('angebot_handwerker')
    .select('gewerk_id, handwerker_id, status, aufgabe_notiz')
    .eq('angebot_id', angebotId)

  const prevHwMap = new Map<
    string,
    { status: string; aufgabe_notiz: string | null }
  >()
  for (const r of prevHw ?? []) {
    const g = r.gewerk_id as string
    const h = r.handwerker_id as string
    if (!g || !h) continue
    prevHwMap.set(`${g}|${h}`, {
      status: String((r as { status?: string }).status ?? 'ausstehend'),
      aufgabe_notiz: (r as { aufgabe_notiz?: string | null }).aufgabe_notiz ?? null,
    })
  }

  await supabase.from('angebot_handwerker').delete().eq('angebot_id', angebotId)

  const hwPosMerged = (): AngebotPosition[] => {
    const vb = variantenForHw?.b?.positionen ?? []
    const bNorm = normalizeAngebotPositionen(vb)
    if (bNorm.length) return [...positionen, ...bNorm]
    return positionen
  }
  const hwZu = handwerkerZuweisungenFromPositionen(hwPosMerged(), input.handwerker_aufgabe_notizen)
  for (const z of hwZu) {
    if (!z.handwerker_id || !z.gewerk_id) continue
    const key = `${z.gewerk_id}|${z.handwerker_id}`
    const prev = prevHwMap.get(key)
    await supabase.from('angebot_handwerker').insert({
      angebot_id: angebotId,
      gewerk_id: z.gewerk_id,
      handwerker_id: z.handwerker_id,
      status: (prev?.status as AngebotHandwerkerZuweisungInput['status']) ?? z.status ?? 'ausstehend',
      aufgabe_notiz:
        z.aufgabe_notiz?.trim() ||
        prev?.aufgabe_notiz?.trim() ||
        null,
    })
  }

  if (leadId) {
    const syncLead = await syncAngebotLeistungenToLead(leadId, positionen)
    if (!syncLead.ok) return syncLead
    void syncAngebotMitOrgFreigabe({
      leadId,
      angebotId,
      betragEur: summen.nettoMax,
    })
  }

  if (!opts?.asSystem) {
    revalidatePath('/angebote')
    revalidatePath(`/angebote/${angebotId}`)
    if (leadId) revalidatePath(`/anfragen/${leadId}`)
  }
  return { ok: true }
}

export async function updateAngebotNotizen(
  angebotId: string,
  notizen: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('angebote')
    .update({ notizen, updated_at: new Date().toISOString() })
    .eq('id', angebotId)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/angebote/${angebotId}`)
  return { ok: true }
}

export async function setAngebotStatus(
  angebotId: string,
  status: AngebotStatus,
  opts?: { asSystem?: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = opts?.asSystem ? supabaseAdmin : createClient()
  const now = new Date().toISOString()
  const extra: Record<string, string> = {}
  if (status === 'gesendet_handwerker') extra.gesendet_handwerker_at = now
  if (status === 'gesendet_kunde') extra.gesendet_kunde_at = now

  const { error } = await supabase
    .from('angebote')
    .update({ status, updated_at: now, ...extra })
    .eq('id', angebotId)
  if (error) return { ok: false, message: error.message }
  if (!opts?.asSystem) {
    revalidatePath(`/angebote/${angebotId}`)
    revalidatePath('/angebote')
  }
  return { ok: true }
}

export async function persistPdfForAngebot(
  angebotId: string,
  opts?: { detail?: AngebotDetail | null; skipRevalidate?: boolean }
): Promise<{ ok: true; buffer: Buffer; publicUrl: string } | { ok: false; message: string }> {
  const detail = opts?.detail ?? (await loadAngebotDetailAdmin(angebotId))
  if (!detail?.kunden) return { ok: false, message: 'Angebot/Kunde nicht gefunden' }

  const [firm, gewerke] = await Promise.all([
    fetchFirmenEinstellungen(supabaseAdmin),
    loadGewerkeAusfuehrung(supabaseAdmin),
  ])

  let buffer: Buffer
  try {
    buffer = await renderAngebotPdfForDetail(detail, firm, gewerke)
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'PDF-Render fehlgeschlagen',
    }
  }

  const path = `${angebotId}/${Date.now()}.pdf`
  const { error: upErr } = await supabaseAdmin.storage
    .from('angebote-pdfs')
    .upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (upErr) {
    const raw = upErr.message ?? ''
    const hint =
      /bucket not found|bucket.*does not exist|storage.*not found/i.test(raw)
        ? ' — Speicher-Bucket „angebote-pdfs“ fehlt: Migration `20260424180000_storage_angebote_pdfs.sql` ausführen oder in Supabase → Storage einen öffentlichen Bucket `angebote-pdfs` (nur PDF) anlegen.'
        : ''
    return { ok: false, message: raw + hint }
  }

  const { data: pub } = supabaseAdmin.storage.from('angebote-pdfs').getPublicUrl(path)
  const publicUrl = pub.publicUrl

  const { error: dbErr } = await supabaseAdmin
    .from('angebote')
    .update({ pdf_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', angebotId)

  if (dbErr) return { ok: false, message: dbErr.message }

  if (!opts?.skipRevalidate) revalidatePath(`/angebote/${angebotId}`)
  return { ok: true, buffer, publicUrl }
}

export async function sendAngebotToHandwerker(
  angebotId: string,
  opts?: { asSystem?: boolean }
) {
  const detail = await loadAngebotDetailAdmin(angebotId)
  if (!detail?.kunden) return { ok: false as const, message: 'Daten unvollständig' }

  const st = await setAngebotStatus(angebotId, 'gesendet_handwerker', { asSystem: opts?.asSystem })
  if (!st.ok) return st

  const rows = detail.angebot_handwerker ?? []
  for (const r of rows) {
    if (!r.handwerker?.email?.trim()) continue
    const send = await sendHandwerkerAnfrageFuerZuweisung(
      detail,
      r as unknown as Record<string, unknown>,
      true
    )
    if (!send.ok) return { ok: false as const, message: send.message }
  }

  return { ok: true as const }
}

/** Signierte URL für HW-PDF aus Partner-Portal (Angebot oder Rechnung). */
export async function getHandwerkerEinreichungPdfUrl(
  zuweisungId: string,
  art: 'angebot' | 'rechnung' = 'angebot',
  anhangIndex = 0
): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  if (art === 'rechnung') {
    const { data: row, error } = await supabase
      .from('angebot_handwerker')
      .select('hw_rechnung_pdf_url')
      .eq('id', zuweisungId.trim())
      .maybeSingle()
    const stored = (row as { hw_rechnung_pdf_url?: string | null } | null)?.hw_rechnung_pdf_url
    if (error || !stored) return { ok: false, message: 'Keine Rechnung hinterlegt' }
    const url = await signedHandwerkerUploadUrl(String(stored))
    if (!url) return { ok: false, message: 'PDF konnte nicht geladen werden' }
    return { ok: true, url }
  }

  const { data: row, error } = await supabase
    .from('angebot_handwerker')
    .select('hw_angebot_pdf_url, hw_angebot_anhang_urls')
    .eq('id', zuweisungId.trim())
    .maybeSingle()

  if (error || !row) return { ok: false, message: 'Kein PDF hinterlegt' }

  const r = row as { hw_angebot_pdf_url?: string | null; hw_angebot_anhang_urls?: unknown }
  const paths = parseHwAnhangStoragePaths(r.hw_angebot_anhang_urls, r.hw_angebot_pdf_url)
  const stored = paths[anhangIndex]
  if (!stored) return { ok: false, message: 'Kein PDF hinterlegt' }

  const url = await signedHandwerkerUploadUrl(stored)
  if (!url) return { ok: false, message: 'PDF konnte nicht geladen werden' }
  return { ok: true, url }
}

/** Vereinbarten HW-Preis übernehmen: Einkaufspreis im Angebot + ggf. preis_partner im Auftrag. */
export async function uebernehmeHandwerkerEinreichungEk(input: {
  angebotId: string
  zuweisungId: string
}): Promise<{ ok: true; aktualisiert: number } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const angebotId = input.angebotId.trim()
  const zuweisungId = input.zuweisungId.trim()

  const { data: zu, error: zErr } = await supabase
    .from('angebot_handwerker')
    .select(
      `
      id,
      angebot_id,
      handwerker_id,
      gewerk_id,
      hw_preis_netto,
      hw_preis_brutto,
      hw_eingereicht_at,
      hw_konditionen,
      gewerke(slug, name)
    `
    )
    .eq('id', zuweisungId)
    .eq('angebot_id', angebotId)
    .maybeSingle()

  if (zErr || !zu) return { ok: false, message: 'Zuweisung nicht gefunden' }
  if (!zu.hw_eingereicht_at?.trim()) {
    return { ok: false, message: 'Noch keine Einreichung vom Handwerker' }
  }

  const konditionen = parseHwKonditionen(zu.hw_konditionen)
  const legacyZeile = ekNettoFromHwEinreichung(zu as {
    hw_preis_netto?: number | null
    hw_preis_brutto?: number | null
  })
  if (!konditionen?.positionen.length && (legacyZeile == null || legacyZeile <= 0)) {
    return { ok: false, message: 'Kein gültiger Preis in der Einreichung' }
  }

  const { data: angebotRow, error: aErr } = await supabase
    .from('angebote')
    .select('positionen')
    .eq('id', angebotId)
    .maybeSingle()

  if (aErr || !angebotRow) return { ok: false, message: 'Angebot nicht gefunden' }

  let angebotPos = angebotPositionenFromRaw(angebotRow.positionen)
  let angebotAktualisiert = 0

  if (konditionen?.positionen.length) {
    const applied = applyVereinbarteKonditionenToAngebotPositionen(angebotPos, konditionen)
    angebotPos = applied.positionen
    angebotAktualisiert = applied.aktualisiert
    if (angebotAktualisiert === 0) {
      return { ok: false, message: 'Keine passenden Angebotspositionen für die Konditionen gefunden' }
    }
  } else {
    const applied = applyLegacyGewerkZeileToAngebotPositionen(
      angebotPos,
      String(zu.gewerk_id),
      legacyZeile!
    )
    angebotPos = applied.positionen
    angebotAktualisiert = applied.aktualisiert
    if (angebotAktualisiert === 0) {
      return { ok: false, message: 'Keine passenden Angebotspositionen für dieses Gewerk' }
    }
  }

  const { error: posSaveErr } = await supabaseAdmin
    .from('angebote')
    .update({ positionen: angebotPos })
    .eq('id', angebotId)

  if (posSaveErr) return { ok: false, message: posSaveErr.message }

  const gwRaw = zu.gewerke as { slug?: string; name?: string } | { slug?: string; name?: string }[] | null
  const gw = Array.isArray(gwRaw) ? gwRaw[0] : gwRaw
  const slug = gw?.slug?.trim()
  const name = gw?.name?.trim()
  const now = new Date().toISOString()
  let auftragAktualisiert = 0

  const { data: auftrag } = await supabase
    .from('auftraege')
    .select('id')
    .eq('angebot_id', angebotId)
    .maybeSingle()

  if (auftrag?.id) {
    const { data: auftragPos, error: apErr } = await supabase
      .from('auftrag_positionen')
      .select('id, leistung_name, gewerk_slug, gewerk_name')
      .eq('auftrag_id', auftrag.id)

    if (apErr) return { ok: false, message: apErr.message }

    if (konditionen?.positionen.length && auftragPos?.length) {
      for (const kp of konditionen.positionen) {
        if (kp.hw_netto <= 0) continue
        const auftragPosId = resolveAuftragPositionId(
          angebotPos,
          auftragPos,
          kp,
          slug,
          name
        )
        if (!auftragPosId) continue
        const { error: upErr } = await supabase
          .from('auftrag_positionen')
          .update({ preis_partner: kp.hw_netto })
          .eq('id', auftragPosId)
        if (!upErr) auftragAktualisiert++
      }
    } else if (auftragPos?.length) {
      let posQuery = supabase
        .from('auftrag_positionen')
        .select('id, leistung_name, gewerk_slug, gewerk_name, menge, preis_partner')
        .eq('auftrag_id', auftrag.id)

      if (slug) posQuery = posQuery.eq('gewerk_slug', slug)
      else if (name) posQuery = posQuery.eq('gewerk_name', name)

      const { data: posRows, error: pErr } = await posQuery
      if (pErr) return { ok: false, message: pErr.message }

      for (const p of posRows ?? []) {
        const angMatch = angebotPos.find(
          (ap) =>
            ap.gewerk_id === String(zu.gewerk_id) &&
            ap.leistung_name?.trim().toLowerCase() ===
              String(p.leistung_name ?? '')
                .trim()
                .toLowerCase()
        )
        const zeile =
          (angMatch && zeileNettoAusEinkaufspreis(angMatch)) ?? legacyZeile!
        const { error: upErr } = await supabase
          .from('auftrag_positionen')
          .update({ preis_partner: zeile })
          .eq('id', p.id as string)
        if (!upErr) auftragAktualisiert++
      }
    }

    revalidatePath(`/auftraege/${auftrag.id}`)
    revalidatePath('/auftraege')
  }

  await supabaseAdmin
    .from('angebot_handwerker')
    .update({
      hw_status: konditionen?.positionen.length ? 'bestaetigt' : 'uebernommen',
      hw_crm_antwort_at: now,
    })
    .eq('id', zu.id as string)

  if (auftrag?.id && zu.handwerker_id) {
    provisionProjektvertragFireAndForget(String(auftrag.id), String(zu.handwerker_id))
  }

  revalidatePath(`/angebote/${angebotId}`)
  return { ok: true, aktualisiert: Math.max(angebotAktualisiert, auftragAktualisiert) }
}

/** CRM: Handwerker-Angebot manuell erfassen (z. B. per E-Mail/WhatsApp). */
export async function crmManuelleHandwerkerEinreichung(
  formData: FormData
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const angebotId = String(formData.get('angebotId') ?? '').trim()
  const zuweisungId = String(formData.get('zuweisungId') ?? '').trim()
  const preisNetto = parseHwPreisEuro(formData.get('preisNetto') as string | null)
  const preisBrutto = parseHwPreisEuro(formData.get('preisBrutto') as string | null)
  const notiz = String(formData.get('notiz') ?? '').trim() || null
  const pdf = formData.get('pdf')

  if (!angebotId || !zuweisungId) {
    return { ok: false, message: 'Angebot oder Zuweisung fehlt.' }
  }
  if (preisNetto == null) {
    return { ok: false, message: 'Bitte einen gültigen Netto-Preis angeben.' }
  }
  if (!(pdf instanceof File) || pdf.size === 0) {
    return { ok: false, message: 'Bitte ein Angebots-PDF hochladen.' }
  }

  const { data: zu, error: zErr } = await supabase
    .from('angebot_handwerker')
    .select('id, angebot_id, handwerker_id, hw_eingereicht_at, hw_status')
    .eq('id', zuweisungId)
    .eq('angebot_id', angebotId)
    .maybeSingle()

  if (zErr || !zu) return { ok: false, message: 'Zuweisung nicht gefunden' }
  if (zu.hw_eingereicht_at?.trim()) {
    return { ok: false, message: 'Es liegt bereits eine Einreichung vor.' }
  }
  if ((zu.hw_status ?? '').toLowerCase() === 'uebernommen') {
    return { ok: false, message: 'Dieses Angebot wurde bereits übernommen.' }
  }

  const handwerkerId = String(zu.handwerker_id ?? '').trim()
  if (!handwerkerId) return { ok: false, message: 'Handwerker fehlt.' }

  const upload = await uploadHwAngebotPdfFromCrm({
    handwerkerId,
    zuweisungId,
    file: pdf,
  })
  if (!upload.ok) return { ok: false, message: upload.message }

  const now = new Date().toISOString()
  const { error: upErr } = await supabaseAdmin
    .from('angebot_handwerker')
    .update({
      status: 'akzeptiert',
      antwort_at: now,
      hw_preis_netto: preisNetto,
      hw_preis_brutto: preisBrutto,
      hw_angebot_pdf_url: upload.path,
      hw_eingereicht_at: now,
      hw_status: 'eingereicht',
      hw_notiz: notiz,
    })
    .eq('id', zuweisungId)

  if (upErr) return { ok: false, message: upErr.message }

  revalidatePath(`/angebote/${angebotId}`)
  return { ok: true }
}

/**
 * CRM-Bestätigung: vereinbarten Preis übernehmen (Einkaufspreis + ggf. Auftrag), Mail an Handwerker.
 * Bei vorhandenem Auftrag: Rückgabe für Nachunternehmervertrag-Wizard (Unterlagen + PDF).
 */
export async function bestaetigeHandwerkerEinreichung(input: {
  angebotId: string
  zuweisungId: string
}): Promise<
  | {
      ok: true
      aktualisiert: number
      mailGesendet: boolean
      mailHinweis?: string
      openWizard?: {
        auftragId: string
        handwerkerId: string
        gewerkId: string
        zuweisungId: string
      }
    }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const angebotId = input.angebotId.trim()
  const zuweisungId = input.zuweisungId.trim()

  const { data: zu, error: zErr } = await supabase
    .from('angebot_handwerker')
    .select('id, hw_eingereicht_at, hw_status')
    .eq('id', zuweisungId)
    .eq('angebot_id', angebotId)
    .maybeSingle()

  if (zErr || !zu) return { ok: false, message: 'Zuweisung nicht gefunden' }
  if (!zu.hw_eingereicht_at?.trim()) {
    return { ok: false, message: 'Noch keine Einreichung — zuerst Portal oder manuell erfassen.' }
  }
  if ((zu.hw_status ?? '').toLowerCase() === 'uebernommen') {
    return { ok: true, aktualisiert: 0, mailGesendet: false, mailHinweis: 'Bereits übernommen.' }
  }
  if ((zu.hw_status ?? '').toLowerCase() === 'bestaetigt') {
    return {
      ok: true,
      aktualisiert: 0,
      mailGesendet: false,
      mailHinweis: 'Konditionen bereits übernommen — Partner muss im Portal noch bestätigen.',
    }
  }

  const { data: zuDetail } = await supabaseAdmin
    .from('angebot_handwerker')
    .select('hw_konditionen')
    .eq('id', zuweisungId)
    .maybeSingle()
  const hatKonditionen = Boolean(parseHwKonditionen(zuDetail?.hw_konditionen)?.positionen.length)

  const { data: auftrag } = await supabase
    .from('auftraege')
    .select('id')
    .eq('angebot_id', angebotId)
    .maybeSingle()

  let aktualisiert = 0
  const uebernahmeRes = await uebernehmeHandwerkerEinreichungEk({ angebotId, zuweisungId })
  if (!uebernahmeRes.ok) return uebernahmeRes
  aktualisiert = uebernahmeRes.aktualisiert

  const mail = await notifyPartnerHandwerkerAngebotBestaetigt(zuweisungId, {
    bitteBestaetigen: hatKonditionen,
  })
  const mailGesendet = mail.ok
  const mailHinweis = mail.ok ? undefined : mail.error

  if (auftrag?.id) {
    const { data: zuHw } = await supabaseAdmin
      .from('angebot_handwerker')
      .select('handwerker_id, gewerk_id')
      .eq('id', zuweisungId)
      .maybeSingle()

    if (zuHw?.handwerker_id && zuHw?.gewerk_id) {
      const { data: existingAh } = await supabaseAdmin
        .from('auftrag_handwerker')
        .select('id')
        .eq('auftrag_id', auftrag.id)
        .eq('handwerker_id', zuHw.handwerker_id)
        .maybeSingle()

      if (!existingAh?.id) {
        const { error: ahErr } = await supabaseAdmin.from('auftrag_handwerker').insert({
          auftrag_id: auftrag.id,
          handwerker_id: zuHw.handwerker_id,
          gewerk_id: zuHw.gewerk_id,
          status: 'zugewiesen',
        })
        if (ahErr) {
          console.warn('[bestaetigeHandwerkerEinreichung] auftrag_handwerker:', ahErr.message)
        }
      }

      provisionProjektvertragFireAndForget(
        auftrag.id as string,
        zuHw.handwerker_id as string
      )

      const erfordertVertrag = await auftragErfordertProjektvertrag(auftrag.id as string)

      return {
        ok: true,
        aktualisiert,
        mailGesendet,
        mailHinweis,
        ...(erfordertVertrag
          ? {
              openWizard: {
                auftragId: auftrag.id as string,
                handwerkerId: zuHw.handwerker_id as string,
                gewerkId: zuHw.gewerk_id as string,
                zuweisungId,
              },
            }
          : {}),
      }
    }
  }

  return { ok: true, aktualisiert, mailGesendet, mailHinweis }
}

export async function openHandwerkerAcceptWizard(input: {
  auftragId: string
  handwerkerId: string
  gewerkId: string
  zuweisungId: string
}) {
  return loadHandwerkerAcceptWizardBootstrap(input)
}

async function loadHandwerkerEinreichungZuweisung(
  angebotId: string,
  zuweisungId: string
): Promise<
  | {
      ok: true
      row: {
        id: string
        hw_eingereicht_at: string | null
        hw_status: string | null
        handwerker: { name: string; email: string | null } | null
        gewerke: { name: string } | null
      }
    }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const { data: zu, error } = await supabase
    .from('angebot_handwerker')
    .select(
      `
      id,
      hw_eingereicht_at,
      hw_status,
      handwerker(name, email),
      gewerke(name)
    `
    )
    .eq('id', zuweisungId)
    .eq('angebot_id', angebotId)
    .maybeSingle()

  if (error || !zu) return { ok: false, message: 'Zuweisung nicht gefunden' }
  if (!zu.hw_eingereicht_at?.trim()) {
    return { ok: false, message: 'Noch keine Einreichung vom Handwerker.' }
  }
  const hwSt = (zu.hw_status ?? '').toLowerCase()
  if (hwSt !== 'eingereicht') {
    return { ok: false, message: 'Nur eingereichte Angebote können geprüft werden.' }
  }

  const hwRaw = zu.handwerker as { name: string; email: string | null } | { name: string; email: string | null }[] | null
  const gwRaw = zu.gewerke as { name: string } | { name: string }[] | null
  const handwerker = Array.isArray(hwRaw) ? hwRaw[0] ?? null : hwRaw
  const gewerke = Array.isArray(gwRaw) ? gwRaw[0] ?? null : gwRaw

  return {
    ok: true,
    row: {
      id: zu.id as string,
      hw_eingereicht_at: zu.hw_eingereicht_at as string | null,
      hw_status: zu.hw_status as string | null,
      handwerker,
      gewerke,
    },
  }
}

/** CRM: Rückfrage zur Handwerker-Einreichung — Partner sieht Text im Portal und kann erneut einreichen. */
export async function rueckfrageHandwerkerEinreichung(input: {
  angebotId: string
  zuweisungId: string
  crmNotiz: string
  betreff?: string
  cc?: string[]
}): Promise<
  | { ok: true; mailGesendet: boolean; mailHinweis?: string }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const crmNotiz = input.crmNotiz.trim()
  if (!crmNotiz) return { ok: false, message: 'Bitte eine Nachricht an den Handwerker eingeben.' }

  const loaded = await loadHandwerkerEinreichungZuweisung(input.angebotId.trim(), input.zuweisungId.trim())
  if (!loaded.ok) return loaded

  const now = new Date().toISOString()
  const { error: upErr } = await supabaseAdmin
    .from('angebot_handwerker')
    .update({
      hw_status: 'rueckfrage',
      hw_crm_notiz: crmNotiz,
      hw_crm_antwort_at: now,
    })
    .eq('id', loaded.row.id)
    .eq('hw_status', 'eingereicht')

  if (upErr) return { ok: false, message: upErr.message }

  const mail = await notifyPartnerHandwerkerAngebotAntwort({
    anfrageId: loaded.row.id,
    typ: 'rueckfrage',
    crmNotiz,
    betreff: input.betreff?.trim() || undefined,
    cc: input.cc?.filter(Boolean),
  })

  revalidatePath(`/angebote/${input.angebotId.trim()}`)
  return {
    ok: true,
    mailGesendet: mail.ok,
    mailHinweis: mail.ok ? undefined : mail.error,
  }
}

/** CRM: Handwerker-Einreichung ablehnen — Partner kann neues Angebot einreichen. */
export async function ablehneHandwerkerEinreichung(input: {
  angebotId: string
  zuweisungId: string
  crmNotiz: string
  betreff?: string
  cc?: string[]
}): Promise<
  | { ok: true; mailGesendet: boolean; mailHinweis?: string }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet' }

  const crmNotiz = input.crmNotiz.trim()
  if (!crmNotiz) return { ok: false, message: 'Bitte einen Grund für den Handwerker eingeben.' }

  const loaded = await loadHandwerkerEinreichungZuweisung(input.angebotId.trim(), input.zuweisungId.trim())
  if (!loaded.ok) return loaded

  const now = new Date().toISOString()
  const { error: upErr } = await supabaseAdmin
    .from('angebot_handwerker')
    .update({
      hw_status: 'abgelehnt',
      hw_crm_notiz: crmNotiz,
      hw_crm_antwort_at: now,
    })
    .eq('id', loaded.row.id)
    .eq('hw_status', 'eingereicht')

  if (upErr) return { ok: false, message: upErr.message }

  const mail = await notifyPartnerHandwerkerAngebotAntwort({
    anfrageId: loaded.row.id,
    typ: 'abgelehnt',
    crmNotiz,
    betreff: input.betreff?.trim() || undefined,
    cc: input.cc?.filter(Boolean),
  })

  revalidatePath(`/angebote/${input.angebotId.trim()}`)
  return {
    ok: true,
    mailGesendet: mail.ok,
    mailHinweis: mail.ok ? undefined : mail.error,
  }
}

export async function acceptHandwerker(angebotId: string) {
  return setAngebotStatus(angebotId, 'handwerker_akzeptiert')
}

export async function sendAngebotToKunde(
  angebotId: string,
  options?: {
    to?: string[]
    cc?: string[]
    betreff?: string
    skipTimeline?: boolean
    asSystem?: boolean
    /** Status kunde_akzeptiert / angenommen beibehalten (Korrektur aus Auftrag) */
    statusBeibehalten?: boolean
    /** Handwerker-Pipeline nicht erneut prüfen (Korrektur) */
    skipHandwerkerGate?: boolean
  }
) {
  const supabase = options?.asSystem ? supabaseAdmin : createClient()
  const detail = await loadAngebotDetailAdmin(angebotId)
  if (!detail) {
    return { ok: false as const, message: 'Angebot nicht gefunden' }
  }
  if (
    !options?.skipHandwerkerGate &&
    !darfAngebotAnKundeSenden(detail.angebot_handwerker, detail.status)
  ) {
    const orgStatus = (detail.leads as { org_freigabe_status?: string } | null | undefined)
      ?.org_freigabe_status as import('@/lib/types').OrgFreigabeStatus | undefined
    return {
      ok: false as const,
      message: handwerkerSendenBlockierHinweis(detail.angebot_handwerker, orgStatus),
    }
  }
  const istKorrektur = Boolean(options?.statusBeibehalten || detail.gesendet_kunde_at)
  const kundenMail = detail.kunden?.email?.trim() ?? ''
  const toList =
    options?.to?.map((e) => e.trim()).filter(Boolean) ??
    (kundenMail ? [kundenMail] : [])
  if (!toList.length) {
    return { ok: false as const, message: 'Keine Empfänger-Adresse (An)' }
  }

  const pdf = await persistPdfForAngebot(angebotId, { detail, skipRevalidate: true })
  if (!pdf.ok) return pdf

  if (!options?.statusBeibehalten) {
    const st = await setAngebotStatus(angebotId, 'gesendet_kunde', { asSystem: options?.asSystem })
    if (!st.ok) return st
  }

  const now = new Date().toISOString()
  if (options?.statusBeibehalten) {
    await supabase
      .from('angebote')
      .update({
        gesendet_kunde_at: now,
        gesendet_am: now,
        status: 'kunde_akzeptiert',
        status_einfach: 'angenommen',
        updated_at: now,
      })
      .eq('id', angebotId)
  } else {
    await supabase
      .from('angebote')
      .update({
        gesendet_kunde_at: now,
        gesendet_am: now,
        status_einfach: 'gesendet',
        updated_at: now,
      })
      .eq('id', angebotId)
  }

  const posMail = normalizeAngebotPositionen(detail.positionen)
  const summenMail = summenAusPositionen(posMail, 19)
  const [firmMail, branding, statusLink, vizPreviewUrl] = await Promise.all([
    fetchFirmenEinstellungen(supabaseAdmin),
    getMailBranding(supabaseAdmin),
    projektOderStatusLink(detail.lead_id),
    loadKiVizMailPreviewUrl(angebotId),
  ])
  const gueltigTage = Math.max(1, parseInt(firmMail.angebot_gueltig_tage, 10) || 30)
  const gueltigFallback = new Date(
    Date.now() + gueltigTage * 24 * 60 * 60 * 1000
  ).toLocaleDateString('de-DE')
  const gueltig = detail.gueltig_bis
    ? (() => {
        try {
          return new Date(detail.gueltig_bis as string).toLocaleDateString('de-DE')
        } catch {
          return gueltigFallback
        }
      })()
    : gueltigFallback

  const kundenEmpfaenger = kundeRechnungsempfaengerAusStammdaten(detail.kunden, {
    plz: detail.leads?.plz ?? null,
    kontakt_name: detail.leads?.kontakt_name ?? null,
  })
  const portalLink = detail.kunde_id ? buildPortalLoginLink() : null
  const portalAudience = portalAudienceFromKunde(detail.kunden)
  const kundenAnrede = kundeAnredeKontextFromEmpfaenger(kundenEmpfaenger)
  const angebotNr = detail.angebotsnr?.trim()
  const wizardMeta = parseWizardMetaFromNotizen(detail.notizen)
  const kundeTyp = resolveAngebotKundeTyp(detail.kunden?.typ, detail.leads?.kundentyp)
  const anrede = parseAngebotAnrede(detail.notizen, kundeTyp)
  const leistungsumfang =
    detail.leistungsumfang?.trim() ||
    wizardMeta?.leistungsumfang?.trim() ||
    detail.notizen?.trim()?.slice(0, 80) ||
    'Ihr Projekt'

  const betreffOverride = options?.betreff?.trim()
  const tpl = angebotNr
    ? {
        betreff:
          betreffOverride ||
          angebotMailBetreff(anrede, angebotNr, branding.firmenname),
        html: buildAngebotMail(
          {
            ...kundenAnrede,
            angebotsnr: angebotNr,
            leistungsumfang,
            gesamt_brutto: summenMail.bruttoMin,
            gueltig_bis: gueltig,
            anrede,
            einleitung: wizardMeta?.einleitung,
            schluss: wizardMeta?.schluss,
            istKorrektur,
            portalLink: portalLink ?? undefined,
            portalAudience,
            visualisierung_vorschau_url: vizPreviewUrl,
          },
          branding
        ),
      }
    : mailAngebot(
        {
          name: kundenAnrede.name,
          positionen: posMail,
          gesamt_min: summenMail.nettoMin,
          gesamt_max: summenMail.nettoMax,
          lohn_gesamt: summenKostenaufstellungAusPositionen(posMail)?.lohn_netto ?? 0,
          gueltig_bis: gueltig,
          statusLink,
          kundeTyp,
          visualisierung_vorschau_url: vizPreviewUrl,
        },
        branding
      )

  const pdfAttachmentName = angebotNr
    ? `Angebot_${angebotNr}_Baerenwald.pdf`
    : `angebot-${angebotId}.pdf`

  const mail = await sendMail({
    typ: 'angebot',
    an: toList.length === 1 ? toList[0]! : toList,
    anName: detail.kunden?.name ?? null,
    cc: options?.cc,
    betreff: betreffOverride || tpl.betreff,
    html: tpl.html,
    pdfBuffer: pdf.buffer,
    pdfName: pdfAttachmentName,
    kundeId: detail.kunde_id,
    leadId: detail.lead_id,
    angebotId,
  })
  if (!mail.success) return { ok: false as const, message: mail.error ?? 'Versand fehlgeschlagen' }

  if (detail.lead_id && !options?.skipTimeline) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const betreff = betreffOverride || tpl.betreff
    const tl = await insertLeadTimelineEvent(supabaseAdmin, {
      lead_id: detail.lead_id,
      angebot_id: angebotId,
      typ: 'email',
      titel: istKorrektur ? 'Korrigiertes Angebot gesendet' : 'Angebot gesendet',
      beschreibung: `${betreff} · An ${toList.join(', ')}`,
      email_log_id: mail.emailLogId ?? null,
      erstellt_von: user?.id ?? null,
    })
    if (!tl.ok) console.warn('[sendAngebotToKunde] timeline:', tl.message)
    revalidatePath(`/anfragen/${detail.lead_id}`)
  }

  return { ok: true as const }
}

export async function markKundeAbgelehnt(angebotId: string) {
  return setAngebotStatus(angebotId, 'abgelehnt')
}

export async function recordKundeAbgelehntMitDetails(
  angebotId: string,
  input: {
    grund: string
    konkurrenz_preis_eur: number | null
    notiz: string | null
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: row } = await supabase
    .from('angebote')
    .select('id, status')
    .eq('id', angebotId)
    .maybeSingle()
  if (!row) return { ok: false, message: 'Angebot nicht gefunden' }
  if (row.status !== 'gesendet_kunde') {
    return { ok: false, message: 'Ablehnung nur bei Status „Gesendet Kunde“ möglich.' }
  }
  if (!isKundeAblehnungGrund(input.grund)) {
    return { ok: false, message: 'Ungültiger Ablehnungsgrund.' }
  }
  const kp =
    input.konkurrenz_preis_eur != null && Number.isFinite(input.konkurrenz_preis_eur)
      ? Math.round(input.konkurrenz_preis_eur * 100) / 100
      : null
  const { error } = await supabase
    .from('angebote')
    .update({
      status: 'abgelehnt' as AngebotStatus,
      ablehnung_grund: input.grund,
      ablehnung_konkurrenz_preis: kp,
      ablehnung_notiz: input.notiz?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', angebotId)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/angebote')
  revalidatePath(`/angebote/${angebotId}`)
  revalidatePath('/')
  return { ok: true }
}

export async function schliesseLeadNachAngebotVerlust(
  angebotId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: a } = await supabase
    .from('angebote')
    .select('lead_id, status')
    .eq('id', angebotId)
    .maybeSingle()
  if (!a?.lead_id) return { ok: false, message: 'Kein Lead mit diesem Angebot verknüpft.' }
  if (a.status !== 'abgelehnt') {
    return { ok: false, message: 'Angebot ist nicht als abgelehnt markiert.' }
  }
  const { error } = await supabase
    .from('leads')
    .update({ status: 'abgebrochen', updated_at: new Date().toISOString() })
    .eq('id', a.lead_id)
  if (error) return { ok: false, message: error.message }
  revalidatePath(`/anfragen/${a.lead_id}`)
  revalidatePath('/anfragen')
  revalidatePath(`/angebote/${angebotId}`)
  revalidatePath('/')
  return { ok: true }
}

export async function sendAngebotNachfassManuell(
  angebotId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const detail = await loadAngebotDetail(angebotId)
  if (!detail) return { ok: false, message: 'Angebot nicht gefunden.' }
  if (detail.nachgefasst_am) {
    return { ok: false, message: 'Nachfass wurde bereits gesendet.' }
  }
  const st = detail.status_einfach ?? detail.status
  if (st !== 'gesendet' && detail.status !== 'gesendet_kunde') {
    return { ok: false, message: 'Nachfassen nur bei gesendeten Angeboten möglich.' }
  }

  const mail = await sendAngebotNachfassMailById(angebotId)
  if (!mail.ok) return mail
  if ('skipped' in mail && mail.skipped) {
    return { ok: false, message: 'Nachfass wurde bereits gesendet.' }
  }

  revalidatePath(`/angebote/${angebotId}`)
  revalidatePath('/angebote')
  revalidatePath('/kalender')
  revalidatePath('/')
  if (detail.lead_id) revalidatePath(`/anfragen/${detail.lead_id}`)
  return { ok: true }
}

/** @deprecated Nutze sendAngebotNachfassManuell — kein Kalender-Termin mehr. */
export async function planNachfassenTerminFuerAngebot(input: {
  angebotId: string
  datum: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  void input.datum
  return sendAngebotNachfassManuell(input.angebotId)
}

export type HandwerkerGewerkListeEintrag = {
  id: string
  name: string
  firma: string | null
  telefon: string | null
  letzter_einsatz: string | null
  verfuegbar: boolean
}

export async function listHandwerkerFuerGewerk(
  gewerkId: string,
  opts?: { asSystem?: boolean }
): Promise<
  { ok: true; handwerker: HandwerkerGewerkListeEintrag[] } | { ok: false; message: string }
> {
  const supabase = opts?.asSystem ? supabaseAdmin : createClient()
  const { data: gw, error: gErr } = await supabase
    .from('gewerke')
    .select('slug')
    .eq('id', gewerkId)
    .maybeSingle()
  if (gErr || !gw?.slug) return { ok: false, message: 'Gewerk nicht gefunden' }

  const { data: allHw, error: hErr } = await supabase
    .from('handwerker')
    .select('id, name, firma, telefon, gewerke, aktiv')
    .eq('aktiv', true)
  if (hErr) return { ok: false, message: hErr.message }

  const slug = gw.slug as string
  const filtered = filterHandwerkerFuerGewerkSlug(
    (allHw ?? []) as { id: string; gewerke?: string[] | null; name: string; firma: string | null; telefon: string | null }[],
    slug
  )

  const ids = filtered.map((h) => h.id)
  const lastByHw = new Map<string, string>()
  const busyIds = new Set<string>()
  if (ids.length) {
    const { data: ah } = await supabase
      .from('auftrag_handwerker')
      .select('handwerker_id, auftraege(created_at, status)')
      .in('handwerker_id', ids)
    for (const row of ah ?? []) {
      const hid = row.handwerker_id as string
      const auf = row.auftraege as { created_at?: string; status?: string } | { created_at?: string; status?: string }[] | null
      const a = Array.isArray(auf) ? auf[0] : auf
      if (a?.created_at) {
        const cur = lastByHw.get(hid)
        if (!cur || a.created_at > cur) lastByHw.set(hid, a.created_at)
      }
      if (a?.status === 'offen' || a?.status === 'in_arbeit') busyIds.add(hid)
    }
  }

  return {
    ok: true,
    handwerker: filtered.map((h) => ({
      id: h.id as string,
      name: h.name as string,
      firma: (h.firma as string | null) ?? null,
      telefon: (h.telefon as string | null) ?? null,
      letzter_einsatz: lastByHw.get(h.id as string) ?? null,
      verfuegbar: !busyIds.has(h.id as string),
    })),
  }
}

export async function replaceAngebotHandwerkerUndSenden(input: {
  angebotId: string
  alteZuweisungId: string
  neuerHandwerkerId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: zuAlt, error: zErr } = await supabase
    .from('angebot_handwerker')
    .select('id, gewerk_id, handwerker_id, status')
    .eq('id', input.alteZuweisungId)
    .eq('angebot_id', input.angebotId)
    .maybeSingle()

  if (zErr || !zuAlt) return { ok: false, message: 'Zuweisung nicht gefunden' }
  if (zuAlt.status !== 'abgelehnt') {
    return { ok: false, message: 'Nur abgelehnte Zuweisungen können ersetzt werden.' }
  }
  if (zuAlt.handwerker_id === input.neuerHandwerkerId) {
    return { ok: false, message: 'Bitte eine andere Handwerkerin auswählen.' }
  }

  const { data: gw } = await supabase
    .from('gewerke')
    .select('slug')
    .eq('id', zuAlt.gewerk_id)
    .maybeSingle()
  const { data: hwNeu } = await supabase
    .from('handwerker')
    .select('id, gewerke, aktiv')
    .eq('id', input.neuerHandwerkerId)
    .maybeSingle()

  if (!gw?.slug || !hwNeu?.aktiv) return { ok: false, message: 'Daten ungültig' }
  const slugs = (hwNeu.gewerke as string[] | null) ?? []
  if (!slugs.includes(gw.slug as string)) {
    return { ok: false, message: 'Handwerker deckt dieses Gewerk nicht ab.' }
  }

  const { error: upAlt } = await supabase
    .from('angebot_handwerker')
    .update({ status: 'ersetzt' })
    .eq('id', input.alteZuweisungId)
  if (upAlt) return { ok: false, message: upAlt.message }

  const { data: inserted, error: insErr } = await supabase
    .from('angebot_handwerker')
    .insert({
      angebot_id: input.angebotId,
      gewerk_id: zuAlt.gewerk_id,
      handwerker_id: input.neuerHandwerkerId,
      status: 'ausstehend',
    })
    .select(
      `
      id,
      angebot_id,
      gewerk_id,
      token,
      status,
      handwerker(id, name, email, telefon),
      gewerke(name)
    `
    )
    .single()

  if (insErr || !inserted) {
    return { ok: false, message: insErr?.message ?? 'Einfügen fehlgeschlagen' }
  }

  const detail = await loadAngebotDetailAdmin(input.angebotId)
  if (!detail?.kunden) {
    return { ok: false, message: 'Angebot nicht gefunden' }
  }

  const send = await sendHandwerkerAnfrageFuerZuweisung(
    detail,
    inserted as Record<string, unknown>,
    true
  )
  if (!send.ok) {
    return { ok: false, message: send.message }
  }

  revalidatePath(`/angebote/${input.angebotId}`)
  revalidatePath('/angebote')
  revalidatePath('/')
  return { ok: true }
}

function addDaysIso(ymd: string, n: number): string {
  const d = new Date(ymd.includes('T') ? ymd : `${ymd}T12:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function defaultStartDatum(): string {
  return addDaysIso(new Date().toISOString().slice(0, 10), 7)
}

export type CreateAuftragFromAngebotOptions = {
  start_datum: string | null
  end_datum: string | null
  notizen: string | null
  send_kunden_email: boolean
  send_handwerker_email: boolean
  betreff?: string
  to?: string[]
  cc?: string[]
}

export async function createAuftragFromAngebot(
  angebotId: string,
  opts?: Partial<CreateAuftragFromAngebotOptions>
): Promise<{ ok: true; auftragId: string } | { ok: false; message: string }> {
  const angebot = await loadAngebotDetailAdmin(angebotId)
  if (!angebot?.kunden) return { ok: false, message: 'Angebot nicht gefunden' }
  if (angebot.status !== 'kunde_akzeptiert') {
    return { ok: false, message: 'Auftrag nur nach Kundenakzept möglich.' }
  }

  const start = opts?.start_datum?.trim() || defaultStartDatum()
  const end = opts?.end_datum?.trim() || addDaysIso(start, 14)
  const notizenAuftrag = opts?.notizen?.trim() || null
  const sendKunde = opts?.send_kunden_email ?? true
  const sendHw = opts?.send_handwerker_email ?? true

  let pos = normalizeAngebotPositionen(angebot.positionen)
  const gewerkNamen = Array.from(new Set(pos.map((p) => p.gewerk_name).filter(Boolean)))
  const titel = `${gewerkNamen.join(', ')} — ${angebot.kunden.name}`.slice(0, 240)

  const hwRows = (angebot.angebot_handwerker ?? []).filter((h) => h.status === 'akzeptiert')

  const kundenToken = randomBytes(32).toString('hex')

  const zahlungsplanRaw = (angebot as { zahlungsplan?: unknown }).zahlungsplan
  let zahlungsplan = parseZahlungsplan(zahlungsplanRaw)
  if (!zahlungsplan && angebot.zahlungsbedingungen === 'anzahlung_50') {
    zahlungsplan = zahlungsplanVorlage50_50()
  }

  const supabaseAuth = createClient()
  const {
    data: { user: authUser },
  } = await supabaseAuth.auth.getUser()

  let istBauprojekt = false
  if (angebot.lead_id) {
    const { data: leadRow } = await supabaseAdmin
      .from('leads')
      .select('ist_bauprojekt')
      .eq('id', angebot.lead_id)
      .maybeSingle()
    istBauprojekt = leadRow?.ist_bauprojekt === true
  }

  const { data: auftrag, error: aErr } = await supabaseAdmin
    .from('auftraege')
    .insert({
      angebot_id: angebotId,
      lead_id: angebot.lead_id,
      kunde_id: angebot.kunde_id,
      status: 'offen',
      titel,
      notizen: notizenAuftrag,
      start_datum: start,
      end_datum: end,
      abnahme_datum: null,
      abnahme_protokoll_url: null,
      kunden_token: kundenToken,
      fortschritt: 0,
      betreuer_id: authUser?.id ?? null,
      zahlungsplan: zahlungsplan ?? null,
      ist_bauprojekt: istBauprojekt,
    })
    .select('id, kunden_token')
    .single()

  if (aErr || !auftrag) return { ok: false, message: aErr?.message ?? 'Auftrag fehlgeschlagen' }

  const auftragId = auftrag.id as string
  const projektLink = projektUrlFromToken((auftrag as { kunden_token?: string }).kunden_token ?? kundenToken)

  const postInsertTasks: Array<PromiseLike<unknown>> = []

  let angebotPosDirty = false
  for (const h of angebot.angebot_handwerker ?? []) {
    if (!hasHwEinreichung(h)) continue
    if ((h.hw_status ?? '').toLowerCase() === 'uebernommen') continue
    const k = parseHwKonditionen(h.hw_konditionen)
    if (k) {
      const applied = applyVereinbarteKonditionenToAngebotPositionen(pos, k)
      pos = applied.positionen
      if (applied.aktualisiert > 0) angebotPosDirty = true
    } else {
      const ek = ekNettoFromHwEinreichung(h)
      if (ek != null && ek > 0) {
        const applied = applyLegacyGewerkZeileToAngebotPositionen(pos, h.gewerk_id, ek)
        pos = applied.positionen
        if (applied.aktualisiert > 0) angebotPosDirty = true
      }
    }
  }
  if (angebotPosDirty) {
    postInsertTasks.push(
      supabaseAdmin
        .from('angebote')
        .update({ positionen: pos })
        .eq('id', angebotId)
        .then(({ error }) => {
          if (error) throw new Error(error.message)
        })
    )
  }

  if (hwRows.length) {
    postInsertTasks.push(
      supabaseAdmin
        .from('auftrag_handwerker')
        .insert(
          hwRows.map((h) => ({
            auftrag_id: auftragId,
            handwerker_id: h.handwerker_id,
            gewerk_id: h.gewerk_id,
            status: 'zugewiesen',
          }))
        )
        .then(({ error: hErr }) => {
          if (hErr) throw new Error(hErr.message)
        })
    )
  }

  const gewerkEk = buildGewerkEkMap(angebot.angebot_handwerker ?? [])
  const posRows = angebotPositionenToAuftragRows(auftragId, pos, {
    gewerkEkByGewerkId: gewerkEk,
  })
  if (posRows.length) {
    postInsertTasks.push(
      supabaseAdmin.from('auftrag_positionen').insert(posRows).then(({ error: posErr }) => {
        if (posErr) console.warn('[auftrag_positionen]', posErr.message)
      })
    )
  }

  const eingereichtIds = (angebot.angebot_handwerker ?? [])
    .filter((h) => {
      if (!hasHwEinreichung(h)) return false
      if ((h.hw_status ?? '').toLowerCase() === 'uebernommen') return false
      const k = parseHwKonditionen(h.hw_konditionen)
      if (k?.positionen.some((p) => p.hw_netto > 0)) return true
      const ek = ekNettoFromHwEinreichung(h)
      return ek != null && ek > 0
    })
    .map((h) => h.id)
  if (eingereichtIds.length) {
    const now = new Date().toISOString()
    postInsertTasks.push(
      supabaseAdmin
        .from('angebot_handwerker')
        .update({ hw_status: 'uebernommen', hw_crm_antwort_at: now })
        .in('id', eingereichtIds)
        .then(({ error }) => {
          if (error) throw new Error(error.message)
        })
    )
  }

  postInsertTasks.push(
    insertKalenderAutoTermine(
      [
        {
          titel: `Start: ${titel}`,
          datum: start,
          typ: 'beginn',
          lead_id: angebot.lead_id ?? null,
          auftrag_id: auftragId,
        },
        {
          titel: `Abnahme: ${titel}`,
          datum: end,
          typ: 'abnahme',
          lead_id: angebot.lead_id ?? null,
          auftrag_id: auftragId,
        },
      ],
      { skipRevalidate: true }
    )
  )

  if (angebot.lead_id) {
    postInsertTasks.push(
      supabaseAdmin
        .from('leads')
        .update({ status: 'auftrag', updated_at: new Date().toISOString() })
        .eq('id', angebot.lead_id)
        .then(({ error }) => {
          if (error) throw new Error(error.message)
        })
    )
  }

  const brandingPromise = getMailBranding(supabaseAdmin)

  try {
    await Promise.all(postInsertTasks)
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Auftrag-Anlage fehlgeschlagen' }
  }

  const vertragRes = await provisionProjektVertraegeFuerAuftrag(auftragId)
  if (!vertragRes.ok) {
    console.warn('[createAuftragFromAngebot] projektvertrag:', vertragRes.message)
  } else if (vertragRes.provisioned > 0) {
    console.info('[createAuftragFromAngebot] projektvertraege:', vertragRes.provisioned)
  }

  const branding = await brandingPromise
  const kunde = angebot.kunden
  const plzKunde = kunde.plz?.trim() || angebot.leads?.plz?.trim() || '—'
  const empfaenger = kundeRechnungsempfaengerAusStammdaten(kunde, {
    plz: angebot.leads?.plz ?? null,
    kontakt_name: angebot.leads?.kontakt_name ?? null,
  })
  const wizardMeta = parseWizardMetaFromNotizen(angebot.notizen)
  const anrede =
    wizardMeta?.anrede ??
    parseAngebotAnrede(
      angebot.notizen,
      resolveAngebotKundeTyp(kunde?.typ, angebot.leads?.kundentyp)
    )
  const leistungsumfang =
    angebot.leistungsumfang?.trim() ||
    wizardMeta?.leistungsumfang?.trim() ||
    gewerkNamen.join(', ') ||
    'Ihr Projekt'
  const summen = summenAusPositionen(pos, 19)
  const bruttoFmt = `${summen.bruttoMin.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`

  if (sendKunde && kunde.email?.trim()) {
    const toList =
      opts?.to?.map((e) => e.trim()).filter(Boolean) ??
      (kunde.email?.trim() ? [kunde.email.trim()] : [])
    if (!toList.length) {
      return { ok: false, message: 'Keine Empfänger-Adresse (An)' }
    }
    const tplK = auftragsbestaetigungMailFromEmpfaenger({
      empfaenger,
      anrede,
      gewerke: gewerkNamen.length ? gewerkNamen : ['Ihr Projekt'],
      leistungsumfang,
      startDatum: formatDatumDeFromIso(start),
      endDatum: formatDatumDeFromIso(end),
      bruttoSumme: bruttoFmt,
      statusLink: projektLink,
      branding,
    })
    const betreff = opts?.betreff?.trim() || tplK.betreff
    const mailRes = await sendMail({
      typ: 'auftragsbestaetigung',
      an: toList.length === 1 ? toList[0]! : toList,
      anName: kunde.name,
      cc: opts?.cc,
      betreff,
      html: tplK.html,
      kundeId: angebot.kunde_id,
      leadId: angebot.lead_id,
      angebotId,
      auftragId,
    })
    if (!mailRes.success) {
      return { ok: false, message: mailRes.error ?? 'Kunden-Mail fehlgeschlagen' }
    }
    if (angebot.lead_id && mailRes.emailLogId) {
      const tl = await insertLeadTimelineEvent(supabaseAdmin, {
        lead_id: angebot.lead_id,
        angebot_id: angebotId,
        typ: 'email',
        titel: 'Auftragsbestätigung gesendet',
        beschreibung: `${betreff} · An ${toList.join(', ')}`,
        email_log_id: mailRes.emailLogId,
      })
      if (!tl.ok) console.warn('[createAuftragFromAngebot] timeline:', tl.message)
    }
  }

  if (sendHw) {
    const partnerLink = buildPartnerLoginLink()
    await Promise.all(
      hwRows.map(async (z) => {
        const email = z.handwerker?.email?.trim()
        if (!email) return
        const gewerkName = z.gewerke?.name ?? 'Gewerk'
        const posFiltered = pos.filter((p) => p.gewerk_id === z.gewerk_id)
        const zeitraum =
          notizenAuftrag?.trim() != null && notizenAuftrag.trim() !== ''
            ? `${formatDatumDeFromIso(start)} – ${formatDatumDeFromIso(end)} · ${notizenAuftrag.trim()}`
            : `${formatDatumDeFromIso(start)} – ${formatDatumDeFromIso(end)}`
        const tplH = mailHandwerkerAnfrage(
          {
            name: z.handwerker?.name ?? 'Guten Tag',
            gewerk: gewerkName,
            plz: plzKunde,
            zeitraum,
            positionen: (posFiltered.length ? posFiltered : pos).map((p) => ({
              beschreibung: [p.beschreibung || p.leistung, `${p.menge} ${p.einheit}`].filter(Boolean).join(' · '),
            })),
            link: partnerLink,
          },
          branding
        )
        await sendMail({
          typ: 'handwerker_anfrage',
          an: email,
          anName: z.handwerker?.name ?? null,
          betreff: tplH.betreff,
          html: tplH.html,
          kundeId: angebot.kunde_id,
          leadId: angebot.lead_id,
          angebotId,
          auftragId,
        })
      })
    )
  }

  const timelineTasks: Array<PromiseLike<unknown>> = [
    insertAuftragTimelineEvent({
      auftrag_id: auftragId,
      typ: 'auftrag_erstellt',
      titel: 'Auftrag erstellt',
      beschreibung: `Aus Angebot ${angebotId.slice(0, 8).toUpperCase()} · ${titel}`,
    }),
    supabaseAdmin
      .from('auftrag_milestones')
      .insert({
        auftrag_id: auftragId,
        titel: 'Auftrag erstellt',
        erledigt: true,
        erledigt_at: new Date().toISOString(),
        fuer_kunden_sichtbar: true,
        ist_system: true,
        sort_order: 0,
      })
      .then(({ error }) => {
        if (error) console.warn('[auftrag_milestones]', error.message)
      }),
  ]

  if (sendKunde && kunde.email?.trim()) {
    timelineTasks.push(
      insertAuftragTimelineEvent({
        auftrag_id: auftragId,
        typ: 'mail_kunde',
        titel: 'E-Mail an Kundin (Auftragsbestätigung)',
        beschreibung: `An ${kunde.email.trim()}`,
        sichtbar_fuer_kunde: true,
      })
    )
  }

  if (sendHw) {
    for (const z of hwRows) {
      const email = z.handwerker?.email?.trim()
      if (!email) continue
      timelineTasks.push(
        insertAuftragTimelineEvent({
          auftrag_id: auftragId,
          typ: 'mail_handwerker',
          titel: `E-Mail an Handwerker: ${z.handwerker?.name ?? '—'}`,
          beschreibung: `An ${email}`,
          handwerker_id: z.handwerker_id,
        })
      )
    }
  }

  await Promise.all(timelineTasks)

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath(`/angebote/${angebotId}`)
  if (angebot.lead_id) revalidatePath(`/anfragen/${angebot.lead_id}`)
  revalidatePath('/kalender')

  return { ok: true, auftragId }
}

export async function markKundeAkzeptiert(
  angebotId: string,
  opts?: { asSystem?: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = opts?.asSystem ? supabaseAdmin : createClient()
  const user = opts?.asSystem
    ? null
    : (
        await supabase.auth.getUser()
      ).data.user

  const { data: row } = await supabase
    .from('angebote')
    .select('id, status, lead_id, kunden(name)')
    .eq('id', angebotId)
    .maybeSingle()
  if (!row) return { ok: false, message: 'Angebot nicht gefunden' }
  if (row.status !== 'gesendet_kunde') {
    return { ok: false, message: 'Nur bei Status „Gesendet Kunde“ möglich.' }
  }

  const st = await setAngebotStatus(angebotId, 'kunde_akzeptiert', { asSystem: opts?.asSystem })
  if (!st.ok) return st

  await supabase
    .from('angebote')
    .update({ status_einfach: 'angenommen', updated_at: new Date().toISOString() })
    .eq('id', angebotId)

  const leadId = row.lead_id as string | null
  if (leadId) {
    const kunde = row.kunden as { name?: string } | null
    const kundeName = kunde?.name?.trim() || 'Kundin/Kunde'

    const { data: lead } = await supabase
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .maybeSingle()

    const leadStatus = (lead?.status ?? 'neu') as LeadStatus
    if (leadStatusVorAngebot(leadStatus)) {
      if (opts?.asSystem) {
        await supabaseAdmin
          .from('leads')
          .update({ status: 'angebot', updated_at: new Date().toISOString() })
          .eq('id', leadId)
      } else {
        const upd = await updateLeadStatus(leadId, 'angebot', 'Angebot vom Kunden angenommen')
        if (!upd.ok) return upd
      }
    }

    const { error: tlErr } = await supabase.from('lead_timeline').insert({
      lead_id: leadId,
      typ: 'angebot_angenommen',
      titel: 'Angebot vom Kunden angenommen',
      beschreibung: kundeName,
      erstellt_von: user?.id ?? null,
    })
    if (tlErr) console.warn('lead_timeline angebot_angenommen:', tlErr.message)

    if (!opts?.asSystem) {
      revalidatePath(`/anfragen/${leadId}`)
      revalidatePath('/anfragen')
    }
  }

  if (!opts?.asSystem) revalidatePath('/')
  return { ok: true }
}

async function buildAngebotAnnahmeMail(
  angebotId: string,
  betreffOverride?: string
): Promise<
  | {
      ok: true
      html: string
      betreff: string
      defaultTo: string[]
      defaultCc: string[]
      kundeName: string
      detail: AngebotDetail
    }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const detail = await loadAngebotDetail(angebotId)
  if (!detail) return { ok: false, message: 'Angebot nicht gefunden' }

  const pos = normalizeAngebotPositionen(detail.positionen)
  if (!pos.length) return { ok: false, message: 'Keine Positionen im Angebot' }

  const branding = await getMailBranding(supabaseAdmin)
  const wizardMeta = parseWizardMetaFromNotizen(detail.notizen)
  const kundeTyp = resolveAngebotKundeTyp(detail.kunden?.typ, detail.leads?.kundentyp)
  const anrede = wizardMeta?.anrede ?? parseAngebotAnrede(detail.notizen, kundeTyp)
  const kundeName = detail.kunden?.name?.trim() || 'Kunde'
  const zeitraum = detail.leads?.zeitraum?.trim() || 'gemäß Vereinbarung'
  const to = detail.kunden?.email?.trim() ? [detail.kunden.email.trim()] : []
  const cc: string[] = []
  const zeilen = pos.map((p) => {
    const lineNetto = (p.lohn_netto + p.material_netto) * (p.menge || 1)
    const brutto = lineNetto * 1.19
    return {
      gewerk: p.gewerk_name || '—',
      leistung: (p.leistung_name || p.leistung || p.beschreibung || 'Leistung').trim(),
      preis: `${brutto.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
    }
  })
  const tpl = mailAngebotAnnahmeBestaetigung(
    {
      name: kundeName,
      anrede,
      zeilen,
      zeitraum,
    },
    branding
  )
  return {
    ok: true,
    html: tpl.html,
    betreff: betreffOverride?.trim() || tpl.betreff,
    defaultTo: to,
    defaultCc: cc,
    kundeName,
    detail,
  }
}

export async function previewAuftragsbestaetigungMail(input: {
  angebotId: string
  start_datum: string
  end_datum?: string | null
  betreff?: string
}): Promise<
  | { ok: true; html: string; betreff: string; defaultTo: string[]; defaultCc: string[] }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const detail = await loadAngebotDetail(input.angebotId)
  if (!detail?.kunden) return { ok: false, message: 'Angebot nicht gefunden' }

  const pos = normalizeAngebotPositionen(detail.positionen)
  const gewerkNamen = Array.from(new Set(pos.map((p) => p.gewerk_name).filter(Boolean)))
  const branding = await getMailBranding(supabaseAdmin)
  const empfaenger = kundeRechnungsempfaengerAusStammdaten(detail.kunden, {
    plz: detail.leads?.plz ?? null,
    kontakt_name: detail.leads?.kontakt_name ?? null,
  })
  const wizardMeta = parseWizardMetaFromNotizen(detail.notizen)
  const kundeTyp = resolveAngebotKundeTyp(detail.kunden?.typ, detail.leads?.kundentyp)
  const anrede = wizardMeta?.anrede ?? parseAngebotAnrede(detail.notizen, kundeTyp)
  const leistungsumfang =
    detail.leistungsumfang?.trim() ||
    wizardMeta?.leistungsumfang?.trim() ||
    gewerkNamen.join(', ') ||
    'Ihr Projekt'
  const summen = summenAusPositionen(pos, 19)
  const bruttoFmt = `${summen.bruttoMin.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
  const start = input.start_datum.trim()
  const end = input.end_datum?.trim() || addDaysIso(start, 14)
  const tpl = auftragsbestaetigungMailFromEmpfaenger({
    empfaenger,
    anrede,
    gewerke: gewerkNamen.length ? gewerkNamen : ['Ihr Projekt'],
    leistungsumfang,
    startDatum: formatDatumDeFromIso(start),
    endDatum: formatDatumDeFromIso(end),
    bruttoSumme: bruttoFmt,
    statusLink: null,
    previewMode: true,
    branding,
  })

  return {
    ok: true,
    html: tpl.html,
    betreff: input.betreff?.trim() || tpl.betreff,
    defaultTo: detail.kunden.email?.trim() ? [detail.kunden.email.trim()] : [],
    defaultCc: [],
  }
}

export async function previewAngebotAnnahmeMail(input: {
  angebotId: string
  betreff?: string
}): Promise<
  | { ok: true; html: string; betreff: string; defaultTo: string[]; defaultCc: string[] }
  | { ok: false; message: string }
> {
  const built = await buildAngebotAnnahmeMail(input.angebotId, input.betreff)
  if (!built.ok) return built
  return {
    ok: true,
    html: built.html,
    betreff: built.betreff,
    defaultTo: built.defaultTo,
    defaultCc: built.defaultCc,
  }
}

export async function markKundeAkzeptiertMitOptionen(input: {
  angebotId: string
  sendMail: boolean
  betreff?: string
  to?: string[]
  cc?: string[]
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (input.sendMail) {
    const built = await buildAngebotAnnahmeMail(input.angebotId, input.betreff)
    if (!built.ok) return built
    const to = input.to?.map((v) => v.trim()).filter(Boolean) ?? built.defaultTo
    if (!to.length) return { ok: false, message: 'Bitte mindestens eine Empfänger-Adresse in An angeben.' }
    const cc = input.cc?.map((v) => v.trim()).filter(Boolean) ?? built.defaultCc

    const mail = await sendMail({
      typ: 'auftragsbestaetigung',
      an: to.length === 1 ? to[0]! : to,
      anName: built.kundeName,
      cc,
      betreff: built.betreff,
      html: built.html,
      kundeId: built.detail.kunde_id,
      leadId: built.detail.lead_id,
      angebotId: input.angebotId,
    })
    if (!mail.success) return { ok: false, message: mail.error ?? 'Versand fehlgeschlagen' }
  }

  return markKundeAkzeptiert(input.angebotId)
}

export async function listAngebotVorlagen(): Promise<AngebotVorlage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('angebot_vorlagen')
    .select('*')
    .eq('aktiv', true)
    .order('name', { ascending: true })
  if (error) {
    console.warn('listAngebotVorlagen', error.message)
    return []
  }
  return (data ?? []).map((row) => ({
    ...(row as AngebotVorlage),
    positionen: normalizeAngebotPositionen((row as { positionen: unknown }).positionen),
  }))
}

function prepareVorlagePositionenForDb(
  positionen: AngebotPosition[],
  mitPreisen: boolean
): AngebotPosition[] {
  let pos = normalizeAngebotPositionen(positionen).map((p) => {
    const { handwerker_id, handwerker_name, ...rest } = p
    void handwerker_id
    void handwerker_name
    return rest
  })
  if (!mitPreisen) {
    pos = pos.map((p) => ({
      ...p,
      preis_typ: 'fix' as const,
      lohn_netto: 0,
      material_netto: 0,
      gesamt_min: 0,
      gesamt_max: 0,
      einkaufspreis: undefined,
    }))
  }
  return pos
}

export async function listAngebotVorlagenEinstellungen(): Promise<AngebotVorlage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('angebot_vorlagen')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('listAngebotVorlagenEinstellungen', error.message)
    return []
  }
  return (data ?? []).map((row) => ({
    ...(row as AngebotVorlage),
    positionen: normalizeAngebotPositionen((row as { positionen: unknown }).positionen),
  }))
}

export async function saveAngebotVorlage(
  name: string,
  beschreibung: string | null,
  positionen: AngebotPosition[],
  mitPreisen: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const pos = prepareVorlagePositionenForDb(positionen, mitPreisen)
  const summen = summenAusPositionen(pos, 19)
  const fix =
    Math.abs(summen.nettoMin - summen.nettoMax) < 0.01 ? summen.nettoMin : null
  const { error } = await supabase.from('angebot_vorlagen').insert({
    name: name.trim(),
    beschreibung: beschreibung?.trim() || null,
    positionen: pos,
    gesamt_min: summen.nettoMin,
    gesamt_max: summen.nettoMax,
    gesamt_fix: fix,
    aktiv: true,
    erstellt_von: user?.id ?? null,
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/angebote/neu')
  revalidatePath('/einstellungen/vorlagen')
  return { ok: true }
}

export async function updateAngebotVorlage(
  id: string,
  name: string,
  beschreibung: string | null,
  positionen: AngebotPosition[],
  mitPreisen: boolean
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const pos = prepareVorlagePositionenForDb(positionen, mitPreisen)
  const summen = summenAusPositionen(pos, 19)
  const fix =
    Math.abs(summen.nettoMin - summen.nettoMax) < 0.01 ? summen.nettoMin : null
  const { error } = await supabase
    .from('angebot_vorlagen')
    .update({
      name: name.trim(),
      beschreibung: beschreibung?.trim() || null,
      positionen: pos,
      gesamt_min: summen.nettoMin,
      gesamt_max: summen.nettoMax,
      gesamt_fix: fix,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/angebote/neu')
  revalidatePath('/einstellungen/vorlagen')
  return { ok: true }
}

export async function deleteAngebot(
  angebotId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = createClient()
  const { data: auf } = await supabase.from('auftraege').select('id').eq('angebot_id', angebotId).maybeSingle()
  if (auf) {
    return {
      error: 'Angebot kann nicht gelöscht werden — es existiert bereits ein Auftrag dazu.',
    }
  }
  const { data: ang } = await supabase.from('angebote').select('lead_id').eq('id', angebotId).maybeSingle()
  const { error: delHw } = await supabase.from('angebot_handwerker').delete().eq('angebot_id', angebotId)
  if (delHw) return { error: delHw.message }
  const { error } = await supabase.from('angebote').delete().eq('id', angebotId)
  if (error) return { error: error.message }
  revalidatePath('/angebote')
  revalidatePath(`/angebote/${angebotId}`)
  const leadId = (ang as { lead_id?: string | null } | null)?.lead_id
  if (leadId) revalidatePath(`/anfragen/${leadId}`)
  revalidatePath('/anfragen')
  return { success: true }
}

export async function deleteAngebotVorlage(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase.from('angebot_vorlagen').delete().eq('id', id)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/vorlagen')
  revalidatePath('/angebote/neu')
  return { ok: true }
}

export async function duplicateAngebotVorlage(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: row, error: loadErr } = await supabase
    .from('angebot_vorlagen')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (loadErr || !row) return { ok: false, message: loadErr?.message ?? 'Vorlage nicht gefunden' }

  const r = row as Record<string, unknown>
  const { error } = await supabase.from('angebot_vorlagen').insert({
    name: `Kopie: ${String(r.name ?? 'Vorlage')}`,
    beschreibung: (r.beschreibung as string | null) ?? null,
    positionen: r.positionen,
    gesamt_min: r.gesamt_min,
    gesamt_max: r.gesamt_max,
    gesamt_fix: r.gesamt_fix,
    aktiv: r.aktiv ?? true,
    erstellt_von: user?.id ?? null,
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/vorlagen')
  return { ok: true }
}

'use server'

import { revalidateAngebotDetail, revalidateAuftragDetail } from '@/lib/crm-revalidate'
import { COPY_ERROR } from '@/lib/copy/errors'
import { logDbError } from '@/lib/errors/log-db-error'
import { createNachtragManuell } from '@/app/(dashboard)/auftraege/nachtrag-baustopp-actions'
import { setWeitereArbeitAnerkennung } from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import { neuePositionsId, normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { insertAuftragTimelineEvent } from '@/lib/auftraege/timeline'
import {
  notifyPartnerUnified,
  partnerVorgangLink,
} from '@/lib/partner/notify-partner-unified'
import { signedHandwerkerUploadUrl } from '@/lib/partner/handwerker-uploads'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { writePartnerPositionsAnfrageStatus } from '@/lib/status/write-partner-positions-anfrage-status'
import type { AngebotPosition } from '@/lib/types'
import { formatEuro } from '@/lib/format/geld-datum'
import { regieKundenStundensatz } from '@/lib/auftraege/regie-display'
import {
  appendRegieMailWarnings,
  sendRegieEntscheidungMailsAfterWrite,
} from '@/lib/auftraege/send-regie-entscheidung-mails'

export type PartnerPositionsAnfrageRow = {
  id: string
  auftrag_id: string
  handwerker_id: string
  titel: string
  begruendung: string | null
  schaetzung_eur: number | null
  schaetzung_minuten: number | null
  status: string
  position_id: string | null
  nachtrag_id: string | null
  created_at: string
  handwerker_name?: string | null
}

export type WeitereArbeitInPruefungRow = {
  id: string
  leistung_name: string
  beschreibung: string | null
  handwerker_id: string | null
  handwerker_name: string | null
  created_at: string
  preis_partner?: number | null
  stundensatz?: number | null
  stundensatz_kunde?: number | null
  menge?: number | null
  einheit?: string | null
  foto_urls?: string[]
}

/** Snapshot für Regie-Korrektur vor Annehmen/Ablehnen. */
export type RegiePositionBearbeitenSnapshot = {
  id: string
  auftrag_id: string
  titel: string
  beschreibung: string | null
  stunden: number | null
  stundensatz: number | null
  stundensatz_kunde: number | null
  /** True wenn Kundensatz fehlte und mit Partnersatz vorbelegt wird. */
  keinAufschlagHinterlegt: boolean
}

async function crmAuth() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet.' }
  return { ok: true as const, userId: user.id }
}

export async function listPartnerPositionsAnfragen(
  auftragId: string
): Promise<PartnerPositionsAnfrageRow[]> {
  const { data, error } = await supabaseAdmin
    .from('partner_positions_anfragen')
    .select(
      'id, auftrag_id, handwerker_id, titel, begruendung, schaetzung_eur, schaetzung_minuten, status, position_id, nachtrag_id, created_at, handwerker:handwerker_id(name)'
    )
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: false })
  // begleitend: Listen-UI hat keinen Fehlerkanal — leere Liste statt Abbruch
  if (error) logDbError('app/auftraege/partner-positions-anfrage-actions:partner_positions_anfragen', error)

  if (error) return []

  return (data ?? []).map((r) => {
    const hw = r.handwerker as { name?: string | null } | { name?: string | null }[] | null
    const name = Array.isArray(hw) ? hw[0]?.name : hw?.name
    return {
      id: String(r.id),
      auftrag_id: String(r.auftrag_id),
      handwerker_id: String(r.handwerker_id),
      titel: String(r.titel),
      begruendung: (r.begruendung as string | null) ?? null,
      schaetzung_eur: r.schaetzung_eur != null ? Number(r.schaetzung_eur) : null,
      schaetzung_minuten:
        r.schaetzung_minuten != null ? Number(r.schaetzung_minuten) : null,
      status: String(r.status),
      position_id: (r.position_id as string | null) ?? null,
      nachtrag_id: (r.nachtrag_id as string | null) ?? null,
      created_at: String(r.created_at),
      handwerker_name: name ?? null,
    }
  })
}

export async function listWeitereArbeitInPruefung(
  auftragId: string
): Promise<WeitereArbeitInPruefungRow[]> {
  const { data, error } = await supabaseAdmin
    .from('auftrag_positionen')
    .select(
      'id, leistung_name, beschreibung, handwerker_id, anerkennung_status, typ, verguetung, preis_partner, stundensatz, stundensatz_kunde, menge, einheit, created_at, handwerker:handwerker_id(name)'
    )
    .eq('auftrag_id', auftragId)
    .eq('anerkennung_status', 'in_pruefung')
    .order('created_at', { ascending: false })
  // begleitend: Listen-UI hat keinen Fehlerkanal — leere Liste statt Abbruch
  if (error) logDbError('app/auftraege/partner-positions-anfrage-actions:auftrag_positionen', error)

  const rows = data ?? []
  if (!rows.length) return []

  const ids = rows.map((r) => String(r.id))
  const fotoByPos = new Map<string, string[]>()

  const { data: eintraege, error: error2 } = await supabaseAdmin
    .from('position_eintraege')
    .select('position_id, eintrag_fotos(storage_path)')
    .in('position_id', ids)
  // begleitend: Fotos optional — Liste der Positionen bleibt ohne sie korrekt
  if (error2) logDbError('app/auftraege/partner-positions-anfrage-actions:position_eintraege', error2)

  for (const e of eintraege ?? []) {
    const posId = String(e.position_id)
    const fotosRaw = Array.isArray(e.eintrag_fotos) ? e.eintrag_fotos : []
    for (const f of fotosRaw) {
      const path = String(
        (f as { storage_path?: string | null }).storage_path ?? ''
      ).trim()
      if (!path) continue
      const url =
        (await signedHandwerkerUploadUrl(path)) ??
        (/^https?:\/\//i.test(path) ? path : null)
      if (!url) continue
      const list = fotoByPos.get(posId) ?? []
      if (!list.includes(url)) list.push(url)
      fotoByPos.set(posId, list)
    }
  }

  return rows.map((r) => {
    const hw = r.handwerker as { name?: string | null } | { name?: string | null }[] | null
    const name = Array.isArray(hw) ? hw[0]?.name : hw?.name
    const id = String(r.id)
    return {
      id,
      leistung_name: String(r.leistung_name ?? ''),
      beschreibung: (r.beschreibung as string | null) ?? null,
      handwerker_id: (r.handwerker_id as string | null) ?? null,
      handwerker_name: name ?? null,
      created_at: String(r.created_at ?? ''),
      preis_partner: r.preis_partner != null ? Number(r.preis_partner) : null,
      stundensatz: r.stundensatz != null ? Number(r.stundensatz) : null,
      stundensatz_kunde:
        r.stundensatz_kunde != null ? Number(r.stundensatz_kunde) : null,
      menge: r.menge != null ? Number(r.menge) : null,
      einheit: (r.einheit as string | null) ?? null,
      foto_urls: fotoByPos.get(id) ?? [],
    }
  })
}

type DecideResult = { ok: true; message?: string } | { ok: false; message: string }

async function loadAnfrage(id: string) {
  const { data, error } = await supabaseAdmin
    .from('partner_positions_anfragen')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  // tragend: Aufrufer bricht bei null ab („Anfrage nicht offen“)
  if (error) {
    logDbError('app/auftraege/partner-positions-anfrage-actions:partner_positions_anfragen', error)
    return null
  }
  return data
}

async function auftragTitel(auftragId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('auftraege')
    .select('titel')
    .eq('id', auftragId)
    .maybeSingle()
  // begleitend: Anzeige-/Mail-Titel — Fallback „Auftrag“ reicht
  if (error) logDbError('app/auftraege/partner-positions-anfrage-actions:auftraege', error)
  return String(data?.titel ?? '').trim() || 'Auftrag'
}

/**
 * Angenommene Partner-Nacharbeit auch ins verknüpfte Angebot schreiben,
 * damit „Angebot bearbeiten“ / Wizard die Position zum Kundenversand hat.
 */
async function resolveAngebotIdForAuftrag(auftragId: string): Promise<string | null> {
  const { data: auftrag, error } = await supabaseAdmin
    .from('auftraege')
    .select('angebot_id, lead_id')
    .eq('id', auftragId)
    .maybeSingle()
  // tragend für append — Aufrufer wertet null/Fehler über Append-Ergebnis
  if (error) {
    logDbError('app/auftraege/partner-positions-anfrage-actions:auftraege', error)
    return null
  }

  const direct = String(auftrag?.angebot_id ?? '').trim()
  if (direct) return direct

  const leadId = String(auftrag?.lead_id ?? '').trim()
  if (!leadId) return null

  const { data: ang, error: angErr } = await supabaseAdmin
    .from('angebote')
    .select('id')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  // tragend: ohne Angebot-ID kein Append
  if (angErr) {
    logDbError('app/auftraege/partner-positions-anfrage-actions:angebote', angErr)
    return null
  }
  const viaLead = String(ang?.id ?? '').trim()
  return viaLead || null
}

function angebotPositionenGesamtNetto(positionen: AngebotPosition[]): number {
  return Math.round(
    positionen.reduce((sum, p) => {
      const menge =
        p.menge != null && Number.isFinite(Number(p.menge)) && Number(p.menge) > 0
          ? Number(p.menge)
          : 1
      const vk = Number(p.vk_netto ?? 0)
      if (vk > 0) return sum + vk * menge
      const lohn = Number(p.lohn_netto ?? 0)
      const mat = Number(p.material_netto ?? 0)
      if (lohn > 0 || mat > 0) return sum + (lohn + mat) * menge
      const g = Number(p.gesamt_min ?? p.gesamt_max ?? 0)
      return sum + (g > 0 ? g : 0)
    }, 0) * 100
  ) / 100
}

/** ok | skipped (kein Angebot) | error (Schreib-/Lesefehler) */
type AppendAngebotResult = 'ok' | 'skipped' | 'error'

async function appendLeistungZuAngebot(opts: {
  auftragId: string
  /** Auftrag-Positions-ID — gleiche ID im Angebots-JSON → Portal-Preis-Lookup. */
  positionId?: string | null
  titel: string
  beschreibung?: string | null
  gewerkName: string
  gewerkSlug: string
  handwerkerId?: string | null
  preisNetto?: number | null
  menge?: number | null
  einheit?: string | null
}): Promise<AppendAngebotResult> {
  const angebotId = await resolveAngebotIdForAuftrag(opts.auftragId)
  if (!angebotId) return 'skipped'

  const { data: ang, error: error2 } = await supabaseAdmin
    .from('angebote')
    .select('positionen')
    .eq('id', angebotId)
    .maybeSingle()
  // tragend: Angebots-Positionen lesen
  if (error2) {
    logDbError('app/auftraege/partner-positions-anfrage-actions:angebote', error2)
    return 'error'
  }
  if (!ang) return 'error'

  const existing = normalizeAngebotPositionen(ang.positionen)
  const positionId = String(opts.positionId ?? '').trim()
  const titleKey = opts.titel.trim().toLowerCase()
  if (
    existing.some((p) => {
      const id = String(p.id ?? '').trim()
      if (positionId && id === positionId) return true
      return (
        String(p.leistung_name ?? p.leistung ?? '')
          .trim()
          .toLowerCase() === titleKey
      )
    })
  ) {
    return 'ok'
  }

  const preis =
    opts.preisNetto != null && Number.isFinite(opts.preisNetto) && opts.preisNetto > 0
      ? Math.round(opts.preisNetto * 100) / 100
      : 0
  const menge =
    opts.menge != null && Number.isFinite(opts.menge) && opts.menge > 0 ? opts.menge : 1
  const einheit = opts.einheit?.trim() || (opts.menge && opts.menge > 1 ? 'Min' : 'pauschal')
  const zeile = Math.round(preis * menge * 100) / 100

  const neu: AngebotPosition = {
    id: positionId || neuePositionsId(),
    gewerk_id: '',
    gewerk_name: opts.gewerkName,
    gewerk_slug: opts.gewerkSlug,
    leistung: opts.titel,
    leistung_name: opts.titel,
    beschreibung: opts.beschreibung?.trim() || opts.titel,
    lohn_netto: preis,
    material_netto: 0,
    vk_netto: preis,
    gesamt_min: zeile,
    gesamt_max: zeile,
    menge,
    einheit,
    preis_typ: 'fix',
    position_quelle: 'frei',
    handwerker_id: opts.handwerkerId?.trim() || undefined,
    notiz_intern: 'Aus Partner-Nacharbeit übernommen',
  }

  const next = [...existing, neu]
  const gesamtNetto = angebotPositionenGesamtNetto(next)

  const { error: error3 } = await supabaseAdmin
    .from('angebote')
    .update({
      positionen: next,
      gesamt_fix: gesamtNetto,
      gesamt_min: gesamtNetto,
      gesamt_max: gesamtNetto,
      updated_at: new Date().toISOString(),
    })
    .eq('id', angebotId)
  // tragend: Angebot-Update ist die Kunden-Übernahme
  if (error3) {
    logDbError('app/auftraege/partner-positions-anfrage-actions:angebote', error3)
    return 'error'
  }

  // begleitend: Verknüpfung Auftrag↔Angebot — Position ist schon im Angebot
  const { error: linkErr } = await supabaseAdmin
    .from('auftraege')
    .update({ angebot_id: angebotId })
    .eq('id', opts.auftragId)
    .is('angebot_id', null)
  if (linkErr) logDbError('app/auftraege/partner-positions-anfrage-actions:auftraege', linkErr)

  revalidateAngebotDetail(angebotId)
  return 'ok'
}

/**
 * Pfad A: Nacharbeit vom Partner annehmen → Position am Auftrag.
 * Unteilbar per Reihenfolge: Position + Angebot zuerst, Anfrage-Status `intern` zuletzt.
 */
export async function decidePartnerPositionsAnfrageIntern(input: {
  anfrageId: string
  gewerkSlug?: string
  gewerkName?: string
  preisPartner?: number | null
  notiz?: string | null
}): Promise<DecideResult> {
  const auth = await crmAuth()
  if (!auth.ok) return { ok: false, message: auth.message }

  const anfrage = await loadAnfrage(input.anfrageId)
  if (!anfrage || anfrage.status !== 'offen') {
    return { ok: false, message: 'Anfrage nicht offen.' }
  }

  const auftragId = String(anfrage.auftrag_id)
  const handwerkerId = String(anfrage.handwerker_id)
  const titel = String(anfrage.titel)

  const { data: siblings, error } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('gewerk_slug, gewerk_name, sort_order')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)
    .order('sort_order', { ascending: false })
    .limit(1)
  // begleitend: Gewerk-Defaults reichen für die neue Position
  if (error) logDbError('app/auftraege/partner-positions-anfrage-actions:auftrag_positionen', error)

  const sib = siblings?.[0]
  const gewerkSlug =
    input.gewerkSlug?.trim() ||
    String(sib?.gewerk_slug ?? '').trim() ||
    'allgemein'
  const gewerkName =
    input.gewerkName?.trim() ||
    String(sib?.gewerk_name ?? '').trim() ||
    'Allgemein'

  const { data: last, error: error2 } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('sort_order')
    .eq('auftrag_id', auftragId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  // begleitend: sort_order fällt auf 10 zurück
  if (error2) logDbError('app/auftraege/partner-positions-anfrage-actions:auftrag_positionen', error2)

  const schaetzungEur =
    input.preisPartner ??
    (anfrage.schaetzung_eur != null ? Number(anfrage.schaetzung_eur) : null)
  // HW hat die Nacharbeit selbst eingereicht → bereits „angenommen“, keine Portal-Nachreichung
  const partnerMeta = {
    aenderung_typ: null,
    preis_alt: null,
    handwerker_status: 'bestaetigt',
    ...(schaetzungEur != null && Number.isFinite(schaetzungEur) && schaetzungEur > 0
      ? { preis_partner: Math.round(schaetzungEur * 100) / 100 }
      : {}),
  }

  const { data: pos, error: error3 } = await supabaseAdmin
    .from('auftrag_positionen')
    .insert({
      auftrag_id: auftragId,
      handwerker_id: handwerkerId,
      gewerk_slug: gewerkSlug,
      gewerk_name: gewerkName,
      leistung_name: titel,
      beschreibung: [
        anfrage.begruendung ? String(anfrage.begruendung) : null,
        input.notiz?.trim() || null,
      ]
        .filter(Boolean)
        .join('\n\n'),
      einheit: anfrage.schaetzung_minuten ? 'Min' : 'pauschal',
      menge: anfrage.schaetzung_minuten ? Number(anfrage.schaetzung_minuten) : 1,
      typ: 'lv',
      verguetung: anfrage.schaetzung_eur ? 'festpreis' : 'aufwand',
      leistung_status: 'offen',
      anerkennung_status: 'anerkannt',
      preis_fix:
        schaetzungEur != null && Number.isFinite(schaetzungEur) && schaetzungEur > 0
          ? Math.round(schaetzungEur * 100) / 100
          : null,
      sort_order: Number(last?.sort_order ?? 0) + 10,
      ...partnerMeta,
    })
    .select('id')
    .single()
  // tragend: Positions-Insert ist Kern der Annahme
  if (error3) {
    logDbError('app/auftraege/partner-positions-anfrage-actions:auftrag_positionen', error3)
    return { ok: false, message: COPY_ERROR.saveFailed }
  }
  if (!pos) {
    return { ok: false, message: COPY_ERROR.saveFailed }
  }

  const append = await appendLeistungZuAngebot({
    auftragId,
    positionId: String(pos.id),
    titel,
    beschreibung: anfrage.begruendung ? String(anfrage.begruendung) : null,
    gewerkName,
    gewerkSlug,
    handwerkerId,
    preisNetto: schaetzungEur,
    menge: anfrage.schaetzung_minuten ? Number(anfrage.schaetzung_minuten) : 1,
    einheit: anfrage.schaetzung_minuten ? 'Min' : 'pauschal',
  })
  if (append === 'error') {
    return { ok: false, message: COPY_ERROR.saveFailed }
  }

  // Status der Anfrage zuletzt — bei Abbruch zuvor bleibt die Anfrage „offen“
  const { error: __dbErr1 } = await writePartnerPositionsAnfrageStatus(
    supabaseAdmin,
    input.anfrageId,
    'intern',
    {
      position_id: pos.id,
      crm_notiz: input.notiz?.trim() || null,
      decided_at: new Date().toISOString(),
      decided_by: auth.userId,
      updated_at: new Date().toISOString(),
    }
  )
  // tragend: Anfrage-Status zuletzt — ohne ihn bleibt „offen“ prüfbar
  if (__dbErr1) {
    logDbError('app/auftraege/partner-positions-anfrage-actions:partner_positions_anfragen', __dbErr1)
    return { ok: false, message: COPY_ERROR.saveFailed }
  }

  // begleitend: Audit/Timeline/Notify — Annahme ist bereits gespeichert
  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion: 'partner_positions_anfrage_angenommen',
    actorId: auth.userId,
    actorRolle: 'crm',
    payload: { anfrage_id: input.anfrageId, position_id: pos.id },
  })

  await insertAuftragTimelineEvent({
    auftrag_id: auftragId,
    typ: 'nachtrag_akzeptiert',
    titel: `Nacharbeit angenommen: ${titel}`,
    beschreibung: anfrage.begruendung ? String(anfrage.begruendung) : null,
    erstellt_von: auth.userId,
    handwerker_id: handwerkerId,
    sichtbar_fuer_kunde: true,
    fuer_kunde_freigegeben: true,
  })

  const projekt = await auftragTitel(auftragId)
  await notifyPartnerUnified({
    handwerkerId,
    typ: 'erinnerung',
    projektName: projekt,
    link: partnerVorgangLink(auftragId),
    leistungName: titel,
    auftragId,
    positionIds: [String(pos.id)],
    sendMail: false,
  })

  // Mails erst nach allen Schreibvorgängen (Claim verhindert Doppelversand)
  const mailRes = await sendRegieEntscheidungMailsAfterWrite({
    positionId: String(pos.id),
    status: 'anerkannt',
  })

  revalidateAuftragDetail(auftragId)
  return {
    ok: true,
    message: appendRegieMailWarnings(
      'Nacharbeit angenommen — unter Leistungen. Partner muss nicht erneut bestätigen.',
      mailRes.warnings
    ),
  }
}

/**
 * Pfad B: Kunden-Nachtrag-Entwurf anlegen (bestehender Nachtrag-Flow).
 */
export async function decidePartnerPositionsAnfrageNachtrag(input: {
  anfrageId: string
  notiz?: string | null
}): Promise<DecideResult> {
  const auth = await crmAuth()
  if (!auth.ok) return { ok: false, message: auth.message }

  const anfrage = await loadAnfrage(input.anfrageId)
  if (!anfrage || anfrage.status !== 'offen') {
    return { ok: false, message: 'Anfrage nicht offen.' }
  }

  const auftragId = String(anfrage.auftrag_id)
  const titel = String(anfrage.titel)
  const eur =
    anfrage.schaetzung_eur != null && Number.isFinite(Number(anfrage.schaetzung_eur))
      ? Number(anfrage.schaetzung_eur)
      : 0
  const fest = Math.round(Math.max(0, eur) * 100) / 100

  const { data: siblings, error } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('gewerk_slug, gewerk_name')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', String(anfrage.handwerker_id))
    .limit(1)
  // begleitend: Gewerk-Defaults für Nachtrag-Zeile
  if (error) logDbError('app/auftraege/partner-positions-anfrage-actions:auftrag_positionen', error)

  const sib = siblings?.[0]
  const positionen: AngebotPosition[] = [
    {
      id: neuePositionsId(),
      gewerk_id: '',
      gewerk_name: String(sib?.gewerk_name ?? 'Nachtrag'),
      gewerk_slug: String(sib?.gewerk_slug ?? '') || undefined,
      leistung: 'Nachtrag',
      beschreibung:
        String(anfrage.begruendung ?? '').trim() || titel || 'Zusatzleistung',
      lohn_netto: fest,
      material_netto: 0,
      gesamt_min: fest,
      gesamt_max: fest,
      menge: 1,
      einheit: 'Stk.',
      preis_typ: 'fix',
      handwerker_id: String(anfrage.handwerker_id),
    },
  ]

  const nachtrag = await createNachtragManuell({
    auftragId,
    grund: `Partner-Meldung: ${titel}`,
    beschreibung: [
      anfrage.begruendung ? String(anfrage.begruendung) : null,
      input.notiz?.trim() || null,
      anfrage.schaetzung_minuten
        ? `Zeitschätzung Partner: ${anfrage.schaetzung_minuten} Min`
        : null,
    ]
      .filter(Boolean)
      .join('\n'),
    positionen,
    handwercher_bestaetigt: false,
  })

  if (!nachtrag.ok) return { ok: false, message: nachtrag.message }

  const { error: __dbErr2 } = await writePartnerPositionsAnfrageStatus(
    supabaseAdmin,
    input.anfrageId,
    'nachtrag',
    {
      nachtrag_id: nachtrag.id,
      crm_notiz: input.notiz?.trim() || null,
      decided_at: new Date().toISOString(),
      decided_by: auth.userId,
      updated_at: new Date().toISOString(),
    }
  )
  // tragend: Anfrage muss auf „nachtrag“ stehen
  if (__dbErr2) {
    logDbError('app/auftraege/partner-positions-anfrage-actions:partner_positions_anfragen', __dbErr2)
    return { ok: false, message: COPY_ERROR.saveFailed }
  }

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion: 'partner_positions_anfrage_nachtrag',
    actorId: auth.userId,
    actorRolle: 'crm',
    payload: { anfrage_id: input.anfrageId, nachtrag_id: nachtrag.id },
  })

  revalidateAuftragDetail(auftragId)
  return {
    ok: true,
    message: 'Nachtrag-Entwurf angelegt — bitte an Kunden senden.',
  }
}

export async function decidePartnerPositionsAnfrageAblehnen(input: {
  anfrageId: string
  notiz?: string | null
}): Promise<DecideResult> {
  const auth = await crmAuth()
  if (!auth.ok) return { ok: false, message: auth.message }

  const anfrage = await loadAnfrage(input.anfrageId)
  if (!anfrage || anfrage.status !== 'offen') {
    return { ok: false, message: 'Anfrage nicht offen.' }
  }

  const auftragId = String(anfrage.auftrag_id)
  const { error: __dbErr3 } = await writePartnerPositionsAnfrageStatus(
    supabaseAdmin,
    input.anfrageId,
    'abgelehnt',
    {
      crm_notiz: input.notiz?.trim() || null,
      decided_at: new Date().toISOString(),
      decided_by: auth.userId,
      updated_at: new Date().toISOString(),
    }
  )
  // tragend: Ablehnungs-Status der Anfrage
  if (__dbErr3) {
    logDbError('app/auftraege/partner-positions-anfrage-actions:partner_positions_anfragen', __dbErr3)
    return { ok: false, message: COPY_ERROR.saveFailed }
  }

  // begleitend: Partner-Mail / Audit — Ablehnung ist bereits gespeichert
  const projekt = await auftragTitel(auftragId)
  await notifyPartnerUnified({
    handwerkerId: String(anfrage.handwerker_id),
    typ: 'entfernt',
    projektName: projekt,
    link: partnerVorgangLink(auftragId),
    leistungName: String(anfrage.titel),
    auftragId,
    aenderungTyp: 'entfernt',
    sendMail: true,
  })

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion: 'partner_positions_anfrage_abgelehnt',
    actorId: auth.userId,
    actorRolle: 'crm',
    payload: { anfrage_id: input.anfrageId, notiz: input.notiz ?? null },
  })

  revalidateAuftragDetail(auftragId)
  return { ok: true, message: 'Meldung abgelehnt — Partner benachrichtigt.' }
}

/**
 * Regie „Weitere Arbeit“ anerkennen/ablehnen + Partner-Notify.
 * Annahme unteilbar per Reihenfolge: Preis + Angebot zuerst, `anerkannt` zuletzt.
 */
export async function decideWeitereArbeitMitNotify(input: {
  positionId: string
  status: 'anerkannt' | 'abgelehnt'
  notiz?: string | null
}): Promise<DecideResult> {
  if (input.status === 'anerkannt') {
    const { data: pos, error } = await supabaseAdmin
      .from('auftrag_positionen')
      .select(
        'id, auftrag_id, handwerker_id, leistung_name, beschreibung, preis_partner, preis_fix, menge, einheit, gewerk_name, gewerk_slug, stundensatz, stundensatz_kunde'
      )
      .eq('id', input.positionId)
      .maybeSingle()
    // tragend: ohne Position keine Annahme
    if (error) {
      logDbError('app/auftraege/partner-positions-anfrage-actions:auftrag_positionen', error)
      return { ok: false, message: COPY_ERROR.saveFailed }
    }
    if (!pos?.auftrag_id) {
      return { ok: false, message: COPY_ERROR.notFound }
    }

    const name = String(pos.leistung_name ?? 'Nachtrag').trim() || 'Nachtrag'
    const partnerPreis =
      pos.preis_partner != null && Number(pos.preis_partner) > 0
        ? Number(pos.preis_partner)
        : pos.stundensatz != null && Number(pos.stundensatz) > 0
          ? Number(pos.stundensatz)
          : null
    const begruendung = String(pos.beschreibung ?? '')
      .replace(/\n*Nachtrag\s*\/\s*Regie\s*[—\-–]\s*wartet auf Freigabe durch Bärenwald\.?\s*$/i, '')
      .trim()

    // Kundenpreis: stundensatz_kunde, Fallback Partnersatz (Altdaten)
    const kundenPreis = regieKundenStundensatz({
      stundensatz_kunde:
        pos.stundensatz_kunde != null ? Number(pos.stundensatz_kunde) : null,
      stundensatz: partnerPreis,
    })
    const unitPreis = kundenPreis > 0 ? kundenPreis : null
    if (unitPreis != null) {
      const { error: __dbErr4 } = await supabaseAdmin
        .from('auftrag_positionen')
        .update({
          preis_fix:
            pos.preis_fix != null && Number(pos.preis_fix) > 0
              ? Number(pos.preis_fix)
              : unitPreis,
          // Portal: lohn_fix × Menge (Regie speichert sonst nur stundensatz/preis_partner)
          lohn_fix: unitPreis,
        })
        .eq('id', pos.id)
      // tragend: Kundenpreis vor Statuswechsel
      if (__dbErr4) {
        logDbError('app/auftraege/partner-positions-anfrage-actions:auftrag_positionen', __dbErr4)
        return { ok: false, message: COPY_ERROR.saveFailed }
      }
    }

    const append = await appendLeistungZuAngebot({
      auftragId: String(pos.auftrag_id),
      positionId: String(pos.id),
      titel: name,
      beschreibung: begruendung || null,
      gewerkName: String(pos.gewerk_name ?? 'Regie').trim() || 'Regie',
      gewerkSlug: String(pos.gewerk_slug ?? 'regie').trim() || 'regie',
      handwerkerId: pos.handwerker_id ? String(pos.handwerker_id) : null,
      preisNetto: unitPreis,
      menge: pos.menge != null ? Number(pos.menge) : 1,
      einheit: String(pos.einheit ?? 'Std'),
    })
    if (append === 'error') {
      return { ok: false, message: COPY_ERROR.saveFailed }
    }

    // Status `anerkannt` zuletzt
    const base = await setWeitereArbeitAnerkennung({
      positionId: input.positionId,
      status: 'anerkannt',
      notiz: input.notiz,
    })
    if (!base.ok) return { ok: false, message: base.message || COPY_ERROR.saveFailed }

    const preis =
      unitPreis != null ? formatEuro(unitPreis, { style: 'currency' }) : null
    const zeit =
      pos.menge != null && Number(pos.menge) > 0
        ? `${Number(pos.menge)} ${String(pos.einheit ?? 'Std').trim() || 'Std'}`
        : null
    const meta = [preis, zeit].filter(Boolean).join(' · ')

    await insertAuftragTimelineEvent({
      auftrag_id: String(pos.auftrag_id),
      typ: 'nachtrag_akzeptiert',
      titel: `Nacharbeit angenommen: ${name}`,
      beschreibung: [meta || null, begruendung || null, input.notiz?.trim() || null]
        .filter(Boolean)
        .join('\n\n'),
      sichtbar_fuer_kunde: true,
      fuer_kunde_freigegeben: true,
      handwerker_id: pos.handwerker_id ? String(pos.handwerker_id) : null,
    })

    // Portal-Glocke ohne generische Partner-Mail (eigene Regie-Mail folgt)
    if (pos.handwerker_id) {
      const projekt = await auftragTitel(String(pos.auftrag_id))
      await notifyPartnerUnified({
        handwerkerId: String(pos.handwerker_id),
        typ: 'erinnerung',
        projektName: projekt,
        link: partnerVorgangLink(String(pos.auftrag_id)),
        leistungName: String(pos.leistung_name ?? 'Weitere Arbeit'),
        auftragId: String(pos.auftrag_id),
        positionIds: [String(pos.id)],
        sendMail: false,
      })
    }

    const mailRes = await sendRegieEntscheidungMailsAfterWrite({
      positionId: String(pos.id),
      status: 'anerkannt',
    })

    revalidateAuftragDetail(pos.auftrag_id)

    return {
      ok: true,
      message: appendRegieMailWarnings(
        'Angenommen — unter Leistungen. Angebot enthält die Position (bearbeiten & an Kunden senden).',
        mailRes.warnings
      ),
    }
  }

  // Ablehnung: Status zuerst (tragend), Notify/Timeline begleitend
  const base = await setWeitereArbeitAnerkennung({
    positionId: input.positionId,
    status: 'abgelehnt',
    notiz: input.notiz,
  })
  if (!base.ok) return { ok: false, message: base.message || COPY_ERROR.saveFailed }

  const { data: pos, error } = await supabaseAdmin
    .from('auftrag_positionen')
    .select(
      'id, auftrag_id, handwerker_id, leistung_name, beschreibung, preis_partner, preis_fix, menge, einheit, gewerk_name, gewerk_slug'
    )
    .eq('id', input.positionId)
    .maybeSingle()
  // begleitend: Ablehnung ist gespeichert — Notify/Timeline ohne Pos überspringen
  if (error) logDbError('app/auftraege/partner-positions-anfrage-actions:auftrag_positionen', error)

  if (pos?.auftrag_id) {
    const name = String(pos.leistung_name ?? 'Nachtrag').trim() || 'Nachtrag'
    const begruendung = String(pos.beschreibung ?? '')
      .replace(/\n*Nachtrag\s*\/\s*Regie\s*[—\-–]\s*wartet auf Freigabe durch Bärenwald\.?\s*$/i, '')
      .trim()
    await insertAuftragTimelineEvent({
      auftrag_id: String(pos.auftrag_id),
      typ: 'nachtrag_abgelehnt',
      titel: `Nacharbeit abgelehnt: ${name}`,
      beschreibung: [begruendung || null, input.notiz?.trim() || null]
        .filter(Boolean)
        .join('\n\n'),
      sichtbar_fuer_kunde: true,
      fuer_kunde_freigegeben: true,
      handwerker_id: pos.handwerker_id ? String(pos.handwerker_id) : null,
    })
  }

  if (pos?.handwerker_id && pos.auftrag_id) {
    const projekt = await auftragTitel(String(pos.auftrag_id))
    await notifyPartnerUnified({
      handwerkerId: String(pos.handwerker_id),
      typ: 'entfernt',
      projektName: projekt,
      link: partnerVorgangLink(String(pos.auftrag_id)),
      leistungName: String(pos.leistung_name ?? 'Weitere Arbeit'),
      auftragId: String(pos.auftrag_id),
      positionIds: [String(pos.id)],
      sendMail: false,
    })
  }

  const mailRes =
    pos?.id != null
      ? await sendRegieEntscheidungMailsAfterWrite({
          positionId: String(pos.id),
          status: 'abgelehnt',
          ablehnungsNotiz: input.notiz,
        })
      : { warnings: [] as string[] }

  if (pos?.auftrag_id) {
    revalidateAuftragDetail(pos.auftrag_id)
  }

  return {
    ok: true,
    message: appendRegieMailWarnings('Abgelehnt — Partner informiert.', mailRes.warnings),
  }
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function sameText(a: string | null | undefined, b: string | null | undefined): boolean {
  return String(a ?? '').trim() === String(b ?? '').trim()
}

function sameNum(a: number | null, b: number | null): boolean {
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return Object.is(a, b)
}

/**
 * Regie-Position in Prüfung laden — für Bearbeiten vor Annehmen/Ablehnen.
 * Kundensatz: kein Aufschlagsfaktor im Code → Partnersatz + Hinweis.
 */
export async function loadRegiePositionFuerBearbeitung(
  positionId: string
): Promise<
  { ok: true; position: RegiePositionBearbeitenSnapshot } | { ok: false; message: string }
> {
  const auth = await crmAuth()
  if (!auth.ok) return { ok: false, message: auth.message }

  const { data: pos, error } = await supabaseAdmin
    .from('auftrag_positionen')
    .select(
      'id, auftrag_id, leistung_name, beschreibung, menge, stundensatz, stundensatz_kunde, preis_partner, anerkennung_status'
    )
    .eq('id', positionId)
    .maybeSingle()
  if (error) {
    logDbError('app/auftraege/partner-positions-anfrage-actions:auftrag_positionen', error)
    return { ok: false, message: COPY_ERROR.saveFailed }
  }
  if (!pos) return { ok: false, message: COPY_ERROR.notFound }
  if (String(pos.anerkennung_status) !== 'in_pruefung') {
    return { ok: false, message: 'Position steht nicht mehr in Prüfung.' }
  }

  const partnersatz =
    numOrNull(pos.stundensatz) ??
    (numOrNull(pos.preis_partner) != null && Number(pos.preis_partner) > 0
      ? Number(pos.preis_partner)
      : null)
  const kundeRaw = numOrNull(pos.stundensatz_kunde)
  const keinAufschlagHinterlegt = kundeRaw == null
  const kundensatz = kundeRaw ?? partnersatz

  return {
    ok: true,
    position: {
      id: String(pos.id),
      auftrag_id: String(pos.auftrag_id),
      titel: String(pos.leistung_name ?? ''),
      beschreibung: (pos.beschreibung as string | null) ?? null,
      stunden: numOrNull(pos.menge),
      stundensatz: partnersatz,
      stundensatz_kunde: kundensatz,
      keinAufschlagHinterlegt,
    },
  }
}

/**
 * Regie-Position korrigieren ohne Anerkennungsstatus zu ändern.
 * Reihenfolge: Position zuerst, dann Audit `regie_korrigiert`.
 */
export async function updateRegiePositionInPruefung(input: {
  positionId: string
  titel: string
  beschreibung: string | null
  stunden: number
  stundensatz: number
  stundensatz_kunde: number
  begruendung?: string | null
}): Promise<DecideResult> {
  const auth = await crmAuth()
  if (!auth.ok) return { ok: false, message: auth.message }

  const titel = String(input.titel ?? '').trim()
  if (!titel) return { ok: false, message: 'Titel fehlt.' }

  const stunden = Number(input.stunden)
  const stundensatz = Number(input.stundensatz)
  const stundensatzKunde = Number(input.stundensatz_kunde)
  if (!Number.isFinite(stunden) || stunden <= 0) {
    return { ok: false, message: 'Stunden müssen größer als 0 sein.' }
  }
  if (!Number.isFinite(stundensatz) || stundensatz <= 0) {
    return { ok: false, message: 'Partnersatz muss größer als 0 sein.' }
  }
  if (!Number.isFinite(stundensatzKunde) || stundensatzKunde <= 0) {
    return { ok: false, message: 'Kundensatz muss größer als 0 sein.' }
  }

  const { data: pos, error } = await supabaseAdmin
    .from('auftrag_positionen')
    .select(
      'id, auftrag_id, leistung_name, beschreibung, menge, stundensatz, stundensatz_kunde, preis_partner, anerkennung_status'
    )
    .eq('id', input.positionId)
    .maybeSingle()
  if (error) {
    logDbError('app/auftraege/partner-positions-anfrage-actions:auftrag_positionen', error)
    return { ok: false, message: COPY_ERROR.saveFailed }
  }
  if (!pos) return { ok: false, message: COPY_ERROR.notFound }
  if (String(pos.anerkennung_status) !== 'in_pruefung') {
    return { ok: false, message: 'Position steht nicht mehr in Prüfung.' }
  }

  const altTitel = String(pos.leistung_name ?? '')
  const altBeschreibung = (pos.beschreibung as string | null) ?? null
  const altStunden = numOrNull(pos.menge)
  const altPartnersatz =
    numOrNull(pos.stundensatz) ??
    (numOrNull(pos.preis_partner) != null && Number(pos.preis_partner) > 0
      ? Number(pos.preis_partner)
      : null)
  const altKundensatz = numOrNull(pos.stundensatz_kunde)
  /** Für Begründung: fehlender Kundensatz = Partnersatz (wie UI-Vorbelegung). */
  const altKundensatzEffective = altKundensatz ?? altPartnersatz
  const neuBeschreibung = input.beschreibung?.trim() ? input.beschreibung.trim() : null

  const titelChanged = !sameText(altTitel, titel)
  const beschreibungChanged = !sameText(altBeschreibung, neuBeschreibung)
  const stundenChanged = !sameNum(altStunden, stunden)
  const partnersatzChanged = !sameNum(altPartnersatz, stundensatz)
  const kundensatzChanged = !sameNum(altKundensatzEffective, stundensatzKunde)

  const materialChanged =
    titelChanged || stundenChanged || partnersatzChanged || kundensatzChanged
  const begruendung = String(input.begruendung ?? '').trim()
  if (materialChanged && !begruendung) {
    return {
      ok: false,
      message: 'Begründung ist Pflicht, wenn Titel, Stunden oder Sätze geändert werden.',
    }
  }

  if (
    !titelChanged &&
    !beschreibungChanged &&
    !stundenChanged &&
    !partnersatzChanged &&
    !kundensatzChanged
  ) {
    return { ok: true, message: 'Keine Änderung.' }
  }

  // Kein anerkennung_status — Bearbeiten ist nicht Annehmen.
  const { error: __dbErr } = await supabaseAdmin
    .from('auftrag_positionen')
    .update({
      leistung_name: titel,
      beschreibung: neuBeschreibung,
      menge: stunden,
      einheit: 'Std',
      stundensatz,
      stundensatz_kunde: stundensatzKunde,
      preis_partner: stundensatz,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pos.id)
  if (__dbErr) {
    logDbError('app/auftraege/partner-positions-anfrage-actions:auftrag_positionen', __dbErr)
    return { ok: false, message: COPY_ERROR.saveFailed }
  }

  const payload: Record<string, unknown> = {
    begruendung: begruendung || null,
  }
  if (titelChanged) payload.titel = { alt: altTitel, neu: titel }
  if (beschreibungChanged) {
    payload.beschreibung = { alt: altBeschreibung, neu: neuBeschreibung }
  }
  if (stundenChanged) payload.stunden = { alt: altStunden, neu: stunden }
  if (partnersatzChanged) {
    payload.stundensatz = { alt: altPartnersatz, neu: stundensatz }
  }
  if (kundensatzChanged) {
    payload.stundensatz_kunde = { alt: altKundensatz, neu: stundensatzKunde }
  }

  const audit = await writeAuditEvent({
    entityType: 'auftrag_position',
    entityId: String(pos.id),
    aktion: 'regie_korrigiert',
    actorId: auth.userId,
    actorRolle: 'crm',
    payload,
  })
  if (!audit.ok) {
    return { ok: false, message: COPY_ERROR.saveFailed }
  }

  revalidateAuftragDetail(String(pos.auftrag_id))
  return { ok: true, message: 'Korrektur gespeichert — Position bleibt in Prüfung.' }
}

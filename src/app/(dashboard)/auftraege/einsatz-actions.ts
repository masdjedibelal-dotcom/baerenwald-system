'use server'

import { revalidatePath } from 'next/cache'

import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { logDbError } from '@/lib/errors/log-db-error'
import { getMailBranding } from '@/lib/get-mail-branding'
import { buildEinsatzPartnerMail } from '@/lib/mail/einsatz-partner-mail'
import { sendMail } from '@/lib/mail-service'
import { buildPartnerDashboardLink } from '@/lib/portal-utils'

/**
 * Einsätze (Umbau P11): Anweisung + EK an genau einen Partner je Einsatz.
 * Ersetzt die Zuweisung von Auftragspositionen an Partner.
 */

export type EinsatzStatus = 'gesendet' | 'angenommen' | 'abgelehnt' | 'fertig'

export type EinsatzZeile = {
  id: string
  auftrag_id: string
  handwerker_id: string
  partner_name: string
  titel: string
  anweisung: string | null
  termin_von: string | null
  termin_bis: string | null
  ort: string | null
  kontakt_vor_ort: string | null
  ek_betrag: number | null
  ek_art: 'netto' | 'brutto'
  status: EinsatzStatus
  gesendet_at: string
  ablehnung_grund: string | null
  fertig_at: string | null
  fertig_text: string | null
  fertig_dateien: { name: string; url: string }[]
  rechnung_pdf_url: string | null
  rechnung_betrag: number | null
  rechnung_eingereicht_at: string | null
}

export type EinsatzPartnerOption = { id: string; label: string; email: string | null }

export type EinsatzVorbelegung = {
  titel: string
  termin_von: string | null
  termin_bis: string | null
  ort: string
  kontakt_vor_ort: string
}

const SELECT =
  'id, auftrag_id, handwerker_id, titel, anweisung, termin_von, termin_bis, ort, kontakt_vor_ort, ek_betrag, ek_art, status, gesendet_at, ablehnung_grund, fertig_at, fertig_text, fertig_dateien, rechnung_pdf_url, rechnung_betrag, rechnung_eingereicht_at, handwerker(name, firma)'

function partnerLabel(hw: { name?: string | null; firma?: string | null } | null | undefined): string {
  return hw?.firma?.trim() || hw?.name?.trim() || 'Partner'
}

function mapZeile(r: Record<string, unknown>): EinsatzZeile {
  const hwRaw = r.handwerker as
    | { name?: string | null; firma?: string | null }
    | { name?: string | null; firma?: string | null }[]
    | null
  const hw = Array.isArray(hwRaw) ? hwRaw[0] : hwRaw
  return {
    id: String(r.id),
    auftrag_id: String(r.auftrag_id),
    handwerker_id: String(r.handwerker_id),
    partner_name: partnerLabel(hw),
    titel: String(r.titel ?? ''),
    anweisung: (r.anweisung as string | null) ?? null,
    termin_von: (r.termin_von as string | null) ?? null,
    termin_bis: (r.termin_bis as string | null) ?? null,
    ort: (r.ort as string | null) ?? null,
    kontakt_vor_ort: (r.kontakt_vor_ort as string | null) ?? null,
    ek_betrag: r.ek_betrag == null ? null : Number(r.ek_betrag),
    ek_art: r.ek_art === 'brutto' ? 'brutto' : 'netto',
    status: (String(r.status ?? 'gesendet') as EinsatzStatus) ?? 'gesendet',
    gesendet_at: String(r.gesendet_at ?? ''),
    ablehnung_grund: (r.ablehnung_grund as string | null) ?? null,
    fertig_at: (r.fertig_at as string | null) ?? null,
    fertig_text: (r.fertig_text as string | null) ?? null,
    fertig_dateien: Array.isArray(r.fertig_dateien)
      ? (r.fertig_dateien as { name: string; url: string }[])
      : [],
    rechnung_pdf_url: (r.rechnung_pdf_url as string | null) ?? null,
    rechnung_betrag: r.rechnung_betrag == null ? null : Number(r.rechnung_betrag),
    rechnung_eingereicht_at: (r.rechnung_eingereicht_at as string | null) ?? null,
  }
}

export async function listEinsaetze(
  auftragId: string
): Promise<{ ok: true; einsaetze: EinsatzZeile[] } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const { data, error } = await gate.db
    .from('einsaetze')
    .select(SELECT)
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: true })
  if (error) {
    logDbError('app/auftraege/einsatz-actions:list', error)
    return { ok: false, message: 'Einsätze konnten nicht geladen werden.' }
  }
  return { ok: true, einsaetze: (data ?? []).map((r) => mapZeile(r as Record<string, unknown>)) }
}

/** Partner-Auswahl und Vorbelegung (Ort, Kontakt, Termin) für „Einsatz anlegen“. */
export async function loadEinsatzFormular(auftragId: string): Promise<
  | { ok: true; partner: EinsatzPartnerOption[]; vorbelegung: EinsatzVorbelegung }
  | { ok: false; message: string }
> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const [hwRes, aufRes] = await Promise.all([
    gate.db.from('handwerker').select('id, name, firma, email, aktiv').order('firma', { ascending: true }),
    gate.db
      .from('auftraege')
      .select('titel, start_datum, end_datum, leads(strasse, hausnummer, plz, kontakt_name, kontakt_telefon)')
      .eq('id', auftragId)
      .maybeSingle(),
  ])
  if (hwRes.error) logDbError('app/auftraege/einsatz-actions:handwerker', hwRes.error)
  if (aufRes.error) logDbError('app/auftraege/einsatz-actions:auftrag', aufRes.error)
  if (!aufRes.data) return { ok: false, message: 'Auftrag nicht gefunden.' }

  const partner = (hwRes.data ?? [])
    .filter((h) => (h as { aktiv?: boolean | null }).aktiv !== false)
    .map((h) => ({
      id: String(h.id),
      label: partnerLabel(h as { name?: string | null; firma?: string | null }),
      email: ((h as { email?: string | null }).email ?? '').trim() || null,
    }))
  const leadRaw = (aufRes.data as { leads?: unknown }).leads
  const lead = (Array.isArray(leadRaw) ? leadRaw[0] : leadRaw) as
    | { strasse?: string | null; hausnummer?: string | null; plz?: string | null; kontakt_name?: string | null; kontakt_telefon?: string | null }
    | null
  const ort = [
    [lead?.strasse, lead?.hausnummer].filter(Boolean).join(' '),
    lead?.plz ?? '',
  ]
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .join(', ')
  const kontakt = [lead?.kontakt_name, lead?.kontakt_telefon]
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .join(', ')
  const a = aufRes.data as { titel?: string | null; start_datum?: string | null; end_datum?: string | null }
  return {
    ok: true,
    partner,
    vorbelegung: {
      titel: String(a.titel ?? '').trim(),
      termin_von: a.start_datum ? String(a.start_datum).slice(0, 10) : null,
      termin_bis: a.end_datum ? String(a.end_datum).slice(0, 10) : null,
      ort,
      kontakt_vor_ort: kontakt,
    },
  }
}

export async function createEinsatz(input: {
  auftragId: string
  handwerkerId: string
  titel: string
  anweisung?: string | null
  terminVon?: string | null
  terminBis?: string | null
  ort?: string | null
  kontaktVorOrt?: string | null
  ekBetrag?: number | null
  ekArt: 'netto' | 'brutto'
}): Promise<{ ok: true; einsatz: EinsatzZeile; mailGesendet: boolean } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const titel = input.titel.trim()
  if (!input.handwerkerId) return { ok: false, message: 'Bitte einen Partner wählen.' }
  if (!titel) return { ok: false, message: 'Bitte einen Titel angeben.' }

  const { data, error } = await gate.db
    .from('einsaetze')
    .insert({
      auftrag_id: input.auftragId,
      handwerker_id: input.handwerkerId,
      titel,
      anweisung: input.anweisung?.trim() || null,
      termin_von: input.terminVon || null,
      termin_bis: input.terminBis || null,
      ort: input.ort?.trim() || null,
      kontakt_vor_ort: input.kontaktVorOrt?.trim() || null,
      ek_betrag: input.ekBetrag != null && input.ekBetrag > 0 ? Math.round(input.ekBetrag * 100) / 100 : null,
      ek_art: input.ekArt === 'brutto' ? 'brutto' : 'netto',
      status: 'gesendet',
      erstellt_von: gate.user.id,
    })
    .select(SELECT)
    .single()
  if (error || !data) {
    logDbError('app/auftraege/einsatz-actions:insert', error)
    return { ok: false, message: 'Einsatz konnte nicht angelegt werden.' }
  }
  const einsatz = mapZeile(data as Record<string, unknown>)

  // Mail an den Partner — Einsatz ist angelegt, auch wenn die Mail scheitert (Hinweis im CRM).
  let mailGesendet = false
  const { data: hw } = await gate.db
    .from('handwerker')
    .select('email, name, firma')
    .eq('id', input.handwerkerId)
    .maybeSingle()
  const email = String((hw as { email?: string | null } | null)?.email ?? '').trim()
  if (email) {
    const branding = await getMailBranding()
    const tpl = buildEinsatzPartnerMail(
      {
        partnerName: partnerLabel(hw as { name?: string | null; firma?: string | null }),
        titel: einsatz.titel,
        anweisung: einsatz.anweisung,
        terminVon: einsatz.termin_von,
        terminBis: einsatz.termin_bis,
        ort: einsatz.ort,
        kontaktVorOrt: einsatz.kontakt_vor_ort,
        ekBetrag: einsatz.ek_betrag,
        ekArt: einsatz.ek_art,
        portalLink: buildPartnerDashboardLink(),
      },
      branding
    )
    const sent = await sendMail({
      typ: 'einsatz_partner',
      an: email,
      anName: einsatz.partner_name,
      betreff: tpl.betreff,
      html: tpl.html,
      auftragId: input.auftragId,
      kontextTyp: 'auftrag',
    })
    mailGesendet = sent.success
  }

  revalidatePath(`/auftraege/${input.auftragId}`)
  return { ok: true, einsatz, mailGesendet }
}

/** Nur solange der Partner noch nicht angenommen hat (gesendet/abgelehnt). */
export async function zurueckziehenEinsatz(
  einsatzId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await requireStaffAndServiceRole()
  if (!gate.ok) return { ok: false, message: gate.message }
  const { data: row, error } = await gate.db
    .from('einsaetze')
    .select('id, auftrag_id, status')
    .eq('id', einsatzId)
    .maybeSingle()
  if (error) logDbError('app/auftraege/einsatz-actions:load', error)
  if (!row) return { ok: false, message: 'Einsatz nicht gefunden.' }
  if (row.status !== 'gesendet' && row.status !== 'abgelehnt') {
    return { ok: false, message: 'Angenommene Einsätze können nicht zurückgezogen werden.' }
  }
  const { error: delErr } = await gate.db.from('einsaetze').delete().eq('id', einsatzId)
  if (delErr) {
    logDbError('app/auftraege/einsatz-actions:delete', delErr)
    return { ok: false, message: 'Einsatz konnte nicht zurückgezogen werden.' }
  }
  revalidatePath(`/auftraege/${String(row.auftrag_id)}`)
  return { ok: true }
}

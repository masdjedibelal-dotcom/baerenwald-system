'use server'

import { requireStaffAndServiceRole } from '@/lib/auth/require-staff-service-role'
import { revalidateKundeDetail } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
import { getMailBranding } from '@/lib/get-mail-branding'
import { sendMail } from '@/lib/mail-service'
import { mailPrimaryButtonHtml } from '@/lib/mail/email-buttons'
import { mailHtmlBase } from '@/lib/mail-templates'
import { funktionAn, MARKE } from '@/lib/marke'
import { publicWebsiteBaseUrl } from '@/lib/portal-utils'
import { C } from '@/lib/tokens/colors'
import { auftragsAdresseFuerOrg } from '@/teo/hv/auftrag-per-mail'

/**
 * Hausverwaltung ohne Portal-Zwang (nur TEO):
 * - Arbeitsplatz (Login) und QR-Mieter-Meldung je Verwaltung schaltbar, standardmäßig aus
 * - Personen der Verwaltung im CRM pflegen: nur E-Mail-Empfänger oder mit Einladung zum Arbeitsplatz
 */

export type PersonRolle = 'verwaltung' | 'team' | 'eigentuemer'

export type VerwaltungPerson = {
  id: string
  name: string
  email: string | null
  rolle: PersonRolle
  darfFreigeben: boolean
  /** nur_mail = kein Zugang · eingeladen = Einladung raus, noch nicht angemeldet · aktiv = angemeldet */
  zugang: 'nur_mail' | 'eingeladen' | 'aktiv'
}

export type VerwaltungZugang = {
  arbeitsplatzAktiv: boolean
  meldeQrAktiv: boolean
  auftragsAdresse: string | null
  personen: VerwaltungPerson[]
}

type Fail = { ok: false; message: string }

const ROLLEN: PersonRolle[] = ['verwaltung', 'team', 'eigentuemer']
const ROLLEN_LABEL: Record<PersonRolle, string> = { verwaltung: 'Verwaltung', team: 'Team', eigentuemer: 'Eigentümer' }

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function gueltigeMail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

async function gate() {
  if (!funktionAn('hvWorkflow')) return { ok: false as const, message: 'Nicht verfügbar.' }
  return requireStaffAndServiceRole()
}

export async function ladeVerwaltungZugang(kundeId: string): Promise<{ ok: true; daten: VerwaltungZugang } | Fail> {
  const g = await gate()
  if (!g.ok) return g
  const [kRes, pRes] = await Promise.all([
    g.db.from('kunden').select('org_kennung, arbeitsplatz_aktiv, melde_qr_aktiv').eq('id', kundeId).maybeSingle(),
    g.db
      .from('kunden_mitglieder')
      .select('id, name, email, rolle, darf_freigeben, auth_user_id, eingeladen_am, eingeladen_von')
      .eq('kunde_id', kundeId)
      .eq('aktiv', true)
      .order('created_at', { ascending: true }),
  ])
  if (kRes.error) {
    logDbError('teo/hv/verwaltung-zugang:kunde', kRes.error)
    return { ok: false, message: 'Einstellungen konnten nicht geladen werden (Migration hv_ohne_portal ausgeführt?).' }
  }
  if (pRes.error) logDbError('teo/hv/verwaltung-zugang:personen', pRes.error)
  const k = kRes.data as { org_kennung?: string | null; arbeitsplatz_aktiv?: boolean | null; melde_qr_aktiv?: boolean | null } | null
  type Zeile = {
    id: string
    name: string | null
    email: string | null
    rolle: string
    darf_freigeben: boolean | null
    auth_user_id: string | null
    eingeladen_von: string | null
  }
  const personen = ((pRes.data ?? []) as Zeile[]).map<VerwaltungPerson>((r) => ({
    id: r.id,
    name: r.name?.trim() || r.email || '—',
    email: r.email,
    rolle: ROLLEN.includes(r.rolle as PersonRolle) ? (r.rolle as PersonRolle) : 'verwaltung',
    darfFreigeben: Boolean(r.darf_freigeben),
    zugang: r.auth_user_id ? 'aktiv' : r.eingeladen_von ? 'eingeladen' : 'nur_mail',
  }))
  return {
    ok: true,
    daten: {
      arbeitsplatzAktiv: Boolean(k?.arbeitsplatz_aktiv),
      meldeQrAktiv: Boolean(k?.melde_qr_aktiv),
      auftragsAdresse: auftragsAdresseFuerOrg(k?.org_kennung),
      personen,
    },
  }
}

export async function speichereVerwaltungSchalter(
  kundeId: string,
  input: { arbeitsplatzAktiv: boolean; meldeQrAktiv: boolean }
): Promise<{ ok: true } | Fail> {
  const g = await gate()
  if (!g.ok) return g
  const { error } = await g.db
    .from('kunden')
    .update({ arbeitsplatz_aktiv: input.arbeitsplatzAktiv, melde_qr_aktiv: input.meldeQrAktiv, updated_at: new Date().toISOString() })
    .eq('id', kundeId)
  if (error) {
    logDbError('teo/hv/verwaltung-zugang:schalter', error)
    return { ok: false, message: error.message }
  }
  revalidateKundeDetail(kundeId)
  return { ok: true }
}

export type PersonEingabe = { name: string; email: string; rolle: PersonRolle; darfFreigeben: boolean }

function werte(p: PersonEingabe) {
  const rolle = ROLLEN.includes(p.rolle) ? p.rolle : 'verwaltung'
  return {
    name: p.name.trim().slice(0, 120),
    email: p.email.trim().toLowerCase(),
    rolle,
    ist_admin: false,
    darf_freigeben: rolle === 'verwaltung' && p.darfFreigeben,
  }
}

export async function speicherePerson(kundeId: string, id: string | null, p: PersonEingabe): Promise<{ ok: true } | Fail> {
  const g = await gate()
  if (!g.ok) return g
  const w = werte(p)
  if (!w.name) return { ok: false, message: 'Bitte einen Namen eingeben.' }
  if (!gueltigeMail(w.email)) return { ok: false, message: 'Bitte eine gültige E-Mail eingeben.' }

  const { data: gleich, error: gErr } = await g.db
    .from('kunden_mitglieder')
    .select('id, aktiv')
    .eq('kunde_id', kundeId)
    .ilike('email', w.email.replace(/[\\%_]/g, (z) => `\\${z}`))
    .maybeSingle()
  if (gErr) logDbError('teo/hv/verwaltung-zugang:dublette', gErr)
  const gleichId = (gleich as { id?: string } | null)?.id ?? null

  if (id) {
    if (gleichId && gleichId !== id) return { ok: false, message: 'Diese E-Mail ist schon bei einer anderen Person eingetragen.' }
    const { error } = await g.db.from('kunden_mitglieder').update(w).eq('id', id).eq('kunde_id', kundeId)
    if (error) {
      logDbError('teo/hv/verwaltung-zugang:aendern', error)
      return { ok: false, message: 'Änderung konnte nicht gespeichert werden.' }
    }
  } else if (gleichId) {
    // Früher entfernte Person mit gleicher E-Mail wieder aktivieren
    if ((gleich as { aktiv?: boolean }).aktiv) return { ok: false, message: 'Diese Person ist schon eingetragen.' }
    const { error } = await g.db.from('kunden_mitglieder').update({ ...w, aktiv: true }).eq('id', gleichId)
    if (error) {
      logDbError('teo/hv/verwaltung-zugang:reaktivieren', error)
      return { ok: false, message: 'Person konnte nicht gespeichert werden.' }
    }
  } else {
    const { error } = await g.db.from('kunden_mitglieder').insert({ ...w, kunde_id: kundeId, aktiv: true })
    if (error) {
      logDbError('teo/hv/verwaltung-zugang:anlegen', error)
      return { ok: false, message: 'Person konnte nicht gespeichert werden.' }
    }
  }
  revalidateKundeDetail(kundeId)
  return { ok: true }
}

export async function entfernePerson(kundeId: string, id: string): Promise<{ ok: true } | Fail> {
  const g = await gate()
  if (!g.ok) return g
  const { error } = await g.db.from('kunden_mitglieder').update({ aktiv: false }).eq('id', id).eq('kunde_id', kundeId)
  if (error) {
    logDbError('teo/hv/verwaltung-zugang:entfernen', error)
    return { ok: false, message: 'Person konnte nicht entfernt werden.' }
  }
  revalidateKundeDetail(kundeId)
  return { ok: true }
}

/** Einladung zum Arbeitsplatz; schaltet den Arbeitsplatz der Verwaltung mit ein. Passwort legt die Person selbst fest. */
export async function ladePersonEin(kundeId: string, id: string): Promise<{ ok: true } | Fail> {
  const g = await gate()
  if (!g.ok) return g
  const [kRes, pRes] = await Promise.all([
    g.db.from('kunden').select('name, org_anzeigename, arbeitsplatz_aktiv').eq('id', kundeId).maybeSingle(),
    g.db.from('kunden_mitglieder').select('id, name, email, rolle, auth_user_id').eq('id', id).eq('kunde_id', kundeId).eq('aktiv', true).maybeSingle(),
  ])
  if (kRes.error) logDbError('teo/hv/verwaltung-zugang:einladen-kunde', kRes.error)
  if (pRes.error) logDbError('teo/hv/verwaltung-zugang:einladen-person', pRes.error)
  const k = kRes.data as { name?: string | null; org_anzeigename?: string | null; arbeitsplatz_aktiv?: boolean | null } | null
  const p = pRes.data as { name?: string | null; email?: string | null; rolle?: string; auth_user_id?: string | null } | null
  if (!k) return { ok: false, message: 'Verwaltung nicht gefunden.' }
  // Zugang gilt mit der Einladung — Arbeitsplatz der Verwaltung einschalten (steuert u. a. den Portal-Hinweis in Mails)
  if (!k.arbeitsplatz_aktiv) {
    const { error: apErr } = await g.db.from('kunden').update({ arbeitsplatz_aktiv: true, updated_at: new Date().toISOString() }).eq('id', kundeId)
    if (apErr) logDbError('teo/hv/verwaltung-zugang:arbeitsplatz-aktiv', apErr)
  }
  if (!p?.email) return { ok: false, message: 'Person ohne E-Mail.' }
  if (p.auth_user_id) return { ok: false, message: 'Diese Person ist bereits angemeldet.' }

  const orgName = k.org_anzeigename?.trim() || k.name?.trim() || 'Ihre Verwaltung'
  const name = p.name?.trim() || p.email
  const rolle = ROLLEN.includes(p.rolle as PersonRolle) ? (p.rolle as PersonRolle) : 'verwaltung'
  const link = `${publicWebsiteBaseUrl()}/portal/registrieren?${new URLSearchParams({ email: p.email, name, locked: '1' })}`
  const branding = await getMailBranding(g.db)
  const body = `
    <p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">Guten Tag ${esc(name)},</p>
    <p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">für <strong>${esc(orgName)}</strong> haben wir Ihnen einen Zugang zum ${esc(MARKE.name)}-Arbeitsplatz eingerichtet (Rolle: ${ROLLEN_LABEL[rolle]}). Dort sehen Sie alle Vorgänge, Angebote und Fotos an einer Stelle.</p>
    ${rolle === 'eigentuemer' ? `<p style="font-size:15px;color:${C.gray700};margin:0 0 12px;line-height:1.6;">${esc(MARKE.name)} ist der Handwerks-Service von ${esc(orgName)}: Wir kümmern uns um Schäden, Reparaturen und Arbeiten an Ihrem Haus.</p>` : ''}
    <p style="font-size:15px;color:${C.gray700};margin:0 0 16px;line-height:1.6;">Legen Sie Ihr Passwort fest, danach sind Sie direkt drin.</p>
    <p style="margin:0 0 16px;">${mailPrimaryButtonHtml('Zugang einrichten', link)}</p>
    <p style="font-size:13px;color:${C.gray500};margin:0;line-height:1.5;">Sie müssen den Arbeitsplatz nicht nutzen: Angebote, Termine und Rechnungen bekommen Sie weiterhin per E-Mail.</p>`
  const m = await sendMail({
    typ: 'arbeitsplatz_einladung',
    an: p.email,
    anName: name,
    betreff: `Ihr Zugang zum ${MARKE.name}-Arbeitsplatz`,
    html: mailHtmlBase(body, `Zugang für ${orgName}`, branding, undefined, { anrede: 'sie', skipMeinBaerenwaldPs: true }),
    kundeId,
    bcc: [],
  })
  if (!m.success) return { ok: false, message: m.error ?? 'Einladung konnte nicht gesendet werden.' }

  const { error } = await g.db
    .from('kunden_mitglieder')
    .update({ eingeladen_von: g.user.id, eingeladen_am: new Date().toISOString() })
    .eq('id', id)
  if (error) logDbError('teo/hv/verwaltung-zugang:eingeladen', error)
  revalidateKundeDetail(kundeId)
  return { ok: true }
}

/** Für die Übersicht: QR-Meldung an? (null = unbekannt/Spalte fehlt → wie bisher anzeigen) */
export async function meldeQrAktivFuerKunde(kundeId: string): Promise<boolean | null> {
  const g = await gate()
  if (!g.ok) return null
  const { data, error } = await g.db.from('kunden').select('melde_qr_aktiv').eq('id', kundeId).maybeSingle()
  if (error) return null
  const v = (data as { melde_qr_aktiv?: boolean | null } | null)?.melde_qr_aktiv
  return typeof v === 'boolean' ? v : null
}

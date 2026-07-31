/**
 * Melde-Aushang-PDF (einseitig) — HV-Objekt oder ganze HV, QR, Branding.
 */

import QRCode from 'qrcode'
import { renderHtmlToPdfBuffer } from '@/lib/angebote/render-angebot-html-pdf'
import { buildMeldeLink } from '@/lib/org/org-portal-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase-server'
import { buildAushangHtml, type AushangHtmlInput } from '@/lib/templates/aushang-template'

export type RenderAushangResult =
  | { ok: true; buffer: Buffer; filename: string; meldeUrl: string }
  | { ok: false; message: string }

type OrgKundePick = {
  name?: string | null
  org_anzeigename?: string | null
  org_kennung?: string | null
  org_logo_url?: string | null
  telefon?: string | null
  email?: string | null
}

async function requireAuthUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

async function buildAushangPdf(input: AushangHtmlInput, filename: string): Promise<RenderAushangResult> {
  const qrPng = await QRCode.toBuffer(input.meldeUrl, {
    type: 'png',
    width: 480,
    margin: 2,
    errorCorrectionLevel: 'M',
  })
  const qrDataUrl = `data:image/png;base64,${Buffer.from(qrPng).toString('base64')}`
  const html = buildAushangHtml({ ...input, qrDataUrl })
  const buffer = await renderHtmlToPdfBuffer(html, {
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
  })
  return { ok: true, buffer, filename, meldeUrl: input.meldeUrl }
}

/** Aushang für ein konkretes Objekt (Objekt-Melde-Link). */
export async function renderMeldeAushangPdf(objektId: string): Promise<RenderAushangResult> {
  const user = await requireAuthUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const { data: objekt, error } = await supabaseAdmin
    .from('kunden_objekte')
    .select(
      'id, titel, strasse, hausnummer, plz, ort, melde_slug, kunde_id, kunden(id, name, org_anzeigename, org_kennung, org_logo_url, telefon, email, typ)'
    )
    .eq('id', objektId)
    .maybeSingle()

  if (error || !objekt) {
    return { ok: false, message: error?.message || 'Objekt nicht gefunden.' }
  }

  const kundeRaw = objekt.kunden
  const kunde = (Array.isArray(kundeRaw) ? kundeRaw[0] : kundeRaw) as OrgKundePick | null

  const orgKennung = kunde?.org_kennung?.trim()
  if (!orgKennung) {
    return { ok: false, message: 'Objekt-Kunde hat keine org_kennung (HV-Portal).' }
  }

  const meldeUrl = buildMeldeLink(orgKennung, objekt.melde_slug)
  const str = [objekt.strasse, objekt.hausnummer].filter(Boolean).join(' ').trim()
  const ort = [objekt.plz, objekt.ort].filter(Boolean).join(' ').trim()
  const adresse = [str, ort].filter(Boolean).join(' · ') || null

  const slug = String(objekt.melde_slug || objekt.id).slice(0, 40)
  return buildAushangPdf(
    {
      orgName: kunde?.org_anzeigename?.trim() || kunde?.name?.trim() || 'Hausverwaltung',
      orgSub: 'Verwaltung',
      primaryColor: '#22508C',
      objektTitel: objekt.titel?.trim() || 'Objekt',
      objektAdresse: adresse,
      meldeUrl,
      logoUrl: kunde?.org_logo_url ?? null,
      hvTelefon: kunde?.telefon ?? null,
      hvEmail: kunde?.email ?? null,
    },
    `aushang-${slug}.pdf`
  )
}

/** Aushang für die ganze Hausverwaltung (Org-Melde-Link ohne Objekt-Slug). */
export async function renderHvMeldeAushangPdf(kundeId: string): Promise<RenderAushangResult> {
  const user = await requireAuthUser()
  if (!user) return { ok: false, message: 'Nicht angemeldet.' }

  const { data: kunde, error } = await supabaseAdmin
    .from('kunden')
    .select('id, name, org_anzeigename, org_kennung, org_logo_url, telefon, email, portal_modus')
    .eq('id', kundeId)
    .maybeSingle()

  if (error || !kunde) {
    return { ok: false, message: error?.message || 'Kunde nicht gefunden.' }
  }

  const orgKennung = (kunde as OrgKundePick).org_kennung?.trim()
  if (!orgKennung) {
    return { ok: false, message: 'Kunde hat keine org_kennung (HV-Portal).' }
  }

  const orgName =
    (kunde as OrgKundePick).org_anzeigename?.trim() ||
    (kunde as OrgKundePick).name?.trim() ||
    'Hausverwaltung'
  const meldeUrl = buildMeldeLink(orgKennung)
  const slug = orgKennung.slice(0, 40)

  return buildAushangPdf(
    {
      orgName,
      orgSub: 'Verwaltung',
      primaryColor: '#22508C',
      objektTitel: 'alle Objekte',
      objektAdresse: null,
      meldeUrl,
      logoUrl: (kunde as OrgKundePick).org_logo_url ?? null,
      hvTelefon: (kunde as OrgKundePick).telefon ?? null,
      hvEmail: (kunde as OrgKundePick).email ?? null,
    },
    `aushang-${slug}.pdf`
  )
}

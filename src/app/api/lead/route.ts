import { NextResponse } from 'next/server'
import { notifyNewLeadAlert } from '@/lib/copilot/crm-actions'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendAnfrageBestaetigung } from '@/app/actions/mails'
import { collectGroessenFromFunnelDaten } from '@/lib/lead-funnel-daten'
import { isEchterFreitext } from '@/lib/lead-display-helpers'
import {
  bereicheMitLegacyGewerbeSituation,
  leadHatGewerbeKontext,
  situationOhneGewerbe,
} from '@/lib/lead-gewerbe-storage'
import { normalizeKundeNamen } from '@/lib/kunde-namen'
import {
  anfrageAdresseAusPayload,
  hatAnfrageAdresse,
  kundeAdresseDbFelder,
} from '@/lib/anfrage-adresse'

export const dynamic = 'force-dynamic'

type Body = {
  name?: string
  vorname?: string
  nachname?: string
  email?: string
  telefon?: string
  plz?: string
  strasse?: string
  hausnummer?: string
  ort?: string
  situation?: string
  bereiche?: string[]
  preis_min?: number | null
  preis_max?: number | null
  budget_ca?: number | null
  /** z. B. { preisModus: 'komplex' } */
  funnel_daten?: Record<string, unknown>
  zeitraum?: string
  notizen?: string
  /** Echter Freitext des Kunden (nicht funnel_daten-JSON). */
  nachricht?: string
  kontakt_nachricht?: string
  message?: string
  kanal?: string
}

export async function POST(req: Request) {
  const secret = process.env.LEAD_API_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungültiges JSON' }, { status: 400 })
  }

  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim()
  const telefon = String(body.telefon ?? '').trim()
  const plz = String(body.plz ?? '').trim()
  const kanalRaw = body.kanal ?? 'website'
  const kanal = (
    ['website', 'telefon', 'whatsapp', 'email', 'vor_ort', 'sonstiges'].includes(String(kanalRaw))
      ? kanalRaw
      : 'website'
  ) as 'website' | 'telefon' | 'whatsapp' | 'email' | 'vor_ort' | 'sonstiges'

  if (!name) {
    return NextResponse.json({ ok: false, error: 'Name ist erforderlich' }, { status: 400 })
  }
  if (!email && !telefon) {
    return NextResponse.json({ ok: false, error: 'E-Mail oder Telefon nötig' }, { status: 400 })
  }

  let kundeId: string | null = null
  if (email) {
    const { data: existing } = await supabaseAdmin.from('kunden').select('id').eq('email', email).maybeSingle()
    if (existing?.id) kundeId = existing.id as string
  }

  const bereicheRaw = Array.isArray(body.bereiche) ? body.bereiche.filter((x) => typeof x === 'string') : []
  const bereicheMerged = bereicheMitLegacyGewerbeSituation(bereicheRaw, body.situation)
  const situationStored = situationOhneGewerbe(body.situation?.trim() ?? null)
  const istGewerbe = leadHatGewerbeKontext(bereicheMerged, body.situation)

  const kontaktNachrichtRaw = [body.kontakt_nachricht, body.nachricht, body.message]
    .map((s) => String(s ?? '').trim())
    .find((s) => s.length > 0)
  const kontaktNachricht =
    kontaktNachrichtRaw && isEchterFreitext(kontaktNachrichtRaw) ? kontaktNachrichtRaw : null

  const adresseFelder = anfrageAdresseAusPayload({
    plz,
    strasse: body.strasse,
    hausnummer: body.hausnummer,
    ort: body.ort,
    funnel_daten: body.funnel_daten,
  })
  const adresseDb = kundeAdresseDbFelder(adresseFelder)
  const plzFinal = plz || adresseDb.plz || null

  if (!kundeId) {
    const kundentyp = istGewerbe ? 'gewerbe' : 'privat'
    const namen = normalizeKundeNamen({
      typ: kundentyp,
      name,
      vorname: body.vorname,
      nachname: body.nachname,
      funnelDaten: body.funnel_daten,
      kontaktName: name,
    })
    const { data: kundeRow, error: kundeErr } = await supabaseAdmin
      .from('kunden')
      .insert({
        name: namen.name,
        vorname: namen.vorname,
        nachname: namen.nachname,
        email: email || null,
        telefon: telefon || null,
        plz: plzFinal,
        typ: kundentyp,
        strasse: adresseDb.strasse,
        hausnummer: adresseDb.hausnummer,
        ort: adresseDb.ort,
        adresse: adresseDb.adresse,
        notizen: null,
      })
      .select('id')
      .single()
    if (kundeErr || !kundeRow) {
      return NextResponse.json({ ok: false, error: kundeErr?.message ?? 'Kunde' }, { status: 500 })
    }
    kundeId = kundeRow.id as string
  } else if (hatAnfrageAdresse(adresseFelder)) {
    await supabaseAdmin
      .from('kunden')
      .update({ ...adresseDb, plz: plzFinal, updated_at: new Date().toISOString() })
      .eq('id', kundeId)
  }

  const { data: leadRow, error: leadErr } = await supabaseAdmin
    .from('leads')
    .insert({
      kunde_id: kundeId,
      kanal,
      status: 'neu',
      situation: situationStored,
      bereiche: bereicheMerged.length ? bereicheMerged : null,
      preis_min: body.preis_min ?? null,
      preis_max: body.preis_max ?? null,
      budget_ca: body.budget_ca ?? null,
      plz: plzFinal,
      zeitraum: body.zeitraum?.trim() || null,
      kundentyp: istGewerbe ? 'gewerbe' : 'privat',
      kontakt_name: name,
      kontakt_email: email || null,
      kontakt_telefon: telefon || null,
      kontakt_nachricht: kontaktNachricht,
      notizen: body.notizen?.trim() || null,
      funnel_daten: (() => {
        const raw =
          body.funnel_daten && typeof body.funnel_daten === 'object' && !Array.isArray(body.funnel_daten)
            ? body.funnel_daten
            : {}
        const fd = raw as Record<string, unknown>
        const nested =
          fd.funnel_daten && typeof fd.funnel_daten === 'object' && !Array.isArray(fd.funnel_daten)
            ? (fd.funnel_daten as Record<string, unknown>)
            : {}
        const merged: Record<string, unknown> = {
          ...raw,
          ...nested,
          fachdetails:
            (fd.fachdetails as Record<string, unknown> | undefined) ??
            (nested.fachdetails as Record<string, unknown> | undefined) ??
            {},
          kundentyp:
            (typeof fd.kundentyp === 'string' ? fd.kundentyp : undefined) ??
            (typeof nested.kundentyp === 'string' ? nested.kundentyp : undefined) ??
            '',
          quelle: 'website',
        }
        const groessenCollected = collectGroessenFromFunnelDaten(merged)
        merged.groessen = groessenCollected
        return merged
      })(),
    })
    .select('id')
    .single()

  if (leadErr || !leadRow) {
    return NextResponse.json({ ok: false, error: leadErr?.message ?? 'Lead' }, { status: 500 })
  }

  const leadId = leadRow.id as string

  await supabaseAdmin.from('leads_status_history').insert({
    lead_id: leadId,
    status_alt: null,
    status_neu: 'neu',
    user_id: null,
  })

  await supabaseAdmin.from('lead_timeline').insert({
    lead_id: leadId,
    typ: 'created',
    titel: 'Anfrage erstellt',
    beschreibung: null,
    erstellt_von: null,
  })

  if (kanal === 'website') {
    await sendAnfrageBestaetigung(leadId)
  }

  void notifyNewLeadAlert(leadId).catch(() => undefined)

  return NextResponse.json({ ok: true, id: leadId })
}

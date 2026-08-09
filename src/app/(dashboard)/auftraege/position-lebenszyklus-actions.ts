'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { writeAuditEvent } from '@/lib/audit/write-audit-event'
import { signedHandwerkerUploadUrl } from '@/lib/partner/handwerker-uploads'
import {
  type AnerkennungStatus,
  type AuftragTagesspanne,
  type EintragQuelle,
  type EintragTyp,
  type PositionEintrag,
  type PositionMaterial,
  zeitMinutenFromStdMin,
} from '@/lib/auftraege/position-lebenszyklus'

type ActionResult = { ok: true } | { ok: false; message: string }
type EintragResult =
  | { ok: true; eintragId: string; positionId: string }
  | { ok: false; message: string }

async function crmAuth() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet.' }
  return { ok: true as const, userId: user.id }
}

function migrationHint(message: string): string {
  if (/position_eintraege|eintrag_fotos|verguetung|gestartet_am|anerkennung/i.test(message)) {
    return (
      'Migration Positions-Lebenszyklus fehlt noch. Bitte ' +
      '`20260829120000_position_lebenszyklus_bautagebuch.sql` anwenden.'
    )
  }
  return message
}

async function loadPosition(positionId: string) {
  const { data, error } = await supabaseAdmin
    .from('auftrag_positionen')
    .select(
      'id, auftrag_id, handwerker_id, leistung_status, leistung_name, verguetung, typ, anerkennung_status, gestartet_am, erledigt_am, preis_partner, menge, einheit, stundensatz'
    )
    .eq('id', positionId)
    .maybeSingle()
  if (error) throw new Error(migrationHint(error.message))
  return data
}

async function insertCrmEintrag(opts: {
  positionId: string
  typ: EintragTyp
  beschreibung: string | null
  zeitMinuten: number | null
  userId: string
  quelle?: EintragQuelle | null
  rueckdatiertGrund?: string | null
  ereignisZeit?: string | null
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const { data, error } = await supabaseAdmin
    .from('position_eintraege')
    .insert({
      position_id: opts.positionId,
      typ: opts.typ,
      beschreibung: opts.beschreibung,
      zeit_minuten: opts.zeitMinuten,
      erfasst_von: 'crm_intern',
      erfasser_akteur: opts.userId,
      quelle: opts.quelle ?? null,
      rueckdatiert_grund: opts.rueckdatiertGrund ?? null,
      ereignis_zeit: opts.ereignisZeit ?? new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return { ok: false, message: migrationHint(error.message) }
  return { ok: true, id: String(data.id) }
}

async function attachCrmFoto(opts: {
  eintragId: string
  storagePath: string
  captureAt?: string | null
  nachgereicht?: boolean
  nachreichGrund?: string | null
  gpsLat?: number | null
  gpsLng?: number | null
}): Promise<ActionResult> {
  const { error } = await supabaseAdmin.from('eintrag_fotos').insert({
    eintrag_id: opts.eintragId,
    storage_path: opts.storagePath,
    exif_aufnahme: opts.captureAt ?? null,
    server_eingang: new Date().toISOString(),
    aufnahmeart: opts.nachgereicht ? 'nachgereicht' : 'direkt',
    nachreich_grund: opts.nachgereicht ? opts.nachreichGrund ?? null : null,
    exif_gps_lat: opts.gpsLat ?? null,
    exif_gps_lng: opts.gpsLng ?? null,
  })
  if (error) return { ok: false, message: migrationHint(error.message) }
  return { ok: true }
}

function revalidateAuftrag(auftragId: string) {
  revalidatePath(`/auftraege/${auftragId}`)
}

/** Alle Positions-Einträge eines Auftrags (gruppiert über Positionen). */
export async function listAuftragPositionEintraege(
  auftragId: string
): Promise<PositionEintrag[]> {
  const auth = await crmAuth()
  if (!auth.ok) return []

  const { data: posRows, error: posErr } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('id')
    .eq('auftrag_id', auftragId)
  if (posErr || !posRows?.length) return []

  const ids = posRows.map((p) => String(p.id))
  const { data, error } = await supabaseAdmin
    .from('position_eintraege')
    .select('*, eintrag_fotos(*)')
    .in('position_id', ids)
    .order('created_at', { ascending: true })

  if (error) {
    if (/relation .* does not exist|position_eintraege/i.test(error.message)) return []
    console.error('[listAuftragPositionEintraege]', error.message)
    return []
  }

  const out: PositionEintrag[] = []
  for (const row of data ?? []) {
    const fotosRaw = Array.isArray(row.eintrag_fotos) ? row.eintrag_fotos : []
    const fotos = []
    for (const f of fotosRaw) {
      const path = String(f.storage_path ?? '')
      const display = path
        ? (await signedHandwerkerUploadUrl(path)) ??
          (/^https?:\/\//i.test(path) ? path : null)
        : null
      fotos.push({
        id: String(f.id),
        eintrag_id: String(f.eintrag_id),
        storage_path: path,
        exif_aufnahme: f.exif_aufnahme ?? null,
        server_eingang: f.server_eingang ?? null,
        exif_gps_lat: f.exif_gps_lat != null ? Number(f.exif_gps_lat) : null,
        exif_gps_lng: f.exif_gps_lng != null ? Number(f.exif_gps_lng) : null,
        aufnahmeart: f.aufnahmeart ?? 'direkt',
        nachreich_grund: f.nachreich_grund ?? null,
        created_at: f.created_at ?? null,
        display_url: display,
      })
    }
    out.push({
      id: String(row.id),
      position_id: String(row.position_id),
      typ: String(row.typ),
      beschreibung: row.beschreibung ?? null,
      beschreibung_roh: row.beschreibung_roh ?? null,
      zeit_minuten: row.zeit_minuten != null ? Number(row.zeit_minuten) : null,
      erfasst_von: String(row.erfasst_von ?? 'crm_intern'),
      erfasser_akteur: row.erfasser_akteur ?? null,
      quelle: row.quelle ?? null,
      rueckdatiert_grund: row.rueckdatiert_grund ?? null,
      ereignis_zeit: row.ereignis_zeit ?? null,
      created_at: row.created_at ?? null,
      eintrag_fotos: fotos,
    })
  }
  return out
}

export async function listAuftragTagesspannen(
  auftragId: string
): Promise<AuftragTagesspanne[]> {
  const auth = await crmAuth()
  if (!auth.ok) return []

  const { data, error } = await supabaseAdmin
    .from('v_auftrag_tagesspannen')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('tag', { ascending: true })

  if (error) {
    if (/v_auftrag_tagesspannen|does not exist/i.test(error.message)) return []
    console.error('[listAuftragTagesspannen]', error.message)
    return []
  }

  return (data ?? []).map((r) => ({
    auftrag_id: String(r.auftrag_id),
    tag: String(r.tag),
    spanne_von: String(r.spanne_von),
    spanne_bis: String(r.spanne_bis),
    foto_count: Number(r.foto_count) || 0,
  }))
}

export async function listPositionMaterial(
  positionId: string
): Promise<PositionMaterial[]> {
  const auth = await crmAuth()
  if (!auth.ok) return []

  const { data, error } = await supabaseAdmin
    .from('position_material')
    .select('*')
    .eq('position_id', positionId)
    .order('created_at', { ascending: true })

  if (error) {
    if (/position_material|does not exist/i.test(error.message)) return []
    return []
  }
  return (data ?? []).map((r) => ({
    id: String(r.id),
    position_id: String(r.position_id),
    bezeichnung: String(r.bezeichnung),
    menge: Number(r.menge) || 0,
    einzelpreis: Number(r.einzelpreis) || 0,
    beleg_foto_id: r.beleg_foto_id ? String(r.beleg_foto_id) : null,
    created_at: r.created_at ?? null,
  }))
}

export type CrmPositionEintragInput = {
  positionId: string
  typ: EintragTyp
  beschreibung?: string | null
  zeitStd?: number | null
  zeitMin?: number | null
  quelle?: EintragQuelle | null
  rueckdatiertGrund?: string | null
  ereignisZeit?: string | null
  /** Storage-Pfad oder HTTP-URL (aus timeline-foto/upload). */
  fotoStoragePath?: string | null
  fotoCaptureAt?: string | null
  fotoNachgereicht?: boolean
  fotoNachreichGrund?: string | null
}

/** CRM-Nacherfassung: Start / Fortschritt / Ergebnis (mit Quelle & optional Rückdatierung). */
export async function createCrmPositionEintrag(
  input: CrmPositionEintragInput
): Promise<EintragResult> {
  const auth = await crmAuth()
  if (!auth.ok) return auth

  const positionId = input.positionId?.trim()
  if (!positionId) return { ok: false, message: 'Position fehlt.' }
  if (!['start', 'fortschritt', 'ergebnis', 'weitere_arbeit'].includes(input.typ)) {
    return { ok: false, message: 'Ungültiger Eintrag-Typ.' }
  }

  let pos
  try {
    pos = await loadPosition(positionId)
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Position laden fehlgeschlagen.' }
  }
  if (!pos) return { ok: false, message: 'Position nicht gefunden.' }

  const status = String(pos.leistung_status ?? 'offen')
  const isAufwand = String(pos.verguetung ?? '') === 'aufwand'
  /** CRM-Tagebuch: Stunden auch bei Festpreis speichern (interner Abgleich). */
  const zeitMinuten =
    input.typ === 'weitere_arbeit' || isAufwand
      ? zeitMinutenFromStdMin(input.zeitStd, input.zeitMin)
      : null

  if (input.typ === 'start') {
    if (status !== 'offen' && !(status === 'in_arbeit' && !pos.gestartet_am)) {
      if (status === 'erledigt') return { ok: false, message: 'Position ist bereits erledigt.' }
      if (pos.gestartet_am) return { ok: false, message: 'Position wurde bereits gestartet.' }
    }
  } else if (input.typ === 'fortschritt' || input.typ === 'ergebnis') {
    if (status !== 'in_arbeit' && !pos.gestartet_am) {
      return { ok: false, message: 'Erst Start erfassen.' }
    }
  }

  if (input.ereignisZeit && !input.rueckdatiertGrund?.trim()) {
    const ereignis = new Date(input.ereignisZeit).getTime()
    if (Number.isFinite(ereignis) && Date.now() - ereignis > 5 * 60_000) {
      return { ok: false, message: 'Rückdatierung braucht einen Grund.' }
    }
  }

  const fotoPath = input.fotoStoragePath?.trim() || null
  if ((input.typ === 'start' || input.typ === 'ergebnis') && !fotoPath) {
    return { ok: false, message: 'Foto ist Pflicht (Start/Ergebnis).' }
  }
  if (input.fotoNachgereicht && !input.fotoNachreichGrund?.trim()) {
    return { ok: false, message: 'Bitte Grund für nachgereichtes Foto angeben.' }
  }

  const eintrag = await insertCrmEintrag({
    positionId,
    typ: input.typ,
    beschreibung: input.beschreibung?.trim() || null,
    zeitMinuten,
    userId: auth.userId,
    quelle: input.quelle ?? null,
    rueckdatiertGrund: input.rueckdatiertGrund?.trim() || null,
    ereignisZeit: input.ereignisZeit ?? null,
  })
  if (!eintrag.ok) return eintrag

  if (fotoPath) {
    const attached = await attachCrmFoto({
      eintragId: eintrag.id,
      storagePath: fotoPath,
      captureAt: input.fotoCaptureAt ?? null,
      nachgereicht: Boolean(input.fotoNachgereicht),
      nachreichGrund: input.fotoNachreichGrund ?? null,
    })
    if (!attached.ok) return attached
  }

  const now = new Date().toISOString()
  if (input.typ === 'start') {
    await supabaseAdmin
      .from('auftrag_positionen')
      .update({
        leistung_status: 'in_arbeit',
        gestartet_am: pos.gestartet_am ?? input.ereignisZeit ?? now,
      })
      .eq('id', positionId)
  } else if (input.typ === 'ergebnis') {
    await supabaseAdmin
      .from('auftrag_positionen')
      .update({
        leistung_status: 'erledigt',
        erledigt_am: input.ereignisZeit ?? now,
      })
      .eq('id', positionId)
  }

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: String(pos.auftrag_id),
    aktion: `crm_position_${input.typ}`,
    actorId: auth.userId,
    actorRolle: 'crm',
    payload: {
      position_id: positionId,
      eintrag_id: eintrag.id,
      quelle: input.quelle ?? null,
      rueckdatiert_grund: input.rueckdatiertGrund ?? null,
      zeit_minuten: zeitMinuten,
    },
  })

  // Tagebuch-Einträge sind sofort im Kundenportal sichtbar (keine Freigabe)
  if (['weitere_arbeit', 'notiz', 'fortschritt', 'ergebnis', 'start'].includes(input.typ)) {
    try {
      const { publishPositionEintragFuerKunde } = await import(
        '@/lib/auftraege/publish-position-eintrag-kunde'
      )
      await publishPositionEintragFuerKunde({
        eintragId: eintrag.id,
        auftragId: String(pos.auftrag_id),
        typ: input.typ,
        beschreibung: input.beschreibung?.trim() || null,
        leistungName: (pos.leistung_name as string | null)?.trim() || null,
        erstelltVon: auth.userId,
        handwerkerId: (pos.handwerker_id as string | null) ?? null,
      })
    } catch (e) {
      console.warn(
        '[createCrmPositionEintrag] Kunden-Publish fehlgeschlagen',
        e instanceof Error ? e.message : e
      )
    }
  }

  revalidateAuftrag(String(pos.auftrag_id))
  return { ok: true, eintragId: eintrag.id, positionId }
}

/** Prüfschritt weitere_arbeit: Anerkennen / Rückfrage / Ablehnen. */
export async function setWeitereArbeitAnerkennung(input: {
  positionId: string
  status: Extract<AnerkennungStatus, 'anerkannt' | 'abgelehnt' | 'in_pruefung'>
  notiz?: string | null
}): Promise<ActionResult> {
  const auth = await crmAuth()
  if (!auth.ok) return auth

  let pos
  try {
    pos = await loadPosition(input.positionId)
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Fehler.' }
  }
  if (!pos) return { ok: false, message: 'Position nicht gefunden.' }

  const { error } = await supabaseAdmin
    .from('auftrag_positionen')
    .update({ anerkennung_status: input.status })
    .eq('id', input.positionId)

  if (error) return { ok: false, message: migrationHint(error.message) }

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: String(pos.auftrag_id),
    aktion: 'weitere_arbeit_pruefung',
    actorId: auth.userId,
    actorRolle: 'crm',
    payload: {
      position_id: input.positionId,
      status: input.status,
      notiz: input.notiz?.trim() || null,
    },
  })

  revalidateAuftrag(String(pos.auftrag_id))
  return { ok: true }
}

export type ZeitenAbgleichZeile = {
  tag: string
  partnerMinuten: number
  spanneMinuten: number
  fotoCount: number
  deltaMinuten: number
}

/** Partner-Zeit (Summe zeit_minuten je Tag) vs. Tagesspanne aus Direkt-Fotos. */
export async function loadZeitenAbgleich(
  auftragId: string
): Promise<ZeitenAbgleichZeile[]> {
  const [eintraege, spannen] = await Promise.all([
    listAuftragPositionEintraege(auftragId),
    listAuftragTagesspannen(auftragId),
  ])

  const partnerByTag = new Map<string, number>()
  for (const e of eintraege) {
    const t = (e.ereignis_zeit || e.created_at || '').slice(0, 10)
    if (!t) continue
    partnerByTag.set(t, (partnerByTag.get(t) ?? 0) + (Number(e.zeit_minuten) || 0))
  }

  const tags = new Set<string>([
    ...Array.from(partnerByTag.keys()),
    ...spannen.map((s) => String(s.tag).slice(0, 10)),
  ])

  const rows: ZeitenAbgleichZeile[] = []
  for (const tag of Array.from(tags).sort()) {
    const sp = spannen.find((s) => String(s.tag).slice(0, 10) === tag)
    const spanneMinuten = sp
      ? Math.max(
          0,
          Math.round(
            (new Date(sp.spanne_bis).getTime() - new Date(sp.spanne_von).getTime()) / 60_000
          )
        )
      : 0
    const partnerMinuten = partnerByTag.get(tag) ?? 0
    rows.push({
      tag,
      partnerMinuten,
      spanneMinuten,
      fotoCount: sp?.foto_count ?? 0,
      deltaMinuten: partnerMinuten - spanneMinuten,
    })
  }
  return rows
}

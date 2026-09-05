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
  positionId?: string | null
  auftragId?: string | null
  typ: EintragTyp
  beschreibung: string | null
  zeitMinuten: number | null
  userId: string
  quelle?: EintragQuelle | null
  rueckdatiertGrund?: string | null
  ereignisZeit?: string | null
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const positionId = opts.positionId?.trim() || null
  const auftragId = opts.auftragId?.trim() || null
  if (!positionId && !auftragId) {
    return { ok: false, message: 'Position oder Auftrag fehlt.' }
  }
  const { data, error } = await supabaseAdmin
    .from('position_eintraege')
    .insert({
      position_id: positionId,
      auftrag_id: auftragId,
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

async function linkEintragLeistungen(
  eintragId: string,
  positionIds: string[]
): Promise<ActionResult> {
  const unique = Array.from(new Set(positionIds.map((id) => id.trim()).filter(Boolean)))
  if (!unique.length) return { ok: true }
  const { error } = await supabaseAdmin.from('position_eintrag_leistungen').insert(
    unique.map((position_id) => ({ eintrag_id: eintragId, position_id }))
  )
  if (error) {
    if (/position_eintrag_leistungen|does not exist/i.test(error.message)) {
      return {
        ok: false,
        message:
          'Migration position_eintrag_leistungen fehlt noch. Bitte `20260905151439_position_eintrag_leistungen.sql` anwenden.',
      }
    }
    return { ok: false, message: migrationHint(error.message) }
  }
  return { ok: true }
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

/** Alle Positions-/Tagebuch-Einträge eines Auftrags (inkl. freie Notizen ohne Leistung). */
export async function listAuftragPositionEintraege(
  auftragId: string
): Promise<PositionEintrag[]> {
  const auth = await crmAuth()
  if (!auth.ok) return []

  const { data: posRows, error: posErr } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('id')
    .eq('auftrag_id', auftragId)
  if (posErr) {
    console.error('[listAuftragPositionEintraege] positionen', posErr.message)
    return []
  }

  const ids = (posRows ?? []).map((p) => String(p.id))
  let query = supabaseAdmin
    .from('position_eintraege')
    .select('*, eintrag_fotos(*)')
    .order('created_at', { ascending: true })

  if (ids.length > 0) {
    query = query.or(`auftrag_id.eq.${auftragId},position_id.in.(${ids.join(',')})`)
  } else {
    query = query.eq('auftrag_id', auftragId)
  }

  const { data, error } = await query

  if (error) {
    if (/relation .* does not exist|position_eintraege/i.test(error.message)) return []
    console.error('[listAuftragPositionEintraege]', error.message)
    return []
  }

  const eintragIds = (data ?? []).map((row) => String(row.id))
  const junctionByEintrag = new Map<string, string[]>()
  if (eintragIds.length > 0) {
    const { data: junctionRows } = await supabaseAdmin
      .from('position_eintrag_leistungen')
      .select('eintrag_id, position_id')
      .in('eintrag_id', eintragIds)
    for (const j of junctionRows ?? []) {
      const eid = String(j.eintrag_id)
      const list = junctionByEintrag.get(eid) ?? []
      list.push(String(j.position_id))
      junctionByEintrag.set(eid, list)
    }
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
    const eid = String(row.id)
    const junctionIds = junctionByEintrag.get(eid) ?? []
    const primaryPos = row.position_id != null ? String(row.position_id) : null
    const leistungIds = Array.from(
      new Set([...(primaryPos ? [primaryPos] : []), ...junctionIds])
    )
    out.push({
      id: eid,
      position_id: primaryPos,
      auftrag_id: row.auftrag_id != null ? String(row.auftrag_id) : auftragId,
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
      leistung_position_ids: leistungIds,
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
    auftragId: String(pos.auftrag_id),
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

export type CrmTagebuchEintragInput = {
  auftragId: string
  /** 0..n Leistungen — leer = freie Notiz. */
  positionIds?: string[]
  /** Optional: ausgewählte Leistungen als erledigt setzen. */
  erledigtPositionIds?: string[]
  titel?: string | null
  beschreibung?: string | null
  /** @deprecated — nutze fotoStoragePaths */
  fotoStoragePath?: string | null
  /** 1..n Storage-Pfade / URLs */
  fotoStoragePaths?: string[]
  fotoCaptureAt?: string | null
  fotoNachgereicht?: boolean
  fotoNachreichGrund?: string | null
  quelle?: EintragQuelle | null
  rueckdatiertGrund?: string | null
  ereignisZeit?: string | null
}

type TagebuchResult =
  | { ok: true; eintragId: string; positionId: string | null }
  | { ok: false; message: string }

/**
 * CRM-Tagebuch: ein narrativer Eintrag, optional 0..n Leistungen (Junction).
 * Kein Start-Gate — Fortschritt/Notiz unabhängig vom Positions-Lebenszyklus.
 */
export async function createCrmTagebuchEintrag(
  input: CrmTagebuchEintragInput
): Promise<TagebuchResult> {
  const auth = await crmAuth()
  if (!auth.ok) return auth

  const auftragId = input.auftragId?.trim()
  if (!auftragId) return { ok: false, message: 'Auftrag fehlt.' }

  const positionIds = Array.from(
    new Set((input.positionIds ?? []).map((id) => id.trim()).filter(Boolean))
  )
  const erledigtIds = Array.from(
    new Set((input.erledigtPositionIds ?? []).map((id) => id.trim()).filter(Boolean))
  )

  const titel = input.titel?.trim() || ''
  const beschreibungRaw = input.beschreibung?.trim() || ''
  const text = [titel, beschreibungRaw].filter(Boolean).join('\n\n')
  const fotoPaths = Array.from(
    new Set(
      [
        ...(input.fotoStoragePaths ?? []),
        ...(input.fotoStoragePath ? [input.fotoStoragePath] : []),
      ]
        .map((p) => p.trim())
        .filter(Boolean)
    )
  )

  if (!text && !fotoPaths.length) {
    return { ok: false, message: 'Titel, Text oder Foto angeben.' }
  }
  if (input.fotoNachgereicht && !input.fotoNachreichGrund?.trim()) {
    return { ok: false, message: 'Bitte Grund für nachgereichtes Foto angeben.' }
  }

  let leistungNames: string[] = []
  if (positionIds.length > 0) {
    const { data: posRows, error: posErr } = await supabaseAdmin
      .from('auftrag_positionen')
      .select('id, leistung_name, auftrag_id')
      .eq('auftrag_id', auftragId)
      .in('id', positionIds)
    if (posErr) return { ok: false, message: migrationHint(posErr.message) }
    if ((posRows ?? []).length !== positionIds.length) {
      return { ok: false, message: 'Eine oder mehrere Leistungen gehören nicht zum Auftrag.' }
    }
    leistungNames = (posRows ?? [])
      .map((p) => String(p.leistung_name ?? '').trim())
      .filter(Boolean)
  }

  for (const eid of erledigtIds) {
    if (!positionIds.includes(eid)) {
      return { ok: false, message: 'Erledigt nur für ausgewählte Leistungen möglich.' }
    }
  }

  const typ: EintragTyp = positionIds.length > 0 ? 'fortschritt' : 'notiz'
  const primaryPos = positionIds[0] ?? null

  const eintrag = await insertCrmEintrag({
    positionId: primaryPos,
    auftragId,
    typ,
    beschreibung: text || (fotoPaths.length ? 'Foto-Update' : null),
    zeitMinuten: null,
    userId: auth.userId,
    quelle: input.quelle ?? 'vor_ort',
    rueckdatiertGrund: input.rueckdatiertGrund?.trim() || null,
    ereignisZeit: input.ereignisZeit ?? null,
  })
  if (!eintrag.ok) return eintrag

  const linked = await linkEintragLeistungen(eintrag.id, positionIds)
  if (!linked.ok) return linked

  for (const path of fotoPaths) {
    const attached = await attachCrmFoto({
      eintragId: eintrag.id,
      storagePath: path,
      captureAt: input.fotoCaptureAt ?? null,
      nachgereicht: Boolean(input.fotoNachgereicht),
      nachreichGrund: input.fotoNachreichGrund ?? null,
    })
    if (!attached.ok) return attached
  }

  if (erledigtIds.length > 0) {
    const now = new Date().toISOString()
    await supabaseAdmin
      .from('auftrag_positionen')
      .update({
        leistung_status: 'erledigt',
        erledigt_am: input.ereignisZeit ?? now,
      })
      .in('id', erledigtIds)
  }

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion: 'crm_tagebuch_eintrag',
    actorId: auth.userId,
    actorRolle: 'crm',
    payload: {
      eintrag_id: eintrag.id,
      position_ids: positionIds,
      erledigt_position_ids: erledigtIds,
      foto_count: fotoPaths.length,
      typ,
    },
  })

  try {
    const { publishPositionEintragFuerKunde } = await import(
      '@/lib/auftraege/publish-position-eintrag-kunde'
    )
    await publishPositionEintragFuerKunde({
      eintragId: eintrag.id,
      auftragId,
      typ,
      titel: titel || null,
      beschreibung: beschreibungRaw || text || null,
      leistungNames,
      erstelltVon: auth.userId,
    })
  } catch (e) {
    console.warn(
      '[createCrmTagebuchEintrag] Kunden-Publish fehlgeschlagen',
      e instanceof Error ? e.message : e
    )
  }

  revalidateAuftrag(auftragId)
  return { ok: true, eintragId: eintrag.id, positionId: primaryPos }
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

  const patch: Record<string, unknown> = {
    anerkennung_status: input.status,
  }
  // HW-Nacharbeit anerkannt: keine offene Portal-Nachreichung hinterlassen
  if (input.status === 'anerkannt') {
    patch.aenderung_typ = null
    patch.handwerker_status = 'bestaetigt'
  }

  const { error } = await supabaseAdmin
    .from('auftrag_positionen')
    .update(patch)
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

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
  | { ok: true; eintragId: string; positionId: string | null }
  | { ok: false; message: string }

type EintragRow = {
  id: string
  position_id?: string | null
  auftrag_id?: string | null
  typ?: string | null
  beschreibung?: string | null
  beschreibung_roh?: string | null
  zeit_minuten?: number | null
  erfasst_von?: string | null
  erfasser_akteur?: string | null
  quelle?: string | null
  rueckdatiert_grund?: string | null
  ereignis_zeit?: string | null
  created_at?: string | null
  eintrag_fotos?: unknown
}

async function crmAuth() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet.' }
  return { ok: true as const, userId: user.id }
}

function migrationHint(message: string): string {
  if (
    /auftrag_id|notiz|bautagebuch_hidden|position_eintraege_bezug/i.test(message)
  ) {
    return (
      'Migration für freie Bautagebuch-Einträge fehlt noch. Bitte ' +
      '`20260830120000_position_eintraege_ohne_leistung.sql` anwenden.'
    )
  }
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
  let auftragId = opts.auftragId?.trim() || null
  if (!positionId && !auftragId) {
    return { ok: false, message: 'Position oder Auftrag fehlt.' }
  }
  if (positionId && !auftragId) {
    try {
      const pos = await loadPosition(positionId)
      auftragId = pos?.auftrag_id ? String(pos.auftrag_id) : null
    } catch {
      /* ignore — insert may still succeed with position only on older schema */
    }
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

async function mapEintragRows(rows: EintragRow[]): Promise<PositionEintrag[]> {
  const out: PositionEintrag[] = []
  for (const row of rows) {
    const fotosRaw = Array.isArray(row.eintrag_fotos) ? row.eintrag_fotos : []
    const fotos = []
    for (const f of fotosRaw as Array<Record<string, unknown>>) {
      const path = String(f.storage_path ?? '')
      const display = path
        ? (await signedHandwerkerUploadUrl(path)) ??
          (/^https?:\/\//i.test(path) ? path : null)
        : null
      fotos.push({
        id: String(f.id),
        eintrag_id: String(f.eintrag_id),
        storage_path: path,
        exif_aufnahme: (f.exif_aufnahme as string | null) ?? null,
        server_eingang: (f.server_eingang as string | null) ?? null,
        exif_gps_lat: f.exif_gps_lat != null ? Number(f.exif_gps_lat) : null,
        exif_gps_lng: f.exif_gps_lng != null ? Number(f.exif_gps_lng) : null,
        aufnahmeart: (f.aufnahmeart as string) ?? 'direkt',
        nachreich_grund: (f.nachreich_grund as string | null) ?? null,
        created_at: (f.created_at as string | null) ?? null,
        display_url: display,
      })
    }
    out.push({
      id: String(row.id),
      position_id: row.position_id ? String(row.position_id) : null,
      auftrag_id: row.auftrag_id ? String(row.auftrag_id) : null,
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

/** Alle Positions-Einträge eines Auftrags inkl. freier Einträge ohne Leistung. */
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
    console.error('[listAuftragPositionEintraege] pos', posErr.message)
  }

  const ids = (posRows ?? []).map((p) => String(p.id))
  const byId = new Map<string, EintragRow>()

  if (ids.length) {
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
    for (const row of data ?? []) {
      byId.set(String(row.id), row as EintragRow)
    }
  }

  const { data: freeRows, error: freeErr } = await supabaseAdmin
    .from('position_eintraege')
    .select('*, eintrag_fotos(*)')
    .eq('auftrag_id', auftragId)
    .is('position_id', null)
    .order('created_at', { ascending: true })

  if (freeErr) {
    if (!/auftrag_id|column .* does not exist/i.test(freeErr.message)) {
      console.error('[listAuftragPositionEintraege] free', freeErr.message)
    }
  } else {
    for (const row of freeRows ?? []) {
      byId.set(String(row.id), row as EintragRow)
    }
  }

  const mapped = await mapEintragRows(Array.from(byId.values()))
  mapped.sort((a, b) => {
    const ta = new Date(a.created_at || a.ereignis_zeit || 0).getTime()
    const tb = new Date(b.created_at || b.ereignis_zeit || 0).getTime()
    return ta - tb
  })
  return mapped
}

export async function listBautagebuchHiddenPositionIds(
  auftragId: string
): Promise<string[]> {
  const auth = await crmAuth()
  if (!auth.ok) return []

  const { data, error } = await supabaseAdmin
    .from('auftraege')
    .select('bautagebuch_hidden_position_ids')
    .eq('id', auftragId)
    .maybeSingle()

  if (error) {
    if (/bautagebuch_hidden/i.test(error.message)) return []
    console.error('[listBautagebuchHiddenPositionIds]', error.message)
    return []
  }

  const raw = data?.bautagebuch_hidden_position_ids
  if (!Array.isArray(raw)) return []
  return raw.map((id) => String(id)).filter(Boolean)
}

/** Leistung nur im Bautagebuch ausblenden (Auftrag/Position bleiben). */
export async function setBautagebuchPositionHidden(input: {
  auftragId: string
  positionId: string
  hidden: boolean
}): Promise<ActionResult> {
  const auth = await crmAuth()
  if (!auth.ok) return auth

  const auftragId = input.auftragId?.trim()
  const positionId = input.positionId?.trim()
  if (!auftragId || !positionId) return { ok: false, message: 'Auftrag/Position fehlt.' }

  const { data: pos } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('id')
    .eq('id', positionId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()
  if (!pos) return { ok: false, message: 'Position gehört nicht zu diesem Auftrag.' }

  const current = await listBautagebuchHiddenPositionIds(auftragId)
  const next = input.hidden
    ? Array.from(new Set([...current, positionId]))
    : current.filter((id) => id !== positionId)

  const { error } = await supabaseAdmin
    .from('auftraege')
    .update({ bautagebuch_hidden_position_ids: next })
    .eq('id', auftragId)

  if (error) return { ok: false, message: migrationHint(error.message) }

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: auftragId,
    aktion: input.hidden ? 'crm_bt_position_hidden' : 'crm_bt_position_shown',
    actorId: auth.userId,
    actorRolle: 'crm',
    payload: { position_id: positionId },
  })

  revalidateAuftrag(auftragId)
  return { ok: true }
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
  /** Leer/null + auftragId = freier Eintrag ohne Leistungsbezug */
  positionId?: string | null
  auftragId?: string | null
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

/** CRM-Nacherfassung: Start / Fortschritt / Ergebnis / freier Notiz-Eintrag. */
export async function createCrmPositionEintrag(
  input: CrmPositionEintragInput
): Promise<EintragResult> {
  const auth = await crmAuth()
  if (!auth.ok) return auth

  const positionId = input.positionId?.trim() || null
  const auftragIdInput = input.auftragId?.trim() || null

  if (
    !['start', 'fortschritt', 'ergebnis', 'weitere_arbeit', 'notiz'].includes(input.typ)
  ) {
    return { ok: false, message: 'Ungültiger Eintrag-Typ.' }
  }

  if (input.ereignisZeit && !input.rueckdatiertGrund?.trim()) {
    const ereignis = new Date(input.ereignisZeit).getTime()
    if (Number.isFinite(ereignis) && Date.now() - ereignis > 5 * 60_000) {
      return { ok: false, message: 'Rückdatierung braucht einen Grund.' }
    }
  }

  const fotoPath = input.fotoStoragePath?.trim() || null
  if (input.fotoNachgereicht && !input.fotoNachreichGrund?.trim()) {
    return { ok: false, message: 'Bitte Grund für nachgereichtes Foto angeben.' }
  }

  // Freier Eintrag ohne Leistungsbezug
  if (!positionId) {
    if (!auftragIdInput) return { ok: false, message: 'Auftrag fehlt.' }
    if (input.typ !== 'notiz' && input.typ !== 'fortschritt') {
      return { ok: false, message: 'Ohne Leistung nur Notiz möglich.' }
    }

    const { data: auftrag } = await supabaseAdmin
      .from('auftraege')
      .select('id')
      .eq('id', auftragIdInput)
      .maybeSingle()
    if (!auftrag) return { ok: false, message: 'Auftrag nicht gefunden.' }

    const zeitMinuten = zeitMinutenFromStdMin(input.zeitStd, input.zeitMin)
    const eintrag = await insertCrmEintrag({
      positionId: null,
      auftragId: auftragIdInput,
      typ: 'notiz',
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

    await writeAuditEvent({
      entityType: 'auftrag',
      entityId: auftragIdInput,
      aktion: 'crm_position_notiz',
      actorId: auth.userId,
      actorRolle: 'crm',
      payload: {
        position_id: null,
        eintrag_id: eintrag.id,
        quelle: input.quelle ?? null,
        ohne_leistung: true,
      },
    })

    revalidateAuftrag(auftragIdInput)
    return { ok: true, eintragId: eintrag.id, positionId: null }
  }

  let pos
  try {
    pos = await loadPosition(positionId)
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Position laden fehlgeschlagen.' }
  }
  if (!pos) return { ok: false, message: 'Position nicht gefunden.' }

  if (input.typ === 'notiz') {
    return { ok: false, message: 'Notiz-Typ nur ohne Leistungsbezug.' }
  }

  const status = String(pos.leistung_status ?? 'offen')
  const isAufwand = String(pos.verguetung ?? '') === 'aufwand'
  const zeitMinuten = isAufwand
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

  revalidateAuftrag(String(pos.auftrag_id))
  return { ok: true, eintragId: eintrag.id, positionId }
}

/** Bestehenden Positions-Eintrag im CRM bearbeiten. */
export async function updateCrmPositionEintrag(input: {
  eintragId: string
  beschreibung?: string | null
  typ?: EintragTyp
  quelle?: EintragQuelle | null
  rueckdatiertGrund?: string | null
  ereignisZeit?: string | null
  zeitStd?: number | null
  zeitMin?: number | null
  fotoStoragePath?: string | null
}): Promise<EintragResult> {
  const auth = await crmAuth()
  if (!auth.ok) return auth

  const eintragId = input.eintragId?.trim()
  if (!eintragId) return { ok: false, message: 'Eintrag fehlt.' }

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from('position_eintraege')
    .select('id, position_id, auftrag_id, typ')
    .eq('id', eintragId)
    .maybeSingle()

  if (loadErr) return { ok: false, message: migrationHint(loadErr.message) }
  if (!existing) return { ok: false, message: 'Eintrag nicht gefunden.' }

  const existingPosId = existing.position_id ? String(existing.position_id) : null
  const isFrei = !existingPosId

  if (input.ereignisZeit && !input.rueckdatiertGrund?.trim()) {
    const ereignis = new Date(input.ereignisZeit).getTime()
    if (Number.isFinite(ereignis) && Date.now() - ereignis > 5 * 60_000) {
      return { ok: false, message: 'Rückdatierung braucht einen Grund.' }
    }
  }

  if (isFrei) {
    const typ = input.typ ?? (existing.typ as EintragTyp)
    if (typ !== 'notiz' && typ !== 'fortschritt') {
      return { ok: false, message: 'Ohne Leistung nur Notiz möglich.' }
    }
    const zeitMinuten = zeitMinutenFromStdMin(input.zeitStd, input.zeitMin)
    const { error: upErr } = await supabaseAdmin
      .from('position_eintraege')
      .update({
        beschreibung: input.beschreibung?.trim() || null,
        typ: 'notiz',
        quelle: input.quelle ?? null,
        rueckdatiert_grund: input.rueckdatiertGrund?.trim() || null,
        ereignis_zeit: input.ereignisZeit ?? null,
        zeit_minuten: zeitMinuten,
      })
      .eq('id', eintragId)

    if (upErr) return { ok: false, message: migrationHint(upErr.message) }

    const fotoPath = input.fotoStoragePath?.trim() || null
    if (fotoPath) {
      const attached = await attachCrmFoto({
        eintragId,
        storagePath: fotoPath,
      })
      if (!attached.ok) return attached
    }

    const auftragId = existing.auftrag_id ? String(existing.auftrag_id) : null
    if (auftragId) revalidateAuftrag(auftragId)
    return { ok: true, eintragId, positionId: null }
  }

  let pos
  try {
    pos = await loadPosition(existingPosId)
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Position laden fehlgeschlagen.' }
  }
  if (!pos) return { ok: false, message: 'Position nicht gefunden.' }

  const isAufwand = String(pos.verguetung ?? '') === 'aufwand'
  const zeitMinuten = isAufwand
    ? zeitMinutenFromStdMin(input.zeitStd, input.zeitMin)
    : null

  const typ = input.typ ?? (existing.typ as EintragTyp)
  if (typ === 'notiz') {
    return { ok: false, message: 'Notiz-Typ nur ohne Leistungsbezug.' }
  }
  const patch: Record<string, unknown> = {
    beschreibung: input.beschreibung?.trim() || null,
    typ,
    quelle: input.quelle ?? null,
    rueckdatiert_grund: input.rueckdatiertGrund?.trim() || null,
    ereignis_zeit: input.ereignisZeit ?? null,
  }
  if (isAufwand) patch.zeit_minuten = zeitMinuten

  const { error: upErr } = await supabaseAdmin
    .from('position_eintraege')
    .update(patch)
    .eq('id', eintragId)

  if (upErr) return { ok: false, message: migrationHint(upErr.message) }

  const fotoPath = input.fotoStoragePath?.trim() || null
  if (fotoPath) {
    await supabaseAdmin.from('eintrag_fotos').delete().eq('eintrag_id', eintragId)
    const attached = await attachCrmFoto({
      eintragId,
      storagePath: fotoPath,
    })
    if (!attached.ok) return attached
  }

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: String(pos.auftrag_id),
    aktion: 'crm_position_eintrag_update',
    actorId: auth.userId,
    actorRolle: 'crm',
    payload: { position_id: pos.id, eintrag_id: eintragId, typ },
  })

  revalidateAuftrag(String(pos.auftrag_id))
  return { ok: true, eintragId, positionId: String(pos.id) }
}

/**
 * Vorher-/Nachher-Foto am Positions-Slot: legt Start/Ergebnis-Eintrag an oder ersetzt das Foto.
 */
export async function upsertCrmVorherNachherFoto(input: {
  positionId: string
  slot: 'vorher' | 'nachher'
  storagePath: string
}): Promise<EintragResult> {
  const auth = await crmAuth()
  if (!auth.ok) return auth

  const positionId = input.positionId?.trim()
  const storagePath = input.storagePath?.trim()
  if (!positionId) return { ok: false, message: 'Position fehlt.' }
  if (!storagePath) return { ok: false, message: 'Foto fehlt.' }

  const typ: EintragTyp = input.slot === 'vorher' ? 'start' : 'ergebnis'

  let pos
  try {
    pos = await loadPosition(positionId)
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Position laden fehlgeschlagen.' }
  }
  if (!pos) return { ok: false, message: 'Position nicht gefunden.' }

  const status = String(pos.leistung_status ?? 'offen')
  if (typ === 'ergebnis' && status !== 'in_arbeit' && !pos.gestartet_am) {
    return { ok: false, message: 'Bitte zuerst ein Vorher-Foto / den Start erfassen.' }
  }

  const { data: existing, error: exErr } = await supabaseAdmin
    .from('position_eintraege')
    .select('id')
    .eq('position_id', positionId)
    .eq('typ', typ)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (exErr) return { ok: false, message: migrationHint(exErr.message) }

  let eintragId = existing?.id ? String(existing.id) : null

  if (!eintragId) {
    const created = await insertCrmEintrag({
      positionId,
      typ,
      beschreibung: input.slot === 'vorher' ? 'Vorher-Foto' : 'Nachher-Foto',
      zeitMinuten: null,
      userId: auth.userId,
      quelle: 'foto_erhalten',
    })
    if (!created.ok) return created
    eintragId = created.id

    const now = new Date().toISOString()
    if (typ === 'start') {
      await supabaseAdmin
        .from('auftrag_positionen')
        .update({
          leistung_status: 'in_arbeit',
          gestartet_am: pos.gestartet_am ?? now,
        })
        .eq('id', positionId)
    } else if (typ === 'ergebnis') {
      await supabaseAdmin
        .from('auftrag_positionen')
        .update({
          leistung_status: 'erledigt',
          erledigt_am: now,
        })
        .eq('id', positionId)
    }
  } else {
    // Alte Fotos am Eintrag ersetzen
    await supabaseAdmin.from('eintrag_fotos').delete().eq('eintrag_id', eintragId)
  }

  const attached = await attachCrmFoto({
    eintragId,
    storagePath,
  })
  if (!attached.ok) return attached

  await writeAuditEvent({
    entityType: 'auftrag',
    entityId: String(pos.auftrag_id),
    aktion: `crm_${input.slot}_foto`,
    actorId: auth.userId,
    actorRolle: 'crm',
    payload: { position_id: positionId, eintrag_id: eintragId },
  })

  revalidateAuftrag(String(pos.auftrag_id))
  return { ok: true, eintragId, positionId }
}

/** Einzelnes Eintrags-Foto löschen (Vorher/Nachher-Slot). */
export async function deleteCrmEintragFoto(input: {
  fotoId: string
}): Promise<ActionResult> {
  const auth = await crmAuth()
  if (!auth.ok) return auth

  const fotoId = input.fotoId?.trim()
  if (!fotoId) return { ok: false, message: 'Foto fehlt.' }

  const { data: foto, error: fErr } = await supabaseAdmin
    .from('eintrag_fotos')
    .select('id, eintrag_id')
    .eq('id', fotoId)
    .maybeSingle()

  if (fErr) return { ok: false, message: migrationHint(fErr.message) }
  if (!foto) return { ok: false, message: 'Foto nicht gefunden.' }

  const { data: eintrag } = await supabaseAdmin
    .from('position_eintraege')
    .select('position_id')
    .eq('id', foto.eintrag_id)
    .maybeSingle()

  let auftragId: string | null = null
  if (eintrag?.position_id) {
    try {
      const pos = await loadPosition(String(eintrag.position_id))
      auftragId = pos?.auftrag_id ? String(pos.auftrag_id) : null
    } catch {
      auftragId = null
    }
  }

  const { error: delErr } = await supabaseAdmin.from('eintrag_fotos').delete().eq('id', fotoId)
  if (delErr) return { ok: false, message: migrationHint(delErr.message) }

  if (auftragId) {
    await writeAuditEvent({
      entityType: 'auftrag',
      entityId: auftragId,
      aktion: 'crm_eintrag_foto_geloescht',
      actorId: auth.userId,
      actorRolle: 'crm',
      payload: { foto_id: fotoId, eintrag_id: foto.eintrag_id },
    })
    revalidateAuftrag(auftragId)
  }

  return { ok: true }
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

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { loadComplianceTypen } from '@/app/(dashboard)/einstellungen/compliance/actions'
import { loadGewerkeAusfuehrung } from '@/lib/gewerke-ausfuehrung'
import {
  filterLeistungComplianceTypen,
  gewerkSlugsAusPositionen,
  istPflichtFuerProjekt,
} from '@/lib/handwerker/compliance-partner-profile'
import { notifyPartnerUnified, partnerVorgangLink } from '@/lib/partner/notify-partner-unified'
import { syncProjektvertragStilleFireAndForget } from '@/lib/vertraege/sync-projektvertrag-stille'
import {
  bauvorhabenAusAuftrag,
  formatVertragDatumDe,
  leistungsumfangAusPositionen,
  leistungsumfangNachtragAusPositionen,
  nachtragPositionenAusAuftrag,
  verguetungAusPositionen,
  verguetungNachtragAusPositionen,
} from '@/lib/vertraege/build-vertrag-texte'
import { nextVertragsnummer } from '@/lib/vertraege/next-vertragsnummer'
import { persistPdfForVertrag } from '@/lib/vertraege/persist-vertrag-pdf'
import { istHauptvertragFuerNachtrag } from '@/lib/vertraege/vertrag-nachtrag-helpers'
import { auftragIstBauprojekt, type GewerkBauprojektHinweis } from '@/lib/auftraege/ist-bauprojekt'
import { syncRahmenvertragComplianceDoc } from '@/lib/vertraege/sync-vertrag-compliance'
import type {
  CompliancePoolItem,
  HandwerkerVertragRow,
  NachtragPositionDraft,
  NachtragWizardContext,
  ProjektVertragWizardBootstrap,
  ProjektVertragWizardMeta,
  RahmenVertragWizardBootstrap,
  VertragHandwerkerSnapshot,
} from '@/lib/vertraege/types'
import type { AuftragPosition } from '@/lib/types'

export type { ProjektVertragWizardBootstrap, RahmenVertragWizardBootstrap }

const HW_SELECT = 'id, name, firma, adresse, telefon, email, steuernummer, ustid'

function unwrapJoin<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null
  return Array.isArray(raw) ? (raw[0] ?? null) : raw
}

function defaultProjektMeta(): ProjektVertragWizardMeta {
  return {
    handwerker_id: '',
    gewerk_id: null,
    gewerk_name: '',
    bauvorhaben: '',
    leistungsumfang: '',
    verguetung_text: '',
    regiesatz_netto: 56,
    einbehalt_prozent: 5,
    zahlungsziel_tage: 14,
    aufmass_rhythmus_tage: 14,
    notizen: '',
  }
}

function positionenFuerHandwerkerGewerk(
  positionen: AuftragPosition[],
  handwerkerId: string,
  gewerkName: string
): AuftragPosition[] {
  const gn = gewerkName.trim().toLowerCase()
  return positionen.filter(
    (p) =>
      p.handwerker_id === handwerkerId ||
      (gn && p.gewerk_name?.trim().toLowerCase() === gn)
  )
}

export async function loadProjektVertragBootstrap(
  auftragId: string,
  vertragId?: string | null
): Promise<{ ok: true; bootstrap: ProjektVertragWizardBootstrap } | { ok: false; message: string }> {
  const supabase = createClient()

  const { data: auf, error } = await supabase
    .from('auftraege')
    .select(
      `
      id, titel, start_datum, end_datum, ist_bauprojekt,
      kunden(name, adresse, strasse, hausnummer, plz, ort),
      auftrag_handwerker(handwerker_id, gewerk_id, gewerke(id, name), handwerker(${HW_SELECT})),
      auftrag_positionen(*)
    `
    )
    .eq('id', auftragId)
    .maybeSingle()

  if (error || !auf) return { ok: false, message: error?.message ?? 'Auftrag nicht gefunden' }

  const { data: alleGewerke } = await supabase.from('gewerke').select('slug, ist_bauleistung')
  const positionSlugs = ((auf.auftrag_positionen ?? []) as AuftragPosition[])
    .map((p) => p.gewerk_slug?.trim())
    .filter(Boolean) as string[]
  const bauprojekt = auftragIstBauprojekt({
    ist_bauprojekt: (auf as { ist_bauprojekt?: boolean | null }).ist_bauprojekt,
    gewerkSlugs: positionSlugs,
    alleGewerke: (alleGewerke ?? []) as GewerkBauprojektHinweis[],
  })
  if (!bauprojekt) {
    return {
      ok: false,
      message:
        'Nachunternehmervertrag nur bei Bauprojekten. Standardaufträge bestätigt der Partner Leistung und Preis im Portal.',
    }
  }

  const positionen = (auf.auftrag_positionen ?? []) as AuftragPosition[]
  const hwRows = (auf.auftrag_handwerker ?? []).map((row) => {
    const r = row as {
      handwerker_id: string
      gewerk_id: string | null
      gewerke?: unknown
      handwerker?: unknown
    }
    return {
      handwerker_id: r.handwerker_id,
      gewerk_id: r.gewerk_id,
      gewerke: unwrapJoin(r.gewerke as { id: string; name: string } | { id: string; name: string }[] | null),
      handwerker: unwrapJoin(
        r.handwerker as VertragHandwerkerSnapshot | VertragHandwerkerSnapshot[] | null
      ),
    }
  })

  const handwerkerMap = new Map<string, VertragHandwerkerSnapshot>()
  for (const row of hwRows) {
    if (row.handwerker) handwerkerMap.set(row.handwerker_id, row.handwerker)
  }
  for (const p of positionen) {
    if (p.handwerker_id && p.handwerker && !handwerkerMap.has(p.handwerker_id)) {
      handwerkerMap.set(p.handwerker_id, {
        id: p.handwerker.id ?? p.handwerker_id,
        name: p.handwerker.name,
        firma: null,
        adresse: null,
        telefon: p.handwerker.telefon ?? null,
        email: p.handwerker.email ?? null,
        steuernummer: null,
        ustid: null,
      })
    }
  }

  const handwerker_optionen = Array.from(handwerkerMap.values())
  if (!handwerker_optionen.length) {
    return { ok: false, message: 'Kein Handwerker am Auftrag zugewiesen — bitte zuerst Partner zuweisen.' }
  }

  const gewerkMap = new Map<string, string>()
  for (const row of hwRows) {
    if (row.gewerke?.id) gewerkMap.set(row.gewerke.id, row.gewerke.name)
  }
  for (const p of positionen) {
    if (p.gewerk_name) gewerkMap.set(p.gewerk_name, p.gewerk_name)
  }

  const kunde = auf.kunden as {
    name?: string
    adresse?: string | null
    strasse?: string | null
    hausnummer?: string | null
    plz?: string | null
    ort?: string | null
  } | null
  const kundeAdr =
    kunde?.adresse?.trim() ||
    [kunde?.strasse, kunde?.hausnummer].filter(Boolean).join(' ').trim() ||
    null

  let meta = defaultProjektMeta()
  let existingNr: string | null = null
  let existingId: string | null = vertragId ?? null

  if (vertragId) {
    const { data: v } = await supabase.from('handwerker_vertraege').select('*').eq('id', vertragId).maybeSingle()
    if (v) {
      const row = v as HandwerkerVertragRow
      existingNr = row.vertrags_nr
      meta = {
        handwerker_id: row.handwerker_id,
        gewerk_id: row.gewerk_id,
        gewerk_name: row.gewerk_name ?? '',
        bauvorhaben: row.bauvorhaben ?? '',
        leistungsumfang: row.leistungsumfang ?? '',
        verguetung_text: row.verguetung_text ?? '',
        regiesatz_netto: row.regiesatz_netto,
        einbehalt_prozent: row.einbehalt_prozent,
        zahlungsziel_tage: row.zahlungsziel_tage,
        aufmass_rhythmus_tage: row.aufmass_rhythmus_tage,
        notizen: row.notizen ?? '',
      }
    }
  }

  if (!meta.handwerker_id) {
    const first = handwerker_optionen[0]!
    const firstGewerk = hwRows.find((r) => r.handwerker_id === first.id)?.gewerke?.name ?? positionen[0]?.gewerk_name ?? ''
    meta.handwerker_id = first.id
    meta.gewerk_name = firstGewerk
    meta.gewerk_id = hwRows.find((r) => r.handwerker_id === first.id)?.gewerk_id ?? null
    const pos = positionenFuerHandwerkerGewerk(positionen, first.id, firstGewerk)
    const auftragTitel = (auf.titel as string | null | undefined)?.trim() || 'Auftrag'
    meta.bauvorhaben = bauvorhabenAusAuftrag({
      titel: auftragTitel,
      kunde_adresse: kundeAdr,
      kunde_plz: kunde?.plz ?? null,
      kunde_ort: kunde?.ort ?? null,
      gewerk_name: firstGewerk,
    })
    meta.leistungsumfang = leistungsumfangAusPositionen(pos)
    meta.verguetung_text = verguetungAusPositionen(pos)
  }

  const firm = await fetchFirmenEinstellungen(supabase)
  const auftragTitel =
    (auf.titel as string | null | undefined)?.trim() ||
    (kunde?.name as string | undefined)?.trim() ||
    'Auftrag'

  return {
    ok: true,
    bootstrap: {
      auftrag_id: auftragId,
      auftrag_titel: auftragTitel,
      vertrag_id: existingId,
      vertrags_nr: existingNr,
      meta,
      handwerker_optionen,
      gewerk_optionen: Array.from(gewerkMap.entries()).map(([id, name]) => ({ id, name })),
      positionen,
      kunde_adresse: kundeAdr,
      kunde_plz: kunde?.plz ?? null,
      kunde_ort: kunde?.ort ?? null,
      firm,
    },
  }
}

export async function loadHandwerkerAcceptWizardBootstrap(input: {
  auftragId: string
  handwerkerId: string
  gewerkId: string
  zuweisungId: string
}): Promise<{ ok: true; bootstrap: ProjektVertragWizardBootstrap } | { ok: false; message: string }> {
  const auftragId = input.auftragId.trim()
  const handwerkerId = input.handwerkerId.trim()
  const gewerkId = input.gewerkId.trim()
  const zuweisungId = input.zuweisungId.trim()
  if (!auftragId || !handwerkerId || !gewerkId || !zuweisungId) {
    return { ok: false, message: 'Auftrag, Handwerker, Gewerk oder Zuweisung fehlt.' }
  }

  const base = await loadProjektVertragBootstrap(auftragId)
  if (!base.ok) return base

  const gewerkName =
    base.bootstrap.gewerk_optionen.find((g) => g.id === gewerkId)?.name ??
    base.bootstrap.meta.gewerk_name ??
    ''

  const pos = positionenFuerHandwerkerGewerk(base.bootstrap.positionen, handwerkerId, gewerkName)
  const meta: ProjektVertragWizardMeta = {
    ...base.bootstrap.meta,
    handwerker_id: handwerkerId,
    gewerk_id: gewerkId,
    gewerk_name: gewerkName,
    bauvorhaben: bauvorhabenAusAuftrag({
      titel: base.bootstrap.auftrag_titel,
      kunde_adresse: base.bootstrap.kunde_adresse,
      kunde_plz: base.bootstrap.kunde_plz,
      kunde_ort: base.bootstrap.kunde_ort,
      gewerk_name: gewerkName,
    }),
    leistungsumfang: leistungsumfangAusPositionen(pos),
    verguetung_text: verguetungAusPositionen(pos),
    notizen: base.bootstrap.meta.notizen?.trim()
      ? base.bootstrap.meta.notizen
      : 'Nach CRM-Übernahme — Partner bestätigt Vertrag und Unterlagen im Portal.',
  }

  const supabase = createClient()
  const [typen, gewerke, zuordnungRes, auftragRes] = await Promise.all([
    loadComplianceTypen(),
    loadGewerkeAusfuehrung(supabase),
    supabaseAdmin
      .from('auftrag_handwerker')
      .select('compliance_pflicht_slugs, handwerker(gewerke)')
      .eq('auftrag_id', auftragId)
      .eq('handwerker_id', handwerkerId)
      .maybeSingle(),
    supabaseAdmin.from('auftraege').select('ist_bauprojekt').eq('id', auftragId).maybeSingle(),
  ])

  const istBauprojekt = (auftragRes.data as { ist_bauprojekt?: boolean | null } | null)?.ist_bauprojekt ?? null

  const projektGewerkSlugs = gewerkSlugsAusPositionen(
    base.bootstrap.positionen.map((p) => ({ gewerk_slug: p.gewerk_slug }))
  )
  const hwGewerke =
    (unwrapJoin(
      (zuordnungRes.data as { handwerker?: { gewerke?: string[] | null } | null } | null)?.handwerker
    )?.gewerke as string[] | null | undefined) ?? null

  const poolTypen = filterLeistungComplianceTypen(typen, projektGewerkSlugs, hwGewerke, gewerke, istBauprojekt)
  const compliance_pool: CompliancePoolItem[] = poolTypen.map((t) => ({
    slug: t.slug,
    bezeichnung: t.bezeichnung,
    beschreibung: t.beschreibung,
    default_pflicht: istPflichtFuerProjekt(t, projektGewerkSlugs, hwGewerke, gewerke, istBauprojekt),
  }))

  const savedSlugs = (zuordnungRes.data as { compliance_pflicht_slugs?: string[] | null } | null)
    ?.compliance_pflicht_slugs
  const initial_compliance_slugs =
    savedSlugs != null
      ? savedSlugs.filter((s) => compliance_pool.some((p) => p.slug === s))
      : compliance_pool.filter((p) => p.default_pflicht).map((p) => p.slug)

  return {
    ok: true,
    bootstrap: {
      ...base.bootstrap,
      meta,
      accept_mode: {
        zuweisung_id: zuweisungId,
        compliance_pool,
        initial_compliance_slugs,
      },
    },
  }
}

export async function loadRahmenVertragBootstrap(
  handwerkerId: string,
  vertragId?: string | null
): Promise<{ ok: true; bootstrap: RahmenVertragWizardBootstrap } | { ok: false; message: string }> {
  const supabase = createClient()
  const { data: hw, error } = await supabase.from('handwerker').select(HW_SELECT).eq('id', handwerkerId).maybeSingle()
  if (error || !hw) return { ok: false, message: error?.message ?? 'Handwerker nicht gefunden' }

  let existingId = vertragId ?? null
  let existingNr: string | null = null
  let notizen = ''

  if (!vertragId) {
    const { data: existing } = await supabase
      .from('handwerker_vertraege')
      .select('id, vertrags_nr, notizen')
      .eq('handwerker_id', handwerkerId)
      .eq('typ', 'rahmen')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existing) {
      existingId = existing.id as string
      existingNr = existing.vertrags_nr as string
      notizen = (existing.notizen as string) ?? ''
    }
  } else {
    const { data: v } = await supabase.from('handwerker_vertraege').select('*').eq('id', vertragId).maybeSingle()
    if (v) {
      existingNr = v.vertrags_nr as string
      notizen = (v.notizen as string) ?? ''
    }
  }

  const firm = await fetchFirmenEinstellungen(supabase)

  return {
    ok: true,
    bootstrap: {
      handwerker_id: handwerkerId,
      vertrag_id: existingId,
      vertrags_nr: existingNr,
      handwerker: hw as VertragHandwerkerSnapshot,
      firm,
      notizen,
    },
  }
}

async function upsertVertragRow(
  input: {
    vertrag_id?: string | null
    typ: 'projekt' | 'rahmen'
    auftrag_id?: string | null
    handwerker_id: string
    meta?: ProjektVertragWizardMeta
    notizen?: string
    ergaenzung?: {
      parent_vertrag_id: string
      dokument_titel: string
      bezug_vertrag_vom: string | null
      bezug_vertrags_nr: string | null
      nachtrag_positionen?: NachtragPositionDraft[]
    }
  }
): Promise<{ ok: true; id: string; vertrags_nr: string } | { ok: false; message: string }> {
  const supabase = supabaseAdmin
  const now = new Date().toISOString()

  let vertrags_nr: string
  if (input.vertrag_id) {
    const { data } = await supabase.from('handwerker_vertraege').select('vertrags_nr').eq('id', input.vertrag_id).maybeSingle()
    vertrags_nr = (data?.vertrags_nr as string) ?? (await nextVertragsnummer(supabase, input.typ))
  } else {
    vertrags_nr = await nextVertragsnummer(supabase, input.typ)
  }

  const patch: Record<string, unknown> = {
    typ: input.typ,
    vertrags_nr,
    handwerker_id: input.handwerker_id,
    updated_at: now,
  }

  if (input.typ === 'projekt' && input.meta) {
    const m = input.meta
    patch.auftrag_id = input.auftrag_id ?? null
    patch.gewerk_id = m.gewerk_id
    patch.gewerk_name = m.gewerk_name?.trim() || null
    patch.bauvorhaben = m.bauvorhaben?.trim() || null
    patch.leistungsumfang = m.leistungsumfang?.trim() || null
    patch.verguetung_text = m.verguetung_text?.trim() || null
    patch.regiesatz_netto = m.regiesatz_netto
    patch.einbehalt_prozent = m.einbehalt_prozent
    patch.zahlungsziel_tage = m.zahlungsziel_tage
    patch.aufmass_rhythmus_tage = m.aufmass_rhythmus_tage
    patch.notizen = m.notizen?.trim() || null
    if (input.typ === 'projekt') {
      patch.leistungsumfang = m.leistungsumfang?.trim() || 'Leistungen gemäß Vereinbarung.'
    }
  }

  if (input.ergaenzung) {
    patch.dokument_art = 'ergaenzung'
    patch.parent_vertrag_id = input.ergaenzung.parent_vertrag_id
    patch.dokument_titel = input.ergaenzung.dokument_titel
    patch.bezug_vertrag_vom = input.ergaenzung.bezug_vertrag_vom
    patch.bezug_vertrags_nr = input.ergaenzung.bezug_vertrags_nr
    patch.vertrag_vom = null
    patch.nachtrag_positionen = input.ergaenzung.nachtrag_positionen ?? null
  } else if (!input.vertrag_id) {
    patch.dokument_art = 'hauptvertrag'
  }

  if (input.notizen !== undefined) patch.notizen = input.notizen?.trim() || null

  if (input.vertrag_id) {
    const { error } = await supabase.from('handwerker_vertraege').update(patch).eq('id', input.vertrag_id)
    if (error) return { ok: false, message: error.message }
    return { ok: true, id: input.vertrag_id, vertrags_nr }
  }

  const { data, error } = await supabase
    .from('handwerker_vertraege')
    .insert({ ...patch, status: 'entwurf', created_at: now })
    .select('id, vertrags_nr')
    .single()

  if (error || !data) return { ok: false, message: error?.message ?? 'Speichern fehlgeschlagen' }
  return { ok: true, id: data.id as string, vertrags_nr: data.vertrags_nr as string }
}

export async function saveProjektVertragDraft(payload: {
  vertrag_id?: string | null
  auftrag_id: string
  meta: ProjektVertragWizardMeta
}): Promise<{ ok: true; vertrag_id: string; vertrags_nr: string } | { ok: false; message: string }> {
  if (!payload.meta.handwerker_id) return { ok: false, message: 'Bitte Handwerker wählen.' }
  const saved = await upsertVertragRow({
    vertrag_id: payload.vertrag_id,
    typ: 'projekt',
    auftrag_id: payload.auftrag_id,
    handwerker_id: payload.meta.handwerker_id,
    meta: payload.meta,
  })
  if (!saved.ok) return saved
  revalidatePath(`/auftraege/${payload.auftrag_id}`)
  return { ok: true, vertrag_id: saved.id, vertrags_nr: saved.vertrags_nr }
}

export async function finalizeProjektVertrag(payload: {
  vertrag_id?: string | null
  auftrag_id: string
  meta: ProjektVertragWizardMeta
}): Promise<
  { ok: true; vertrag_id: string; vertrags_nr: string; pdf_url: string } | { ok: false; message: string }
> {
  const draft = await saveProjektVertragDraft(payload)
  if (!draft.ok) return draft
  const pdf = await persistPdfForVertrag(draft.vertrag_id)
  if (!pdf.ok) return pdf

  await supabaseAdmin
    .from('auftrag_handwerker')
    .update({ projektvertrag_quelle: 'crm_wizard' })
    .eq('auftrag_id', payload.auftrag_id)
    .eq('handwerker_id', payload.meta.handwerker_id)

  revalidatePath(`/auftraege/${payload.auftrag_id}`)
  return {
    ok: true,
    vertrag_id: draft.vertrag_id,
    vertrags_nr: draft.vertrags_nr,
    pdf_url: pdf.publicUrl,
  }
}

export async function finalizeHandwerkerAcceptWizard(payload: {
  vertrag_id?: string | null
  auftrag_id: string
  handwerker_id: string
  meta: ProjektVertragWizardMeta
  compliance_slugs: string[]
}): Promise<
  { ok: true; vertrag_id: string; vertrags_nr: string; pdf_url: string; mailGesendet: boolean; mailHinweis?: string }
  | { ok: false; message: string }
> {
  const auftragId = payload.auftrag_id.trim()
  const handwerkerId = payload.handwerker_id.trim()
  if (!auftragId || !handwerkerId) {
    return { ok: false, message: 'Auftrag oder Handwerker fehlt.' }
  }

  const slugs = Array.from(new Set(payload.compliance_slugs.map((s) => s.trim()).filter(Boolean)))

  const { error: slugErr } = await supabaseAdmin
    .from('auftrag_handwerker')
    .update({ compliance_pflicht_slugs: slugs })
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)

  if (slugErr) return { ok: false, message: slugErr.message }

  const finalized = await finalizeProjektVertrag({
    vertrag_id: payload.vertrag_id,
    auftrag_id: auftragId,
    meta: payload.meta,
  })
  if (!finalized.ok) return finalized

  const { data: auftrag } = await supabaseAdmin
    .from('auftraege')
    .select('angebot_id')
    .eq('id', auftragId)
    .maybeSingle()
  const angebotId = (auftrag as { angebot_id?: string | null } | null)?.angebot_id
  if (angebotId) revalidatePath(`/angebote/${angebotId}`)

  return {
    ok: true,
    vertrag_id: finalized.vertrag_id,
    vertrags_nr: finalized.vertrags_nr,
    pdf_url: finalized.pdf_url,
    mailGesendet: false,
  }
}

export async function finalizeRahmenVertrag(payload: {
  vertrag_id?: string | null
  handwerker_id: string
  notizen?: string
}): Promise<
  { ok: true; vertrag_id: string; vertrags_nr: string; pdf_url: string } | { ok: false; message: string }
> {
  const saved = await upsertVertragRow({
    vertrag_id: payload.vertrag_id,
    typ: 'rahmen',
    handwerker_id: payload.handwerker_id,
    notizen: payload.notizen,
    meta: {
      ...defaultProjektMeta(),
      handwerker_id: payload.handwerker_id,
      leistungsumfang: 'Leistungen je Projekt gemäß gesondertem Projekt-Nachunternehmervertrag.',
      verguetung_text: 'Vergütung je Projektvertrag.',
    },
  })
  if (!saved.ok) return saved

  const pdf = await persistPdfForVertrag(saved.id)
  if (!pdf.ok) return pdf

  await syncRahmenvertragComplianceDoc({
    handwerker_id: payload.handwerker_id,
    pdf_url: pdf.publicUrl,
    vertrags_nr: saved.vertrags_nr,
  })

  revalidatePath(`/handwerker/${payload.handwerker_id}`)
  return { ok: true, vertrag_id: saved.id, vertrags_nr: saved.vertrags_nr, pdf_url: pdf.publicUrl }
}

export async function loadRahmenVertraegeForHandwerker(
  handwerkerIds: string[]
): Promise<Map<string, HandwerkerVertragRow>> {
  const map = new Map<string, HandwerkerVertragRow>()
  if (!handwerkerIds.length) return map
  const supabase = createClient()
  const { data } = await supabase
    .from('handwerker_vertraege')
    .select('*')
    .eq('typ', 'rahmen')
    .in('handwerker_id', handwerkerIds)
    .order('created_at', { ascending: false })
  for (const row of (data ?? []) as HandwerkerVertragRow[]) {
    if (!map.has(row.handwerker_id)) map.set(row.handwerker_id, row)
  }
  return map
}

export async function loadRahmenVertragForHandwerker(
  handwerkerId: string
): Promise<HandwerkerVertragRow | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('handwerker_vertraege')
    .select('*')
    .eq('handwerker_id', handwerkerId)
    .eq('typ', 'rahmen')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as HandwerkerVertragRow | null) ?? null
}

export async function listVertraegeFuerAuftrag(auftragId: string): Promise<HandwerkerVertragRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('handwerker_vertraege')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('created_at', { ascending: false })
  return (data ?? []) as HandwerkerVertragRow[]
}

export async function listHauptvertraegeFuerNachtrag(
  auftragId: string
): Promise<HandwerkerVertragRow[]> {
  const alle = await listVertraegeFuerAuftrag(auftragId)
  return alle.filter(istHauptvertragFuerNachtrag)
}

function parentVertragDatum(row: HandwerkerVertragRow): string | null {
  return (
    row.vertrag_vom?.trim() ||
    formatVertragDatumDe(row.signiert_am) ||
    formatVertragDatumDe(row.created_at)
  )
}

export async function loadNachtragBootstrap(input: {
  auftragId: string
  parentVertragId: string
  vertragId?: string | null
}): Promise<{ ok: true; bootstrap: ProjektVertragWizardBootstrap } | { ok: false; message: string }> {
  const auftragId = input.auftragId.trim()
  const parentVertragId = input.parentVertragId.trim()
  if (!auftragId || !parentVertragId) {
    return { ok: false, message: 'Auftrag oder Ursprungsvertrag fehlt.' }
  }

  const supabase = createClient()
  const { data: parent, error: parentErr } = await supabase
    .from('handwerker_vertraege')
    .select('*')
    .eq('id', parentVertragId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()

  if (parentErr || !parent) {
    return { ok: false, message: parentErr?.message ?? 'Ursprungsvertrag nicht gefunden.' }
  }

  const parentRow = parent as HandwerkerVertragRow
  if (!istHauptvertragFuerNachtrag(parentRow)) {
    return { ok: false, message: 'Nur abgeschlossene Hauptverträge können ergänzt werden.' }
  }

  const base = await loadProjektVertragBootstrap(auftragId, input.vertragId ?? null)
  if (!base.ok) return base

  const pos = positionenFuerHandwerkerGewerk(
    base.bootstrap.positionen,
    parentRow.handwerker_id,
    parentRow.gewerk_name ?? ''
  )

  let nachtragPositionen: NachtragPositionDraft[] = nachtragPositionenAusAuftrag(pos)

  if (input.vertragId) {
    const { data: draft } = await supabase
      .from('handwerker_vertraege')
      .select('nachtrag_positionen')
      .eq('id', input.vertragId)
      .maybeSingle()
    const saved = (draft as { nachtrag_positionen?: NachtragPositionDraft[] | null } | null)
      ?.nachtrag_positionen
    if (saved?.length) nachtragPositionen = saved
  }

  const parentVertragVom = parentVertragDatum(parentRow)
  const nachtragCtx: NachtragWizardContext = {
    parent_vertrag_id: parentRow.id,
    parent_vertrags_nr: parentRow.vertrags_nr,
    parent_vertrag_vom: parentVertragVom,
    parent_leistungsumfang: parentRow.leistungsumfang?.trim() || '',
    parent_verguetung_text: parentRow.verguetung_text?.trim() || '',
  }

  const bauvorhaben =
    parentRow.bauvorhaben?.trim() ||
    base.bootstrap.meta.bauvorhaben ||
    base.bootstrap.auftrag_titel

  const meta: ProjektVertragWizardMeta = {
    handwerker_id: parentRow.handwerker_id,
    gewerk_id: parentRow.gewerk_id,
    gewerk_name: parentRow.gewerk_name ?? '',
    bauvorhaben: `${bauvorhaben} (gleiches Bauvorhaben)`,
    leistungsumfang: leistungsumfangNachtragAusPositionen(nachtragPositionen, bauvorhaben),
    verguetung_text: verguetungNachtragAusPositionen({
      bezug_vertrag_vom: parentVertragVom,
      parent_verguetung_text: nachtragCtx.parent_verguetung_text,
      positionen: nachtragPositionen,
    }),
    regiesatz_netto: parentRow.regiesatz_netto,
    einbehalt_prozent: parentRow.einbehalt_prozent,
    zahlungsziel_tage: parentRow.zahlungsziel_tage,
    aufmass_rhythmus_tage: parentRow.aufmass_rhythmus_tage,
    notizen: '',
    nachtrag_positionen: nachtragPositionen,
  }

  if (input.vertragId) {
    const { data: existing } = await supabase
      .from('handwerker_vertraege')
      .select('*')
      .eq('id', input.vertragId)
      .maybeSingle()
    if (existing) {
      const row = existing as HandwerkerVertragRow
      meta.leistungsumfang = row.leistungsumfang ?? meta.leistungsumfang
      meta.verguetung_text = row.verguetung_text ?? meta.verguetung_text
      meta.notizen = row.notizen ?? ''
    }
  }

  return {
    ok: true,
    bootstrap: {
      ...base.bootstrap,
      vertrag_id: input.vertragId ?? null,
      vertrags_nr: input.vertragId ? base.bootstrap.vertrags_nr : null,
      meta,
      nachtrag_mode: nachtragCtx,
    },
  }
}

async function syncNachtragPositionenToAuftrag(
  auftragId: string,
  handwerkerId: string,
  positionen: NachtragPositionDraft[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const now = new Date().toISOString()
  for (let idx = 0; idx < positionen.length; idx++) {
    const p = positionen[idx]!
    const payload = {
      leistung_name: p.leistung_name.trim() || 'Leistung',
      einheit: p.einheit?.trim() || null,
      menge: p.menge,
      preis_partner: p.preis_partner,
      preis_fix: p.preis_partner,
      gewerk_name: p.gewerk_name.trim() || 'Leistung',
      handwerker_id: handwerkerId,
      updated_at: now,
      sort_order: idx,
    }

    if (p.quelle === 'neu' || p.id.startsWith('neu-')) {
      const { error } = await supabaseAdmin.from('auftrag_positionen').insert({
        ...payload,
        auftrag_id: auftragId,
        gewerk_slug: null,
        oberkategorie: null,
        unterkategorie: null,
        beschreibung: null,
        lohn_fix: null,
        material_fix: null,
        created_at: now,
      })
      if (error) return { ok: false, message: error.message }
    } else {
      const { error } = await supabaseAdmin
        .from('auftrag_positionen')
        .update(payload)
        .eq('id', p.id)
        .eq('auftrag_id', auftragId)
      if (error) return { ok: false, message: error.message }
    }
  }
  return { ok: true }
}

export async function saveNachtragDraft(payload: {
  vertrag_id?: string | null
  auftrag_id: string
  parent_vertrag_id: string
  meta: ProjektVertragWizardMeta
}): Promise<{ ok: true; vertrag_id: string; vertrags_nr: string } | { ok: false; message: string }> {
  if (!payload.meta.handwerker_id) return { ok: false, message: 'Handwerker fehlt.' }
  if (!payload.parent_vertrag_id) return { ok: false, message: 'Ursprungsvertrag fehlt.' }

  const supabase = createClient()
  const { data: parent } = await supabase
    .from('handwerker_vertraege')
    .select('vertrags_nr, signiert_am, created_at, vertrag_vom')
    .eq('id', payload.parent_vertrag_id)
    .maybeSingle()

  const parentRow = parent as HandwerkerVertragRow | null
  const bezugDatum = parentRow ? parentVertragDatum(parentRow) : null

  const saved = await upsertVertragRow({
    vertrag_id: payload.vertrag_id,
    typ: 'projekt',
    auftrag_id: payload.auftrag_id,
    handwerker_id: payload.meta.handwerker_id,
    meta: payload.meta,
    ergaenzung: {
      parent_vertrag_id: payload.parent_vertrag_id,
      dokument_titel: 'Ergänzungsvereinbarung zum Nachunternehmervertrag',
      bezug_vertrag_vom: bezugDatum,
      bezug_vertrags_nr: parentRow?.vertrags_nr ?? null,
      nachtrag_positionen: payload.meta.nachtrag_positionen,
    },
  })
  if (!saved.ok) return saved
  revalidatePath(`/auftraege/${payload.auftrag_id}`)
  return { ok: true, vertrag_id: saved.id, vertrags_nr: saved.vertrags_nr }
}

export async function finalizeNachtragVertrag(payload: {
  vertrag_id?: string | null
  auftrag_id: string
  parent_vertrag_id: string
  meta: ProjektVertragWizardMeta
  positionen_auftrag_speichern?: boolean
}): Promise<
  | {
      ok: true
      vertrag_id: string
      vertrags_nr: string
      pdf_url: string
      mailGesendet: boolean
      mailHinweis?: string
    }
  | { ok: false; message: string }
> {
  const draft = await saveNachtragDraft(payload)
  if (!draft.ok) return draft

  if (payload.positionen_auftrag_speichern !== false && payload.meta.nachtrag_positionen?.length) {
    const sync = await syncNachtragPositionenToAuftrag(
      payload.auftrag_id,
      payload.meta.handwerker_id,
      payload.meta.nachtrag_positionen
    )
    if (!sync.ok) return sync
  }

  const pdf = await persistPdfForVertrag(draft.vertrag_id)
  if (!pdf.ok) return pdf

  const handwerkerId = payload.meta.handwerker_id
  syncProjektvertragStilleFireAndForget(payload.auftrag_id, handwerkerId)

  const { data: auftragRow } = await supabaseAdmin
    .from('auftraege')
    .select('titel, kunden(name)')
    .eq('id', payload.auftrag_id)
    .maybeSingle()
  const kunde = Array.isArray(auftragRow?.kunden)
    ? auftragRow.kunden[0]
    : auftragRow?.kunden
  const projektName =
    (auftragRow?.titel as string | null)?.trim() ||
    (kunde as { name?: string | null } | null)?.name?.trim() ||
    'Auftrag'

  const nachtragPos = payload.meta.nachtrag_positionen ?? []
  const positionIds = nachtragPos
    .map((p) => p.id?.trim())
    .filter((id): id is string => Boolean(id && !id.startsWith('neu-')))

  const notify = await notifyPartnerUnified({
    handwerkerId,
    typ: 'geaendert',
    projektName,
    link: partnerVorgangLink(payload.auftrag_id),
    leistungName:
      nachtragPos.length === 1
        ? String(nachtragPos[0]!.leistung_name ?? '')
        : nachtragPos.length > 1
          ? `${nachtragPos.length} Leistungen`
          : 'Änderungsanfrage',
    auftragId: payload.auftrag_id,
    positionIds: positionIds.length ? positionIds : undefined,
    aenderungTyp: 'geaendert',
  })

  revalidatePath(`/auftraege/${payload.auftrag_id}`)
  return {
    ok: true,
    vertrag_id: draft.vertrag_id,
    vertrags_nr: draft.vertrags_nr,
    pdf_url: pdf.publicUrl,
    mailGesendet: notify.ok,
    mailHinweis: notify.ok ? undefined : notify.error,
  }
}

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { bauvorhabenAusAuftrag, leistungsumfangAusPositionen, verguetungAusPositionen } from '@/lib/vertraege/build-vertrag-texte'
import { nextVertragsnummer } from '@/lib/vertraege/next-vertragsnummer'
import { persistPdfForVertrag } from '@/lib/vertraege/persist-vertrag-pdf'
import type { ProjektVertragWizardMeta } from '@/lib/vertraege/types'
import type { AuftragPosition } from '@/lib/types'

function unwrapJoin<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null
  return Array.isArray(raw) ? (raw[0] ?? null) : raw
}

function positionenFuerZuordnung(
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

export type PortalProjektvertragPreview = {
  auftrag_id: string
  auftrag_titel: string
  gewerk_name: string
  bauvorhaben: string
  leistungsumfang: string
  verguetung_text: string
  bereits_bestaetigt: boolean
  vertrag_pdf_url: string | null
  vertrags_nr: string | null
}

export async function loadPortalProjektvertragPreview(
  auftragId: string,
  handwerkerId: string
): Promise<{ ok: true; preview: PortalProjektvertragPreview } | { ok: false; message: string }> {
  const { data: zuordnung } = await supabaseAdmin
    .from('auftrag_handwerker')
    .select('id, projektvertrag_bestaetigt_am, gewerke(name)')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)
    .maybeSingle()

  if (!zuordnung) return { ok: false, message: 'Keine Zuordnung zu diesem Auftrag.' }

  const { data: auf, error } = await supabaseAdmin
    .from('auftraege')
    .select(
      `
      id, titel,
      kunden(name, adresse, strasse, hausnummer, plz, ort),
      auftrag_positionen(*)
    `
    )
    .eq('id', auftragId)
    .maybeSingle()

  if (error || !auf) return { ok: false, message: error?.message ?? 'Auftrag nicht gefunden' }

  const gewerk = unwrapJoin(
    (zuordnung as { gewerke?: { name: string } | { name: string }[] | null }).gewerke
  )
  const gewerkName = gewerk?.name ?? ''
  const positionen = (auf.auftrag_positionen ?? []) as AuftragPosition[]
  const pos = positionenFuerZuordnung(positionen, handwerkerId, gewerkName)
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

  const { data: existingVertrag } = await supabaseAdmin
    .from('handwerker_vertraege')
    .select('vertrags_nr, pdf_url, status')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)
    .eq('typ', 'projekt')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const bestaetigt = Boolean(
    (zuordnung as { projektvertrag_bestaetigt_am?: string | null }).projektvertrag_bestaetigt_am
  )

  return {
    ok: true,
    preview: {
      auftrag_id: auftragId,
      auftrag_titel: (auf.titel as string | null)?.trim() || kunde?.name || 'Auftrag',
      gewerk_name: gewerkName,
      bauvorhaben: bauvorhabenAusAuftrag({
        titel: (auf.titel as string | null) ?? 'Auftrag',
        kunde_adresse: kundeAdr,
        kunde_plz: kunde?.plz ?? null,
        kunde_ort: kunde?.ort ?? null,
        gewerk_name: gewerkName,
      }),
      leistungsumfang: leistungsumfangAusPositionen(pos),
      verguetung_text: verguetungAusPositionen(pos),
      bereits_bestaetigt: bestaetigt,
      vertrag_pdf_url: (existingVertrag?.pdf_url as string | null) ?? null,
      vertrags_nr: (existingVertrag?.vertrags_nr as string | null) ?? null,
    },
  }
}

export async function confirmPortalProjektvertrag(
  auftragId: string,
  handwerkerId: string
): Promise<
  { ok: true; vertrag_id: string; vertrags_nr: string; pdf_url: string } | { ok: false; message: string }
> {
  const preview = await loadPortalProjektvertragPreview(auftragId, handwerkerId)
  if (!preview.ok) return preview
  if (preview.preview.bereits_bestaetigt && preview.preview.vertrag_pdf_url) {
    return {
      ok: true,
      vertrag_id: '',
      vertrags_nr: preview.preview.vertrags_nr ?? '',
      pdf_url: preview.preview.vertrag_pdf_url,
    }
  }

  const { data: zuordnung } = await supabaseAdmin
    .from('auftrag_handwerker')
    .select('id, gewerk_id, gewerke(name)')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)
    .maybeSingle()
  if (!zuordnung) return { ok: false, message: 'Keine Zuordnung.' }

  const gewerk = unwrapJoin(
    (zuordnung as { gewerke?: { name: string } | { name: string }[] | null }).gewerke
  )
  const gewerkName = gewerk?.name ?? ''
  const gewerkId = (zuordnung as { gewerk_id?: string | null }).gewerk_id ?? null

  const { data: auf } = await supabaseAdmin
    .from('auftraege')
    .select('id, titel, kunden(plz, ort, adresse, strasse, hausnummer), auftrag_positionen(*)')
    .eq('id', auftragId)
    .maybeSingle()
  if (!auf) return { ok: false, message: 'Auftrag nicht gefunden' }

  const positionen = (auf.auftrag_positionen ?? []) as AuftragPosition[]
  const pos = positionenFuerZuordnung(positionen, handwerkerId, gewerkName)
  const kunde = auf.kunden as {
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

  const meta: ProjektVertragWizardMeta = {
    handwerker_id: handwerkerId,
    gewerk_id: gewerkId,
    gewerk_name: gewerkName,
    bauvorhaben: bauvorhabenAusAuftrag({
      titel: (auf.titel as string | null) ?? 'Auftrag',
      kunde_adresse: kundeAdr,
      kunde_plz: kunde?.plz ?? null,
      kunde_ort: kunde?.ort ?? null,
      gewerk_name: gewerkName,
    }),
    leistungsumfang: leistungsumfangAusPositionen(pos),
    verguetung_text: verguetungAusPositionen(pos),
    regiesatz_netto: 56,
    einbehalt_prozent: 5,
    zahlungsziel_tage: 14,
    aufmass_rhythmus_tage: 14,
    notizen: 'Automatisch erzeugt nach Partner-Bestätigung im Portal.',
  }

  const now = new Date().toISOString()
  const { data: existing } = await supabaseAdmin
    .from('handwerker_vertraege')
    .select('id, vertrags_nr')
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)
    .eq('typ', 'projekt')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let vertragId = existing?.id as string | undefined
  let vertragsNr = existing?.vertrags_nr as string | undefined

  const row = {
    typ: 'projekt' as const,
    auftrag_id: auftragId,
    handwerker_id: handwerkerId,
    gewerk_id: meta.gewerk_id,
    gewerk_name: meta.gewerk_name || null,
    bauvorhaben: meta.bauvorhaben,
    leistungsumfang: meta.leistungsumfang,
    verguetung_text: meta.verguetung_text,
    regiesatz_netto: meta.regiesatz_netto,
    einbehalt_prozent: meta.einbehalt_prozent,
    zahlungsziel_tage: meta.zahlungsziel_tage,
    aufmass_rhythmus_tage: meta.aufmass_rhythmus_tage,
    notizen: meta.notizen,
    updated_at: now,
  }

  if (vertragId) {
    const { error } = await supabaseAdmin.from('handwerker_vertraege').update(row).eq('id', vertragId)
    if (error) return { ok: false, message: error.message }
  } else {
    vertragsNr = await nextVertragsnummer(supabaseAdmin, 'projekt')
    const { data: ins, error } = await supabaseAdmin
      .from('handwerker_vertraege')
      .insert({
        ...row,
        vertrags_nr: vertragsNr,
        status: 'entwurf',
        created_at: now,
      })
      .select('id, vertrags_nr')
      .single()
    if (error || !ins) return { ok: false, message: error?.message ?? 'Vertrag anlegen fehlgeschlagen' }
    vertragId = ins.id as string
    vertragsNr = ins.vertrags_nr as string
  }

  const pdf = await persistPdfForVertrag(vertragId)
  if (!pdf.ok) return pdf

  const signiertAm = new Date().toISOString()
  await supabaseAdmin
    .from('handwerker_vertraege')
    .update({ status: 'unterschrieben', signiert_am: signiertAm })
    .eq('id', vertragId)

  await supabaseAdmin
    .from('auftrag_handwerker')
    .update({
      projektvertrag_bestaetigt_am: signiertAm,
      projektvertrag_quelle: 'portal_bestaetigung',
    })
    .eq('auftrag_id', auftragId)
    .eq('handwerker_id', handwerkerId)

  revalidatePath(`/auftraege/${auftragId}`)
  revalidatePath(`/handwerker/${handwerkerId}`)

  return {
    ok: true,
    vertrag_id: vertragId,
    vertrags_nr: vertragsNr ?? '',
    pdf_url: pdf.publicUrl,
  }
}

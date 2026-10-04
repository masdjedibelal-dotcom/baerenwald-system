'use server'

import { revalidateAngebotDetail,revalidateAuftragList,revalidateLeadDetail } from '@/lib/crm-revalidate'
import { writeAngebotStatus } from '@/lib/status/write-angebot-status'
import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { AngebotPosition } from '@/lib/types'
import {
createAngebot,
persistPdfForAngebot,
sendAngebotToKunde,
updateAngebot,
} from '@/app/(dashboard)/angebote/actions'
import type {
AngebotDokumentTyp,
AngebotWizardMeta,
} from '@/lib/angebote/angebot-wizard-types'
import type { AngebotProjektFoto } from '@/lib/angebote/angebot-projekt-fotos'
import {
defaultWizardMeta,
metaToNotizen,
parseAngebotWizardMetaFromNotizen,
resolveAngebotKundeTyp,
angebotTitelFuerKopie,
type AngebotWizardBootstrap,
type AngebotVariantenPersistJson,
angebotStatusErlaubtImWizard,
angebotWizardBearbeitenSperrgrund,
} from '@/lib/angebote/angebot-wizard-types'
import {
loadAuftragKorrekturKontext,
auftragKorrekturSperrgrund,
type AuftragKorrekturKontext,
} from '@/lib/angebote/auftrag-korrektur'
import { parseZahlungsplan,zahlungsplanVorlage50_50 } from '@/lib/rechnungen/zahlungsplan'
import { parseProjektFotos } from '@/lib/angebote/angebot-projekt-fotos'
import {
mergeHandwerkerQueuesIntoPositionen,
normalizeAngebotPositionen,
repairAngebotPositionen,
summenAusPositionen,
} from '@/lib/angebot-positionen'
import { rebindLooseAnfahrtPositionen } from '@/lib/anfahrt-angebot'
import { parseAngebotAnrede } from '@/lib/templates/angebot-mail'
import { syncNeueLeistungenToPreisliste } from '@/app/(dashboard)/preislisten/actions'
import { syncAuftragAusAngebotKorrektur } from '@/app/(dashboard)/auftraege/angebot-korrektur-actions'
import {
syncInputsFromAngebotPositionen,
syncInputsFromDokumentArtikel,
type NeueLeistungSyncInput,
} from '@/lib/preislisten/sync-neue-leistungen'
import type { DokumentArtikelZeile } from '@/lib/dokument-zeilen'

export type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'

export type SaveAngebotWizardDraftPayload = {
  angebotId?: string | null
  lead_id: string
  kunde_id: string
  /** Primäre Positionen (= Variante A, wenn Zweivarianten aktiv) */
  positionen: AngebotPosition[]
  meta: AngebotWizardMeta
  dokument_typ?: AngebotDokumentTyp
  projektbeschreibung?: string | null
  fotos_urls?: AngebotProjektFoto[]
  wichtige_hinweise?: string | null
  /** Nur bei Projekt + zwei Varianten: B-Positionen; A liegt in Spalte positionen */
  varianten?: AngebotVariantenPersistJson | null
  /** Artikel-Zeilen für Übernahme freier Leistungen in preislisten */
  artikelFuerPreislisteSync?: DokumentArtikelZeile[]
  kunde_objekt_id?: string | null
  /** Handwerker-Zuordnung pro Gewerk (Schritt 3) */
  handwerker_zuweisungen?: { gewerk_id: string; handwerker_id: string }[]
  handwerker_aufgabe_notizen?: Record<string, string | null | undefined>
  zahlungsplan?: import('@/lib/rechnungen/zahlungsplan').Zahlungsplan | null
  /** Nach Speichern: Auftragspositionen aus Angebot übernehmen */
  auftragKorrekturId?: string | null
  ist_wiederkehrend?: boolean
  wiederkehr_turnus?: string | null
}

async function persistAngebotPdfNachEntwurfSpeichern(
  angebotId: string,
  leadId: string | null,
  opts?: { asSystem?: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  // Bereits versendet: PDF + Portal-Snapshot bleiben bis erneut „Versenden“
  const { data: stRow, error } = await supabaseAdmin
    .from('angebote')
    .select('gesendet_kunde_at, gesendet_am, status, status_einfach')
    .eq('id', angebotId)
    .maybeSingle()
  if (error) logDbError('app/angebote/wizard-actions:angebote', error)
  const alreadySent = Boolean(
    String(
      (stRow as { gesendet_kunde_at?: string | null } | null)?.gesendet_kunde_at ??
        (stRow as { gesendet_am?: string | null } | null)?.gesendet_am ??
        ''
    ).trim()
  )
  if (alreadySent) {
    if (!opts?.asSystem) {
      revalidateAngebotDetail(angebotId)
      if (leadId) {
        revalidateLeadDetail(leadId)
      }
    }
    return { ok: true }
  }

  const pdf = await persistPdfForAngebot(angebotId, { skipRevalidate: true })
  if (!opts?.asSystem) {
    revalidateAngebotDetail(angebotId)
    if (leadId) {
      revalidateLeadDetail(leadId)
    }
  }
  if (!pdf.ok) {
    console.warn('[saveAngebotWizardDraft] PDF:', pdf.message)
    return { ok: false, message: pdf.message }
  }
  return { ok: true }
}

export async function saveAngebotWizardDraft(
  input: SaveAngebotWizardDraftPayload,
  opts?: { asSystem?: boolean }
): Promise<
  { ok: true; angebotId: string; angebotsnr: string | null } | { ok: false; message: string }
> {
  try {
    return await saveAngebotWizardDraftInner(input, opts)
  } catch (e) {
    console.error('[saveAngebotWizardDraft]', e)
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Speichern fehlgeschlagen',
    }
  }
}

async function saveAngebotWizardDraftInner(
  input: SaveAngebotWizardDraftPayload,
  opts?: { asSystem?: boolean }
): Promise<
  { ok: true; angebotId: string; angebotsnr: string | null } | { ok: false; message: string }
> {
  const dokumentTyp = input.dokument_typ ?? 'einfach'
  let positionen = repairAngebotPositionen(
    rebindLooseAnfahrtPositionen(normalizeAngebotPositionen(input.positionen))
  )
  if (input.handwerker_zuweisungen?.length) {
    positionen = mergeHandwerkerQueuesIntoPositionen(positionen, input.handwerker_zuweisungen)
  }
  if (!positionen.length) {
    return { ok: false, message: 'Mindestens eine Position erforderlich.' }
  }

  const preislisteSync: NeueLeistungSyncInput[] = input.artikelFuerPreislisteSync?.length
    ? syncInputsFromDokumentArtikel(input.artikelFuerPreislisteSync)
    : syncInputsFromAngebotPositionen(positionen)
  const variantenB = input.varianten?.b?.positionen
  if (Array.isArray(variantenB) && variantenB.length) {
    preislisteSync.push(...syncInputsFromAngebotPositionen(normalizeAngebotPositionen(variantenB)))
  }
  // No-Op für Katalog — freie Positionen → Lernsignale (KI)
  await syncNeueLeistungenToPreisliste(preislisteSync)
  const freie = positionen.filter(
    (p) =>
      p.position_quelle === 'frei' ||
      (!p.variante_id && !p.leistung_id && p.leistung?.trim())
  )
  if (freie.length) {
    const { recordKatalogLernsignale } = await import('@/app/(dashboard)/katalog/actions')
    await recordKatalogLernsignale(
      freie.map((p) => ({
        angebotId: input.angebotId,
        leadId: input.lead_id,
        gewerkId: p.gewerk_id || null,
        titel: p.leistung || p.leistung_name || '',
        beschreibung: p.beschreibung,
        einheit: p.einheit,
        preisNetto: Number(p.vk_netto ?? p.lohn_netto) || 0,
        menge: p.menge,
        quelle: 'frei' as const,
      }))
    )
  }

  const variantenNormalized: AngebotVariantenPersistJson | null =
    dokumentTyp === 'projekt' && input.varianten
      ? {
          a: {
            name: input.varianten.a?.name ?? 'Variante A',
            positionen: normalizeAngebotPositionen(input.varianten.a?.positionen ?? []),
          },
          b: {
            name: input.varianten.b?.name ?? 'Variante B',
            positionen: normalizeAngebotPositionen(input.varianten.b?.positionen ?? []),
          },
        }
      : null

  const posBLen = variantenNormalized?.b?.positionen?.length ?? 0
  if (variantenNormalized && posBLen === 0) {
    return { ok: false, message: 'Bei zwei Varianten bitte auch Positionen für Variante B anlegen.' }
  }

  const notizen = metaToNotizen(input.meta)
  const summen = summenAusPositionen(positionen, 19)

  const projektFelder =
    dokumentTyp === 'projekt'
      ? {
          dokument_typ: 'projekt' as const,
          projektbeschreibung: input.projektbeschreibung?.trim() ?? null,
          fotos_urls: Array.isArray(input.fotos_urls) ? input.fotos_urls : [] as AngebotProjektFoto[],
          wichtige_hinweise: input.wichtige_hinweise?.trim() ?? null,
          varianten: variantenNormalized,
          hinweise: null,
        }
      : {
          dokument_typ: 'einfach' as const,
          projektbeschreibung: null,
          fotos_urls: Array.isArray(input.fotos_urls) ? input.fotos_urls : ([] as AngebotProjektFoto[]),
          wichtige_hinweise: null,
          varianten: null,
          hinweise: input.meta.hinweise?.trim() || null,
        }

  const kundeObjektId = input.meta.kunde_objekt_id?.trim() || null
  const objektAnlageId = input.meta.objekt_anlage_id?.trim() || null
  const ansprechpartnerId = input.meta.ansprechpartner_id?.trim() || null

  // P10 (Entscheidung 29.09.2026): Ein Angebot, das beim Kunden war, wird nicht überschrieben.
  // Bearbeiten erzeugt eine neue Version mit neuer Nummer; die alte gilt als „ersetzt“.
  // Ausnahme: Auftrags-Korrektur (eigener Weg).
  let ersetztAngebotId: string | null = null
  if (input.angebotId && !input.auftragKorrekturId?.trim()) {
    const db0 = opts?.asSystem ? supabaseAdmin : createClient()
    const { data: alt, error: altErr } = await db0
      .from('angebote')
      .select('status, status_einfach, gesendet_kunde_at, gesendet_am')
      .eq('id', input.angebotId)
      .maybeSingle()
    if (altErr) logDbError('app/angebote/wizard-actions:angebote-version', altErr)
    if (alt && angebotWarBeimKunden(alt)) ersetztAngebotId = input.angebotId
  }

  if (input.angebotId && !ersetztAngebotId) {
    const upd = await updateAngebot(
      input.angebotId,
      {
        lead_id: input.lead_id,
        kunde_id: input.kunde_id,
        kunde_objekt_id: kundeObjektId,
        objekt_anlage_id: objektAnlageId,
        ansprechpartner_id: ansprechpartnerId,
        positionen,
        notizen,
        preis_typ: 'range',
        gesamt_min: summen.nettoMin,
        gesamt_max: summen.nettoMax,
        leistungsumfang: input.meta.leistungsumfang,
        einleitung: input.meta.einleitung,
        hinweise: projektFelder.hinweise,
        zahlungsbedingungen: input.meta.zahlungsbedingungen,
        gueltig_bis: input.meta.gueltig_bis,
        zahlungsplan:
          input.meta.zahlungsbedingungen === 'abschlagsplan' ||
          input.meta.zahlungsbedingungen === 'anzahlung_50'
            ? input.zahlungsplan ?? null
            : null,
        dokument_typ: projektFelder.dokument_typ,
        projektbeschreibung: projektFelder.projektbeschreibung,
        fotos_urls: projektFelder.fotos_urls,
        wichtige_hinweise: projektFelder.wichtige_hinweise,
        varianten: projektFelder.varianten,
        handwerker_aufgabe_notizen: input.handwerker_aufgabe_notizen,
        ist_wiederkehrend: input.ist_wiederkehrend,
        wiederkehr_turnus: input.wiederkehr_turnus,
      },
      {
        asSystem: opts?.asSystem,
        forAuftragKorrektur: Boolean(input.auftragKorrekturId?.trim()),
      }
    )
    if (!upd.ok) return upd
    const db = opts?.asSystem ? supabaseAdmin : createClient()
    const { data: nrRow, error } = await db
      .from('angebote')
      .select('angebotsnr')
      .eq('id', input.angebotId)
      .maybeSingle()
    if (error) logDbError('app/angebote/wizard-actions:angebote', error)
    await persistAngebotPdfNachEntwurfSpeichern(input.angebotId, input.lead_id, opts)
    if (input.auftragKorrekturId?.trim()) {
      const sync = await syncAuftragAusAngebotKorrektur({
        auftragId: input.auftragKorrekturId.trim(),
        angebotId: input.angebotId,
        leistungszeitraum_von: input.meta.leistungszeitraum_von ?? null,
        leistungszeitraum_bis: input.meta.leistungszeitraum_bis ?? null,
      })
      if (!sync.ok) return sync
    }
    return { ok: true, angebotId: input.angebotId, angebotsnr: nrRow?.angebotsnr ?? null }
  }

  const created = await createAngebot({
    lead_id: input.lead_id,
    kunde_id: input.kunde_id,
    kunde_objekt_id: kundeObjektId,
    objekt_anlage_id: objektAnlageId,
    ansprechpartner_id: ansprechpartnerId,
    positionen,
    notizen,
    preis_typ: 'range',
    gesamt_min: summen.nettoMin,
    gesamt_max: summen.nettoMax,
    leistungsumfang: input.meta.leistungsumfang,
    einleitung: input.meta.einleitung,
    hinweise: projektFelder.hinweise,
    zahlungsbedingungen: input.meta.zahlungsbedingungen,
    gueltig_bis: input.meta.gueltig_bis,
    zahlungsplan:
      input.meta.zahlungsbedingungen === 'abschlagsplan' ||
      input.meta.zahlungsbedingungen === 'anzahlung_50'
        ? input.zahlungsplan ?? null
        : null,
    dokument_typ: projektFelder.dokument_typ,
    projektbeschreibung: projektFelder.projektbeschreibung,
    fotos_urls: projektFelder.fotos_urls,
    wichtige_hinweise: projektFelder.wichtige_hinweise,
    varianten: projektFelder.varianten,
    handwerker_aufgabe_notizen: input.handwerker_aufgabe_notizen,
    ist_wiederkehrend: input.ist_wiederkehrend,
    wiederkehr_turnus: input.wiederkehr_turnus,
  }, { asSystem: opts?.asSystem })
  if (!created.ok) return created
  const db = opts?.asSystem ? supabaseAdmin : createClient()
  if (ersetztAngebotId) {
    // Wie im Portal: ersetzte Version = status abgelehnt, status_einfach ersetzt, Verweis auf die neue.
    const { error: ersErr } = await writeAngebotStatus(db, ersetztAngebotId, 'abgelehnt', {
      status_einfach: 'ersetzt',
      ersetzt_durch: created.id,
    })
    if (ersErr) logDbError('app/angebote/wizard-actions:angebote-ersetzt', ersErr)
  }
  const { data: nrRow, error } = await db
    .from('angebote')
    .select('angebotsnr')
    .eq('id', created.id)
    .maybeSingle()
  if (error) logDbError('app/angebote/wizard-actions:angebote', error)
  await persistAngebotPdfNachEntwurfSpeichern(created.id, input.lead_id, opts)
  return { ok: true, angebotId: created.id, angebotsnr: nrRow?.angebotsnr ?? null }
}

export async function sendAngebotWizard(input: {
  angebotId: string
  lead_id: string
  mailTo: string[]
  mailCc?: string[]
  betreff?: string
  /** Angenommenes Angebot: Korrektur senden ohne Status-Rücksetzung */
  auftragKorrektur?: boolean
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const sent = await sendAngebotToKunde(input.angebotId, {
      to: input.mailTo,
      cc: input.mailCc,
      betreff: input.betreff?.trim() || undefined,
      statusBeibehalten: input.auftragKorrektur,
      skipHandwerkerGate: input.auftragKorrektur,
    })
    if (!sent?.ok) {
      return {
        ok: false,
        message:
          sent && 'message' in sent && sent.message
            ? sent.message
            : 'Versand fehlgeschlagen',
      }
    }
    if (input.auftragKorrektur) {
      revalidateAuftragList()
    }
    revalidateLeadDetail(input.lead_id)
    revalidateAngebotDetail(input.angebotId)
    return { ok: true }
  } catch (e) {
    console.error('[sendAngebotWizard]', e)
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Versand fehlgeschlagen',
    }
  }
}

function normalizeVariantenFromDb(raw: unknown): AngebotVariantenPersistJson | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as AngebotVariantenPersistJson
  const aPos = Array.isArray(r.a?.positionen) ? r.a.positionen : []
  const bPos = Array.isArray(r.b?.positionen) ? r.b.positionen : []
  if (!aPos.length && !bPos.length) return null
  return {
    a: {
      name: r.a?.name?.trim() || 'Variante A',
      positionen: normalizeAngebotPositionen(aPos),
    },
    b: {
      name: r.b?.name?.trim() || 'Variante B',
      positionen: normalizeAngebotPositionen(bPos),
    },
  }
}

export async function loadAngebotWizardBootstrap(
  angebotId: string,
  leadId: string,
  opts?: {
    asSystem?: boolean
    /** Auftrags-Korrektur/Nachtrag: Gate am Auftrag, nicht am Angebotsstatus */
    forAuftragKorrektur?: boolean
    /** Nachtrag: gestellte Rechnung sperrt den Load nicht */
    ignoreGestellteRechnung?: boolean
  }
): Promise<{ ok: true; bootstrap: AngebotWizardBootstrap } | { ok: false; message: string }> {
  const supabase = opts?.asSystem ? supabaseAdmin : createClient()

  const { data: row, error } = await supabase
    .from('angebote')
    .select(
      `
      id,
      lead_id,
      status,
      angebotsnr,
      notizen,
      positionen,
      dokument_typ,
      projektbeschreibung,
      fotos_urls,
      wichtige_hinweise,
      einleitung,
      leistungsumfang,
      gueltig_bis,
      zahlungsbedingungen,
      zahlungsplan,
      hinweise,
      varianten,
      kunde_objekt_id,
      ansprechpartner_id,
      gesendet_kunde_at,
      ist_wiederkehrend,
      wiederkehr_turnus,
      leads(plz, bereiche, situation, kundentyp,       kunden!kunde_id(typ)),
      angebot_handwerker(gewerk_id, handwerker_id, status, aufgabe_notiz)
    `
    )
    .eq('id', angebotId)
    .maybeSingle()
  if (error) logDbError('app/angebote/wizard-actions:angebote', error)

  if (error || !row) {
    return { ok: false, message: error?.message ?? 'Angebot nicht gefunden' }
  }

  const ang = row as {
    id: string
    lead_id: string | null
    status: string
    angebotsnr: string | null
    kunde_objekt_id?: string | null
    notizen: string | null
    positionen: unknown
    dokument_typ: string | null
    projektbeschreibung: string | null
    fotos_urls: unknown
    wichtige_hinweise: string | null
    einleitung: string | null
    leistungsumfang: string | null
    gueltig_bis: string | null
    zahlungsbedingungen: string | null
    zahlungsplan?: unknown
    hinweise: string | null
    varianten?: unknown
    gesendet_kunde_at?: string | null
    ist_wiederkehrend?: boolean | null
    wiederkehr_turnus?: string | null
    leads?: {
      plz?: string | null
      bereiche?: unknown
      situation?: string | null
      kundentyp?: string | null
      kunden?: { typ?: string | null } | null
    } | null
    angebot_handwerker?: {
      gewerk_id: string
      handwerker_id: string
      status?: string
      aufgabe_notiz?: string | null
    }[] | null
  }

  if (ang.lead_id !== leadId) {
    return { ok: false, message: 'Angebot gehört nicht zu dieser Anfrage.' }
  }
  let auftragKorrektur: AuftragKorrekturKontext | undefined
  if (opts?.forAuftragKorrektur) {
    const loadedCtx = await loadAuftragKorrekturKontext(supabase, {
      angebotId,
    })
    auftragKorrektur = opts.ignoreGestellteRechnung
      ? { auftragId: loadedCtx.auftragId, hatGestellteRechnung: false }
      : loadedCtx
  }
  if (!angebotStatusErlaubtImWizard(ang.status, { ...opts, auftragKorrektur })) {
    return {
      ok: false,
      message: opts?.forAuftragKorrektur
        ? auftragKorrekturSperrgrund(
            auftragKorrektur ?? {
              auftragId: null,
              hatGestellteRechnung: false,
            }
          )
        : angebotWizardBearbeitenSperrgrund(ang.status) ??
          'Dieses Angebot kann im Wizard nicht mehr bearbeitet werden.',
    }
  }

  const kundeTyp = resolveAngebotKundeTyp(
    ang.leads?.kunden?.typ,
    ang.leads?.kundentyp
  )
  const projektLabel =
    (ang.leistungsumfang?.trim() || 'Projekt').slice(0, 120)
  const fallbackMeta = defaultWizardMeta(
    'Kunde',
    projektLabel,
    ang.leistungsumfang?.trim() ?? '',
    parseAngebotAnrede(ang.notizen, kundeTyp),
    kundeTyp
  )

  const metaParsed = parseAngebotWizardMetaFromNotizen(ang.notizen, fallbackMeta, {
    einleitung: ang.einleitung,
    leistungsumfang: ang.leistungsumfang,
    gueltig_bis: ang.gueltig_bis,
    zahlungsbedingungen: ang.zahlungsbedingungen,
    hinweise: ang.hinweise,
  }, kundeTyp)
  const angObjektId = (ang as { kunde_objekt_id?: string | null }).kunde_objekt_id
  const angApId = (ang as { ansprechpartner_id?: string | null }).ansprechpartner_id
  const meta = {
    ...metaParsed,
    kunde_objekt_id: angObjektId?.trim() || metaParsed.kunde_objekt_id || null,
    ansprechpartner_id: angApId?.trim() || metaParsed.ansprechpartner_id || null,
  }

  const zahlungsplanParsed = parseZahlungsplan(ang.zahlungsplan)
  const zahlungsplan =
    zahlungsplanParsed ??
    (meta.zahlungsbedingungen === 'anzahlung_50' ? zahlungsplanVorlage50_50() : null)

  const dokumentTyp =
    ang.dokument_typ === 'projekt' ? ('projekt' as const) : ('einfach' as const)

  const variantenPersist =
    dokumentTyp === 'projekt' ? normalizeVariantenFromDb(ang.varianten) : null

  const posNorm = repairAngebotPositionen(
    rebindLooseAnfahrtPositionen(normalizeAngebotPositionen(ang.positionen))
  )
  const hwK = (ang.angebot_handwerker ?? []).map((z) => ({
    gewerk_id: z.gewerk_id as string,
    handwerker_id: z.handwerker_id as string,
  }))
  const positionen = mergeHandwerkerQueuesIntoPositionen(posNorm, hwK)

  const bootstrap: AngebotWizardBootstrap = {
    angebotId: ang.id,
    angebotsnr: ang.angebotsnr?.trim() || null,
    positionen,
    meta,
    dokumentTyp,
    projektbeschreibung: ang.projektbeschreibung?.trim() || null,
    projektFotos: parseProjektFotos(ang.fotos_urls),
    varianten: variantenPersist,
    wichtige_hinweise: ang.wichtige_hinweise?.trim() || null,
    bereitsGesendet: Boolean(ang.gesendet_kunde_at),
    zahlungsplan,
    ist_wiederkehrend: ang.ist_wiederkehrend === true,
    wiederkehr_turnus: ang.wiederkehr_turnus ?? null,
  }

  return { ok: true, bootstrap }
}

/**
 * 1:1-Kopie für neuen Wizard-Entwurf: gleiche Inhalte, Titel mit (2), (3), … — keine Angebots-ID.
 * Positionen inkl. Preise (vk/lohn/material/gesamt) unverändert übernehmen —
 * nicht wie Partner-LV-Vorgabe auf 0 setzen.
 */
export async function loadAngebotWizardBootstrapKopie(
  quelleAngebotId: string,
  leadId: string,
  opts?: { asSystem?: boolean }
): Promise<{ ok: true; bootstrap: AngebotWizardBootstrap } | { ok: false; message: string }> {
  const supabase = opts?.asSystem ? supabaseAdmin : createClient()

  const { data: row, error } = await supabase
    .from('angebote')
    .select(
      `
      id,
      lead_id,
      notizen,
      positionen,
      dokument_typ,
      projektbeschreibung,
      fotos_urls,
      wichtige_hinweise,
      einleitung,
      leistungsumfang,
      gueltig_bis,
      zahlungsbedingungen,
      zahlungsplan,
      hinweise,
      varianten,
      kunde_objekt_id,
      ansprechpartner_id,
      ist_wiederkehrend,
      wiederkehr_turnus,
      leads(plz, bereiche, situation, kundentyp, kunden!kunde_id(typ)),
      angebot_handwerker(gewerk_id, handwerker_id, status, aufgabe_notiz)
    `
    )
    .eq('id', quelleAngebotId)
    .maybeSingle()
  if (error) logDbError('app/angebote/wizard-actions:angebote', error)

  if (error || !row) {
    return { ok: false, message: error?.message ?? 'Angebot nicht gefunden' }
  }

  const ang = row as {
    id: string
    lead_id: string | null
    kunde_objekt_id?: string | null
    ansprechpartner_id?: string | null
    notizen: string | null
    positionen: unknown
    dokument_typ: string | null
    projektbeschreibung: string | null
    fotos_urls: unknown
    wichtige_hinweise: string | null
    einleitung: string | null
    leistungsumfang: string | null
    gueltig_bis: string | null
    zahlungsbedingungen: string | null
    zahlungsplan?: unknown
    hinweise: string | null
    varianten?: unknown
    ist_wiederkehrend?: boolean | null
    wiederkehr_turnus?: string | null
    leads?: {
      plz?: string | null
      bereiche?: unknown
      situation?: string | null
      kundentyp?: string | null
      kunden?: { typ?: string | null } | null
    } | null
    angebot_handwerker?: {
      gewerk_id: string
      handwerker_id: string
      status?: string
      aufgabe_notiz?: string | null
    }[] | null
  }

  if (ang.lead_id !== leadId) {
    return { ok: false, message: 'Angebot gehört nicht zu dieser Anfrage.' }
  }

  const kundeTyp = resolveAngebotKundeTyp(ang.leads?.kunden?.typ, ang.leads?.kundentyp)
  const projektLabel = (ang.leistungsumfang?.trim() || 'Projekt').slice(0, 120)
  const fallbackMeta = defaultWizardMeta(
    'Kunde',
    projektLabel,
    ang.leistungsumfang?.trim() ?? '',
    parseAngebotAnrede(ang.notizen, kundeTyp),
    kundeTyp
  )

  const metaParsed = parseAngebotWizardMetaFromNotizen(ang.notizen, fallbackMeta, {
    einleitung: ang.einleitung,
    leistungsumfang: ang.leistungsumfang,
    gueltig_bis: ang.gueltig_bis,
    zahlungsbedingungen: ang.zahlungsbedingungen,
    hinweise: ang.hinweise,
  }, kundeTyp)

  const meta = {
    ...metaParsed,
    titel: angebotTitelFuerKopie(metaParsed.titel),
    kunde_objekt_id:
      ang.kunde_objekt_id?.trim() || metaParsed.kunde_objekt_id || null,
    objekt_anlage_id:
      (ang as { objekt_anlage_id?: string | null }).objekt_anlage_id?.trim() ||
      metaParsed.objekt_anlage_id ||
      null,
    ansprechpartner_id:
      ang.ansprechpartner_id?.trim() || metaParsed.ansprechpartner_id || null,
  }

  const zahlungsplanParsed = parseZahlungsplan(ang.zahlungsplan)
  const zahlungsplan =
    zahlungsplanParsed ??
    (meta.zahlungsbedingungen === 'anzahlung_50' ? zahlungsplanVorlage50_50() : null)

  const dokumentTyp =
    ang.dokument_typ === 'projekt' ? ('projekt' as const) : ('einfach' as const)

  const variantenPersist =
    dokumentTyp === 'projekt' ? normalizeVariantenFromDb(ang.varianten) : null

  // Preise 1:1 aus Quelle — repair füllt fehlendes vk nur aus lohn/gesamt, setzt nie alles auf 0
  const posNorm = repairAngebotPositionen(
    rebindLooseAnfahrtPositionen(normalizeAngebotPositionen(ang.positionen))
  )
  const hwK = (ang.angebot_handwerker ?? []).map((z) => ({
    gewerk_id: z.gewerk_id as string,
    handwerker_id: z.handwerker_id as string,
  }))
  const positionen = mergeHandwerkerQueuesIntoPositionen(posNorm, hwK)

  const bootstrap: AngebotWizardBootstrap = {
    angebotId: null,
    angebotsnr: null,
    positionen,
    meta,
    dokumentTyp,
    projektbeschreibung: ang.projektbeschreibung?.trim() || null,
    projektFotos: parseProjektFotos(ang.fotos_urls),
    varianten: variantenPersist,
    wichtige_hinweise: ang.wichtige_hinweise?.trim() || null,
    zahlungsplan,
    ist_wiederkehrend: ang.ist_wiederkehrend === true,
    wiederkehr_turnus: ang.wiederkehr_turnus ?? null,
  }

  return { ok: true, bootstrap }
}

/** War das Angebot beim Kunden (versendet, abgelaufen, nachgefasst)? Dann neue Version statt Überschreiben. */
function angebotWarBeimKunden(a: {
  status?: string | null
  status_einfach?: string | null
  gesendet_kunde_at?: string | null
  gesendet_am?: string | null
}): boolean {
  const st = String(a.status ?? '').toLowerCase()
  const se = String(a.status_einfach ?? '').toLowerCase()
  if (['kunde_akzeptiert', 'angenommen', 'abgelehnt', 'ersetzt', 'storniert'].includes(st)) return false
  if (['angenommen', 'abgelehnt', 'ersetzt', 'storniert'].includes(se)) return false
  return Boolean(a.gesendet_kunde_at || a.gesendet_am) || ['gesendet', 'gesendet_kunde', 'abgelaufen'].includes(st) || se === 'gesendet'
}

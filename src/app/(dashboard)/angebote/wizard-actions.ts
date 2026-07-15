'use server'

import { revalidatePath } from 'next/cache'
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
  angebotDarfImWizardBearbeitetWerden,
} from '@/lib/angebote/angebot-wizard-types'
import { parseZahlungsplan, zahlungsplanVorlage50_50 } from '@/lib/rechnungen/zahlungsplan'
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
}

async function persistAngebotPdfNachEntwurfSpeichern(
  angebotId: string,
  leadId: string | null,
  opts?: { asSystem?: boolean }
): Promise<void> {
  const pdf = await persistPdfForAngebot(angebotId, { skipRevalidate: true })
  if (!pdf.ok) {
    console.warn('[saveAngebotWizardDraft] PDF:', pdf.message)
  }
  if (!opts?.asSystem) {
    revalidatePath('/angebote')
    revalidatePath(`/angebote/${angebotId}`)
    if (leadId) {
      revalidatePath(`/anfragen/${leadId}`)
      revalidatePath('/anfragen')
    }
  }
}

export async function saveAngebotWizardDraft(
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
  await syncNeueLeistungenToPreisliste(preislisteSync)

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

  if (input.angebotId) {
    const upd = await updateAngebot(input.angebotId, {
      lead_id: input.lead_id,
      kunde_id: input.kunde_id,
      kunde_objekt_id: kundeObjektId,
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
    }, { asSystem: opts?.asSystem })
    if (!upd.ok) return upd
    const db = opts?.asSystem ? supabaseAdmin : createClient()
    const { data: nrRow } = await db
      .from('angebote')
      .select('angebotsnr')
      .eq('id', input.angebotId)
      .maybeSingle()
    await persistAngebotPdfNachEntwurfSpeichern(input.angebotId, input.lead_id, opts)
    if (input.auftragKorrekturId?.trim()) {
      const sync = await syncAuftragAusAngebotKorrektur({
        auftragId: input.auftragKorrekturId.trim(),
        angebotId: input.angebotId,
      })
      if (!sync.ok) return sync
    }
    return { ok: true, angebotId: input.angebotId, angebotsnr: nrRow?.angebotsnr ?? null }
  }

  const created = await createAngebot({
    lead_id: input.lead_id,
    kunde_id: input.kunde_id,
    kunde_objekt_id: kundeObjektId,
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
  }, { asSystem: opts?.asSystem })
  if (!created.ok) return created
  const db = opts?.asSystem ? supabaseAdmin : createClient()
  const { data: nrRow } = await db
    .from('angebote')
    .select('angebotsnr')
    .eq('id', created.id)
    .maybeSingle()
  await persistAngebotPdfNachEntwurfSpeichern(created.id, input.lead_id, opts)
  return { ok: true, angebotId: created.id, angebotsnr: nrRow?.angebotsnr ?? null }
}

export async function sendAngebotWizard(input: {
  angebotId: string
  lead_id: string
  mailTo: string[]
  mailCc?: string[]
  /** Angenommenes Angebot: Korrektur senden ohne Status-Rücksetzung */
  auftragKorrektur?: boolean
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const sent = await sendAngebotToKunde(input.angebotId, {
    to: input.mailTo,
    cc: input.mailCc,
    statusBeibehalten: input.auftragKorrektur,
    skipHandwerkerGate: input.auftragKorrektur,
  })
  if (!sent.ok) return sent
  if (input.auftragKorrektur) {
    revalidatePath(`/auftraege`)
  }
  revalidatePath(`/anfragen/${input.lead_id}`)
  revalidatePath('/anfragen')
  revalidatePath('/angebote')
  revalidatePath(`/angebote/${input.angebotId}`)
  return { ok: true }
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
  opts?: { asSystem?: boolean }
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
      gesendet_kunde_at,
      leads(plz, bereiche, situation, kundentyp, kunden!kunde_id(typ))
    `
    )
    .eq('id', angebotId)
    .maybeSingle()

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
    leads?: {
      plz?: string | null
      bereiche?: unknown
      situation?: string | null
      kundentyp?: string | null
      kunden?: { typ?: string | null } | null
    } | null
  }

  if (ang.lead_id !== leadId) {
    return { ok: false, message: 'Angebot gehört nicht zu dieser Anfrage.' }
  }
  if (!angebotDarfImWizardBearbeitetWerden(ang.status)) {
    return { ok: false, message: 'Dieses Angebot kann im Wizard nicht mehr bearbeitet werden.' }
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
  const meta = {
    ...metaParsed,
    kunde_objekt_id: angObjektId?.trim() || metaParsed.kunde_objekt_id || null,
  }

  const zahlungsplanParsed = parseZahlungsplan(ang.zahlungsplan)
  const zahlungsplan =
    zahlungsplanParsed ??
    (meta.zahlungsbedingungen === 'anzahlung_50' ? zahlungsplanVorlage50_50() : null)

  const dokumentTyp =
    ang.dokument_typ === 'projekt' ? ('projekt' as const) : ('einfach' as const)

  const variantenPersist =
    dokumentTyp === 'projekt' ? normalizeVariantenFromDb(ang.varianten) : null

  const bootstrap: AngebotWizardBootstrap = {
    angebotId: ang.id,
    angebotsnr: ang.angebotsnr?.trim() || null,
    positionen: repairAngebotPositionen(
      rebindLooseAnfahrtPositionen(normalizeAngebotPositionen(ang.positionen))
    ),
    meta,
    dokumentTyp,
    projektbeschreibung: ang.projektbeschreibung?.trim() || null,
    projektFotos: parseProjektFotos(ang.fotos_urls),
    varianten: variantenPersist,
    wichtige_hinweise: ang.wichtige_hinweise?.trim() || null,
    bereitsGesendet: Boolean(ang.gesendet_kunde_at),
    zahlungsplan,
  }

  return { ok: true, bootstrap }
}

/** 1:1-Kopie für neuen Wizard-Entwurf: gleiche Inhalte, Titel mit (2), (3), … — keine Angebots-ID. */
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
      leads(plz, bereiche, situation, kundentyp, kunden!kunde_id(typ)),
      angebot_handwerker(gewerk_id, handwerker_id, status, aufgabe_notiz)
    `
    )
    .eq('id', quelleAngebotId)
    .maybeSingle()

  if (error || !row) {
    return { ok: false, message: error?.message ?? 'Angebot nicht gefunden' }
  }

  const ang = row as {
    id: string
    lead_id: string | null
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
  }

  return { ok: true, bootstrap }
}

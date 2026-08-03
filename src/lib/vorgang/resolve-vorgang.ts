import { kanalMetaFromLead, unterstatusLabel } from '@/lib/vorgang/vorgang-labels'
import { angebotTitelOderSituationBereich } from '@/lib/vorgang/vorgang-anzeige-titel'
import type {
  ResolveVorgangInput,
  ResolvedVorgang,
  ResolvedVorgangBadges,
  VorgangActor,
  VorgangAngebotInput,
  VorgangAuftragInput,
  VorgangPhase,
  VorgangRechnungInput,
} from '@/lib/vorgang/types'

/**
 * Kanonischer Vorgang-Resolver (final Spec):
 * - Phase nie aus vorgang_phase lesen — immer aus Entity-Kette ableiten
 * - Storno-Regel: neueste nicht-stornierte Entität gewinnt (Rechnung > Auftrag > Angebot > Anfrage)
 * - Actor-Priorität: freigabe > handwerker > kunde > bw
 * - Output-Shape: `ResolvedVorgang` in `@/lib/vorgang/types`
 *
 * A7 Parität: Fixtures in `shared/crm-vorgang/resolve-vorgang.fixtures.json`
 * (+ Kopie `resolve-vorgang.fixtures.json` hier) — Portal und CRM byte-identisch halten.
 * Fine-Stages: `mapAngebotStatusEinfach` (status_einfach vor Legacy-status).
 * Rechnungs-Gewinn: `isPhaseWinningRechnung` (Voll/Schluss, keine Abschläge als Stamm).
 */

/** Actor-Priorität (höher = wichtiger). */
export const ACTOR_PRIORITY: Record<VorgangActor, number> = {
  freigabe: 4,
  handwerker: 3,
  kunde: 2,
  bw: 1,
}

function entityTs(x: { updated_at?: string | null; created_at: string }): string {
  return x.updated_at?.trim() || x.created_at
}

function pickNewest<T>(items: T[], ts: (x: T) => string): T | null {
  if (!items.length) return null
  return [...items].sort((a, b) => ts(b).localeCompare(ts(a)))[0] ?? null
}

/**
 * Unterstatus für Angebote: `status_einfach` hat Vorrang (inkl. Fine-Stages).
 * Legacy-`status` wird auf status_einfach-Äquivalent gemappt.
 */
export function mapAngebotStatusEinfach(angebot: VorgangAngebotInput): string {
  const einfach = angebot.status_einfach?.trim().toLowerCase()
  if (einfach) return einfach
  const legacy = (angebot.status ?? '').trim().toLowerCase()
  switch (legacy) {
    case 'entwurf':
      return 'entwurf'
    case 'gesendet_handwerker':
      return 'gesendet_handwerker'
    case 'handwerker_akzeptiert':
      return 'handwerker_akzeptiert'
    case 'gesendet_kunde':
      return 'gesendet_kunde'
    case 'gesendet':
      return 'gesendet'
    case 'kunde_akzeptiert':
      return 'angenommen'
    case 'abgelehnt':
      return 'abgelehnt'
    default:
      return 'entwurf'
  }
}

export function isAngebotStorniert(angebot: VorgangAngebotInput): boolean {
  const einfach = mapAngebotStatusEinfach(angebot)
  return einfach === 'abgelehnt' || einfach === 'ersetzt' || einfach === 'storniert'
}

export function isAuftragStorniert(auftrag: VorgangAuftragInput): boolean {
  return auftrag.status === 'storniert'
}

export function isRechnungStorniert(rechnung: VorgangRechnungInput): boolean {
  return rechnung.status === 'storniert'
}

/**
 * Weitere Rechnungszeilen in der Liste (nicht der Stamm-Vorgang).
 * Nur laufende Abschläge sind Satelliten — Auftrag bleibt unter „Aufträge“ sichtbar.
 * Schlussrechnung ist Endabrechnung wie Vollrechnung (kein Satellit).
 */
export function isSatellitenRechnung(rechnung: VorgangRechnungInput): boolean {
  const art = (rechnung.rechnung_art ?? 'voll').trim().toLowerCase()
  return art === 'abschlag'
}

/**
 * Vollrechnung und Schlussrechnung (versendet/bezahlt) ziehen den Stamm in die
 * Rechnungsphase — analog Endabrechnung. Abschläge allein lassen den offenen
 * Auftrag unter „Aufträge“ sichtbar.
 */
export function isPhaseWinningRechnung(rechnung: VorgangRechnungInput): boolean {
  const st = (rechnung.status ?? '').trim().toLowerCase()
  if (!st || st === 'storniert' || st === 'entwurf') return false
  if (isSatellitenRechnung(rechnung)) return false
  return true
}

function pickNewestActive<T>(
  items: T[],
  isStorniert: (x: T) => boolean,
  ts: (x: T) => string
): T | null {
  const active = items.filter((x) => !isStorniert(x))
  if (active.length) return pickNewest(active, ts)
  return null
}

function leadAnfrageUnterstatus(leadStatus: string, forceStorniert: boolean): string {
  if (forceStorniert) return 'storniert'
  const s = leadStatus.trim().toLowerCase()
  if (s === 'neu' || s === 'kontaktiert' || s === 'termin' || s === 'abgebrochen') return s
  // Lead schon weiter (Angebot/Auftrag/…) — nicht als offene Anfrage „Neu“ anzeigen
  if (s === 'angebot' || s === 'auftrag' || s === 'abgeschlossen') return 'abgeschlossen'
  return 'neu'
}

function funnelKategorie(funnelDaten: unknown): string | null {
  if (!funnelDaten || typeof funnelDaten !== 'object') return null
  const kat = (funnelDaten as { melde_kategorie?: unknown }).melde_kategorie
  return typeof kat === 'string' ? kat : null
}

function isNotfall(input: ResolveVorgangInput): boolean {
  const lead = input.lead
  if ((lead.hv_meldung_status ?? '').trim() === 'notmassnahme') return true
  if (lead.situation === 'notfall') return true
  return funnelKategorie(lead.funnel_daten) === 'notfall'
}

function isUeberfaellig(faellig: string | null | undefined, now = new Date()): boolean {
  const raw = (faellig ?? '').trim()
  if (!raw) return false
  const d = new Date(raw.length === 10 ? `${raw}T12:00:00` : raw)
  if (Number.isNaN(d.getTime())) return false
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return due < today
}

/** Angebot wartet auf Kundenantwort (Fine-Stages + flat). */
function angebotWartetAufKunde(status: string): boolean {
  return status === 'gesendet' || status === 'gesendet_kunde'
}

function resolveActor(
  input: ResolveVorgangInput,
  phase: VorgangPhase,
  unterstatus: string,
  angebotAktiv: VorgangAngebotInput | null,
  auftragAktiv: VorgangAuftragInput | null,
  badges: ResolvedVorgangBadges
): { actor: VorgangActor | null; needsAction: boolean } {
  if (unterstatus === 'storniert') {
    return { actor: null, needsAction: false }
  }

  const lead = input.lead
  const candidates: { actor: VorgangActor; rank: number }[] = []

  // Actor freigabe / Badge nur bei org_freigabe_status=ausstehend
  if ((lead.org_freigabe_status ?? '').trim() === 'ausstehend') {
    candidates.push({ actor: 'freigabe', rank: ACTOR_PRIORITY.freigabe })
  }

  if (phase === 'auftrag' && auftragAktiv?.handwerkerAktionOffen) {
    candidates.push({ actor: 'handwerker', rank: ACTOR_PRIORITY.handwerker })
  }

  if (phase === 'angebot' && angebotAktiv) {
    const st = mapAngebotStatusEinfach(angebotAktiv)
    if (angebotWartetAufKunde(st)) {
      candidates.push({ actor: 'kunde', rank: ACTOR_PRIORITY.kunde })
    } else if (st === 'gesendet_handwerker') {
      candidates.push({ actor: 'handwerker', rank: ACTOR_PRIORITY.handwerker })
    }
  }

  if (badges.notfall) {
    candidates.push({ actor: 'bw', rank: ACTOR_PRIORITY.bw })
  }

  if (!candidates.length) {
    return { actor: null, needsAction: false }
  }

  candidates.sort((a, b) => b.rank - a.rank)
  const top = candidates[0]!
  return { actor: top.actor, needsAction: true }
}

type PhasePick = {
  phase: VorgangPhase
  entityId: string
  unterstatus: string
  updatedAt: string
}

/** Storno-Regel: neueste nicht-stornierte Entität gewinnt (Kette Rechnung→Auftrag→Angebot→Anfrage).
 * Versendete Voll- und Schlussrechnung gewinnen die Stamm-Phase; Abschläge bleiben Satelliten. */
function resolvePhase(input: ResolveVorgangInput): PhasePick {
  const lead = input.lead
  const angebote = input.angebote ?? []
  const auftraege = input.auftraege ?? []
  const rechnungen = input.rechnungen ?? []
  const phaseRechnungen = rechnungen.filter(isPhaseWinningRechnung)

  const rechnungAktiv = pickNewestActive(phaseRechnungen, isRechnungStorniert, entityTs)
  if (rechnungAktiv) {
    return {
      phase: 'rechnung',
      entityId: rechnungAktiv.id,
      unterstatus: rechnungAktiv.status,
      updatedAt: entityTs(rechnungAktiv),
    }
  }

  const auftragAktiv = pickNewestActive(auftraege, isAuftragStorniert, entityTs)
  if (auftragAktiv) {
    return {
      phase: 'auftrag',
      entityId: auftragAktiv.id,
      unterstatus: auftragAktiv.status,
      updatedAt: entityTs(auftragAktiv),
    }
  }

  const angebotAktiv = pickNewestActive(angebote, isAngebotStorniert, entityTs)
  if (angebotAktiv) {
    return {
      phase: 'angebot',
      entityId: angebotAktiv.id,
      unterstatus: mapAngebotStatusEinfach(angebotAktiv),
      updatedAt: entityTs(angebotAktiv),
    }
  }

  if (phaseRechnungen.length > 0 && phaseRechnungen.every(isRechnungStorniert)) {
    const r = pickNewest(phaseRechnungen, entityTs)!
    return {
      phase: 'rechnung',
      entityId: r.id,
      unterstatus: 'storniert',
      updatedAt: entityTs(r),
    }
  }

  if (auftraege.length > 0 && auftraege.every(isAuftragStorniert)) {
    const a = pickNewest(auftraege, entityTs)!
    return {
      phase: 'auftrag',
      entityId: a.id,
      unterstatus: 'storniert',
      updatedAt: entityTs(a),
    }
  }

  if (angebote.length > 0 && angebote.every(isAngebotStorniert)) {
    return {
      phase: 'anfrage',
      entityId: lead.id,
      unterstatus: 'storniert',
      updatedAt: entityTs(lead),
    }
  }

  return {
    phase: 'anfrage',
    entityId: lead.id,
    unterstatus: leadAnfrageUnterstatus(lead.status, false),
    updatedAt: entityTs(lead),
  }
}

function buildTitel(
  input: ResolveVorgangInput,
  angebotAktiv: VorgangAngebotInput | null | undefined
): string {
  const angebote = input.angebote ?? []
  const angebot =
    angebotAktiv ??
    angebote.find((a) => Boolean(a.leistungsumfang?.trim() || a.notizen?.trim() || a.titel?.trim())) ??
    angebote[0] ??
    null

  return angebotTitelOderSituationBereich({
    angebot,
    situation: input.lead.situation,
    bereiche: input.lead.bereiche,
    fallback: input.titel?.trim() || input.lead.kontakt_name?.trim() || 'Vorgang',
  })
}

/** Kanonische Ableitung — nie aus vorgang_phase lesen. Output: `ResolvedVorgang`. */
export function resolveVorgang(input: ResolveVorgangInput): ResolvedVorgang {
  const lead = input.lead
  const angebote = input.angebote ?? []
  const auftraege = input.auftraege ?? []
  const rechnungen = input.rechnungen ?? []

  const pick = resolvePhase(input)

  let unterstatus = pick.unterstatus
  if (pick.phase === 'anfrage' && unterstatus !== 'storniert') {
    unterstatus = leadAnfrageUnterstatus(lead.status, false)
  }

  const angebotAktiv =
    pick.phase === 'angebot'
      ? angebote.find((a) => a.id === pick.entityId) ??
        pickNewestActive(angebote, isAngebotStorniert, entityTs)
      : pickNewestActive(angebote, isAngebotStorniert, entityTs)

  const auftragAktiv =
    pick.phase === 'auftrag'
      ? auftraege.find((a) => a.id === pick.entityId) ??
        pickNewestActive(auftraege, isAuftragStorniert, entityTs)
      : pickNewestActive(auftraege, isAuftragStorniert, entityTs)

  const rechnungAktiv =
    pick.phase === 'rechnung'
      ? rechnungen.find((r) => r.id === pick.entityId) ?? pickNewest(rechnungen, entityTs)
      : pickNewestActive(rechnungen, isRechnungStorniert, entityTs)

  const badges: ResolvedVorgangBadges = {}
  if (isNotfall(input)) badges.notfall = true
  if ((lead.org_freigabe_status ?? '').trim() === 'ausstehend') {
    badges.wartet_freigabe = true
  }

  const { actor, needsAction } = resolveActor(
    input,
    pick.phase,
    unterstatus,
    angebotAktiv,
    auftragAktiv,
    badges
  )

  const ueberfaellig =
    pick.phase === 'rechnung' &&
    unterstatus === 'gesendet' &&
    rechnungAktiv != null &&
    isUeberfaellig(rechnungAktiv.faellig)

  return {
    phase: pick.phase,
    unterstatus,
    unterstatusLabel: unterstatusLabel(pick.phase, unterstatus),
    needsAction,
    actor,
    badges,
    ueberfaellig,
    kanalMeta: kanalMetaFromLead(lead.kanal),
    titel: buildTitel(input, angebotAktiv),
    entityId: pick.entityId,
    entityType: pick.phase,
    updatedAt: pick.updatedAt,
  }
}

/** Eigener Rechnungs-Vorgang für eine weitere Rechnung (neben dem Stamm). */
export function resolveSatellitenRechnungVorgang(
  input: ResolveVorgangInput,
  rechnung: VorgangRechnungInput
): ResolvedVorgang {
  const forced: VorgangRechnungInput = { ...rechnung, rechnung_art: 'voll' }
  const resolved = resolveVorgang({
    lead: input.lead,
    angebote: input.angebote,
    auftraege: [],
    rechnungen: [forced],
    titel: input.titel,
  })
  return {
    ...resolved,
    titel: satellitenRechnungTitel(rechnung, resolved.titel),
  }
}

/**
 * FAB-/Direktrechnung ohne Lead/Auftrag: immer Rechnungsphase —
 * auch als Entwurf (sonst fällt resolveVorgang auf synthetische Anfrage zurück).
 */
export function resolveStandaloneDirektrechnung(input: {
  rechnung: VorgangRechnungInput
  titel: string
  kundeName?: string | null
}): ResolvedVorgang {
  const r = input.rechnung
  const st = (r.status ?? '').trim().toLowerCase() || 'entwurf'
  const unterstatus = st === 'storniert' ? 'storniert' : st
  const ueberfaellig =
    unterstatus === 'gesendet' && isUeberfaellig(r.faellig)
  return {
    phase: 'rechnung',
    unterstatus,
    unterstatusLabel: unterstatusLabel('rechnung', unterstatus),
    needsAction: false,
    actor: null,
    badges: {},
    ueberfaellig,
    kanalMeta: 'Direktkunde',
    titel: input.titel,
    entityId: r.id,
    entityType: 'rechnung',
    updatedAt: entityTs(r),
  }
}

export function satellitenRechnungTitel(
  rechnung: VorgangRechnungInput,
  fallbackTitel: string
): string {
  const art = (rechnung.rechnung_art ?? '').trim().toLowerCase()
  const nr = rechnung.rechnungsnummer?.trim()
  if (art === 'schluss') {
    return nr ? `Schlussrechnung ${nr}` : 'Schlussrechnung'
  }
  if (art === 'abschlag') {
    const idx = rechnung.abschlag_index
    const base =
      idx != null && Number.isFinite(Number(idx)) ? `Abschlag ${idx}` : 'Abschlagsrechnung'
    return nr ? `${base} · ${nr}` : base
  }
  return nr || fallbackTitel
}

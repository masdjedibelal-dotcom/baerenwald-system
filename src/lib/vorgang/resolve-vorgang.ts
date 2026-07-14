import { kanalMetaFromLead, unterstatusLabel } from '@/lib/vorgang/vorgang-labels'
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

function entityTs(x: { updated_at?: string | null; created_at: string }): string {
  return x.updated_at?.trim() || x.created_at
}

function pickNewest<T>(items: T[], ts: (x: T) => string): T | null {
  if (!items.length) return null
  return [...items].sort((a, b) => ts(b).localeCompare(ts(a)))[0] ?? null
}

function mapAngebotStatusEinfach(angebot: VorgangAngebotInput): string {
  const einfach = angebot.status_einfach?.trim().toLowerCase()
  if (einfach) return einfach
  const legacy = (angebot.status ?? '').trim().toLowerCase()
  switch (legacy) {
    case 'entwurf':
      return 'entwurf'
    case 'gesendet_handwerker':
    case 'handwerker_akzeptiert':
    case 'gesendet_kunde':
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
  return einfach === 'abgelehnt' || einfach === 'ersetzt'
}

export function isAuftragStorniert(auftrag: VorgangAuftragInput): boolean {
  return auftrag.status === 'storniert'
}

export function isRechnungStorniert(rechnung: VorgangRechnungInput): boolean {
  return rechnung.status === 'storniert'
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
  if (s === 'abgebrochen') return 'abgebrochen'
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

  if ((lead.org_freigabe_status ?? '').trim() === 'ausstehend') {
    candidates.push({ actor: 'freigabe', rank: 4 })
  }

  if (
    phase === 'auftrag' &&
    auftragAktiv &&
    (auftragAktiv.handwerkerAktionOffen ||
      auftragAktiv.status === 'offen' ||
      auftragAktiv.status === 'in_arbeit')
  ) {
    if (auftragAktiv.handwerkerAktionOffen) {
      candidates.push({ actor: 'handwerker', rank: 3 })
    }
  }

  if (phase === 'angebot' && angebotAktiv) {
    const st = mapAngebotStatusEinfach(angebotAktiv)
    if (st === 'gesendet') {
      candidates.push({ actor: 'kunde', rank: 2 })
    }
  }

  if (badges.notfall) {
    candidates.push({ actor: 'bw', rank: 1 })
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

function resolvePhase(input: ResolveVorgangInput): PhasePick {
  const lead = input.lead
  const angebote = input.angebote ?? []
  const auftraege = input.auftraege ?? []
  const rechnungen = input.rechnungen ?? []

  const rechnungAktiv = pickNewestActive(rechnungen, isRechnungStorniert, entityTs)
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

  if (rechnungen.length > 0 && rechnungen.every(isRechnungStorniert)) {
    const r = pickNewest(rechnungen, entityTs)!
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

function buildTitel(input: ResolveVorgangInput): string {
  if (input.titel?.trim()) return input.titel.trim()
  const lead = input.lead
  const bereich = lead.bereiche?.[0]?.trim()
  const situation = lead.situation?.trim()
  const ort = lead.plz?.trim()
  const parts = [situation, bereich, ort].filter(Boolean)
  if (parts.length) return parts.join(' — ')
  return lead.kontakt_name?.trim() || 'Vorgang'
}

/** Kanonische Ableitung — nie aus vorgang_phase lesen. */
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
      ? angebote.find((a) => a.id === pick.entityId) ?? pickNewestActive(angebote, isAngebotStorniert, entityTs)
      : pickNewestActive(angebote, isAngebotStorniert, entityTs)

  const auftragAktiv =
    pick.phase === 'auftrag'
      ? auftraege.find((a) => a.id === pick.entityId) ?? pickNewestActive(auftraege, isAuftragStorniert, entityTs)
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
    titel: buildTitel(input),
    entityId: pick.entityId,
    entityType: pick.phase,
    updatedAt: pick.updatedAt,
  }
}

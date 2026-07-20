/**
 * Metadaten für Partner-Portal „Vorgänge“ — CRM setzt, Portal cleart nach Annahme.
 */

export type AenderungTyp = 'neu' | 'geaendert' | 'entfernt'

export type PositionPartnerSnapshot = {
  handwerker_id: string | null
  preis_partner: number | null
  handwerker_status?: string | null
  aenderung_typ?: string | null
}

const PENDING_HW = new Set(['angefragt', 'zugewiesen', 'ausstehend', 'offen', 'warten', ''])

/** Status, bei dem der Handwerker im Portal noch handeln muss. */
export function handwerkerMussImPortalHandeln(status: string | null | undefined): boolean {
  return PENDING_HW.has((status ?? '').toLowerCase())
}

export function handwerkerWarBereitsAngenommen(status: string | null | undefined): boolean {
  return (status ?? '').toLowerCase() === 'akzeptiert'
}

function roundPreis(n: number): number {
  return Math.round(n * 100) / 100
}

function preisGeaendert(alt: number | null | undefined, neu: number | null | undefined): boolean {
  const a = alt != null && Number.isFinite(alt) ? roundPreis(alt) : null
  const b = neu != null && Number.isFinite(neu) ? roundPreis(neu) : null
  return a !== b
}

/** Patch-Felder für Erstzuweisung (noch nicht gesendet). */
export function metaErstzuweisung(ekNetto?: number | null): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    handwerker_status: 'zugewiesen',
    aenderung_typ: 'neu',
    preis_alt: null,
  }
  if (ekNetto != null && Number.isFinite(ekNetto) && ekNetto > 0) {
    patch.preis_partner = roundPreis(ekNetto)
  }
  return patch
}

/** Patch bei Partnerwechsel oder Preisänderung auf bereits zugewiesener/gesendeter Leistung. */
export function metaPartnerAenderung(
  current: PositionPartnerSnapshot,
  input: {
    handwerkerId?: string | null
    preisPartner?: number | null
    /** Leistungstext geändert (Name/Beschreibung) */
    inhaltGeaendert?: boolean
  }
): Record<string, unknown> | null {
  if (!current.handwerker_id && !input.handwerkerId) return null

  const nextHw =
    input.handwerkerId !== undefined ? input.handwerkerId?.trim() || null : current.handwerker_id
  const nextPreis =
    input.preisPartner !== undefined ? input.preisPartner : current.preis_partner

  const hwWechsel =
    input.handwerkerId !== undefined &&
    (current.handwerker_id ?? '') !== (nextHw ?? '')

  const preisAend =
    input.preisPartner !== undefined &&
    preisGeaendert(current.preis_partner, input.preisPartner)

  const inhalt = Boolean(input.inhaltGeaendert)

  if (!hwWechsel && !preisAend && !inhalt) return null
  if (!nextHw) return null

  const warAngenommen = handwerkerWarBereitsAngenommen(current.handwerker_status)
  const warGesendet =
    warAngenommen || !handwerkerMussImPortalHandeln(current.handwerker_status)

  const patch: Record<string, unknown> = {}

  if (hwWechsel) {
    patch.aenderung_typ = 'neu'
    patch.preis_alt = null
    patch.handwerker_status = 'zugewiesen'
  } else if (preisAend) {
    patch.aenderung_typ = 'geaendert'
    if (current.preis_partner != null && Number.isFinite(current.preis_partner)) {
      patch.preis_alt = roundPreis(current.preis_partner)
    }
    if (warGesendet) patch.handwerker_status = 'angefragt'
  } else if (inhalt && warGesendet) {
    patch.aenderung_typ = 'geaendert'
    if (warGesendet) patch.handwerker_status = 'angefragt'
  }

  if (input.preisPartner !== undefined) {
    patch.preis_partner =
      nextPreis != null && Number.isFinite(nextPreis) && nextPreis > 0
        ? roundPreis(nextPreis)
        : null
  }

  if (input.handwerkerId !== undefined) {
    patch.handwerker_id = nextHw
  }

  return Object.keys(patch).length ? patch : null
}

/** Neue Leistung mit Handwerker — vor dem Senden. */
export function metaNeueLeistungMitPartner(
  preisPartner?: number | null,
  handwerkerStatus: string = 'zugewiesen'
): Record<string, unknown> {
  return {
    aenderung_typ: 'neu',
    preis_alt: null,
    handwerker_status: handwerkerStatus,
    ...(preisPartner != null && Number.isFinite(preisPartner) && preisPartner > 0
      ? { preis_partner: roundPreis(preisPartner) }
      : {}),
  }
}

/** Leistung entfernt — Zeile behalten, HW muss bestätigen. */
export function metaLeistungEntfernt(): Record<string, unknown> {
  return {
    aenderung_typ: 'entfernt',
    handwerker_status: 'angefragt',
  }
}

/** Beim Senden an Handwerker: pending + aenderung_typ sicherstellen. */
export function metaBeimSendenAnHandwerker(
  current: Pick<PositionPartnerSnapshot, 'aenderung_typ'>
): Record<string, unknown> {
  return {
    handwerker_status: 'angefragt',
    handwerker_angefragt_at: new Date().toISOString(),
    ...(current.aenderung_typ ? {} : { aenderung_typ: 'neu' }),
  }
}

/** Handwerker entfernt — Metadaten zurücksetzen. */
export function metaHandwerkerEntfernt(): Record<string, unknown> {
  return {
    handwerker_status: null,
    aenderung_typ: null,
    preis_alt: null,
    preis_partner: null,
  }
}

import { resolveStatusEinfach, type AngebotStatusEinfach } from '@/lib/angebot-einfach'
import {
  matchesAuftragPhase,
  type AuftragListenPhase,
} from '@/lib/auftraege/auftrag-liste-helpers'
import {
  abschlagBereitsAbgerechnet,
  berechneZahlungsplan,
  naechsteOffeneAbschlagZeile,
  parseZahlungsplan,
  type RechnungAbschlagLink,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import type { AngebotListeEintrag, AuftragListeEintrag, AuftragStatus } from '@/lib/types'

const ANGEBOT_PIPELINE_AUSGESCHLOSSEN: AngebotStatusEinfach[] = ['abgelehnt', 'ersetzt']

const AUFTRAG_LEISTUNG_AKTIV: AuftragStatus[] = ['offen', 'in_arbeit', 'abnahme']

export type AuftragPipelineKontext = {
  rechnungen: RechnungAbschlagLink[]
  zahlungsplan: Zahlungsplan | null
  gesamtNetto: number
}

export function leereAuftragPipelineKontext(): AuftragPipelineKontext {
  return { rechnungen: [], zahlungsplan: null, gesamtNetto: 0 }
}

export function gesamtNettoAusAuftragListe(auftrag: AuftragListeEintrag): number {
  const angRaw = auftrag.angebote
  const ang = Array.isArray(angRaw) ? angRaw[0] : angRaw
  if (!ang) return 0
  const fix = ang.gesamt_fix
  const max = ang.gesamt_max
  const min = ang.gesamt_min
  if (fix != null && fix > 0) return fix
  if (max != null && max > 0) return max
  if (min != null && min > 0) return min
  return 0
}

export function auftragPipelineKontextFromListe(
  auftrag: AuftragListeEintrag,
  rechnungen: RechnungAbschlagLink[] = []
): AuftragPipelineKontext {
  const angRaw = auftrag.angebote
  const ang = Array.isArray(angRaw) ? angRaw[0] : angRaw
  const aufPlan = (auftrag as { zahlungsplan?: unknown }).zahlungsplan
  const angPlan = (ang as { zahlungsplan?: unknown } | null | undefined)?.zahlungsplan
  const zahlungsplan = parseZahlungsplan(aufPlan) ?? parseZahlungsplan(angPlan)
  return {
    rechnungen,
    zahlungsplan,
    gesamtNetto: gesamtNettoAusAuftragListe(auftrag),
  }
}

/** Rechnungen ohne Storno — für Abrechnungs- und Pipeline-Logik. */
export function aktiveRechnungen(rechnungen: RechnungAbschlagLink[]): RechnungAbschlagLink[] {
  return rechnungen.filter((r) => (r.status ?? '').toLowerCase() !== 'storniert')
}

/**
 * Abrechnung noch offen?
 * — Abschlagsplan: mindestens eine Planzeile ohne Abschlags-/Schlussrechnung
 * — Standard: noch keine (nicht stornierte) Rechnung
 */
export function abrechnungOffen(kontext: AuftragPipelineKontext): boolean {
  const aktiv = aktiveRechnungen(kontext.rechnungen)
  const plan = kontext.zahlungsplan
  if (plan?.modus === 'abschlagsplan' && plan.zeilen.length > 0) {
    const netto = kontext.gesamtNetto > 0 ? kontext.gesamtNetto : 0
    const zpKontext = berechneZahlungsplan(plan, netto)
    return naechsteOffeneAbschlagZeile(plan, zpKontext, kontext.rechnungen) !== null
  }
  return aktiv.length === 0
}

/** Angebote-Pipeline: Verkauf / Nachfassen / Auftrag anlegen. */
export function angebotInAngebotePipeline(
  angebot: AngebotListeEintrag,
  angebotIdsMitAuftrag: ReadonlySet<string>,
  angebotIdsMitRechnung: ReadonlySet<string> = new Set()
): boolean {
  if (angebotIdsMitAuftrag.has(angebot.id) || angebotIdsMitRechnung.has(angebot.id)) {
    return false
  }
  const st = resolveStatusEinfach(angebot)
  if (ANGEBOT_PIPELINE_AUSGESCHLOSSEN.includes(st)) return false
  if (st === 'angenommen') return true
  return st === 'entwurf' || st === 'gesendet' || st === 'abgelaufen'
}

export function angebotVerkaufErledigt(
  angebotIdsMitAuftrag: ReadonlySet<string>,
  angebotIdsMitRechnung: ReadonlySet<string>,
  angebotId: string
): boolean {
  return angebotIdsMitAuftrag.has(angebotId) || angebotIdsMitRechnung.has(angebotId)
}

/**
 * Aufträge-Pipeline: Leistung läuft ODER Abrechnung (Abschlag/Schluss) noch offen.
 */
export function auftragInAuftraegePipeline(
  auftrag: Pick<AuftragListeEintrag, 'id' | 'status'>,
  kontext: AuftragPipelineKontext
): boolean {
  const status = auftrag.status
  if (status === 'storniert') return false
  if (AUFTRAG_LEISTUNG_AKTIV.includes(status)) return true
  if (status === 'abgeschlossen') return abrechnungOffen(kontext)
  return false
}

/** Listen-Phasen nach Auftragsstatus (nicht Abrechnungs-Pipeline). */
export function matchesAuftragPipelinePhase(
  auftrag: AuftragListeEintrag,
  _kontext: AuftragPipelineKontext,
  phase: AuftragListenPhase
): boolean {
  return matchesAuftragPhase(auftrag, phase)
}

export function countAuftragPipelinePhase(
  auftraege: AuftragListeEintrag[],
  kontextByAuftragId: Readonly<Record<string, AuftragPipelineKontext>>,
  phase: AuftragListenPhase
): number {
  if (!phase) return auftraege.length
  return auftraege.filter((a) =>
    matchesAuftragPipelinePhase(
      a,
      kontextByAuftragId[a.id] ?? leereAuftragPipelineKontext(),
      phase
    )
  ).length
}

/** Badge-Text in der Auftragsliste bei offener Abrechnung nach Abschluss. */
export function abrechnungPipelineLabel(kontext: AuftragPipelineKontext): string | null {
  if (!abrechnungOffen(kontext)) return null
  const plan = kontext.zahlungsplan
  if (plan?.modus === 'abschlagsplan' && plan.zeilen.length > 0) {
    const netto = kontext.gesamtNetto > 0 ? kontext.gesamtNetto : 0
    const zpKontext = berechneZahlungsplan(plan, netto)
    const gesamt = zpKontext.zeilen.length
    const erledigt = zpKontext.zeilen.filter((z) =>
      abschlagBereitsAbgerechnet(z.id, kontext.rechnungen)
    ).length
    if (erledigt < gesamt) return `Abrechnung ${erledigt}/${gesamt}`
    return 'Abrechnung offen'
  }
  return 'Abrechnung offen'
}

export function buildAngebotIdsMitRechnung(
  rows: { angebot_id: string | null }[]
): Set<string> {
  const ids = new Set<string>()
  for (const row of rows) {
    const id = row.angebot_id?.trim()
    if (id) ids.add(id)
  }
  return ids
}

export function buildRechnungenByAuftragId(
  rows: {
    id: string
    auftrag_id: string | null
    rechnung_art?: string | null
    abschlag_index?: number | null
    zahlungsplan_abschlag_id?: string | null
    status?: string | null
    brutto?: number | null
  }[]
): Record<string, RechnungAbschlagLink[]> {
  const map: Record<string, RechnungAbschlagLink[]> = {}
  for (const row of rows) {
    const aid = row.auftrag_id?.trim()
    if (!aid) continue
    if (!map[aid]) map[aid] = []
    map[aid].push({
      id: row.id,
      rechnung_art: row.rechnung_art,
      abschlag_index: row.abschlag_index,
      zahlungsplan_abschlag_id: row.zahlungsplan_abschlag_id,
      status: row.status,
      brutto: row.brutto,
    })
  }
  return map
}

export function buildAuftragPipelineKontextMap(
  auftraege: AuftragListeEintrag[],
  rechnungenByAuftragId: Readonly<Record<string, RechnungAbschlagLink[]>>
): Record<string, AuftragPipelineKontext> {
  const out: Record<string, AuftragPipelineKontext> = {}
  for (const a of auftraege) {
    out[a.id] = auftragPipelineKontextFromListe(a, rechnungenByAuftragId[a.id] ?? [])
  }
  return out
}

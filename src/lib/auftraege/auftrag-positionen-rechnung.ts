import { neuePositionsId } from '@/lib/angebot-positionen'
import {
  formatRegieSchaetzung,
  formatRegieSollIst,
  istRegiePosition,
  REGIE_BADGE_LABEL,
} from '@/lib/auftraege/regie-display'
import type { AngebotPosition, AuftragPosition } from '@/lib/types'

export type RegieZeitByPosition = Record<string, number>
export type RegieBeschreibungByPosition = Record<string, string>

/**
 * Auftragspositionen → Angebot-Positionsformat für Rechnungseditor.
 * Regie: Menge/Preis aus Bautagebuch-Zeiten wenn vorhanden; sonst Stundensatz-Schätzung.
 * Partner-Texte aus BT optional in `beschreibung` (prüfbar vor Versand).
 * notiz_extern trägt Soll/Ist + Regieschein-Hinweis (CRM-intern „Regie“).
 */
export function auftragPositionenToAngebotPositionen(
  positionen: AuftragPosition[],
  opts?: {
    regieZeitMinutenByPositionId?: RegieZeitByPosition
    regieBeschreibungByPositionId?: RegieBeschreibungByPosition
  }
): AngebotPosition[] {
  const zeitMap = opts?.regieZeitMinutenByPositionId ?? {}
  const textMap = opts?.regieBeschreibungByPositionId ?? {}

  return [...positionen]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((p) => {
      const isRegie = istRegiePosition(p)
      const erfasstMin = zeitMap[p.id] ?? 0
      const stundensatz = Number(p.stundensatz) || 0
      const geschStd = Number(p.geschaetzt_std) || 0
      const partnerText = textMap[p.id]?.trim() || ''

      let menge = Math.max(p.menge ?? 1, 0.0001)
      let lineNetto = Math.round((p.preis_fix ?? 0) * 100) / 100
      let lohn = Math.round((p.lohn_fix ?? 0) * 100) / 100
      let material = Math.round((p.material_fix ?? 0) * 100) / 100
      let einheit = p.einheit?.trim() || 'pauschal'

      if (isRegie) {
        einheit = 'Std'
        if (erfasstMin > 0 && stundensatz > 0) {
          menge = Math.round((erfasstMin / 60) * 100) / 100
          lineNetto = Math.round(menge * stundensatz * 100) / 100
          lohn = lineNetto
          material = 0
        } else if (stundensatz > 0) {
          menge = geschStd > 0 ? geschStd : 1
          lineNetto = Math.round(menge * stundensatz * 100) / 100
          lohn = lineNetto
          material = 0
        }
      }

      const stueck =
        lohn + material > 0
          ? Math.round(((lohn + material) / menge) * 100) / 100
          : Math.round((lineNetto / menge) * 100) / 100

      const schaetzung = formatRegieSchaetzung({
        geschaetztStd: geschStd || (isRegie ? menge : null),
        stundensatz: stundensatz || (isRegie ? stueck : null),
      })
      const sollIst = formatRegieSollIst({
        geschaetztStd: geschStd || null,
        erfasstMinuten: erfasstMin || null,
      })
      const regieNotiz = isRegie
        ? [
            REGIE_BADGE_LABEL,
            schaetzung,
            sollIst,
            erfasstMin > 0 ? 'Regieschein: aus Bautagebuch' : null,
          ]
            .filter(Boolean)
            .join(' · ')
        : undefined

      const baseBesch = p.beschreibung?.trim() || ''
      const beschreibung = isRegie
        ? [partnerText || null, baseBesch && partnerText !== baseBesch ? baseBesch : null]
            .filter(Boolean)
            .join('\n\n') || baseBesch
        : baseBesch

      return {
        id: p.id || neuePositionsId(),
        gewerk_id: '',
        gewerk_name: p.gewerk_name?.trim() || '—',
        gewerk_slug: p.gewerk_slug ?? undefined,
        gewerk_block_key: p.gewerk_block_key ?? undefined,
        leistung: p.leistung_name?.trim() || 'Leistung',
        leistung_name: p.leistung_name,
        beschreibung,
        lohn_netto: lohn > 0 ? lohn / menge : stueck,
        material_netto: material > 0 ? material / menge : 0,
        vk_netto: stueck,
        gesamt_min: lineNetto,
        gesamt_max: lineNetto,
        menge,
        einheit,
        preis_typ: 'fix',
        mwst_satz: 19,
        handwerker_id: p.handwerker_id ?? undefined,
        handwerker_name: p.handwerker?.name ?? undefined,
        notiz_extern: regieNotiz || undefined,
        verguetung: isRegie ? 'aufwand' : 'festpreis',
        ...(isRegie
          ? {
              geschaetzt_std: geschStd > 0 ? geschStd : null,
              stundensatz: stundensatz > 0 ? stundensatz : stueck > 0 ? stueck : null,
            }
          : {}),
      } satisfies AngebotPosition
    })
}

/** Texte aus Partner-Bautagebuch-Einträgen für Rechnungszeilen aggregieren. */
export function aggregateRegieBeschreibungFromEintraege(
  eintraege: Array<{
    position_id?: string | null
    beschreibung?: string | null
    zeit_minuten?: number | null
    typ?: string | null
    created_at?: string | null
  }>
): RegieBeschreibungByPosition {
  const byPos = new Map<string, string[]>()
  const sorted = [...eintraege].sort((a, b) =>
    String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''))
  )
  for (const e of sorted) {
    const pid = e.position_id?.trim()
    if (!pid) continue
    const text = e.beschreibung?.trim()
    if (!text) continue
    const zeit = Number(e.zeit_minuten) || 0
    const zeitLabel =
      zeit > 0
        ? ` (${Math.floor(zeit / 60)}:${String(zeit % 60).padStart(2, '0')} Std.)`
        : ''
    const line = `• ${text}${zeitLabel}`
    const list = byPos.get(pid) ?? []
    list.push(line)
    byPos.set(pid, list)
  }
  const out: RegieBeschreibungByPosition = {}
  Array.from(byPos.entries()).forEach(([pid, lines]) => {
    out[pid] = lines.join('\n')
  })
  return out
}

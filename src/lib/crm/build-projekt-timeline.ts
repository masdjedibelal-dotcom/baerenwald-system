import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import { ANGEBOT_STATUS_LABELS, AUFTRAG_STATUS_LABELS, formatDatum } from '@/lib/utils'
import { RECHNUNG_STATUS_LABELS } from '@/lib/rechnung-config'

export type ProjektTimelineEintrag = {
  id: string
  ts: number
  text: string
  time: string
  state: 'done' | 'active'
  linkLabel?: string
  href?: string
}

/** Ergänzt die Lead-Timeline um Angebots-, Auftrags- und Rechnungs-Meilensteine aus dem Projektkontext. */
export function ergaenzeTimelineMitProjektKontext(
  basis: ProjektTimelineEintrag[],
  kontext: ProjektKontext
): ProjektTimelineEintrag[] {
  const extra: ProjektTimelineEintrag[] = []

  for (const a of kontext.angebote) {
    extra.push({
      id: `projekt-angebot-${a.id}`,
      ts: new Date(a.created_at).getTime(),
      text: `Angebot ${a.angebotsnr?.trim() || a.id.slice(0, 8).toUpperCase()} — ${ANGEBOT_STATUS_LABELS[a.status as keyof typeof ANGEBOT_STATUS_LABELS] ?? a.status}`,
      time: formatDatum(a.created_at),
      state: 'done',
      linkLabel: 'Zum Angebot',
      href: `/angebote/${a.id}`,
    })
  }

  if (kontext.auftrag) {
    extra.push({
      id: `projekt-auftrag-${kontext.auftrag.id}`,
      ts: Date.now(),
      text: `Auftrag: ${kontext.auftrag.titel?.trim() || 'Auftrag'} — ${AUFTRAG_STATUS_LABELS[kontext.auftrag.status as keyof typeof AUFTRAG_STATUS_LABELS] ?? kontext.auftrag.status}`,
      time: '—',
      state: 'active',
      linkLabel: 'Zum Auftrag',
      href: `/auftraege/${kontext.auftrag.id}`,
    })
  }

  for (const r of kontext.rechnungen) {
    extra.push({
      id: `projekt-rechnung-${r.id}`,
      ts: new Date(r.rechnungsdatum).getTime(),
      text: `Rechnung ${r.rechnungsnummer} — ${RECHNUNG_STATUS_LABELS[r.status as keyof typeof RECHNUNG_STATUS_LABELS] ?? r.status}`,
      time: formatDatum(r.rechnungsdatum),
      state: 'done',
      linkLabel: 'Zur Rechnung',
      href: `/rechnungen/${r.id}`,
    })
  }

  const ids = new Set(basis.map((b) => b.id))
  const merged = [...basis]
  for (const e of extra) {
    if (!ids.has(e.id)) merged.push(e)
  }
  return merged.sort((a, b) => a.ts - b.ts)
}

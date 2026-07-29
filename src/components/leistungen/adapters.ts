import { parseFunnelPositionen } from '@/lib/lead-funnel-positionen'
import { positionVkNettoStueck } from '@/lib/angebot-positionen'
import {
  leistungStatusLabel,
  normalizeLeistungStatus,
} from '@/lib/auftraege/auftrag-fortschritt-preis'
import { formatZeitraumKurz } from '@/components/auftraege/leistungen-v3/utils'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { richTextToPlain } from '@/lib/rich-text'
import { formatDatum } from '@/lib/utils'
import type { AbnahmeMangel } from '@/lib/auftraege/abnahme-protokoll-types'
import { isMangelOffen, mangelStatusLabel } from '@/lib/auftraege/abnahme-maengel-helpers'
import type { AngebotPosition, AuftragPosition } from '@/lib/types'
import type { LeistungMangelAnzeige, LeistungRow } from '@/components/leistungen/types'

function mengeLabel(menge: number | null | undefined, einheit: string | null | undefined): string {
  const e = einheit?.trim() || ''
  const m = menge ?? 1
  if (e.toLowerCase() === 'pauschal') return `${m} pauschal`
  if (!e) return String(m)
  return `${m} ${e}`.trim()
}

function angebotPreis(p: AngebotPosition): number {
  const stueck = positionVkNettoStueck(p)
  const menge = Math.max(0, p.menge ?? 1)
  if (p.gesamt_min != null && Number.isFinite(p.gesamt_min) && Math.abs(p.gesamt_min) >= stueck * 0.5) {
    return Math.abs(p.gesamt_min)
  }
  return Math.round(stueck * menge * 100) / 100
}

/** Anfrage: Funnel-Positionen (read-only). */
export function leistungenFromAnfrage(funnelDaten: unknown): LeistungRow[] {
  return parseFunnelPositionen(funnelDaten).map((p, i) => {
    const mid =
      p.preis_min > 0 || p.preis_max > 0
        ? Math.round(((p.preis_min + p.preis_max) / 2) * 100) / 100
        : 0
    const preisLabel =
      p.preis_min > 0 && p.preis_max > 0 && p.preis_min !== p.preis_max
        ? `${formatEurBetrag(p.preis_min)} – ${formatEurBetrag(p.preis_max)}`
        : mid > 0
          ? formatEurBetrag(mid)
          : '—'
    return {
      id: `anfrage-${i}-${p.leistung}`,
      bezeichnung: p.leistung,
      subline: p.gewerk_name?.trim() || null,
      mengeLabel: mengeLabel(p.menge, p.einheit),
      preisLabel,
      preisValue: mid,
      status: 'geplant',
      statusLabel: 'Geplant',
      gewerkName: p.gewerk_name?.trim() || null,
    }
  })
}

/** Angebot / Rechnung: AngebotPosition[]. */
export function leistungenFromAngebotPositionen(
  positionen: AngebotPosition[],
  statusFallback: { status: string; statusLabel: string } = {
    status: 'entwurf',
    statusLabel: 'Entwurf',
  },
  opts?: { eigenleistungSubline?: boolean }
): LeistungRow[] {
  return positionen.map((p) => {
    const name = p.leistung_name?.trim() || p.leistung?.trim() || 'Position'
    const preis = angebotPreis(p)
    const hw = p.handwerker_name?.trim() || null
    const subline = opts?.eigenleistungSubline
      ? hw || 'Eigenleistung'
      : p.gewerk_name?.trim() || null
    return {
      id: p.id,
      bezeichnung: name,
      subline,
      mengeLabel: mengeLabel(p.menge, p.einheit),
      preisLabel: preis > 0 ? formatEurBetrag(preis) : '—',
      preisValue: preis,
      status: statusFallback.status,
      statusLabel: statusFallback.statusLabel,
      beschreibung: p.beschreibung?.trim() || null,
      gewerkName: p.gewerk_name?.trim() || 'Allgemein',
      handwerkerName: hw,
      handwerkerId: p.handwerker_id ?? null,
    }
  })
}

/** Auftrag: AuftragPosition[]. */
export function leistungenFromAuftragPositionen(positionen: AuftragPosition[]): LeistungRow[] {
  return [...positionen]
    .filter((p) => (p.aenderung_typ ?? '').toLowerCase() !== 'entfernt')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((p) => {
      const st = normalizeLeistungStatus(p.leistung_status)
      const vk = Math.max(0, p.preis_fix ?? 0)
      const menge = Math.max(1, p.menge ?? 1)
      const einzel = menge > 0 ? Math.round((vk / menge) * 100) / 100 : vk
      const notizen = (p.auftrag_position_notizen ?? [])
        .map((n) => ({
          at: n.datum || n.created_at || null,
          text: (n.text ?? '').trim(),
        }))
        .filter((n) => n.text)
      const hwName = p.handwerker?.name?.trim() || null
      const hwStatus = String(p.handwerker_status ?? '').toLowerCase()
      let anfrageStatusLabel: string | null = null
      if (hwStatus.includes('anfrag') || hwStatus === 'pending' || hwStatus === 'wartend') {
        anfrageStatusLabel = 'Angefragt'
      } else if (hwStatus.includes('angenommen') || hwStatus === 'accepted') {
        anfrageStatusLabel = 'Angenommen'
      } else if (hwName) {
        anfrageStatusLabel = 'Zugewiesen'
      }

      const statusLabel =
        st === 'erledigt' ? 'Abgenommen' : leistungStatusLabel(st)

      const subParts: string[] = []
      if (hwName) subParts.push(hwName)
      if (st === 'in_arbeit' && p.gestartet_am) {
        subParts.push(`in Arbeit seit ${formatDatum(p.gestartet_am.slice(0, 10))}`)
      } else if (st === 'erledigt') {
        subParts.push('dokumentiert · abgenommen')
      } else if (st === 'offen' && !hwName) {
        subParts.push('noch nicht zugewiesen')
      }

      return {
        id: p.id,
        bezeichnung: p.leistung_name?.trim() || 'Leistung',
        subline: subParts.length ? subParts.join(' · ') : p.gewerk_name?.trim() || null,
        mengeLabel: mengeLabel(p.menge, p.einheit),
        preisLabel: vk > 0 ? formatEurBetrag(vk) : '—',
        preisValue: vk,
        einzelpreisLabel: einzel > 0 ? formatEurBetrag(einzel) : null,
        status: st === 'erledigt' ? 'abgenommen' : st,
        statusLabel,
        beschreibung: richTextToPlain(p.beschreibung) || null,
        gewerkName: p.gewerk_name?.trim() || null,
        handwerkerName: hwName,
        handwerkerId: p.handwerker_id,
        anfrageStatusLabel,
        zeitraumLabel: formatZeitraumKurz(p) || null,
        ekLabel:
          p.preis_partner != null && p.preis_partner > 0
            ? formatEurBetrag(p.preis_partner)
            : null,
        dokumentationEintraege: notizen,
        abnahmeLabel:
          st === 'erledigt'
            ? 'Abgenommen'
            : 'Noch nicht abgenommen — Ergebnis und Notiz fließen ins Abnahmedokument.',
      }
    })
}

function heuteYmd(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Mängel für die Karte über der Tabelle (Frist + Status offen/überfällig/behoben). */
export function maengelFuerLeistungenTab(
  maengel: AbnahmeMangel[],
  punkte?: { id: string; gewerk?: string | null }[] | null
): LeistungMangelAnzeige[] {
  const today = heuteYmd()
  const gewerkByPunkt = new Map(
    (punkte ?? []).map((p) => [p.id, (p.gewerk ?? '').trim() || null] as const)
  )
  return maengel.map((m) => {
    const offen = isMangelOffen(m)
    const frist = m.frist?.trim()?.slice(0, 10) || null
    let status: LeistungMangelAnzeige['status'] = 'offen'
    let statusLabel = mangelStatusLabel(m.status)
    if (!offen) {
      status = 'behoben'
      statusLabel = mangelStatusLabel(m.status ?? 'behoben')
    } else if (frist && frist < today) {
      status = 'ueberfaellig'
      statusLabel = 'Überfällig'
    } else {
      status = 'offen'
      statusLabel = 'Offen'
    }
    return {
      id: m.punkt_id,
      text: m.beschreibung?.trim() || 'Mangel',
      frist,
      status,
      statusLabel,
      gewerk: gewerkByPunkt.get(m.punkt_id) ?? null,
    }
  })
}

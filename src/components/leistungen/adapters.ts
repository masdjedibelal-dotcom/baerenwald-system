import { parseFunnelPositionen } from '@/lib/lead-funnel-positionen'
import { positionVkNettoStueck } from '@/lib/angebot-positionen'
import {
  leistungStatusLabel,
  normalizeLeistungStatus,
} from '@/lib/auftraege/auftrag-fortschritt-preis'
import { formatZeitraumKurz } from '@/components/auftraege/leistungen-v3/utils'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  formatRegieSollIst,
  formatStundenColon,
  istRegiePosition,
  REGIE_BADGE_LABEL,
} from '@/lib/auftraege/regie-display'
import { eintragTypLabel } from '@/lib/auftraege/position-lebenszyklus'
import { richTextToPlain } from '@/lib/rich-text'
import { formatDatum } from '@/lib/utils'
import type { AbnahmeMangel } from '@/lib/auftraege/abnahme-protokoll-types'
import { isMangelOffen, mangelStatusLabel } from '@/lib/auftraege/abnahme-maengel-helpers'
import type { AngebotPosition, AuftragPosition } from '@/lib/types'
import type { LeistungMangelAnzeige, LeistungRow } from '@/components/leistungen/types'

export type LeistungEintragLite = {
  position_id?: string | null
  typ?: string | null
  beschreibung?: string | null
  zeit_minuten?: number | null
  created_at?: string | null
  erfasst_von?: string | null
  fotoCount?: number
}

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
    const isRegie = istRegiePosition(p)
    const baseSub = opts?.eigenleistungSubline
      ? hw || 'Eigenleistung'
      : p.gewerk_name?.trim() || null
    const subline = isRegie
      ? [REGIE_BADGE_LABEL, baseSub].filter(Boolean).join(' · ')
      : baseSub
    return {
      id: p.id,
      bezeichnung: name,
      subline,
      mengeLabel: isRegie
        ? `geschätzt ${mengeLabel(p.geschaetzt_std ?? p.menge, p.einheit || 'h')}`
        : mengeLabel(p.menge, p.einheit),
      preisLabel: preis > 0 ? formatEurBetrag(preis) : '—',
      preisValue: preis,
      status: statusFallback.status,
      statusLabel: statusFallback.statusLabel,
      beschreibung: p.beschreibung?.trim() || null,
      gewerkName: p.gewerk_name?.trim() || 'Allgemein',
      handwerkerName: hw,
      handwerkerId: p.handwerker_id ?? null,
      istRegie: isRegie,
    }
  })
}

/** Auftrag: AuftragPosition[]. */
export function leistungenFromAuftragPositionen(
  positionen: AuftragPosition[],
  opts?: { eintraege?: LeistungEintragLite[] }
): LeistungRow[] {
  const eintraegeByPos = new Map<string, LeistungEintragLite[]>()
  for (const e of opts?.eintraege ?? []) {
    const pid = e.position_id?.trim()
    if (!pid) continue
    const list = eintraegeByPos.get(pid) ?? []
    list.push(e)
    eintraegeByPos.set(pid, list)
  }

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

      const isRegie = istRegiePosition(p)
      const posEintraege = eintraegeByPos.get(p.id) ?? []
      const erfasstMin = posEintraege.reduce(
        (s, e) => s + (Number(e.zeit_minuten) || 0),
        0
      )
      const handwerkerUpdates = posEintraege
        .filter((e) => {
          const von = String(e.erfasst_von ?? '')
          return (
            von.includes('partner') ||
            von.includes('eigenbetrieb') ||
            Boolean(e.beschreibung?.trim()) ||
            (Number(e.zeit_minuten) || 0) > 0
          )
        })
        .map((e) => {
          const zeit = Number(e.zeit_minuten) || 0
          const typ = eintragTypLabel(e.typ)
          const text = e.beschreibung?.trim() || typ || 'Update'
          return {
            at: e.created_at ?? null,
            text,
            zeitLabel: zeit > 0 ? formatStundenColon(zeit) : null,
            fotoCount: e.fotoCount ?? 0,
          }
        })

      const stundensatz = Number(p.stundensatz) || 0
      const erfasstNetto =
        isRegie && erfasstMin > 0 && stundensatz > 0
          ? Math.round((erfasstMin / 60) * stundensatz * 100) / 100
          : null
      const sollIst = isRegie
        ? formatRegieSollIst({
            geschaetztStd: p.geschaetzt_std ?? null,
            erfasstMinuten: erfasstMin || null,
          })
        : null

      // Subline: Regie + Ist wenn vorhanden
      const subParts: string[] = []
      if (isRegie) subParts.push(REGIE_BADGE_LABEL)
      if (sollIst) subParts.push(sollIst)
      if (st === 'in_arbeit' && p.gestartet_am) {
        subParts.push(`in Arbeit seit ${formatDatum(p.gestartet_am.slice(0, 10))}`)
      } else if (st === 'erledigt') {
        subParts.push('dokumentiert · abgenommen')
      }

      return {
        id: p.id,
        bezeichnung: p.leistung_name?.trim() || 'Leistung',
        subline: subParts.length ? subParts.join(' · ') : p.gewerk_name?.trim() || null,
        mengeLabel: isRegie
          ? erfasstMin > 0
            ? `erfasst ${formatStundenColon(erfasstMin)} Std.`
            : `geschätzt ${mengeLabel(p.geschaetzt_std ?? p.menge, p.einheit || 'h')}`
          : mengeLabel(p.menge, p.einheit),
        preisLabel:
          erfasstNetto != null && erfasstNetto > 0
            ? formatEurBetrag(erfasstNetto)
            : vk > 0
              ? formatEurBetrag(vk)
              : '—',
        preisValue: erfasstNetto != null && erfasstNetto > 0 ? erfasstNetto : vk,
        einzelpreisLabel: isRegie
          ? stundensatz > 0
            ? `${formatEurBetrag(stundensatz)}/h`
            : einzel > 0
              ? `${formatEurBetrag(einzel)}/h`
              : null
          : einzel > 0
            ? formatEurBetrag(einzel)
            : null,
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
        istRegie: isRegie,
        handwerkerUpdates,
        regieSollIstLabel: sollIst,
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

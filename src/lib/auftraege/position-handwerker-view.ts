import { effektiverHandwerkerStatus } from '@/lib/auftraege/auftrag-angebot-handwerker-match'
import {
  leistungStatusBadgeClass,
  leistungStatusLabel,
  normalizeLeistungStatus,
  type AuftragLeistungStatus,
} from '@/lib/auftraege/auftrag-fortschritt-preis'
import {
  istEigenleistungPosition,
  preisEigenleistung,
  preisPartner,
} from '@/lib/auftraege/auftrag-leistung-phasen'
import { betragAnzeige } from '@/lib/angebot-einfach'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  hasHwEinreichung,
  kannHwEinreichungPruefen,
  hwStatusLabel,
} from '@/lib/partner/handwerker-einreichung'
import {
  hwKonditionDelta,
  hwKonditionForAuftragPosition,
  parseHwKonditionen,
  type HwKonditionenArt,
} from '@/lib/partner/hw-konditionen'
import type { AngebotHandwerkerRow, AngebotPosition, AuftragPosition } from '@/lib/types'

export type PipelineStepId =
  | 'zugewiesen'
  | 'antwort'
  | 'konditionen'
  | 'crm_freigabe'
  | 'hw_bestaetigung'
  | 'ausfuehrung'

export type PipelineStepState = 'pending' | 'active' | 'done' | 'skipped'

export type PipelineStep = {
  id: PipelineStepId
  label: string
  shortLabel: string
  state: PipelineStepState
}

export type VerhandlungBadge = {
  label: string
  badgeClass: string
  deltaText: string | null
  art?: HwKonditionenArt
}

export type PositionHandwerkerView = {
  handwerkerName: string | null
  hasHandwerker: boolean
  eigenleistung: boolean
  verhandlungBadge: VerhandlungBadge | null
  vk: number
  ekPartner: number
  ekEigen: number
  marge: number
  margeProzent: number | null
  leistungStatus: AuftragLeistungStatus
  leistungStatusLabel: string
  leistungStatusBadgeClass: string
  pipeline: PipelineStep[]
  activePipelineIndex: number
  konditionenAusstehend: boolean
  partnerPreisReadOnly: number | null
  konditionArt: HwKonditionenArt | null
  hwStatusRaw: string | null
  zuweisungStatus: string
  eingereicht: boolean
  kannPruefen: boolean
  wartetAufHwBestaetigung: boolean
}

const PIPELINE_META: { id: PipelineStepId; label: string; shortLabel: string }[] = [
  { id: 'zugewiesen', label: 'Zugewiesen', shortLabel: '①' },
  { id: 'antwort', label: 'Antwort', shortLabel: '②' },
  { id: 'konditionen', label: 'Konditionen', shortLabel: '③' },
  { id: 'crm_freigabe', label: 'CRM-Freigabe', shortLabel: '④' },
  { id: 'hw_bestaetigung', label: 'HW-Bestätigung', shortLabel: '⑤' },
  { id: 'ausfuehrung', label: 'Ausführung', shortLabel: '⑥' },
]

function formatDelta(delta: number | null): string | null {
  if (delta == null) return null
  const prefix = delta > 0 ? '+' : ''
  return `${prefix}${betragAnzeige(delta, null, null)}`
}

function buildVerhandlungBadge(input: {
  pos: AuftragPosition
  partnerRow: AngebotHandwerkerRow | null
  konditionArt: HwKonditionenArt | null
  delta: number | null
  eingereicht: boolean
  kannPruefen: boolean
  hwStatus: string
  zuweisungStatus: string
}): VerhandlungBadge | null {
  const { pos, partnerRow, konditionArt, delta, eingereicht, kannPruefen, hwStatus, zuweisungStatus } =
    input

  if (!pos.handwerker_id) {
    return {
      label: 'Kein Handwerker',
      badgeClass: 'pos-v2-badge-muted',
      deltaText: null,
    }
  }

  if (hwStatus === 'abgelehnt') {
    return { label: 'Abgelehnt', badgeClass: 'pos-v2-badge-danger', deltaText: null }
  }
  if (hwStatus === 'rueckfrage') {
    return { label: 'Rückfrage', badgeClass: 'pos-v2-badge-warn', deltaText: null }
  }
  if (hwStatus === 'uebernommen') {
    return { label: 'Übernommen', badgeClass: 'pos-v2-badge-success', deltaText: null }
  }
  if (hwStatus === 'bestaetigt') {
    return {
      label: '⏵ Bestätigt',
      badgeClass: 'pos-v2-badge-violet',
      deltaText: null,
    }
  }

  if (kannPruefen && konditionArt === 'gegenvorschlag') {
    return {
      label: 'Gegenvorschlag',
      badgeClass: 'pos-v2-badge-warn',
      deltaText: formatDelta(delta),
      art: 'gegenvorschlag',
    }
  }

  if (kannPruefen && konditionArt === 'bestaetigt') {
    return {
      label: 'Zur Prüfung',
      badgeClass: 'pos-v2-badge-info',
      deltaText: formatDelta(delta),
      art: 'bestaetigt',
    }
  }

  if (eingereicht) {
    return {
      label: hwStatusLabel(partnerRow?.hw_status),
      badgeClass: 'pos-v2-badge-info',
      deltaText: formatDelta(delta),
    }
  }

  if (zuweisungStatus === 'angefragt' || zuweisungStatus === 'warten') {
    return { label: 'Warte Antwort', badgeClass: 'pos-v2-badge-info', deltaText: null }
  }

  const portal = (partnerRow?.status ?? '').toLowerCase()
  if (portal === 'akzeptiert' || zuweisungStatus === 'akzeptiert') {
    return { label: 'Konditionen fehlen', badgeClass: 'pos-v2-badge-warn', deltaText: null }
  }

  return { label: 'Zugewiesen', badgeClass: 'pos-v2-badge-muted', deltaText: null }
}

function resolveActivePipelineIndex(input: {
  hasHandwerker: boolean
  zuweisungStatus: string
  partnerPortalStatus: string
  eingereicht: boolean
  hwStatus: string
  leistungStatus: AuftragLeistungStatus
}): number {
  const { hasHandwerker, zuweisungStatus, partnerPortalStatus, eingereicht, hwStatus, leistungStatus } =
    input

  if (!hasHandwerker) return -1
  if (hwStatus === 'uebernommen' || leistungStatus === 'in_arbeit' || leistungStatus === 'erledigt') {
    return 5
  }
  if (hwStatus === 'bestaetigt') return 4
  if (hwStatus === 'eingereicht' || eingereicht) return 3
  if (partnerPortalStatus === 'akzeptiert' || zuweisungStatus === 'akzeptiert') return 2
  if (zuweisungStatus === 'angefragt' || zuweisungStatus === 'warten') return 1
  return 0
}

function buildPipeline(activeIndex: number, hasHandwerker: boolean): PipelineStep[] {
  if (!hasHandwerker) {
    return PIPELINE_META.map((m) => ({ ...m, state: 'pending' as PipelineStepState }))
  }

  return PIPELINE_META.map((m, i) => {
    let state: PipelineStepState = 'pending'
    if (i < activeIndex) state = 'done'
    else if (i === activeIndex) state = 'active'
    return { ...m, state }
  })
}

export function buildPositionHandwerkerView(
  pos: AuftragPosition,
  partnerRow: AngebotHandwerkerRow | null,
  angebotPositionen: AngebotPosition[] = []
): PositionHandwerkerView {
  const eigenleistung = istEigenleistungPosition(pos)
  const ekPartner = preisPartner(pos)
  const ekEigen = preisEigenleistung(pos)
  const vk = Math.max(0, pos.preis_fix ?? 0)
  const marge = vk - ekPartner - ekEigen
  const margeProzent = vk > 0 ? Math.round((marge / vk) * 1000) / 10 : null

  const leistungStatus = normalizeLeistungStatus(pos.leistung_status)
  const zuweisungStatus = effektiverHandwerkerStatus(pos, partnerRow)
  const eingereicht = partnerRow ? hasHwEinreichung(partnerRow) : false
  const kannPruefen = partnerRow ? kannHwEinreichungPruefen(partnerRow) : false
  const hwStatusRaw = (partnerRow?.hw_status ?? '').toLowerCase() || null
  const hwStatus = hwStatusRaw ?? ''
  const partnerPortalStatus = (partnerRow?.status ?? '').toLowerCase()

  const konditionen = partnerRow ? parseHwKonditionen(partnerRow.hw_konditionen) : null
  const konditionZeile = konditionen
    ? hwKonditionForAuftragPosition(
        konditionen,
        {
          id: pos.id,
          leistung_name: pos.leistung_name,
          gewerk_slug: pos.gewerk_slug,
          gewerk_name: pos.gewerk_name,
        },
        angebotPositionen,
        pos.gewerk_slug,
        pos.gewerk_name
      )
    : null

  const delta = konditionZeile ? hwKonditionDelta(konditionZeile.ek_netto, konditionZeile.hw_netto) : null
  const konditionArt = konditionen?.art ?? null
  const konditionenAusstehend = Boolean(partnerRow && eingereicht && kannPruefen && konditionZeile)
  const partnerPreisReadOnly =
    konditionenAusstehend && konditionZeile ? konditionZeile.hw_netto : null
  const wartetAufHwBestaetigung = hwStatus === 'bestaetigt'

  const activePipelineIndex = resolveActivePipelineIndex({
    hasHandwerker: Boolean(pos.handwerker_id),
    zuweisungStatus,
    partnerPortalStatus,
    eingereicht,
    hwStatus,
    leistungStatus,
  })

  const verhandlungBadge = eigenleistung
    ? null
    : buildVerhandlungBadge({
        pos,
        partnerRow,
        konditionArt,
        delta,
        eingereicht,
        kannPruefen,
        hwStatus,
        zuweisungStatus,
      })

  return {
    handwerkerName: pos.handwerker?.name ?? null,
    hasHandwerker: Boolean(pos.handwerker_id),
    eigenleistung,
    verhandlungBadge,
    vk,
    ekPartner,
    ekEigen,
    marge,
    margeProzent,
    leistungStatus,
    leistungStatusLabel: leistungStatusLabel(pos.leistung_status),
    leistungStatusBadgeClass: leistungStatusBadgeClass(pos.leistung_status),
    pipeline: buildPipeline(activePipelineIndex, Boolean(pos.handwerker_id)),
    activePipelineIndex,
    konditionenAusstehend,
    partnerPreisReadOnly,
    konditionArt,
    hwStatusRaw,
    zuweisungStatus,
    eingereicht,
    kannPruefen,
    wartetAufHwBestaetigung,
  }
}

export function formatMargeSummary(vk: number, marge: number, margeProzent: number | null): string {
  if (vk <= 0) return '—'
  const pct = margeProzent != null ? ` · ${margeProzent}%` : ''
  return `${formatEurBetrag(marge)}${pct}`
}

export function margeBarTone(marge: number, vk: number): 'good' | 'warn' | 'bad' | 'neutral' {
  if (vk <= 0) return 'neutral'
  const pct = (marge / vk) * 100
  if (pct >= 25) return 'good'
  if (pct >= 10) return 'warn'
  return 'bad'
}

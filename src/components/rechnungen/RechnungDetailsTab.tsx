'use client'

import { MockCard } from '@/components/mock-ui/MockCard'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockProp } from '@/components/mock-ui/MockProp'
import { RECHNUNG_BELEG_TYP_LABELS } from '@/lib/rechnung-config'
import type { LeadDetail, Rechnung, RechnungBelegTyp } from '@/lib/types'
import { formatDatum } from '@/lib/utils'

function artLabel(detail: Rechnung, belegTyp: RechnungBelegTyp): string {
  if (belegTyp === 'gutschrift') return RECHNUNG_BELEG_TYP_LABELS.gutschrift
  const art = String(
    (detail as { rechnung_art?: string | null }).rechnung_art ?? ''
  ).toLowerCase()
  if (art === 'schluss') return 'Schlussrechnung'
  if (art === 'abschlag') return 'Abschlag'
  const titel = (detail.auftraege?.titel ?? detail.rechnungsnummer ?? '').toLowerCase()
  const nr = (detail.rechnungsnummer ?? '').toLowerCase()
  const blob = `${titel} ${nr} ${art}`
  if (/schluss/.test(blob)) return 'Schlussrechnung'
  if (/abschlag|anzahlung|teilrechnung/.test(blob)) return 'Abschlag'
  return RECHNUNG_BELEG_TYP_LABELS.rechnung
}

function zahlungszielTage(
  erstellt: string | null | undefined,
  faellig: string | null | undefined,
  fallback: number
): number {
  if (!erstellt || !faellig) return fallback
  const a = new Date(erstellt.slice(0, 10))
  const b = new Date(faellig.slice(0, 10))
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return fallback
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000)
  return diff > 0 ? diff : fallback
}

function tageSeitFaelligkeit(faelligAm: string | null): number {
  if (!faelligAm) return 0
  const parts = faelligAm.split('-').map((x) => parseInt(x, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0
  const [y, m, d] = parts
  const due = new Date(y!, m! - 1, d!)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - due.getTime()) / 86400000)
}

/** Details: Rechnungsdaten · Zahlungsstatus (Leistungen → shared LeistungenTab). */
export function RechnungDetailsTab({
  detail,
  zahlungszielFallback = 14,
}: {
  detail: Rechnung
  lead?: LeadDetail | null
  zahlungszielFallback?: number
}) {
  const belegTyp: RechnungBelegTyp =
    detail.beleg_typ === 'gutschrift' ? 'gutschrift' : 'rechnung'

  const tageUeber = detail.faellig_am ? tageSeitFaelligkeit(detail.faellig_am) : 0
  const ueberfaellig =
    tageUeber > 0 &&
    detail.status !== 'bezahlt' &&
    detail.status !== 'storniert' &&
    belegTyp === 'rechnung'

  const zielTage = zahlungszielTage(
    detail.rechnungsdatum || detail.created_at,
    detail.faellig_am,
    zahlungszielFallback
  )

  const zahlungsText = (() => {
    if (detail.status === 'bezahlt') {
      return (
        <span style={{ color: 'var(--green)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <MockIcon ctx="emphasis" n="check" size={14} />
          Vollständig bezahlt
        </span>
      )
    }
    if (detail.status === 'storniert') {
      return <span style={{ color: 'var(--text-3)' }}>Storniert</span>
    }
    if (ueberfaellig) {
      return (
        <span style={{ color: 'var(--danger, #c0392b)', fontWeight: 600 }}>
          {tageUeber} Tag{tageUeber === 1 ? '' : 'e'} überfällig
        </span>
      )
    }
    if (detail.faellig_am) {
      return (
        <span style={{ color: 'var(--text-2)' }}>
          Zahlung ausstehend · fällig {formatDatum(detail.faellig_am)}
        </span>
      )
    }
    return <span style={{ color: 'var(--text-3)' }}>Zahlung ausstehend</span>
  })()

  return (
    <>
      <MockCard title="Rechnung" icon="file-invoice">
        <div className="props">
          <MockProp label="Nummer">{detail.rechnungsnummer?.trim() || '—'}</MockProp>
          <MockProp label="Art">{artLabel(detail, belegTyp)}</MockProp>
          <MockProp label="Erstellt">
            {detail.rechnungsdatum
              ? formatDatum(detail.rechnungsdatum)
              : detail.created_at
                ? formatDatum(detail.created_at.slice(0, 10))
                : '—'}
          </MockProp>
          {belegTyp === 'rechnung' ? (
            <MockProp label="Zahlungsziel">{zielTage} Tage</MockProp>
          ) : null}
          {belegTyp === 'rechnung' && detail.faellig_am ? (
            <MockProp label="Fällig">
              <span style={ueberfaellig ? { color: 'var(--danger, #c0392b)', fontWeight: 600 } : undefined}>
                {formatDatum(detail.faellig_am)}
              </span>
            </MockProp>
          ) : null}
          {detail.bezahlt_at ? (
            <MockProp label="Bezahlt am">{formatDatum(detail.bezahlt_at.slice(0, 10))}</MockProp>
          ) : null}
        </div>
      </MockCard>

      <MockCard title="Zahlungsstatus" icon="receipt">
        <div className="props">
          <MockProp label="Status">{zahlungsText}</MockProp>
        </div>
      </MockCard>
    </>
  )
}

/** Mock Phasen-Sheet / Übersicht — flache Prop-Liste. */
export function buildRechnungPhaseSheetProps(
  detail: Rechnung,
  opts?: { zahlungszielFallback?: number; statusLabel?: string }
): { k: string; v: string }[] {
  const belegTyp: RechnungBelegTyp =
    detail.beleg_typ === 'gutschrift' ? 'gutschrift' : 'rechnung'
  const zielTage = zahlungszielTage(
    detail.rechnungsdatum || detail.created_at,
    detail.faellig_am,
    opts?.zahlungszielFallback ?? 14
  )
  const rows: { k: string; v: string }[] = [
    { k: 'Nummer', v: detail.rechnungsnummer?.trim() || '—' },
    { k: 'Art', v: artLabel(detail, belegTyp) },
    {
      k: 'Erstellt',
      v: detail.rechnungsdatum
        ? formatDatum(detail.rechnungsdatum)
        : detail.created_at
          ? formatDatum(detail.created_at.slice(0, 10))
          : '—',
    },
  ]
  if (belegTyp === 'rechnung') {
    rows.push({ k: 'Zahlungsziel', v: `${zielTage} Tage` })
    rows.push({
      k: 'Fällig',
      v: detail.faellig_am ? formatDatum(detail.faellig_am) : '—',
    })
  }
  if (detail.bezahlt_at) {
    rows.push({ k: 'Bezahlt am', v: formatDatum(detail.bezahlt_at.slice(0, 10)) })
  }
  rows.push({
    k: 'Status',
    v:
      opts?.statusLabel?.trim() ||
      (detail.status === 'bezahlt' ? 'Bezahlt' : String(detail.status)),
  })
  return rows
}

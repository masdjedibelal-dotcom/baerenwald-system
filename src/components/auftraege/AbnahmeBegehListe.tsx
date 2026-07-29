'use client'

import { useMemo, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  bereinigeAbnahmeLeistungName,
  gruppiereAbnahmePunkte,
  notizenFuerLeistung,
  setNotizenFuerLeistung,
  type AbnahmeLeistungGruppe,
  type AbnahmePunkt,
  type AbnahmePunktStatus,
} from '@/lib/auftraege/abnahme-protokoll-types'
import { cn } from '@/lib/utils'

function leistungKey(p: AbnahmePunkt): string {
  return p.leistung_id?.trim() || p.id
}

function leistungAggregateStatus(punkte: AbnahmePunkt[]): AbnahmePunktStatus {
  if (!punkte.length) return 'offen'
  if (punkte.every((p) => p.status === 'ok')) return 'ok'
  if (punkte.some((p) => p.status === 'mangel')) return 'mangel'
  if (punkte.every((p) => p.status !== 'offen')) return 'ok'
  return 'offen'
}

function nextStatus(current: AbnahmePunktStatus): AbnahmePunktStatus {
  if (current === 'offen') return 'ok'
  if (current === 'ok') return 'mangel'
  return 'offen'
}

function setLeistungStatus(
  alle: AbnahmePunkt[],
  leistungId: string,
  status: AbnahmePunktStatus
): AbnahmePunkt[] {
  return alle.map((p) => {
    if (leistungKey(p) !== leistungId) return p
    return {
      ...p,
      status,
      mangel_frist: status === 'mangel' ? p.mangel_frist ?? null : null,
    }
  })
}

function leistungTitel(leistung: AbnahmeLeistungGruppe): string {
  const name = bereinigeAbnahmeLeistungName(leistung.leistung_name)
  if (name) return name
  return leistung.punkte[0]?.beschreibung?.trim() || 'Leistung'
}

function leistungBeschreibung(leistung: AbnahmeLeistungGruppe): string {
  const name = bereinigeAbnahmeLeistungName(leistung.leistung_name)
  const lines = leistung.punkte
    .map((p) => p.beschreibung?.trim())
    .filter((t): t is string => Boolean(t))
  if (!lines.length) return ''
  if (name && lines.length === 1 && lines[0] === name) return ''
  if (name) return lines.filter((l) => l !== name).join(' · ') || lines.join(' · ')
  if (lines.length === 1) return ''
  return lines.slice(1).join(' · ')
}

export function countAbgenommeneLeistungen(punkte: AbnahmePunkt[]): {
  done: number
  total: number
} {
  const blocks = gruppiereAbnahmePunkte(punkte)
  let done = 0
  let total = 0
  for (const block of blocks) {
    for (const leistung of block.leistungen) {
      total += 1
      if (leistungAggregateStatus(leistung.punkte) === 'ok') done += 1
    }
  }
  return { done, total }
}

function BegehItem({
  leistung,
  onToggle,
  onNotizen,
}: {
  leistung: AbnahmeLeistungGruppe
  onToggle: () => void
  onNotizen: (next: string[]) => void
}) {
  const status = leistungAggregateStatus(leistung.punkte)
  const notizen = notizenFuerLeistung(leistung.punkte)
  const [adding, setAdding] = useState(false)
  const sub = leistungBeschreibung(leistung)

  return (
    <li className="abnahme-inline__item">
      <button
        type="button"
        className={cn(
          'abnahme-inline__check',
          status === 'ok' && 'is-ok',
          status === 'mangel' && 'is-mangel'
        )}
        aria-label={
          status === 'ok'
            ? 'Abgenommen — tippen für Mangel'
            : status === 'mangel'
              ? 'Mangel — tippen für Offen'
              : 'Offen — tippen für Abnehmen'
        }
        aria-pressed={status !== 'offen'}
        onClick={onToggle}
      >
        {status === 'ok' ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
        {status === 'mangel' ? (
          <span className="text-[11px] font-bold text-amber-800" aria-hidden>
            !
          </span>
        ) : null}
      </button>
      <div className="abnahme-inline__item-body">
        <p className="abnahme-inline__item-title">{leistungTitel(leistung)}</p>
        {sub ? <p className="abnahme-inline__item-sub">{sub}</p> : null}
        {notizen.map((n, i) => (
          <div key={i} className="abnahme-inline__notiz">
            <input
              className="input"
              value={n}
              placeholder="Notiz zur Leistung…"
              aria-label={`Notiz ${i + 1}`}
              onChange={(e) => {
                const next = [...notizen]
                next[i] = e.target.value
                onNotizen(next)
              }}
              onBlur={() => {
                if (!n.trim()) onNotizen(notizen.filter((_, j) => j !== i))
                setAdding(false)
              }}
              autoFocus={adding && i === notizen.length - 1 && !n.trim()}
            />
          </div>
        ))}
        <button
          type="button"
          className="abnahme-inline__add-note"
          onClick={() => {
            setAdding(true)
            onNotizen([...notizen, ''])
          }}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Notiz hinzufügen
        </button>
      </div>
    </li>
  )
}

/** Mock-Checkliste: Gewerk-Gruppen mit runden Checks (Begehen & Abnehmen). */
export function AbnahmeBegehListe({
  punkte,
  onChange,
}: {
  punkte: AbnahmePunkt[]
  onChange: (next: AbnahmePunkt[]) => void
}) {
  const blocks = useMemo(() => gruppiereAbnahmePunkte(punkte), [punkte])

  if (!blocks.length) {
    return (
      <p className="text-[length:var(--fs-text)] text-bw-text-muted">
        Keine Leistungen für die Abnahme vorhanden.
      </p>
    )
  }

  return (
    <div className="abnahme-begeh">
      {blocks.map((block) => (
        <div key={block.gewerk} className="abnahme-inline__gewerk">
          <h3 className="abnahme-inline__gewerk-title">{block.gewerk}</h3>
          <ul className="abnahme-inline__items">
            {block.leistungen.map((leistung) => (
              <BegehItem
                key={leistung.leistung_id}
                leistung={leistung}
                onToggle={() => {
                  const cur = leistungAggregateStatus(leistung.punkte)
                  onChange(setLeistungStatus(punkte, leistung.leistung_id, nextStatus(cur)))
                }}
                onNotizen={(next) =>
                  onChange(setNotizenFuerLeistung(punkte, leistung.leistung_id, next))
                }
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function AbnahmeProgressBar({
  done,
  total,
}: {
  done: number
  total: number
}) {
  return (
    <div className="abnahme-inline__progress" role="status">
      <MockIcon ctx="default" n="clock" size={16} />
      <span>
        {done}/{total} Leistungen abgenommen
      </span>
    </div>
  )
}

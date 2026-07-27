'use client'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  berechneZahlungsplan,
  neueZahlungsplanZeile,
  zahlungsplanVorlage30_40_30,
  zahlungsplanVorlage30_70,
  zahlungsplanVorlage50_50,
  type Zahlungsplan,
  type ZahlungsplanZeile,
} from '@/lib/rechnungen/zahlungsplan'
import { cn } from '@/lib/utils'

type EditorRate = {
  id: string
  label: string
  prozent: number
  faellig_am: string
}

const PRESETS: { name: string; build: () => Zahlungsplan }[] = [
  { name: '30 / 40 / 30', build: zahlungsplanVorlage30_40_30 },
  { name: '50 / 50', build: zahlungsplanVorlage50_50 },
  { name: 'Anzahlung 30% + Rest', build: zahlungsplanVorlage30_70 },
]

function planToRates(plan: Zahlungsplan, gesamtNetto: number): EditorRate[] {
  const kontext = berechneZahlungsplan(plan, gesamtNetto)
  return kontext.zeilen.map((z) => {
    const pct =
      z.typ === 'prozent'
        ? z.wert
        : gesamtNetto > 0
          ? Math.round((z.netto / gesamtNetto) * 100)
          : 0
    return {
      id: z.id,
      label: z.titel,
      prozent: pct,
      faellig_am: z.faellig_am?.slice(0, 10) ?? '',
    }
  })
}

/**
 * Editor speichert alles als %-Zeilen. Eingefrorene Raten (gestellt/bezahlt) müssen
 * 1:1 aus dem bisherigen Plan bleiben — sonst wird z. B. typ „rest“ zu „prozent“
 * und der Server-Gate blockiert mit „Betrag/Typ nicht änderbar“.
 */
function ratesToPlan(
  rates: EditorRate[],
  initial: Zahlungsplan | null,
  frozenIds: string[]
): Zahlungsplan {
  const frozen = new Set(frozenIds)
  const initialById = new Map((initial?.zeilen ?? []).map((z) => [z.id, z]))
  const zeilen: ZahlungsplanZeile[] = rates.map((r) => {
    if (frozen.has(r.id)) {
      const orig = initialById.get(r.id)
      if (orig) return { ...orig }
    }
    return neueZahlungsplanZeile({
      id: r.id,
      titel: r.label.trim() || 'Abschlag',
      typ: 'prozent',
      wert: Number(r.prozent) || 0,
      faellig_am: r.faellig_am.trim() || null,
    })
  })
  return { modus: 'abschlagsplan', zeilen }
}

function ratesEqual(a: EditorRate[], b: EditorRate[]): boolean {
  if (a.length !== b.length) return false
  return a.every((r, i) => {
    const o = b[i]
    return (
      o != null &&
      r.id === o.id &&
      r.label === o.label &&
      r.prozent === o.prozent &&
      r.faellig_am === o.faellig_am
    )
  })
}

export function AbschlagsplanEditorModal({
  open,
  onClose,
  gesamtNetto,
  initial,
  onSave,
  saving,
  frozenIds = [],
}: {
  open: boolean
  onClose: () => void
  gesamtNetto: number
  initial: Zahlungsplan | null
  onSave: (plan: Zahlungsplan) => void
  saving?: boolean
  /** Rate-IDs die gestellt/bezahlt sind — nicht änderbar/löschbar */
  frozenIds?: string[]
}) {
  const frozen = new Set(frozenIds)
  const baseline = useMemo(
    () =>
      initial?.zeilen?.length
        ? planToRates(initial, gesamtNetto)
        : planToRates(zahlungsplanVorlage30_40_30(), gesamtNetto),
    [initial, gesamtNetto]
  )
  const [rates, setRates] = useState<EditorRate[]>(baseline)

  useEffect(() => {
    if (!open) return
    setRates(baseline)
  }, [open, baseline])

  const dirty = open && !ratesEqual(rates, baseline)
  const summe = rates.reduce((s, r) => s + (Number(r.prozent) || 0), 0)
  const ok = summe === 100 && rates.length > 0

  function upd(id: string, patch: Partial<EditorRate>) {
    if (frozen.has(id)) return
    setRates((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function applyPreset(build: () => Zahlungsplan) {
    if (frozen.size > 0) return
    setRates(planToRates(build(), gesamtNetto))
  }

  function add() {
    setRates((prev) => [
      ...prev,
      {
        id: neueZahlungsplanZeile().id,
        label: `${prev.length + 1}. Abschlag`,
        prozent: 0,
        faellig_am: '',
      },
    ])
  }

  function remove(id: string) {
    if (frozen.has(id)) return
    setRates((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)))
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Abschlagsplan"
      context="detail"
      dirty={dirty}
      confirmBusy={saving}
      confirmDisabled={!ok || saving}
      onConfirm={() => onSave(ratesToPlan(rates, initial, frozenIds))}
      size="lg"
    >
      <div className="zahlplan-editor-presets">
        <span className="zahlplan-editor-presets__label">Vorlage:</span>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className="zahlplan-preset-chip"
            disabled={frozen.size > 0}
            title={frozen.size > 0 ? 'Vorlagen gesperrt — gestellte/bezahlte Raten' : undefined}
            onClick={() => applyPreset(p.build)}
          >
            {p.name}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span className="zahlplan-editor-presets__gesamt">
          Gesamt <b>{formatEurBetrag(gesamtNetto)}</b>
          <span className="text-bw-text-muted"> netto</span>
        </span>
      </div>

      {frozen.size > 0 ? (
        <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.45 }}>
          Gestellte/bezahlte Raten sind fest. Offene Raten kannst du ändern.
        </p>
      ) : null}

      <div className="zahlplan-editor-table">
        <div className="zahlplan-editor-head">
          <div>Bezeichnung</div>
          <div style={{ textAlign: 'right' }}>Anteil</div>
          <div style={{ textAlign: 'right' }}>Betrag</div>
          <div>Fällig</div>
          <div />
        </div>
        {rates.map((r) => {
          const betrag = Math.round(((gesamtNetto || 0) * (Number(r.prozent) || 0)) / 100)
          const isFrozen = frozen.has(r.id)
          return (
            <div key={r.id} className={cn('zahlplan-editor-row', isFrozen && 'is-frozen')}>
              <input
                className="txt"
                value={r.label}
                disabled={isFrozen}
                onChange={(e) => upd(r.id, { label: e.target.value })}
                style={{ height: 32 }}
              />
              <div className="txt-prefix" style={{ maxWidth: 84 }}>
                <input
                  className="txt"
                  type="number"
                  min={0}
                  max={100}
                  value={r.prozent}
                  disabled={isFrozen}
                  onChange={(e) => upd(r.id, { prozent: Number(e.target.value) || 0 })}
                  style={{ textAlign: 'right' }}
                />
                <span className="prefix" style={{ right: 8, left: 'auto' }}>
                  %
                </span>
              </div>
              <div className="zahlplan-editor-betrag">{formatEurBetrag(betrag)}</div>
              <input
                className="txt"
                type="date"
                value={r.faellig_am}
                disabled={isFrozen}
                onChange={(e) => upd(r.id, { faellig_am: e.target.value })}
                style={{ height: 32, fontSize: 12 }}
              />
              {isFrozen ? (
                <span title="Eingefroren" style={{ fontSize: 11, color: 'var(--text-3)', padding: '0 4px' }}>
                  fest
                </span>
              ) : (
                <MockBtn sm kind="ghost" icon="trash" onClick={() => remove(r.id)} title="Entfernen" />
              )}
            </div>
          )
        })}
        <div className="zahlplan-editor-foot">
          <button type="button" className="pt-add" style={{ border: 'none', padding: 0, width: 'auto' }} onClick={add}>
            <MockIcon ctx="btn" n="plus" size={13} /> Abschlag
          </button>
          <div style={{ flex: 1 }} />
          <span className={cn('zahlplan-editor-summe', summe === 100 ? 'is-ok' : 'is-bad')}>
            Summe {summe}%{summe !== 100 ? ' · muss 100% sein' : ''}
          </span>
        </div>
      </div>
    </EditorSheet>
  )
}

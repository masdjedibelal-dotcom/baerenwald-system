'use client'

import { useEffect, useState } from 'react'
import { MockModal } from '@/components/mock-ui/MockModal'
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

function ratesToPlan(rates: EditorRate[]): Zahlungsplan {
  const zeilen: ZahlungsplanZeile[] = rates.map((r) =>
    neueZahlungsplanZeile({
      id: r.id,
      titel: r.label.trim() || 'Abschlag',
      typ: 'prozent',
      wert: Number(r.prozent) || 0,
      faellig_am: r.faellig_am.trim() || null,
    })
  )
  return { modus: 'abschlagsplan', zeilen }
}

export function AbschlagsplanEditorModal({
  open,
  onClose,
  gesamtNetto,
  initial,
  onSave,
  saving,
}: {
  open: boolean
  onClose: () => void
  gesamtNetto: number
  initial: Zahlungsplan | null
  onSave: (plan: Zahlungsplan) => void
  saving?: boolean
}) {
  const [rates, setRates] = useState<EditorRate[]>(() =>
    initial?.zeilen?.length
      ? planToRates(initial, gesamtNetto)
      : planToRates(zahlungsplanVorlage30_40_30(), gesamtNetto)
  )

  useEffect(() => {
    if (!open) return
    setRates(
      initial?.zeilen?.length
        ? planToRates(initial, gesamtNetto)
        : planToRates(zahlungsplanVorlage30_40_30(), gesamtNetto)
    )
  }, [open, initial, gesamtNetto])

  const summe = rates.reduce((s, r) => s + (Number(r.prozent) || 0), 0)
  const ok = summe === 100 && rates.length > 0

  function upd(id: string, patch: Partial<EditorRate>) {
    setRates((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function applyPreset(build: () => Zahlungsplan) {
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
    setRates((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)))
  }

  return (
    <MockModal
      open={open}
      onClose={onClose}
      icon="calculator"
      title="Abschlagsplan"
      footer={
        <>
          <MockBtn kind="ghost" onClick={onClose} disabled={saving}>
            Abbrechen
          </MockBtn>
          <MockBtn
            kind="primary"
            icon="check"
            disabled={!ok || saving}
            onClick={() => onSave(ratesToPlan(rates))}
          >
            {saving ? 'Speichere…' : 'Plan speichern'}
          </MockBtn>
        </>
      }
    >
      <div className="zahlplan-editor-presets">
        <span className="zahlplan-editor-presets__label">Vorlage:</span>
        {PRESETS.map((p) => (
          <button key={p.name} type="button" className="zahlplan-preset-chip" onClick={() => applyPreset(p.build)}>
            {p.name}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span className="zahlplan-editor-presets__gesamt">
          Gesamt <b>{formatEurBetrag(gesamtNetto)}</b>
          <span className="text-bw-text-muted"> netto</span>
        </span>
      </div>

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
          return (
            <div key={r.id} className="zahlplan-editor-row">
              <input
                className="txt"
                value={r.label}
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
                onChange={(e) => upd(r.id, { faellig_am: e.target.value })}
                style={{ height: 32, fontSize: 12 }}
              />
              <MockBtn sm kind="ghost" icon="trash" onClick={() => remove(r.id)} title="Entfernen" />
            </div>
          )
        })}
        <div className="zahlplan-editor-foot">
          <button type="button" className="pt-add" style={{ border: 'none', padding: 0, width: 'auto' }} onClick={add}>
            <MockIcon ctx="btn" n="plus" size={13} /> Abschlag hinzufügen
          </button>
          <div style={{ flex: 1 }} />
          <span className={cn('zahlplan-editor-summe', summe === 100 ? 'is-ok' : 'is-bad')}>
            Summe {summe}%{summe !== 100 ? ' · muss 100% sein' : ''}
          </span>
        </div>
      </div>
    </MockModal>
  )
}

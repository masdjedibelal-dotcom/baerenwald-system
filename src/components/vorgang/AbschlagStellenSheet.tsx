'use client'

import { useEffect, useState } from 'react'

import { MockSegment } from '@/components/mock-ui'
import { MockField } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import { formatEurBetrag } from '@/lib/dokument-zeilen'

type Art = 'prozent' | 'betrag'

/**
 * Abschlag stellen ohne vorherigen Zahlungsplan (Umbau P09).
 * Betrag wird brutto eingegeben (wie alle Kundenbeträge) und für den Plan in netto umgerechnet.
 */
export function AbschlagStellenSheet({
  open,
  onClose,
  gesamtNetto,
  gesamtBrutto,
  saving,
  onSave,
}: {
  open: boolean
  onClose: () => void
  gesamtNetto: number
  gesamtBrutto: number
  saving?: boolean
  onSave: (abschlag: { typ: Art; wert: number }) => void
}) {
  const [art, setArt] = useState<Art>('prozent')
  const [wert, setWert] = useState<number>(0)

  useEffect(() => {
    if (open) {
      setArt('prozent')
      setWert(0)
    }
  }, [open])

  // Verhältnis brutto/netto des Auftrags (19 %, 0 % bei §13b)
  const faktor = gesamtNetto > 0 && gesamtBrutto > 0 ? gesamtBrutto / gesamtNetto : 1.19
  const r2 = (n: number) => Math.round(n * 100) / 100
  // Wie der Zahlungsplan rechnet: erst netto runden, dann brutto (sonst 1 Cent Abweichung).
  const brutto =
    wert <= 0 ? 0 : art === 'prozent' ? r2(r2((gesamtNetto * wert) / 100) * faktor) : wert
  const ok =
    wert > 0 && (art === 'prozent' ? wert < 100 : brutto < gesamtBrutto)

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Abschlag stellen"
      crumb={`Auftragssumme ${formatEurBetrag(gesamtBrutto)} brutto`}
      secondary={{ label: 'Abbrechen', disabled: Boolean(saving), kind: 'ghost' }}
      primary={{
        label: 'Abschlag anlegen',
        icon: 'check',
        disabled: !ok || Boolean(saving),
        busy: Boolean(saving),
        onClick: () => {
          if (!ok) return
          onSave(
            art === 'prozent'
              ? { typ: 'prozent', wert }
              : { typ: 'betrag', wert: Math.round((wert / faktor) * 100) / 100 }
          )
        },
      }}
    >
      <MockField label="Art">
        <MockSegment
          value={art}
          onChange={(next) => {
            setArt(next)
            setWert(0)
          }}
          options={[
            { value: 'prozent', label: 'Prozent' },
            { value: 'betrag', label: 'Betrag' },
          ]}
          aria-label="Art des Abschlags"
        />
      </MockField>
      <MockField
        label={art === 'prozent' ? 'Anteil in %' : 'Betrag in € (brutto)'}
        hint={
          brutto > 0
            ? `Abschlag ${formatEurBetrag(brutto)} brutto. Der Rest kommt in die Schlussrechnung.`
            : 'Die Schlussrechnung zieht alle gestellten Abschläge automatisch ab.'
        }
      >
        <ClearableNumberInput
          className="txt"
          min={0}
          max={art === 'prozent' ? 99 : undefined}
          value={wert}
          onValueChange={(v) => setWert(Number(v) || 0)}
          style={{ textAlign: 'right' }}
        />
      </MockField>
    </EditorSheet>
  )
}

'use client'

import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import {
  formatEurBetrag,
  gesamtrabattAbzugFromModus,
  isGesamtrabattZielModus,
  type GesamtrabattModus,
} from '@/lib/dokument-zeilen'

function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string
  hint?: string
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`field${full ? ' full' : ''}`} style={full ? { gridColumn: '1 / -1' } : undefined}>
      <div className="field-label">{label}</div>
      {children}
      {hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  )
}

export function nachlassSelectValue(modus: GesamtrabattModus): 'prozent' | 'betrag' | 'ziel' {
  if (isGesamtrabattZielModus(modus)) return 'ziel'
  return modus === 'betrag' ? 'betrag' : 'prozent'
}

export function NachlassModusFields({
  modus,
  wert,
  onChange,
  artikelNetto = 0,
  artikelBrutto = 0,
  inputClassName = 'txt',
  selectClassName = 'sel',
}: {
  modus: GesamtrabattModus
  wert: number
  onChange: (patch: { nachlassModus?: GesamtrabattModus; preis?: number }) => void
  /** Netto vor Nachlass — für Zielbetrag + Vorschau */
  artikelNetto?: number
  /** Brutto vor Nachlass — für Ziel-Brutto */
  artikelBrutto?: number
  inputClassName?: string
  selectClassName?: string
}) {
  const selectVal = nachlassSelectValue(modus)
  const isZiel = isGesamtrabattZielModus(modus)
  const abzug = gesamtrabattAbzugFromModus(modus, wert, artikelNetto, artikelBrutto)
  const zielBasis = modus === 'ziel_brutto' ? artikelBrutto : artikelNetto

  function setArt(next: 'prozent' | 'betrag' | 'ziel') {
    if (next === 'prozent') {
      onChange({ nachlassModus: 'prozent' })
      return
    }
    if (next === 'betrag') {
      onChange({ nachlassModus: 'betrag' })
      return
    }
    const zielModus: GesamtrabattModus = modus === 'ziel_brutto' ? 'ziel_brutto' : 'ziel_netto'
    const basis = zielModus === 'ziel_brutto' ? artikelBrutto : artikelNetto
    onChange({
      nachlassModus: zielModus,
      // Beim Wechsel von %/Betrag immer aktuelle Summe als Startwert
      preis: isZiel
        ? wert > 0
          ? wert
          : Math.round(Math.max(0, basis) * 100) / 100
        : Math.round(Math.max(0, basis) * 100) / 100,
    })
  }

  function setZielBasis(next: 'netto' | 'brutto') {
    const zielModus: GesamtrabattModus = next === 'brutto' ? 'ziel_brutto' : 'ziel_netto'
    const basis = next === 'brutto' ? artikelBrutto : artikelNetto
    onChange({
      nachlassModus: zielModus,
      preis: wert > 0 ? wert : Math.round(Math.max(0, basis) * 100) / 100,
    })
  }

  const wertLabel =
    selectVal === 'prozent'
      ? 'Prozent'
      : selectVal === 'betrag'
        ? 'Betrag netto'
        : modus === 'ziel_brutto'
          ? 'Neuer Brutto-Gesamtbetrag'
          : 'Neuer Netto-Gesamtbetrag'

  return (
    <>
      <Field label="Art des Nachlasses">
        <select
          className={selectClassName}
          value={selectVal}
          onChange={(e) => setArt(e.target.value as 'prozent' | 'betrag' | 'ziel')}
        >
          <option value="prozent">Prozent vom Netto</option>
          <option value="betrag">Fester Betrag (netto)</option>
          <option value="ziel">Neuer Gesamtbetrag</option>
        </select>
      </Field>

      {isZiel ? (
        <Field label="Basis" hint="Rabatt = Summe vorher − neuer Gesamtbetrag">
          <div className="seg" role="group" aria-label="Netto oder Brutto">
            <button
              type="button"
              className={modus === 'ziel_netto' ? 'on' : undefined}
              onClick={() => setZielBasis('netto')}
            >
              Netto
            </button>
            <button
              type="button"
              className={modus === 'ziel_brutto' ? 'on' : undefined}
              onClick={() => setZielBasis('brutto')}
            >
              Brutto
            </button>
          </div>
        </Field>
      ) : (
        <div />
      )}

      <Field
        label={wertLabel}
        hint={
          isZiel && zielBasis > 0
            ? `Aktuell ${formatEurBetrag(zielBasis)}${
                abzug > 0 ? ` · Nachlass −${formatEurBetrag(abzug)}` : ''
              }`
            : abzug > 0 && selectVal !== 'prozent'
              ? `Nachlass −${formatEurBetrag(abzug)}`
              : undefined
        }
      >
        <div className="txt-prefix">
          <span className="prefix">{selectVal === 'prozent' ? '%' : '€'}</span>
          <ClearableNumberInput
            className={inputClassName}
            min={0}
            value={wert}
            onValueChange={(preis) => onChange({ preis })}
          />
        </div>
      </Field>
    </>
  )
}

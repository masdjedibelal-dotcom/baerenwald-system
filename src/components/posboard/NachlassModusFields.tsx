'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockSelect } from '@/components/mock-ui/MockForm'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import {
formatEurBetrag,
gesamtrabattAbzugFromModus,
gesamtrabattArt,
gesamtrabattIstBrutto,
gesamtrabattModusAus,
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
  const art = gesamtrabattArt(modus)
  const brutto = gesamtrabattIstBrutto(modus)
  const abzug = gesamtrabattAbzugFromModus(modus, wert, artikelNetto, artikelBrutto)
  const basis = brutto ? artikelBrutto : artikelNetto

  function setArt(next: 'prozent' | 'betrag' | 'ziel') {
    const nextModus = gesamtrabattModusAus(next, brutto)
    if (next !== 'ziel') {
      onChange({ nachlassModus: nextModus })
      return
    }
    // Beim Wechsel auf Zielbetrag: aktuelle Summe als Startwert
    onChange({
      nachlassModus: nextModus,
      preis:
        art === 'ziel' && wert > 0 ? wert : Math.round(Math.max(0, basis) * 100) / 100,
    })
  }

  function setBasis(next: 'netto' | 'brutto') {
    const nextModus = gesamtrabattModusAus(art, next === 'brutto')
    if (art !== 'ziel') {
      onChange({ nachlassModus: nextModus })
      return
    }
    const b = next === 'brutto' ? artikelBrutto : artikelNetto
    onChange({
      nachlassModus: nextModus,
      preis: wert > 0 ? wert : Math.round(Math.max(0, b) * 100) / 100,
    })
  }

  const wertLabel =
    art === 'prozent'
      ? 'Prozent'
      : art === 'betrag'
        ? brutto
          ? 'Betrag brutto'
          : 'Betrag netto'
        : brutto
          ? 'Neuer Brutto-Gesamtbetrag'
          : 'Neuer Netto-Gesamtbetrag'

  return (
    <>
      <Field label="Art des Nachlasses">
        <MockSelect className={selectClassName} value={art} onChange={(e) => setArt(e.target.value as 'prozent' | 'betrag' | 'ziel')}>
          <option value="prozent">Prozent</option>
          <option value="betrag">Fester Betrag</option>
          <option value="ziel">Neuer Gesamtbetrag</option>
        </MockSelect>
      </Field>

      <Field label="Basis">
        <div className="seg" role="group" aria-label="Netto oder Brutto">
          <MockBtn className={!brutto ? 'on' : undefined} type="button" onClick={() => setBasis('netto')}>
            Netto
          </MockBtn>
          <MockBtn className={brutto ? 'on' : undefined} type="button" onClick={() => setBasis('brutto')}>
            Brutto
          </MockBtn>
        </div>
      </Field>

      <Field
        label={wertLabel}
        hint={
          art === 'ziel' && basis > 0
            ? `Aktuell ${formatEurBetrag(basis)}${
                abzug > 0 ? ` · Nachlass −${formatEurBetrag(abzug)} netto` : ''
              }`
            : abzug > 0
              ? `Nachlass −${formatEurBetrag(abzug)} netto`
              : undefined
        }
      >
        <div className="txt-prefix">
          <span className="prefix">{art === 'prozent' ? '%' : '€'}</span>
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

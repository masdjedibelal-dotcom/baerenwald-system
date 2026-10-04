'use client'

import { useEffect, useMemo, useState } from 'react'

import { MockBtn, MockSegment } from '@/components/mock-ui'
import { MockField } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  berechneZahlungsplan,
  neueZahlungsplanZeile,
  normalizeAbschlagsplanSchluss,
  planMitSchlussrechnung,
  validateZahlungsplanGegenGesamt,
  type Zahlungsplan,
  type ZahlungsplanZeile,
} from '@/lib/rechnungen/zahlungsplan'
import { cn } from '@/lib/utils'

type Art = 'prozent' | 'betrag'

/** Abschläge durchnummerieren — gestellte behalten ihren Titel (stehen schon auf der Rechnung). */
function nummeriere(zeilen: ZahlungsplanZeile[], frozen: Set<string>): ZahlungsplanZeile[] {
  let n = 0
  return zeilen.map((z) => {
    if (z.typ === 'rest') return { ...z, titel: 'Schlussrechnung' }
    n += 1
    return frozen.has(z.id) ? z : { ...z, titel: `${n}. Abschlag` }
  })
}

function gleich(a: ZahlungsplanZeile[], b: ZahlungsplanZeile[]): boolean {
  return (
    a.length === b.length &&
    a.every((z, i) => z.id === b[i]?.id && z.typ === b[i]?.typ && Number(z.wert) === Number(b[i]?.wert))
  )
}

/**
 * Abschlagsplan in einem Blatt: oben „Abschlag hinzufügen“, darunter alle Raten bis zur Schlussrechnung.
 * Entwürfe lassen sich löschen; gestellte Raten nur über Storno in der Rechnung.
 */
export function AbschlagsplanSheet({
  open,
  onClose,
  gesamtNetto,
  gesamtBrutto,
  initial,
  frozenIds = [],
  saving,
  onSave,
}: {
  open: boolean
  onClose: () => void
  gesamtNetto: number
  gesamtBrutto: number
  initial: Zahlungsplan | null
  /** Gestellte/bezahlte Raten — nicht löschbar */
  frozenIds?: string[]
  saving?: boolean
  onSave: (plan: Zahlungsplan) => void
}) {
  const frozen = useMemo(() => new Set(frozenIds), [frozenIds])
  const ausgang = useMemo(
    () =>
      nummeriere(
        normalizeAbschlagsplanSchluss(
          initial?.zeilen?.length ? initial : planMitSchlussrechnung(null)
        ).zeilen,
        frozen
      ),
    [initial, frozen]
  )
  const [zeilen, setZeilen] = useState<ZahlungsplanZeile[]>(ausgang)
  const [art, setArt] = useState<Art>('prozent')
  const [wert, setWert] = useState(0)

  useEffect(() => {
    if (!open) return
    setZeilen(ausgang)
    setArt('prozent')
    setWert(0)
  }, [open, ausgang])

  // Verhältnis brutto/netto des Auftrags (19 %, 0 % bei §13b)
  const faktor = gesamtNetto > 0 && gesamtBrutto > 0 ? gesamtBrutto / gesamtNetto : 1.19
  const plan: Zahlungsplan = useMemo(() => ({ modus: 'abschlagsplan', zeilen }), [zeilen])
  const bruttoById = useMemo(() => {
    const m = new Map<string, number>()
    for (const z of berechneZahlungsplan(plan, Math.max(0, gesamtNetto)).zeilen) m.set(z.id, z.brutto)
    return m
  }, [plan, gesamtNetto])

  const neueZeile = (): ZahlungsplanZeile =>
    neueZahlungsplanZeile({
      titel: 'Abschlag',
      typ: art,
      // Betrag wird brutto eingegeben, im Plan netto gespeichert
      wert: art === 'prozent' ? wert : Math.round((wert / faktor) * 100) / 100,
      faellig_am: null,
    })

  const mitNeuer = useMemo(() => {
    if (wert <= 0) return null
    const next = [...zeilen]
    const restIdx = next.findIndex((z) => z.typ === 'rest')
    next.splice(restIdx < 0 ? next.length : restIdx, 0, neueZeile())
    return next
    // eslint-disable-next-line react-hooks/exhaustive-deps -- neueZeile hängt nur an art/wert/faktor
  }, [zeilen, art, wert, faktor])
  const neuOk = Boolean(
    mitNeuer &&
      validateZahlungsplanGegenGesamt({ modus: 'abschlagsplan', zeilen: mitNeuer }, Math.max(0, gesamtNetto)).ok &&
      (art === 'prozent' ? wert < 100 : wert < gesamtBrutto)
  )

  function hinzufuegen() {
    if (!mitNeuer || !neuOk) return
    setZeilen(nummeriere(mitNeuer, frozen))
    setWert(0)
  }

  function loeschen(id: string) {
    if (frozen.has(id)) return
    setZeilen((prev) => nummeriere(prev.filter((z) => z.id !== id), frozen))
  }

  const gate = validateZahlungsplanGegenGesamt(plan, Math.max(0, gesamtNetto))
  const dirty = open && !gleich(zeilen, ausgang)

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Abschlagsplan"
      crumb={`Auftragssumme ${formatEurBetrag(gesamtBrutto)} brutto`}
      dirty={dirty}
      secondary={{ label: 'Abbrechen', disabled: Boolean(saving), kind: 'ghost' }}
      primary={{
        label: 'Speichern',
        icon: 'check',
        disabled: !dirty || !gate.ok || Boolean(saving),
        busy: Boolean(saving),
        onClick: () => onSave(normalizeAbschlagsplanSchluss(plan)),
      }}
    >
      <div className="abschlagsplan-neu">
        <MockField label="Abschlag hinzufügen">
          <MockSegment
            value={art}
            onChange={(next) => {
              setArt(next)
              setWert(0)
            }}
            options={[
              { value: 'prozent', label: 'Prozent' },
              { value: 'betrag', label: 'Betrag (brutto)' },
            ]}
            aria-label="Art des Abschlags"
          />
        </MockField>
        <div className="abschlagsplan-neu__row">
          <div className="txt-prefix abschlagsplan-neu__wert">
            <span className="prefix">{art === 'prozent' ? '%' : '€'}</span>
            <ClearableNumberInput
              className="txt"
              min={0}
              max={art === 'prozent' ? 99 : undefined}
              value={wert}
              onValueChange={(v) => setWert(Number(v) || 0)}
            />
          </div>
          <MockBtn kind="primary" icon="plus" disabled={!neuOk || Boolean(saving)} onClick={hinzufuegen}>
            Hinzufügen
          </MockBtn>
        </div>
      </div>

      <ul className="abschlagsplan-liste">
        {zeilen.map((z) => {
          const istFest = frozen.has(z.id)
          const sub =
            z.typ === 'rest'
              ? 'Rest — zieht alle Abschläge ab'
              : z.typ === 'prozent'
                ? `${String(z.wert).replace('.', ',')} %`
                : 'Fester Betrag'
          return (
            <li key={z.id} className={cn('abschlagsplan-zeile', istFest && 'is-fest')}>
              <div className="abschlagsplan-zeile__text">
                <span className="abschlagsplan-zeile__titel">{z.titel}</span>
                <span className="abschlagsplan-zeile__sub">
                  {istFest ? `${sub} · gestellt` : sub}
                </span>
              </div>
              <span className="abschlagsplan-zeile__betrag">
                {formatEurBetrag(bruttoById.get(z.id) ?? 0)}
              </span>
              {z.typ !== 'rest' && !istFest ? (
                <MockBtn
                  className="abschlagsplan-zeile__del"
                  type="button"
                  title="Löschen"
                  aria-label={`${z.titel} löschen`}
                  onClick={() => loeschen(z.id)}
                >
                  <MockIcon ctx="btn" n="trash" size={16} />
                </MockBtn>
              ) : (
                <span className="abschlagsplan-zeile__del-platz" aria-hidden />
              )}
            </li>
          )
        })}
      </ul>
      {!gate.ok ? <p className="field-error" role="alert">{gate.message}</p> : null}
    </EditorSheet>
  )
}

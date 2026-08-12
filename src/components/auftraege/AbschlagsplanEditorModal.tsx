'use client'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  berechneZahlungsplan,
  neueZahlungsplanZeile,
  validateZahlungsplanGegenGesamt,
  zahlungsplanVorlage30_40_30,
  zahlungsplanVorlage30_70,
  zahlungsplanVorlage50_50,
  type Zahlungsplan,
  type ZahlungsplanAbschlagTyp,
  type ZahlungsplanZeile,
} from '@/lib/rechnungen/zahlungsplan'
import { cn } from '@/lib/utils'

type EditorRate = {
  id: string
  label: string
  typ: ZahlungsplanAbschlagTyp
  /** Prozent (0–100) oder Festbetrag netto; bei rest 0 */
  wert: number
  faellig_am: string
}

const PRESETS: { name: string; build: () => Zahlungsplan }[] = [
  { name: '30 / 40 / 30', build: zahlungsplanVorlage30_40_30 },
  { name: '50 / 50', build: zahlungsplanVorlage50_50 },
  { name: 'Anzahlung 30% + Rest', build: zahlungsplanVorlage30_70 },
]

function planToRates(plan: Zahlungsplan): EditorRate[] {
  return plan.zeilen.map((z) => ({
    id: z.id,
    label: z.titel,
    typ: z.typ,
    wert: z.typ === 'rest' ? 0 : Number(z.wert) || 0,
    faellig_am: z.faellig_am?.slice(0, 10) ?? '',
  }))
}

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
      if (orig) {
        // Eingefroren: Betrag/Typ fest, Titel/Fällig dürfen bleiben wie im Editor nur wenn nicht eingefroren —
        // Gates erlauben Titel-Änderung nicht am Server für typ/wert; Titel behalten wir aus orig.
        return {
          ...orig,
          titel: orig.titel,
          faellig_am: orig.faellig_am ?? null,
        }
      }
    }
    return neueZahlungsplanZeile({
      id: r.id,
      titel: r.label.trim() || 'Abschlag',
      typ: r.typ,
      wert: r.typ === 'rest' ? 0 : Number(r.wert) || 0,
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
      r.typ === o.typ &&
      r.wert === o.wert &&
      r.faellig_am === o.faellig_am
    )
  })
}

/** Abschlagsplan-Editor: bestehenden Plan bearbeiten (IDs bleiben), % oder €. */
export function AbschlagsplanEditorModal({
  open,
  onClose,
  gesamtNetto,
  gesamtBrutto,
  initial,
  onSave,
  saving,
  frozenIds = [],
}: {
  open: boolean
  onClose: () => void
  gesamtNetto: number
  /** Anzeige „Gesamt … €“ (Auftragswert brutto) */
  gesamtBrutto?: number | null
  initial: Zahlungsplan | null
  onSave: (plan: Zahlungsplan) => void
  saving?: boolean
  /** Rate-IDs die gestellt/bezahlt sind — Betrag/Typ nicht änderbar/löschbar */
  frozenIds?: string[]
}) {
  const frozen = new Set(frozenIds)
  const baseline = useMemo(
    () =>
      initial?.zeilen?.length
        ? planToRates(initial)
        : planToRates(zahlungsplanVorlage30_40_30()),
    [initial]
  )
  const [rates, setRates] = useState<EditorRate[]>(baseline)

  useEffect(() => {
    if (!open) return
    setRates(baseline)
  }, [open, baseline])

  const dirty = open && !ratesEqual(rates, baseline)
  const planPreview = useMemo(
    () => ratesToPlan(rates, initial, frozenIds),
    [rates, initial, frozenIds]
  )
  const berechnet = useMemo(
    () => berechneZahlungsplan(planPreview, Math.max(0, gesamtNetto)),
    [planPreview, gesamtNetto]
  )
  const bruttoById = useMemo(() => {
    const m = new Map<string, number>()
    for (const z of berechnet.zeilen) m.set(z.id, z.brutto)
    return m
  }, [berechnet])

  const gate = validateZahlungsplanGegenGesamt(planPreview, Math.max(0, gesamtNetto))
  const ok = gate.ok && rates.length > 0
  const anzeigeGesamt =
    gesamtBrutto != null && gesamtBrutto > 0
      ? gesamtBrutto
      : Math.round(gesamtNetto * 1.19 * 100) / 100

  const summeProzent = rates
    .filter((r) => r.typ === 'prozent')
    .reduce((s, r) => s + (Number(r.wert) || 0), 0)
  const hatRest = rates.some((r) => r.typ === 'rest')
  const alleProzent = rates.length > 0 && rates.every((r) => r.typ === 'prozent')

  function upd(id: string, patch: Partial<EditorRate>) {
    if (frozen.has(id)) {
      // Eingefroren: nur Label erlauben? Nein — Gates frieren typ/wert; Label optional.
      // Strikt: nichts ändern an eingefrorenen Zeilen im UI.
      return
    }
    setRates((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const next = { ...r, ...patch }
        if (patch.typ === 'rest') next.wert = 0
        if (patch.typ === 'betrag' && r.typ === 'prozent' && gesamtNetto > 0) {
          // % → € netto umrechnen
          next.wert = Math.round(gesamtNetto * ((Number(r.wert) || 0) / 100) * 100) / 100
        }
        if (patch.typ === 'prozent' && r.typ === 'betrag' && gesamtNetto > 0) {
          next.wert = Math.round(((Number(r.wert) || 0) / gesamtNetto) * 1000) / 10
        }
        return next
      })
    )
  }

  function applyPreset(build: () => Zahlungsplan) {
    if (frozen.size > 0) return
    setRates(planToRates(build()))
  }

  function add() {
    setRates((prev) => {
      const withoutTrailingRest = [...prev]
      const last = withoutTrailingRest[withoutTrailingRest.length - 1]
      // Neue Zeile vor Rest einfügen, falls letzte Rest ist
      const neue: EditorRate = {
        id: neueZahlungsplanZeile().id,
        label: `${withoutTrailingRest.filter((x) => x.typ !== 'rest').length + 1}. Abschlag`,
        typ: 'prozent',
        wert: 0,
        faellig_am: '',
      }
      if (last?.typ === 'rest') {
        withoutTrailingRest.splice(withoutTrailingRest.length - 1, 0, neue)
        return withoutTrailingRest
      }
      return [...prev, neue]
    })
  }

  function remove(id: string) {
    if (frozen.has(id)) return
    setRates((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)))
  }

  function setTyp(id: string, typ: ZahlungsplanAbschlagTyp) {
    if (frozen.has(id)) return
    if (typ === 'rest') {
      // Nur eine Rest-Zeile
      setRates((prev) =>
        prev.map((r) => {
          if (r.id === id) return { ...r, typ: 'rest', wert: 0 }
          if (r.typ === 'rest') return { ...r, typ: 'prozent', wert: 0 }
          return r
        })
      )
      return
    }
    upd(id, { typ })
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Abschlagsplan"
      crumb={`${formatEurBetrag(anzeigeGesamt)} aufteilen >`}
      dirty={dirty}
      size="lg"
      footer={
        <div className="zahlplan-editor-footer">
          <MockBtn kind="ghost" onClick={onClose} disabled={saving}>
            Abbrechen
          </MockBtn>
          <MockBtn
            kind="primary"
            icon="check"
            disabled={!ok || saving}
            onClick={() => onSave(ratesToPlan(rates, initial, frozenIds))}
          >
            {saving ? 'Speichern…' : 'Plan speichern'}
          </MockBtn>
        </div>
      }
    >
      <div className="zahlplan-editor-presets">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className="zahlplan-preset-chip"
            disabled={frozen.size > 0}
            title={
              frozen.size > 0
                ? 'Vorlagen gesperrt — gestellte/bezahlte Raten'
                : 'Vorlage übernehmen und danach individuell anpassen'
            }
            onClick={() => applyPreset(p.build)}
          >
            {p.name}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span className="zahlplan-editor-presets__gesamt">
          Gesamt <b>{formatEurBetrag(anzeigeGesamt)}</b>
        </span>
      </div>

      <p className="zahlplan-editor-hint">
        {frozen.size > 0
          ? 'Gestellte/bezahlte Raten bleiben fest (IDs & Beträge). Offene Raten kannst du als % oder € anpassen.'
          : 'Abschläge hinzufügen oder entfernen. Pro Zeile % oder Festbetrag (€ netto) — Rest deckt den Restbetrag automatisch.'}
      </p>

      <div className="zahlplan-editor-list">
        {rates.map((r) => {
          const betrag = bruttoById.get(r.id) ?? 0
          const isFrozen = frozen.has(r.id)
          return (
            <article
              key={r.id}
              className={cn('zahlplan-rate-card', isFrozen && 'is-frozen')}
            >
              <div className="zahlplan-rate-card__head">
                <label className="zahlplan-rate-card__field zahlplan-rate-card__field--grow">
                  <span className="zahlplan-rate-card__lbl">Bezeichnung</span>
                  <input
                    className="txt"
                    value={r.label}
                    disabled={isFrozen}
                    onChange={(e) => upd(r.id, { label: e.target.value })}
                  />
                </label>
                {isFrozen ? (
                  <span className="zahlplan-rate-card__badge" title="Eingefroren">
                    fest
                  </span>
                ) : (
                  <MockBtn
                    sm
                    kind="ghost"
                    icon="trash"
                    onClick={() => remove(r.id)}
                    title="Entfernen"
                  />
                )}
              </div>

              <div className="zahlplan-rate-card__grid">
                <label className="zahlplan-rate-card__field">
                  <span className="zahlplan-rate-card__lbl">Art</span>
                  <select
                    className="sel"
                    value={r.typ}
                    disabled={isFrozen}
                    onChange={(e) => setTyp(r.id, e.target.value as ZahlungsplanAbschlagTyp)}
                  >
                    <option value="prozent">%</option>
                    <option value="betrag">€ netto</option>
                    <option value="rest">Rest</option>
                  </select>
                </label>

                <label className="zahlplan-rate-card__field">
                  <span className="zahlplan-rate-card__lbl">Wert</span>
                  {r.typ === 'rest' ? (
                    <div className="zahlplan-rate-card__auto">auto</div>
                  ) : (
                    <div className="txt-prefix zahlplan-rate-card__wert">
                      <ClearableNumberInput
                        className="txt"
                        min={0}
                        max={r.typ === 'prozent' ? 100 : undefined}
                        value={r.wert}
                        disabled={isFrozen}
                        onValueChange={(wert) => upd(r.id, { wert })}
                        style={{ textAlign: 'right' }}
                      />
                      <span className="prefix" style={{ right: 8, left: 'auto' }}>
                        {r.typ === 'prozent' ? '%' : '€'}
                      </span>
                    </div>
                  )}
                </label>

                <div className="zahlplan-rate-card__field">
                  <span className="zahlplan-rate-card__lbl">Betrag (brutto)</span>
                  <div className="zahlplan-editor-betrag zahlplan-rate-card__betrag">
                    {formatEurBetrag(betrag)}
                  </div>
                </div>

                <label className="zahlplan-rate-card__field">
                  <span className="zahlplan-rate-card__lbl">Fällig</span>
                  <input
                    className="txt"
                    type="date"
                    value={r.faellig_am}
                    disabled={isFrozen}
                    onChange={(e) => upd(r.id, { faellig_am: e.target.value })}
                  />
                </label>
              </div>
            </article>
          )
        })}

        <div className="zahlplan-editor-foot">
          <button
            type="button"
            className="pt-add"
            style={{ border: 'none', padding: 0, width: 'auto' }}
            onClick={add}
          >
            <MockIcon ctx="btn" n="plus" size={13} /> Abschlag hinzufügen
          </button>
          <div style={{ flex: 1 }} />
          <span
            className={cn('zahlplan-editor-summe', ok ? 'is-ok' : 'is-bad')}
            title={!gate.ok ? gate.message : undefined}
          >
            {alleProzent
              ? `Summe ${summeProzent}%${summeProzent !== 100 ? ' · muss 100% sein' : ''}`
              : hatRest
                ? ok
                  ? 'Rest deckt den Restbetrag'
                  : !gate.ok
                    ? gate.message
                    : 'Prüfen…'
                : ok
                  ? 'Plan gültig'
                  : !gate.ok
                    ? gate.message
                    : 'Prüfen…'}
          </span>
        </div>
      </div>
    </EditorSheet>
  )
}

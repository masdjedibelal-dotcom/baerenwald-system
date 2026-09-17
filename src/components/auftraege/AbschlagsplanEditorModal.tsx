'use client'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet, useEditorSheetRequestClose } from '@/components/surfaces/EditorSheet'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  berechneZahlungsplan,
  neueZahlungsplanZeile,
  normalizeAbschlagsplanSchluss,
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
    const orig = initialById.get(r.id)
    if (frozen.has(r.id)) {
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
      rechnung_id: orig?.rechnung_id ?? null,
      position_ids: orig?.position_ids,
      pdf_einleitung_vorlage: orig?.pdf_einleitung_vorlage,
      mail_einleitung_vorlage: orig?.mail_einleitung_vorlage,
      mail_betreff_vorlage: orig?.mail_betreff_vorlage,
    })
  })
  return normalizeAbschlagsplanSchluss({ modus: 'abschlagsplan', zeilen })
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

/** Footer im Sheet-Context — Abbrechen = Dirty-Confirm wie X/Swipe. */
function AbschlagsplanEditorFooter({
  ok,
  saving,
  onSave,
}: {
  ok: boolean
  saving: boolean
  onSave: () => void
}) {
  const requestClose = useEditorSheetRequestClose()
  return (
    <div className="zahlplan-editor-footer">
      <MockBtn
        kind="ghost"
        onClick={() => (requestClose ? requestClose() : undefined)}
        disabled={saving}
      >
        Abbrechen
      </MockBtn>
      <MockBtn kind="primary" icon="check" disabled={!ok || saving} onClick={onSave}>
        {saving ? 'Speichern…' : 'Plan speichern'}
      </MockBtn>
    </div>
  )
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
  frozenMeta = {},
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
  /** Optional: Rechnungsnr. für Hint „Gebunden an gesendete Rechnung …“ */
  frozenMeta?: Record<string, { rechnungsnummer?: string | null }>
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
      if (prev.length === 0) {
        return [
          {
            id: neueZahlungsplanZeile().id,
            label: 'Anzahlung',
            typ: 'prozent',
            wert: 30,
            faellig_am: '',
          },
          {
            id: neueZahlungsplanZeile().id,
            label: 'Schlussrechnung',
            typ: 'rest',
            wert: 0,
            faellig_am: '',
          },
        ]
      }
      const abschlagCount = prev.filter((x) => x.typ !== 'rest').length
      const neue: EditorRate = {
        id: neueZahlungsplanZeile().id,
        label: `${abschlagCount + 1}. Abschlag`,
        typ: 'prozent',
        wert: 0,
        faellig_am: '',
      }
      // Immer vor der letzten Rate (Schluss) einfügen — auch bei %-Schluss ohne typ rest
      const next = [...prev]
      next.splice(Math.max(0, next.length - 1), 0, neue)
      return next.map((r, i) => {
        const isLast = i === next.length - 1
        if (isLast) {
          const looksSchluss =
            r.typ === 'rest' ||
            r.label.trim().toLowerCase().startsWith('schluss') ||
            r.label.trim().toLowerCase() === 'schlussrechnung'
          return {
            ...r,
            label: looksSchluss || !r.label.trim() ? 'Schlussrechnung' : r.label,
          }
        }
        if (
          r.label.trim().toLowerCase().startsWith('schluss') ||
          r.label.trim().toLowerCase() === 'schlussrechnung'
        ) {
          return {
            ...r,
            typ: r.typ === 'rest' ? 'prozent' : r.typ,
            label: i === 0 ? 'Anzahlung' : `${i + 1}. Abschlag`,
            wert: r.typ === 'rest' ? 0 : r.wert,
          }
        }
        return r
      })
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
        <AbschlagsplanEditorFooter
          ok={ok}
          saving={Boolean(saving)}
          onSave={() => onSave(ratesToPlan(rates, initial, frozenIds))}
        />
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
      </div>

      <div className="zahlplan-editor-list">
        {rates.map((r) => {
          const betrag = bruttoById.get(r.id) ?? 0
          const isFrozen = frozen.has(r.id)
          const frozenNr = frozenMeta[r.id]?.rechnungsnummer?.trim() || null
          const frozenHint = frozenNr
            ? `Gebunden an gesendete Rechnung ${frozenNr}`
            : 'Gebunden an gesendete Rechnung'
          return (
            <article
              key={r.id}
              className={cn('card zahlplan-rate-card', isFrozen && 'is-frozen')}
            >
              <div className="zahlplan-rate-card__head">
                <label className="zahlplan-rate-card__field zahlplan-rate-card__field--grow">
                  <span className="zahlplan-rate-card__lbl">Bezeichnung</span>
                  <input
                    className="txt zahlplan-rate-card__name"
                    value={r.label}
                    disabled={isFrozen}
                    aria-label="Bezeichnung"
                    onChange={(e) => upd(r.id, { label: e.target.value })}
                  />
                </label>
                {isFrozen ? (
                  <span
                    className="zahlplan-rate-card__frozen-actions"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span className="zahlplan-rate-card__badge" title={frozenHint}>
                      fest
                    </span>
                    <MockBtn
                      sm
                      kind="ghost"
                      icon="trash"
                      disabled
                      title={frozenHint}
                      aria-label={frozenHint}
                    />
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

              <div className="zahlplan-rate-card__hero" aria-label="Betrag brutto">
                <span className="zahlplan-rate-card__hero-lbl">Brutto</span>
                <span className="zahlplan-rate-card__hero-val">{formatEurBetrag(betrag)}</span>
              </div>

              <div className="zahlplan-rate-card__grid">
                <label className="zahlplan-rate-card__field zahlplan-rate-card__field--art">
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

                <label className="zahlplan-rate-card__field zahlplan-rate-card__field--wert">
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

                <div className="zahlplan-rate-card__field zahlplan-rate-card__field--betrag">
                  <span className="zahlplan-rate-card__lbl">Betrag (brutto)</span>
                  <div className="zahlplan-editor-betrag zahlplan-rate-card__betrag">
                    {formatEurBetrag(betrag)}
                  </div>
                </div>

                <label className="zahlplan-rate-card__field zahlplan-rate-card__field--faellig">
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
            className="pt-add zahlplan-editor-add"
            onClick={add}
          >
            <MockIcon ctx="btn" n="plus" size={13} /> Abschlag hinzufügen
          </button>
          <div className="zahlplan-editor-foot__totals">
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
            <span className="zahlplan-editor-gesamt">
              Gesamt <b>{formatEurBetrag(anzeigeGesamt)}</b>
            </span>
          </div>
        </div>
      </div>
    </EditorSheet>
  )
}

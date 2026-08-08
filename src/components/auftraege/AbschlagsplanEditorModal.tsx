'use client'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { useIsMobile } from '@/hooks/useIsMobile'
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
import { cn, formatDatum } from '@/lib/utils'

type EditorRate = {
  id: string
  label: string
  typ: ZahlungsplanAbschlagTyp
  /** Prozent (0–100) oder Festbetrag netto; bei rest 0 */
  wert: number
  faellig_am: string
}

type RateDraft = {
  id: string | null
  label: string
  typ: ZahlungsplanAbschlagTyp
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

function wertLabel(r: Pick<EditorRate, 'typ' | 'wert'>): string {
  if (r.typ === 'rest') return 'Rest'
  if (r.typ === 'prozent') return `${Number(r.wert) || 0} %`
  return formatEurBetrag(Number(r.wert) || 0)
}

function emptyDraft(label: string): RateDraft {
  return {
    id: null,
    label,
    typ: 'prozent',
    wert: 0,
    faellig_am: '',
  }
}

/** Abschlagsplan-Editor: Card-Liste + zweites Sheet zum Bearbeiten. */
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
  /** Anzeige „Gesamt … €“ (Auftragswert brutto) — Desktop */
  gesamtBrutto?: number | null
  initial: Zahlungsplan | null
  onSave: (plan: Zahlungsplan) => void
  saving?: boolean
  /** Rate-IDs die gestellt/bezahlt sind — Betrag/Typ nicht änderbar/löschbar */
  frozenIds?: string[]
}) {
  const isMobile = useIsMobile()
  const frozen = new Set(frozenIds)
  const baseline = useMemo(
    () =>
      initial?.zeilen?.length
        ? planToRates(initial)
        : planToRates(zahlungsplanVorlage30_40_30()),
    [initial]
  )
  const [rates, setRates] = useState<EditorRate[]>(baseline)
  const [draft, setDraft] = useState<RateDraft | null>(null)

  useEffect(() => {
    if (!open) return
    setRates(baseline)
    setDraft(null)
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

  function applyPreset(build: () => Zahlungsplan) {
    if (frozen.size > 0) return
    setRates(planToRates(build()))
  }

  function openAdd() {
    const n = rates.filter((x) => x.typ !== 'rest').length + 1
    setDraft(emptyDraft(`${n}. Abschlag`))
  }

  function openEdit(r: EditorRate) {
    if (frozen.has(r.id)) return
    setDraft({
      id: r.id,
      label: r.label,
      typ: r.typ,
      wert: r.wert,
      faellig_am: r.faellig_am,
    })
  }

  function remove(id: string) {
    if (frozen.has(id)) return
    setRates((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)))
  }

  function commitDraft() {
    if (!draft) return
    const label = draft.label.trim() || 'Abschlag'
    const typ = draft.typ
    const wert = typ === 'rest' ? 0 : Number(draft.wert) || 0
    const faellig_am = draft.faellig_am.trim()

    setRates((prev) => {
      if (draft.id) {
        return prev.map((r) =>
          r.id === draft.id
            ? { ...r, label, typ, wert, faellig_am }
            : typ === 'rest' && r.typ === 'rest'
              ? { ...r, typ: 'prozent', wert: 0 }
              : r
        )
      }

      const neue: EditorRate = {
        id: neueZahlungsplanZeile().id,
        label,
        typ,
        wert,
        faellig_am,
      }
      const next = prev.map((r) =>
        typ === 'rest' && r.typ === 'rest' ? { ...r, typ: 'prozent' as const, wert: 0 } : r
      )
      const last = next[next.length - 1]
      if (last?.typ === 'rest' && typ !== 'rest') {
        const copy = [...next]
        copy.splice(copy.length - 1, 0, neue)
        return copy
      }
      return [...next, neue]
    })
    setDraft(null)
  }

  const summeText = alleProzent
    ? `Summe ${summeProzent}%`
    : hatRest
      ? ok
        ? 'Summe mit Rest'
        : !gate.ok
          ? gate.message
          : 'Summe prüfen'
      : ok
        ? 'Plan gültig'
        : !gate.ok
          ? gate.message
          : 'Summe prüfen'

  return (
    <>
      <EditorSheet
        open={open}
        onClose={onClose}
        title="Abschlagsplan"
        crumb={!isMobile ? `${formatEurBetrag(anzeigeGesamt)} aufteilen >` : undefined}
        dirty={dirty}
        size="lg"
        onConfirm={() => onSave(ratesToPlan(rates, initial, frozenIds))}
        confirmBusy={saving}
        confirmDisabled={!ok || saving || Boolean(draft)}
      >
        {!isMobile ? (
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
                    : 'Vorlage übernehmen'
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
        ) : null}

        <div className="zahlplan-editor-list zahlplan-editor-list--cards">
          <div className="listcard zahlplan-editor-listcard">
            {rates.map((r) => {
              const betrag = bruttoById.get(r.id) ?? 0
              const isFrozen = frozen.has(r.id)
              return (
                <div
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'list-row zahlplan-row zahlplan-row--simple zahlplan-row--editor',
                    isFrozen && 'is-frozen'
                  )}
                  onClick={() => openEdit(r)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openEdit(r)
                    }
                  }}
                >
                  <div className="zahlplan-row__label">
                    <span className="zahlplan-row__title">
                      <span className="zahlplan-row__name">{r.label.trim() || 'Abschlag'}</span>
                      {isFrozen ? (
                        <span className="zahlplan-rate-card__badge">fest</span>
                      ) : null}
                    </span>
                    <div className="zahlplan-row__pct">
                      {wertLabel(r)}
                      {' · '}
                      {formatEurBetrag(betrag)} brutto
                    </div>
                  </div>
                  <div className="zahlplan-row__faellig">
                    {r.faellig_am ? (
                      <>
                        <span className="zahlplan-row__faellig-label">Fällig</span>
                        <span className="zahlplan-row__faellig-value">
                          {formatDatum(r.faellig_am)}
                        </span>
                      </>
                    ) : (
                      <span className="zahlplan-row__faellig-value zahlplan-row__faellig-value--empty">
                        —
                      </span>
                    )}
                  </div>
                  <div className="zahlplan-row__betrag">{formatEurBetrag(betrag)}</div>
                  <div className="zahlplan-row__menu">
                    {!isFrozen ? (
                      <button
                        type="button"
                        className="zahlplan-row__detail"
                        title="Entfernen"
                        aria-label={`${r.label} entfernen`}
                        onClick={(e) => {
                          e.stopPropagation()
                          remove(r.id)
                        }}
                      >
                        <MockIcon ctx="btn" n="trash" size={15} />
                      </button>
                    ) : (
                      <MockIcon ctx="btn" n="chevron-right" size={15} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <button type="button" className="pt-add zahlplan-editor-add" onClick={openAdd}>
            <MockIcon ctx="btn" n="plus" size={13} /> Abschlag hinzufügen
          </button>

          <div className="zahlplan-editor-summe-line">
            <span
              className={cn('zahlplan-editor-summe', ok ? 'is-ok' : 'is-bad')}
              title={!gate.ok ? gate.message : undefined}
            >
              {summeText}
              {alleProzent && summeProzent !== 100 ? ' · muss 100% sein' : ''}
            </span>
          </div>
        </div>
      </EditorSheet>

      <EditorSheet
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Abschlag bearbeiten' : 'Abschlag hinzufügen'}
        size="md"
        dirty={false}
        manageHistory={false}
        onConfirm={commitDraft}
        confirmDisabled={!draft?.label.trim() && draft?.typ !== 'rest'}
      >
        {draft ? (
          <div className="zahlplan-rate-edit space-y-4">
            <label className="zahlplan-rate-card__field">
              <span className="zahlplan-rate-card__lbl">Bezeichnung</span>
              <input
                className="txt"
                value={draft.label}
                autoFocus
                onChange={(e) => setDraft((d) => (d ? { ...d, label: e.target.value } : d))}
              />
            </label>

            <label className="zahlplan-rate-card__field">
              <span className="zahlplan-rate-card__lbl">Art</span>
              <select
                className="sel"
                value={draft.typ}
                onChange={(e) => {
                  const typ = e.target.value as ZahlungsplanAbschlagTyp
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          typ,
                          wert: typ === 'rest' ? 0 : d.wert,
                        }
                      : d
                  )
                }}
              >
                <option value="prozent">%</option>
                <option value="betrag">€ netto</option>
                <option value="rest">Rest</option>
              </select>
            </label>

            <label className="zahlplan-rate-card__field">
              <span className="zahlplan-rate-card__lbl">Wert</span>
              {draft.typ === 'rest' ? (
                <div className="zahlplan-rate-card__auto">auto</div>
              ) : (
                <div className="txt-prefix zahlplan-rate-card__wert">
                  <ClearableNumberInput
                    className="txt"
                    min={0}
                    max={draft.typ === 'prozent' ? 100 : undefined}
                    value={draft.wert}
                    onValueChange={(wert) => setDraft((d) => (d ? { ...d, wert } : d))}
                    style={{ textAlign: 'right' }}
                  />
                  <span className="prefix" style={{ right: 8, left: 'auto' }}>
                    {draft.typ === 'prozent' ? '%' : '€'}
                  </span>
                </div>
              )}
            </label>

            <label className="zahlplan-rate-card__field">
              <span className="zahlplan-rate-card__lbl">Fällig</span>
              <input
                className="txt"
                type="date"
                value={draft.faellig_am}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, faellig_am: e.target.value } : d))
                }
              />
            </label>
          </div>
        ) : null}
      </EditorSheet>
    </>
  )
}

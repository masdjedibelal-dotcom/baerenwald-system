'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'

import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { useMemo, useState } from 'react'
import { Combobox } from '@/components/ui/Combobox'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import type { AngebotPosition } from '@/lib/types'
import {
  berechneZahlungsplan,
  neueZahlungsplanZeile,
  positionAnzeigeLabel,
  positionIdsBelegt,
  positionenFuerZahlungsplanZeile,
  validateZahlungsplanGegenGesamt,
  zahlungsplanVorlage30_70,
  zahlungsplanVorlage3x,
  zahlungsplanVorlage50_50,
  type Zahlungsplan,
  type ZahlungsplanAbschlagTyp,
  type ZahlungsplanZeile,
} from '@/lib/rechnungen/zahlungsplan'

function LeistungsMultiSelect({
  positionen,
  value,
  onChange,
  disabledIds,
}: {
  positionen: AngebotPosition[]
  value: string[]
  onChange: (ids: string[]) => void
  disabledIds: Set<string>
}) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => new Set(value), [value])
  const label =
    value.length === 0
      ? 'Leistungen wählen…'
      : value.length === 1
        ? positionAnzeigeLabel(positionen.find((p) => p.id === value[0])!) || '1 Leistung'
        : `${value.length} Leistungen`

  function toggle(id: string) {
    if (disabledIds.has(id) && !selected.has(id)) return
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...Array.from(next)])
  }

  return (
    <div className="relative">
      <MockBtn fullWidth className="field rounded-button border border-bw-border bg-[var(--app-card)] px-3 py-2 text-left text-[length:var(--fs-text)]" type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="field-l mb-1 block text-[length:var(--fs-meta)] text-bw-text-muted">Leistungen</span>
        <span className="flex items-center justify-between gap-2 text-bw-text">
          <span className="truncate">{label}</span>
          <MockIcon n="chevron-down" ctx="default" className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </MockBtn>
      {open ? (
        <>
          <MockBtn className="fixed inset-0 z-10 cursor-default" type="button" aria-label="Auswahl schließen" onClick={() => setOpen(false)} />
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-card border border-bw-border bg-[var(--app-card)] p-1 shadow-lg">
            {positionen.map((p) => {
              const blocked = disabledIds.has(p.id) && !selected.has(p.id)
              return (
                <li key={p.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-field px-2 py-1.5 text-[length:var(--fs-text)] ${
                      blocked ? 'cursor-not-allowed opacity-45' : 'hover:bg-bw-hover/60'
                    }`}
                  >
                    <MockCheckbox
                      className="mt-0.5"
                      checked={selected.has(p.id)}
                      disabled={blocked}
                      onChange={() => toggle(p.id)}
                    />
                    <span className="min-w-0">
                      <span className="block text-bw-text">{positionAnzeigeLabel(p)}</span>
                      {blocked ? (
                        <span className="text-[length:var(--fs-meta)] text-bw-text-muted">Bereits anderem Abschlag zugeordnet</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </>
      ) : null}
    </div>
  )
}

export function ZahlungsplanEditor({
  plan,
  onChange,
  gesamtNetto,
  mwstSatz = 19,
  compact = false,
  showTextVorlagen = false,
  showVorlagen = false,
  showLeistungsAuswahl = false,
  positionen = [],
}: {
  plan: Zahlungsplan
  onChange: (plan: Zahlungsplan) => void
  gesamtNetto: number
  mwstSatz?: number
  compact?: boolean
  showTextVorlagen?: boolean
  showVorlagen?: boolean
  showLeistungsAuswahl?: boolean
  positionen?: AngebotPosition[]
}) {
  const kontext = berechneZahlungsplan(plan, gesamtNetto, mwstSatz)
  const sumGate = validateZahlungsplanGegenGesamt(plan, gesamtNetto)

  function patchZeile(id: string, patch: Partial<ZahlungsplanZeile>) {
    onChange({
      ...plan,
      modus: 'abschlagsplan',
      zeilen: plan.zeilen.map((z) => (z.id === id ? { ...z, ...patch } : z)),
    })
  }

  function addZeile() {
    const restIdx = plan.zeilen.findIndex((z) => z.typ === 'rest')
    const neue = neueZahlungsplanZeile({ titel: 'Abschlag', typ: 'prozent', wert: 20 })
    if (restIdx >= 0) {
      const zeilen = [...plan.zeilen]
      zeilen.splice(restIdx, 0, neue)
      onChange({ ...plan, modus: 'abschlagsplan', zeilen })
    } else {
      onChange({ ...plan, modus: 'abschlagsplan', zeilen: [...plan.zeilen, neue] })
    }
  }

  function removeZeile(id: string) {
    const next = plan.zeilen.filter((z) => z.id !== id)
    onChange({ ...plan, modus: 'abschlagsplan', zeilen: next.length ? next : [neueZahlungsplanZeile()] })
  }

  return (
    <div className="space-y-3">
      {!compact && showVorlagen ? (
        <div className="flex flex-wrap gap-2">
          <MockBtn kind="ghost" sm type="button" onClick={() => onChange(zahlungsplanVorlage50_50())}>
            50 / 50
          </MockBtn>
          <MockBtn kind="ghost" sm type="button" onClick={() => onChange(zahlungsplanVorlage30_70())}>
            30 / 70
          </MockBtn>
          <MockBtn kind="ghost" sm type="button" onClick={() => onChange(zahlungsplanVorlage3x())}>
            3 Abschläge
          </MockBtn>
        </div>
      ) : null}

      <ul className="m-0 list-none space-y-3 p-0">
        {kontext.zeilen.map((z) => {
          const schlussPositionen = z.istSchluss
            ? positionenFuerZahlungsplanZeile(z, positionen, plan)
            : []
          return (
            <li key={z.id} className="rounded-card border border-bw-border bg-[var(--app-card)] p-3">
              <div className="grid gap-2 sm:grid-cols-12 sm:items-end">
                <label className="field sm:col-span-4">
                  <span className="field-l">Titel</span>
                  <MockInput value={z.titel} onChange={(e) => patchZeile(z.id, { titel: e.target.value })} />
                </label>
                <div className="sm:col-span-3">
                  <Combobox label="Art" id={`typ-${z.id}`} name={`typ-${z.id}`} options={[
                      { value: 'prozent', label: 'Prozent' },
                      { value: 'betrag', label: 'Betrag netto' },
                      { value: 'rest', label: 'Restbetrag' },
                    ]} value={z.typ == null ? '' : String(z.typ)} placeholder="Auswählen…" onChange={(next) => { patchZeile(z.id, { typ: next as ZahlungsplanAbschlagTyp }); }} />
                </div>
                <label className="field sm:col-span-3">
                  <span className="field-l">{z.typ === 'rest' ? 'Rest' : z.typ === 'prozent' ? 'Prozent' : 'Betrag'}</span>
                  {z.typ === 'rest' ? (
                    <MockInput disabled value="" placeholder="automatisch" />
                  ) : (
                    <ClearableNumberInput
                      className="input"
                      min={0}
                      value={z.wert}
                      onValueChange={(wert) => patchZeile(z.id, { wert })}
                    />
                  )}
                </label>
                <div className="flex items-end justify-between gap-2 sm:col-span-2">
                <div className="text-[length:var(--fs-meta)] text-bw-text-muted">
                  <div>Plan netto {formatEurBetrag(z.netto)}</div>
                  <div>Plan brutto {formatEurBetrag(z.brutto)}</div>
                </div>
                  {plan.zeilen.length > 1 && z.typ !== 'rest' ? (
                    <MockBtn kind="ghost" sm className="shrink-0 text-bw-danger" type="button" onClick={() => removeZeile(z.id)} aria-label="Zeile löschen">
                      <MockIcon n="trash" ctx="default" className="h-4 w-4" />
                    </MockBtn>
                  ) : null}
                </div>
              </div>

              {showLeistungsAuswahl && positionen.length > 0 ? (
                <div className="mt-3 border-t border-bw-border pt-3">
                  {z.istSchluss ? (
                    <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
                      <span className="font-medium text-bw-text">Leistungen (automatisch): </span>
                      {schlussPositionen.length
                        ? schlussPositionen.map((p) => positionAnzeigeLabel(p)).join(' · ')
                        : 'Alle Leistungen — nichts anderen Abschlägen zugeordnet'}
                    </p>
                  ) : (
                    <LeistungsMultiSelect
                      positionen={positionen}
                      value={z.position_ids ?? []}
                      onChange={(ids) => patchZeile(z.id, { position_ids: ids })}
                      disabledIds={positionIdsBelegt(plan, z.id)}
                    />
                  )}
                </div>
              ) : null}

              {showTextVorlagen ? (
                <div className="mt-3 grid gap-2 border-t border-bw-border pt-3">
                  <label className="field">
                    <span className="field-l">PDF-Einleitung (Vorlage)</span>
                    <RichTextEditor value={typeof (z.pdf_einleitung_vorlage ?? '') === 'string' ? (z.pdf_einleitung_vorlage ?? '') : ''} onChange={(__v) => patchZeile(z.id, { pdf_einleitung_vorlage: __v })} minHeight={120} />
                  </label>
                  <label className="field">
                    <span className="field-l">Mail-Einleitung (Vorlage)</span>
                    <RichTextEditor value={typeof (z.mail_einleitung_vorlage ?? '') === 'string' ? (z.mail_einleitung_vorlage ?? '') : ''} onChange={(__v) => patchZeile(z.id, { mail_einleitung_vorlage: __v })} minHeight={120} />
                  </label>
                  <label className="field">
                    <span className="field-l">Mail-Betreff (Vorlage)</span>
                    <MockInput value={z.mail_betreff_vorlage ?? ''} onChange={(e) => patchZeile(z.id, { mail_betreff_vorlage: e.target.value })} />
                  </label>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <MockBtn kind="ghost" sm className="inline-flex gap-1.5" type="button" onClick={addZeile}>
          <MockIcon n="plus" ctx="default" className="h-3.5 w-3.5" aria-hidden />
          Abschlag hinzufügen
        </MockBtn>
        <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
          Auftragssumme netto {formatEurBetrag(gesamtNetto)} · brutto {formatEurBetrag(kontext.gesamtBrutto)}
        </p>
      </div>
      {!sumGate.ok ? (
        <p className="m-0 text-[length:var(--fs-meta)] font-medium text-bw-danger" role="alert">
          {sumGate.message}
        </p>
      ) : null}
    </div>
  )
}

'use client'

import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import type { RechnungWizardMeta } from '@/lib/rechnungen/rechnung-wizard-types'
import { cn, formatDatum } from '@/lib/utils'

export function RechnungWizardDetailsCard({
  meta,
  onMetaChange,
  onRechnungsdatumChange,
  zeigt13b,
  hinweis35aErlaubt,
  lohnNettoPdf,
  showMailFields = false,
}: {
  meta: RechnungWizardMeta
  onMetaChange: (patch: Partial<RechnungWizardMeta>) => void
  onRechnungsdatumChange: (value: string) => void
  zeigt13b: boolean
  hinweis35aErlaubt: boolean
  lohnNettoPdf: number
  showMailFields?: boolean
}) {
  const form = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span className="field-l">Rechnungsdatum</span>
          <Input
            type="date"
            value={meta.rechnungsdatum}
            onChange={(e) => onRechnungsdatumChange(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field-l">Fällig am</span>
          <Input
            type="date"
            value={meta.faellig_am}
            onChange={(e) => onMetaChange({ faellig_am: e.target.value })}
          />
        </label>
        <label className="field">
          <span className="field-l">Leistungszeitraum von</span>
          <Input
            type="date"
            value={meta.leistungszeitraum_von}
            onChange={(e) => onMetaChange({ leistungszeitraum_von: e.target.value })}
          />
        </label>
        <label className="field">
          <span className="field-l">Leistungszeitraum bis</span>
          <Input
            type="date"
            value={meta.leistungszeitraum_bis}
            onChange={(e) => onMetaChange({ leistungszeitraum_bis: e.target.value })}
          />
        </label>
      </div>
      <div className="space-y-2.5">
        <label
          className={cn(
            'flex cursor-pointer flex-wrap items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px]',
            hinweis35aErlaubt
              ? 'border-bw-border bg-bw-hover/30'
              : 'cursor-not-allowed border-bw-border/60 opacity-50'
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5"
            checked={meta.hinweis_35a}
            disabled={!hinweis35aErlaubt}
            onChange={(e) => onMetaChange({ hinweis_35a: e.target.checked })}
          />
          <span>
            <span className="font-medium">§ 35a EStG</span>
            <span className="mt-0.5 block text-[11px] text-bw-text-muted">
              Lohnkosten-Hinweis neben der Summenaufstellung
              {lohnNettoPdf > 0 ? ` (${formatEurBetrag(lohnNettoPdf)} netto)` : ''}
              {!hinweis35aErlaubt ? ' — nur bei Privatkunden und Lohnanteil > 0' : ''}
            </span>
          </span>
        </label>
        {zeigt13b ? (
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-bw-border bg-bw-hover/30 px-3 py-2.5 text-[13px]">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={meta.reverse_charge_13b}
              onChange={(e) => onMetaChange({ reverse_charge_13b: e.target.checked })}
            />
            <span>
              <span className="font-medium">§ 13b UStG (Reverse Charge)</span>
              <span className="mt-0.5 block text-[11px] text-bw-text-muted">
                Steuerschuldnerschaft Leistungsempfänger
              </span>
            </span>
          </label>
        ) : null}
      </div>
      <label className="field">
        <span className="field-l">Einleitung (PDF)</span>
        <Textarea
          rows={3}
          value={meta.einleitung}
          onChange={(e) => onMetaChange({ einleitung: e.target.value })}
        />
      </label>
      <label className="field">
        <span className="field-l">Zusätzliche Hinweise (PDF)</span>
        <Textarea
          rows={2}
          value={meta.hinweise}
          onChange={(e) => onMetaChange({ hinweise: e.target.value })}
        />
      </label>
      {showMailFields ? (
        <>
          <label className="field">
            <span className="field-l">Mail-Einleitung</span>
            <Textarea
              rows={3}
              value={meta.mail_einleitung}
              onChange={(e) => onMetaChange({ mail_einleitung: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="field-l">Mail-Betreff</span>
            <Input
              value={meta.mail_betreff}
              onChange={(e) => onMetaChange({ mail_betreff: e.target.value })}
            />
          </label>
        </>
      ) : null}
    </div>
  )

  const overview = (
    <dl className="space-y-2.5">
      <MobileOverviewField
        label="Rechnungsdatum"
        value={meta.rechnungsdatum ? formatDatum(meta.rechnungsdatum) : '—'}
      />
      <MobileOverviewField
        label="Fällig am"
        value={meta.faellig_am ? formatDatum(meta.faellig_am) : '—'}
      />
      <MobileOverviewField
        label="Leistungszeitraum"
        value={
          meta.leistungszeitraum_von || meta.leistungszeitraum_bis
            ? `${meta.leistungszeitraum_von ? formatDatum(meta.leistungszeitraum_von) : '—'} – ${
                meta.leistungszeitraum_bis ? formatDatum(meta.leistungszeitraum_bis) : '—'
              }`
            : '—'
        }
      />
      <MobileOverviewField
        label="§ 35a EStG"
        value={meta.hinweis_35a ? 'Aktiv' : 'Aus'}
      />
      {zeigt13b ? (
        <MobileOverviewField
          label="§ 13b Reverse Charge"
          value={meta.reverse_charge_13b ? 'Aktiv' : 'Aus'}
        />
      ) : null}
      <MobileOverviewField
        label="Einleitung"
        value={
          <span className="whitespace-pre-wrap text-bw-text-muted">
            {meta.einleitung.trim() || '—'}
          </span>
        }
      />
      <MobileOverviewField
        label="Hinweise"
        value={
          <span className="whitespace-pre-wrap text-bw-text-muted">
            {meta.hinweise.trim() || '—'}
          </span>
        }
      />
      {showMailFields ? (
        <>
          <MobileOverviewField
            label="Mail-Einleitung"
            value={
              <span className="whitespace-pre-wrap text-bw-text-muted">
                {meta.mail_einleitung.trim() || '—'}
              </span>
            }
          />
          <MobileOverviewField label="Mail-Betreff" value={meta.mail_betreff.trim() || '—'} />
        </>
      ) : null}
    </dl>
  )

  return (
    <Card title="Rechnungsdetails">
      <MobileEditableBlock sheetTitle="Rechnungsdetails" overview={overview}>
        {form}
      </MobileEditableBlock>
    </Card>
  )
}

'use client'

import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'
import type { RechnungWizardMeta } from '@/lib/rechnungen/rechnung-wizard-types'
import { formatDatum } from '@/lib/utils'

export function RechnungWizardDetailsCard({
  meta,
  onMetaChange,
  onRechnungsdatumChange,
  zeigt13b,
}: {
  meta: RechnungWizardMeta
  onMetaChange: (patch: Partial<RechnungWizardMeta>) => void
  onRechnungsdatumChange: (value: string) => void
  zeigt13b: boolean
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
      {zeigt13b ? (
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={meta.reverse_charge_13b}
            onChange={(e) => onMetaChange({ reverse_charge_13b: e.target.checked })}
          />
          <span>§ 13b UStG Reverse Charge (Steuerschuldnerschaft Leistungsempfänger)</span>
        </label>
      ) : null}
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

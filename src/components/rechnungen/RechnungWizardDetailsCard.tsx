'use client'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'

import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { useState } from 'react'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { DateInput } from '@/components/ui/DateInput'
import { Card } from '@/components/ui/Card'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'
import {
  Ustg13bHilfeSheet,
  Ustg13bHilfeTrigger,
} from '@/components/rechnungen/Ustg13bHilfeSheet'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import type { RechnungWizardMeta } from '@/lib/rechnungen/rechnung-wizard-types'
import { formatDatum } from '@/lib/utils'

export function RechnungWizardDetailsCard({
  meta,
  onMetaChange,
  onRechnungsdatumChange,
  lohnNettoPdf,
  showMailFields = false,
}: {
  meta: RechnungWizardMeta
  onMetaChange: (patch: Partial<RechnungWizardMeta>) => void
  onRechnungsdatumChange: (value: string) => void
  lohnNettoPdf: number
  showMailFields?: boolean
}) {
  const [ustg13bHilfeOpen, setUstg13bHilfeOpen] = useState(false)
  const form = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span className="field-l">Rechnungsdatum</span>
          <DateInput value={meta.rechnungsdatum} onChange={(e) => onRechnungsdatumChange(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-l">Fällig am</span>
          <DateInput value={meta.faellig_am} onChange={(e) => onMetaChange({ faellig_am: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-l">Leistungszeitraum von</span>
          <DateInput value={meta.leistungszeitraum_von} onChange={(e) => onMetaChange({ leistungszeitraum_von: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-l">Leistungszeitraum bis</span>
          <DateInput value={meta.leistungszeitraum_bis} onChange={(e) => onMetaChange({ leistungszeitraum_bis: e.target.value })} />
        </label>
      </div>
      <div className="space-y-2.5">
        <label className="flex cursor-pointer flex-wrap items-start gap-2 rounded-card border border-bw-border bg-bw-hover/30 px-3 py-2.5 text-[length:var(--fs-text)]">
          <MockCheckbox
            className="mt-0.5"
            checked={meta.hinweis_35a}
            onChange={(e) => onMetaChange({ hinweis_35a: e.target.checked })}
          />
          <span>
            <span className="font-medium">§ 35a EStG</span>
            <span className="mt-0.5 block text-[length:var(--fs-meta)] text-bw-text-muted">
              Lohnkosten-Hinweis neben der Summenaufstellung
              {lohnNettoPdf > 0 ? ` (${formatEurBetrag(lohnNettoPdf)} netto)` : ''}
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-2 rounded-card border border-bw-border bg-bw-hover/30 px-3 py-2.5 text-[length:var(--fs-text)]">
          <MockCheckbox
            className="mt-0.5"
            checked={meta.reverse_charge_13b}
            onChange={(e) => onMetaChange({ reverse_charge_13b: e.target.checked })}
          />
          <span>
            <span className="inline-flex items-center font-medium">
              § 13b UStG (Reverse Charge)
              <Ustg13bHilfeTrigger onOpen={() => setUstg13bHilfeOpen(true)} />
            </span>
            <span className="mt-0.5 block text-[length:var(--fs-meta)] text-bw-text-muted">
              Steuerschuldnerschaft Leistungsempfänger
            </span>
          </span>
        </label>
      </div>
      <label className="field">
        <span className="field-l">Einleitung (PDF)</span>
        <RichTextEditor value={typeof (meta.einleitung) === 'string' ? (meta.einleitung) : ''} onChange={(__v) => onMetaChange({ einleitung: __v })} minHeight={120} />
      </label>
      <label className="field">
        <span className="field-l">Zusätzliche Hinweise (PDF)</span>
        <RichTextEditor value={typeof (meta.hinweise) === 'string' ? (meta.hinweise) : ''} onChange={(__v) => onMetaChange({ hinweise: __v })} minHeight={120} />
      </label>
      {showMailFields ? (
        <>
          <label className="field">
            <span className="field-l">Mail-Einleitung</span>
            <RichTextEditor value={typeof (meta.mail_einleitung) === 'string' ? (meta.mail_einleitung) : ''} onChange={(__v) => onMetaChange({ mail_einleitung: __v })} minHeight={120} />
          </label>
          <label className="field">
            <span className="field-l">Mail-Betreff</span>
            <MockInput value={meta.mail_betreff} onChange={(e) => onMetaChange({ mail_betreff: e.target.value })} />
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
      <MobileOverviewField
        label="§ 13b Reverse Charge"
        value={meta.reverse_charge_13b ? 'Aktiv' : 'Aus'}
      />
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
    <>
      <Card title="Rechnungsdetails">
        <MobileEditableBlock sheetTitle="Rechnungsdetails" overview={overview}>
          {form}
        </MobileEditableBlock>
      </Card>
      <Ustg13bHilfeSheet
        open={ustg13bHilfeOpen}
        onClose={() => setUstg13bHilfeOpen(false)}
        variant="ausgang"
      />
    </>
  )
}

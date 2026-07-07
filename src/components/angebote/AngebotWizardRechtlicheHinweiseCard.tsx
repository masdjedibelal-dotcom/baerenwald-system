'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import type { AngebotWizardMeta } from '@/lib/angebote/angebot-wizard-types'
import { cn } from '@/lib/utils'

export function AngebotWizardRechtlicheHinweiseCard({
  meta,
  onMetaChange,
  hinweis35aErlaubt,
  hinweis13bErlaubt,
  lohnNettoPdf,
}: {
  meta: AngebotWizardMeta
  onMetaChange: (patch: Partial<AngebotWizardMeta>) => void
  hinweis35aErlaubt: boolean
  hinweis13bErlaubt: boolean
  lohnNettoPdf: number
}) {
  const form = (
    <div className="space-y-2.5">
      <label
        className={cn(
          'flex cursor-pointer flex-wrap items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px]',
          hinweis35aErlaubt ? 'border-bw-border bg-bw-hover/30' : 'cursor-not-allowed border-bw-border/60 opacity-50'
        )}
      >
        <input
          type="checkbox"
          checked={Boolean(meta.hinweis_35a)}
          disabled={!hinweis35aErlaubt}
          onChange={(e) => onMetaChange({ hinweis_35a: e.target.checked })}
        />
        <span>
          <span className="font-medium">§ 35a EStG</span>
          <span className="mt-0.5 block text-[11px] text-bw-text-muted">
            Lohnkosten-Hinweis für Privatkunden
            {lohnNettoPdf > 0 ? ` (${formatEurBetrag(lohnNettoPdf)} netto)` : ''}
            {!hinweis35aErlaubt ? ' — nur bei Privatkunden und Lohnanteil > 0' : ''}
          </span>
        </span>
      </label>
      <label
        className={cn(
          'flex cursor-pointer flex-wrap items-start gap-2 rounded-lg border px-3 py-2.5 text-[13px]',
          hinweis13bErlaubt ? 'border-bw-border bg-bw-hover/30' : 'cursor-not-allowed border-bw-border/60 opacity-50'
        )}
      >
        <input
          type="checkbox"
          checked={Boolean(meta.hinweis_13b)}
          disabled={!hinweis13bErlaubt}
          onChange={(e) => onMetaChange({ hinweis_13b: e.target.checked })}
        />
        <span>
          <span className="font-medium">§ 13b UStG (Reverse Charge)</span>
          <span className="mt-0.5 block text-[11px] text-bw-text-muted">
            Für Gewerbe / Hausverwaltung bei Bauleistungen — standardmäßig aus
            {!hinweis13bErlaubt ? ' — nur für Gewerbe- oder Hausverwaltungs-Kunden' : ''}
          </span>
        </span>
      </label>
    </div>
  )

  const overview = (
    <dl className="space-y-2.5">
      <MobileOverviewField
        label="§ 35a EStG"
        value={meta.hinweis_35a ? 'Aktiv' : 'Aus'}
      />
      <MobileOverviewField
        label="§ 13b UStG"
        value={meta.hinweis_13b ? 'Aktiv' : 'Aus'}
      />
    </dl>
  )

  return (
    <Card title="Rechtliche Hinweise im Angebots-PDF">
      <p className="wizard-inline-hint mb-3 hidden md:block">
        Steuer- und Bankdaten kommen aus den{' '}
        <Link href="/einstellungen" className="text-bw-primary underline">
          Firmeneinstellungen
        </Link>{' '}
        (USt-IdNr., Steuernummer, IBAN, BIC). Hinweise optional ein- oder ausblenden.
      </p>
      <MobileEditableBlock sheetTitle="Rechtliche Hinweise" overview={overview}>
        <p className="wizard-inline-hint mb-3 md:hidden">
          Steuer- und Bankdaten kommen aus den Firmeneinstellungen.
        </p>
        {form}
      </MobileEditableBlock>
    </Card>
  )
}

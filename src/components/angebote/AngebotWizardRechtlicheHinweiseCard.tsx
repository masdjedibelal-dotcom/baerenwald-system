'use client'

import { Card } from '@/components/ui/Card'
import { MockIcon } from '@/components/mock-ui/MockIcon'
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
  /** Im EditorSheet: Formular direkt (wie Rechnungswizard) */
  embedded = false,
}: {
  meta: AngebotWizardMeta
  onMetaChange: (patch: Partial<AngebotWizardMeta>) => void
  hinweis35aErlaubt: boolean
  hinweis13bErlaubt: boolean
  lohnNettoPdf: number
  embedded?: boolean
}) {
  const taxToggles = (
    <div className="rw-tax">
      {embedded ? (
        <div className="document-section__label" style={{ marginBottom: 10 }}>
          Steuerliche Hinweise
        </div>
      ) : null}
      <div className="rw-tax__list">
        <button
          type="button"
          className={meta.hinweis_35a ? 'rw-tax__opt on' : 'rw-tax__opt'}
          disabled={!hinweis35aErlaubt}
          onClick={() =>
            hinweis35aErlaubt && onMetaChange({ hinweis_35a: !meta.hinweis_35a })
          }
        >
          <span className="rw-tax__check" aria-hidden>
            {meta.hinweis_35a ? <MockIcon ctx="btn" n="check" size={12} /> : null}
          </span>
          <span className="rw-tax__txt">
            <span className="rw-tax__lab">§35a EStG-Hinweis ausweisen</span>
            <span className="rw-tax__sub">
              {lohnNettoPdf > 0
                ? `Lohnkostenanteil ${formatEurBetrag(lohnNettoPdf)} netto — steuerlich begünstigt`
                : 'Lohnkostenanteil für haushaltsnahe Handwerkerleistungen'}
              {!hinweis35aErlaubt ? ' — nur bei Privatkunden und Lohnanteil > 0' : ''}
            </span>
          </span>
        </button>
        <button
          type="button"
          className={meta.hinweis_13b ? 'rw-tax__opt on' : 'rw-tax__opt'}
          disabled={!hinweis13bErlaubt}
          onClick={() =>
            hinweis13bErlaubt && onMetaChange({ hinweis_13b: !meta.hinweis_13b })
          }
        >
          <span className="rw-tax__check" aria-hidden>
            {meta.hinweis_13b ? <MockIcon ctx="btn" n="check" size={12} /> : null}
          </span>
          <span className="rw-tax__txt">
            <span className="rw-tax__lab">Reverse-Charge (§13b UStG)</span>
            <span className="rw-tax__sub">
              Steuerschuldnerschaft des Leistungsempfängers
              {!hinweis13bErlaubt ? ' — nur für Gewerbe- oder Hausverwaltungs-Kunden' : ''}
            </span>
          </span>
        </button>
      </div>
    </div>
  )

  if (embedded) {
    return <div className="full">{taxToggles}</div>
  }

  const form = (
    <div className="space-y-2.5">
      <label
        className={cn(
          'flex cursor-pointer flex-wrap items-start gap-2 rounded-lg border px-3 py-2.5 text-[length:var(--fs-text)]',
          hinweis35aErlaubt
            ? 'border-bw-border bg-bw-hover/30'
            : 'cursor-not-allowed border-bw-border/60 opacity-50'
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
          <span className="mt-0.5 block text-[length:var(--fs-meta)] text-bw-text-muted">
            Lohnkosten-Hinweis für Privatkunden
            {lohnNettoPdf > 0 ? ` (${formatEurBetrag(lohnNettoPdf)} netto)` : ''}
            {!hinweis35aErlaubt ? ' — nur bei Privatkunden und Lohnanteil > 0' : ''}
          </span>
        </span>
      </label>
      <label
        className={cn(
          'flex cursor-pointer flex-wrap items-start gap-2 rounded-lg border px-3 py-2.5 text-[length:var(--fs-text)]',
          hinweis13bErlaubt
            ? 'border-bw-border bg-bw-hover/30'
            : 'cursor-not-allowed border-bw-border/60 opacity-50'
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
          <span className="mt-0.5 block text-[length:var(--fs-meta)] text-bw-text-muted">
            Für Gewerbe / Hausverwaltung bei Bauleistungen — standardmäßig aus
            {!hinweis13bErlaubt ? ' — nur für Gewerbe- oder Hausverwaltungs-Kunden' : ''}
          </span>
        </span>
      </label>
    </div>
  )

  const overview = (
    <dl className="space-y-2.5">
      <MobileOverviewField label="§ 35a EStG" value={meta.hinweis_35a ? 'Aktiv' : 'Aus'} />
      <MobileOverviewField label="§ 13b UStG" value={meta.hinweis_13b ? 'Aktiv' : 'Aus'} />
    </dl>
  )

  return (
    <Card title="Steuerliche Hinweise">
      <MobileEditableBlock sheetTitle="Steuerliche Hinweise" overview={overview}>
        {form}
      </MobileEditableBlock>
    </Card>
  )
}

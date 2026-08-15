'use client'

import { Card } from '@/components/ui/Card'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import type { AngebotWizardMeta } from '@/lib/angebote/angebot-wizard-types'
import { cn } from '@/lib/utils'

export function AngebotWizardRechtlicheHinweiseCard({
  meta,
  onMetaChange,
  lohnNettoPdf,
  /** Im EditorSheet: Formular direkt (wie Rechnungswizard) */
  embedded = false,
}: {
  meta: AngebotWizardMeta
  onMetaChange: (patch: Partial<AngebotWizardMeta>) => void
  lohnNettoPdf: number
  embedded?: boolean
}) {
  const taxToggles = (
    <div className="rw-tax">
      <div className="document-section__label" style={{ marginBottom: 10 }}>
        Steuerliche Hinweise
      </div>
      <div className="rw-tax__list">
        <button
          type="button"
          className={cn('rw-tax__opt', meta.hinweis_35a && 'on')}
          onClick={() => onMetaChange({ hinweis_35a: !meta.hinweis_35a })}
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
            </span>
          </span>
        </button>
        <button
          type="button"
          className={cn('rw-tax__opt', meta.hinweis_13b && 'on')}
          onClick={() => onMetaChange({ hinweis_13b: !meta.hinweis_13b })}
        >
          <span className="rw-tax__check" aria-hidden>
            {meta.hinweis_13b ? <MockIcon ctx="btn" n="check" size={12} /> : null}
          </span>
          <span className="rw-tax__txt">
            <span className="rw-tax__lab">Reverse-Charge (§13b UStG)</span>
            <span className="rw-tax__sub">Steuerschuldnerschaft des Leistungsempfängers</span>
          </span>
        </button>
      </div>
    </div>
  )

  if (embedded) {
    return <div className="full">{taxToggles}</div>
  }

  return <Card title="Steuerliche Hinweise">{taxToggles}</Card>
}

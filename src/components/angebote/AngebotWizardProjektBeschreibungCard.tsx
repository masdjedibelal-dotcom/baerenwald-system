'use client'

import { ListChecks } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'

export function AngebotWizardProjektBeschreibungCard({
  titel,
  onTitelChange,
  beschreibung,
  onBeschreibungChange,
  beschreibungPlaceholder,
  disabled,
}: {
  titel: string
  onTitelChange: (value: string) => void
  beschreibung: string
  onBeschreibungChange: (value: string) => void
  beschreibungPlaceholder: string
  disabled?: boolean
}) {
  const editFields = (
    <div className="wizard-projekt-beschreibung-fields space-y-3">
      <label className="wizard-projekt-field">
        <span className="wizard-projekt-field-label">
          Projekt-Titel <span className="text-red-600">*</span>
        </span>
        <input
          className="input"
          value={titel}
          onChange={(e) => onTitelChange(e.target.value)}
          placeholder="z. B. Badsanierung"
          disabled={disabled}
        />
        <p className="wizard-projekt-field-hint">Leistungsumfang im Angebotskopf (PDF)</p>
      </label>
      <div className="wizard-projekt-field">
        <span className="wizard-projekt-field-label">Beschreibung</span>
        <Textarea
          rows={4}
          value={beschreibung}
          onChange={(e) => onBeschreibungChange(e.target.value)}
          placeholder={beschreibungPlaceholder}
          disabled={disabled}
        />
        <p className="wizard-projekt-field-hint">Fließtext unter „Projektbeschreibung“ im PDF</p>
      </div>
    </div>
  )

  const overview = (
    <dl className="space-y-2.5">
      <MobileOverviewField label="Projekt-Titel" value={titel.trim() || '—'} />
      <MobileOverviewField
        label="Beschreibung"
        value={
          <span className="whitespace-pre-wrap text-bw-text-muted">
            {beschreibung.trim() || '—'}
          </span>
        }
      />
    </dl>
  )

  return (
    <Card
      className="wizard-projekt-beschreibung"
      title={
        <>
          <ListChecks className="h-3.5 w-3.5 shrink-0 text-bw-text-muted" aria-hidden />
          Projekt-Beschreibung
        </>
      }
    >
      <MobileEditableBlock
        sheetTitle="Projekt-Beschreibung"
        overview={overview}
        disabled={disabled}
      >
        {editFields}
      </MobileEditableBlock>
    </Card>
  )
}

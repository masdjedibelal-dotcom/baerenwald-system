'use client'

import { ListChecks } from 'lucide-react'
import { MockCard } from '@/components/mock-ui/MockCard'
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
    <MockCard className="wizard-projekt-beschreibung" title="Projekt-Beschreibung" icon="checks">
      <MobileEditableBlock
        sheetTitle="Projekt-Beschreibung"
        overview={overview}
        disabled={disabled}
      >
        {editFields}
      </MobileEditableBlock>
    </MockCard>
  )
}

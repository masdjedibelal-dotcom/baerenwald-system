'use client'

import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'
import { ZahlungsplanEditor } from '@/components/rechnungen/ZahlungsplanEditor'
import {
  ZAHLUNGSBEDINGUNGEN_LABELS,
  type AngebotWizardMeta,
} from '@/lib/angebote/angebot-wizard-types'
import {
  zahlungsplanVorlage50_50,
  zahlungsplanLabelFuerAngebot,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import { formatDatum } from '@/lib/utils'

export function AngebotWizardAngebotDetailsCard({
  meta,
  onMetaChange,
  dokumentTyp,
  todayYmd,
  zahlungsplan,
  onZahlungsplanChange,
  gesamtNetto,
}: {
  meta: AngebotWizardMeta
  onMetaChange: (patch: Partial<AngebotWizardMeta>) => void
  dokumentTyp: 'einfach' | 'projekt'
  todayYmd: string
  zahlungsplan?: Zahlungsplan | null
  onZahlungsplanChange?: (plan: Zahlungsplan) => void
  gesamtNetto?: number
}) {
  const zahlungLabel =
    ZAHLUNGSBEDINGUNGEN_LABELS[meta.zahlungsbedingungen] ?? meta.zahlungsbedingungen

  const planLabel = zahlungsplan ? zahlungsplanLabelFuerAngebot(zahlungsplan) : ''

  function handleZahlungChange(value: AngebotWizardMeta['zahlungsbedingungen']) {
    onMetaChange({ zahlungsbedingungen: value })
    if (value === 'abschlagsplan' && onZahlungsplanChange && !zahlungsplan?.zeilen.length) {
      onZahlungsplanChange(zahlungsplanVorlage50_50())
    }
    if (value === 'anzahlung_50' && onZahlungsplanChange) {
      onZahlungsplanChange(zahlungsplanVorlage50_50())
    }
  }

  const form = (
    <div className="space-y-2.5">
      <p className="wizard-inline-hint md:hidden">
        Änderungen werden beim Klick auf <strong>Weiter</strong> oder <strong>Speichern</strong> als
        Entwurf übernommen.
      </p>
      <label>
        <span className="input-label">Angebots-Titel *</span>
        <input
          className="input"
          value={meta.titel}
          onChange={(e) => onMetaChange({ titel: e.target.value })}
        />
      </label>
      <label>
        <span className="input-label">Gültig bis *</span>
        <input
          type="date"
          className="input"
          min={todayYmd}
          value={meta.gueltig_bis}
          onChange={(e) => onMetaChange({ gueltig_bis: e.target.value })}
        />
      </label>
      <Select
        label="Zahlungsbedingungen"
        name="zahlung"
        value={meta.zahlungsbedingungen}
        onChange={(e) =>
          handleZahlungChange(e.target.value as AngebotWizardMeta['zahlungsbedingungen'])
        }
        options={Object.entries(ZAHLUNGSBEDINGUNGEN_LABELS).map(([value, label]) => ({
          value,
          label,
        }))}
      />
      {(meta.zahlungsbedingungen === 'abschlagsplan' ||
        meta.zahlungsbedingungen === 'anzahlung_50') &&
      onZahlungsplanChange &&
      zahlungsplan &&
      gesamtNetto != null &&
      gesamtNetto > 0 ? (
        <div className="rounded-lg border border-bw-border p-3">
          <p className="mb-2 text-sm font-medium text-bw-text">Abschlagsplan</p>
          <ZahlungsplanEditor
            plan={zahlungsplan}
            onChange={onZahlungsplanChange}
            gesamtNetto={gesamtNetto}
            compact={meta.zahlungsbedingungen === 'anzahlung_50'}
            showVorlagen={meta.zahlungsbedingungen !== 'anzahlung_50'}
          />
        </div>
      ) : null}
      {dokumentTyp === 'einfach' ? (
        <label>
          <span className="input-label">Hinweise (optional)</span>
          <Textarea
            rows={2}
            value={meta.hinweise}
            onChange={(e) => onMetaChange({ hinweise: e.target.value })}
            placeholder="z. B. Fundamentarbeiten nicht enthalten"
          />
        </label>
      ) : null}
    </div>
  )

  const overview = (
    <dl className="space-y-2.5">
      <MobileOverviewField label="Angebots-Titel" value={meta.titel.trim() || '—'} />
      <MobileOverviewField
        label="Gültig bis"
        value={meta.gueltig_bis ? formatDatum(meta.gueltig_bis) : '—'}
      />
      <MobileOverviewField label="Zahlungsbedingungen" value={zahlungLabel} />
      {planLabel ? <MobileOverviewField label="Abschlagsplan" value={planLabel} /> : null}
      {dokumentTyp === 'einfach' ? (
        <MobileOverviewField label="Hinweise" value={meta.hinweise.trim() || '—'} />
      ) : null}
    </dl>
  )

  return (
    <Card title="Angebot-Details">
      <p className="wizard-inline-hint mb-3 hidden md:block">
        Änderungen aus Schritt 1 werden beim Klick auf <strong>Weiter</strong> oder{' '}
        <strong>Speichern</strong> in der Kopfzeile als Entwurf übernommen. Der Status steht oben neben
        der Anfrage-Nummer.
      </p>
      <MobileEditableBlock sheetTitle="Angebot-Details" overview={overview}>
        {form}
      </MobileEditableBlock>
    </Card>
  )
}

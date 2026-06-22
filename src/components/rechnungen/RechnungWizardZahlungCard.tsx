'use client'

import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'
import { ZahlungsplanEditor } from '@/components/rechnungen/ZahlungsplanEditor'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import type { RechnungWizardMeta, RechnungWizardZahlungsart } from '@/lib/rechnungen/rechnung-wizard-types'
import {
  standardRechnungZahlungstext,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import type { AngebotPosition } from '@/lib/types'

export function RechnungWizardZahlungCard({
  meta,
  onMetaChange,
  zahlungsplan,
  onZahlungsplanChange,
  gesamtNetto,
  zahlungszielTage,
  positionen,
  allowAbschlag = true,
}: {
  meta: RechnungWizardMeta
  onMetaChange: (patch: Partial<RechnungWizardMeta>) => void
  zahlungsplan: Zahlungsplan
  onZahlungsplanChange: (plan: Zahlungsplan) => void
  gesamtNetto: number
  zahlungszielTage: number
  positionen: AngebotPosition[]
  allowAbschlag?: boolean
}) {
  function setZahlungsart(art: RechnungWizardZahlungsart) {
    if (art === 'standard') {
      onMetaChange({
        zahlungsart: 'standard',
        abschlag_zeile_id: null,
        zahlungsbedingungen: standardRechnungZahlungstext(zahlungszielTage),
      })
      return
    }
    onMetaChange({
      zahlungsart: 'abschlaege',
      abschlag_zeile_id: null,
    })
  }

  const form = (
    <div className="space-y-4">
      <label className="field">
        <span className="field-l">Zahlungsweise</span>
        <Select
          value={meta.zahlungsart}
          onChange={(e) => setZahlungsart(e.target.value as RechnungWizardZahlungsart)}
          options={[
            { value: 'standard', label: `Zahlbar innerhalb von ${zahlungszielTage} Tagen` },
            ...(allowAbschlag
              ? [{ value: 'abschlaege' as const, label: 'Zahlung in Abschlägen' }]
              : []),
          ]}
        />
      </label>

      {meta.zahlungsart === 'abschlaege' ? (
        gesamtNetto > 0 ? (
          <ZahlungsplanEditor
            plan={zahlungsplan}
            onChange={onZahlungsplanChange}
            gesamtNetto={gesamtNetto}
            showLeistungsAuswahl
            positionen={positionen}
          />
        ) : null
      ) : null}

      <label className="field">
        <span className="field-l">Zahlungsbedingungen / Beschreibung (auf der Rechnung)</span>
        <Textarea
          rows={meta.zahlungsart === 'abschlaege' ? 6 : 2}
          value={meta.zahlungsbedingungen}
          onChange={(e) => onMetaChange({ zahlungsbedingungen: e.target.value })}
          placeholder="Beschreibung der Leistung und Zahlungsmodalitäten…"
        />
      </label>
    </div>
  )

  const overview = (
    <dl className="space-y-2.5">
      <MobileOverviewField
        label="Zahlungsweise"
        value={meta.zahlungsart === 'abschlaege' ? 'Abschläge' : `Zahlungsziel ${zahlungszielTage} Tage`}
      />
      <MobileOverviewField
        label="Zahlungsbedingungen"
        value={
          <span className="whitespace-pre-wrap text-bw-text-muted">
            {meta.zahlungsbedingungen.trim() || '—'}
          </span>
        }
      />
    </dl>
  )

  return (
    <Card title="Zahlungsbedingungen">
      <MobileEditableBlock sheetTitle="Zahlungsbedingungen" overview={overview}>
        {form}
      </MobileEditableBlock>
    </Card>
  )
}

/** Versand-Schritt: Auswahl welche Abschlagsrechnung verschickt wird. */
export function RechnungWizardVersandAuswahlCard({
  rechnungen,
  versandRechnungId,
  onVersandRechnungChange,
}: {
  rechnungen: Array<{
    id: string
    rechnungsnummer: string
    rechnungArt: 'abschlag' | 'schluss'
    index: number
    titel: string
    brutto: number
  }>
  versandRechnungId: string | null
  onVersandRechnungChange: (id: string) => void
}) {
  if (!rechnungen.length) return null

  return (
    <Card title="Rechnung zum Versand">
      <label className="field">
        <span className="field-l">Diese Rechnung wird jetzt verschickt</span>
        <Select
          value={versandRechnungId ?? ''}
          onChange={(e) => onVersandRechnungChange(e.target.value)}
          options={rechnungen.map((r) => ({
            value: r.id,
            label:
              r.rechnungArt === 'schluss'
                ? `Schlussrechnung — ${r.titel} (${formatEurBetrag(r.brutto)} brutto)`
                : `Abschlagsrechnung ${r.index} — ${r.titel} (${formatEurBetrag(r.brutto)} brutto)`,
          }))}
        />
      </label>
    </Card>
  )
}

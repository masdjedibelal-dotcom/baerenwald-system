'use client'

import { MockField } from '@/components/mock-ui/MockForm'
import { Card } from '@/components/ui/Card'
import { Combobox } from '@/components/ui/Combobox'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'
import { ZahlungsplanEditor } from '@/components/rechnungen/ZahlungsplanEditor'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import type { RechnungWizardMeta, RechnungWizardZahlungsart } from '@/lib/rechnungen/rechnung-wizard-types'
import {
  standardRechnungZahlungstext,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import type { AngebotPosition } from '@/lib/types'
import { fachbegriff } from '@/lib/crm/fachbegriffe'

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
        <Combobox options={[
            { value: 'standard', label: `Zahlbar innerhalb von ${zahlungszielTage} Tagen` },
            ...(allowAbschlag
              ? [{ value: 'abschlaege' as const, label: 'Zahlung in Abschlägen' }]
              : []),
          ]} value={meta.zahlungsart == null ? '' : String(meta.zahlungsart)} placeholder="Auswählen…" onChange={(next) => { setZahlungsart(next as RechnungWizardZahlungsart); }} />
      </label>

      {meta.zahlungsart === 'abschlaege' ? (
        <p className="text-[length:var(--fs-meta)] text-bw-text-muted" title={fachbegriff('satellit')}>
          {fachbegriff('abschlag')}
        </p>
      ) : null}

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
        <RichTextEditor value={typeof (meta.zahlungsbedingungen) === 'string' ? (meta.zahlungsbedingungen) : ''} onChange={(__v) => onMetaChange({ zahlungsbedingungen: __v })} placeholder="Beschreibung der Leistung und Zahlungsmodalitäten…" minHeight={Math.max((meta.zahlungsart === 'abschlaege' ? 6 : 2) * 24, 120)} aria-label="Beschreibung der Leistung und Zahlungsmodalitäten…" />
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
        <Combobox options={rechnungen.map((r) => ({
            value: r.id,
            label:
              r.rechnungArt === 'schluss'
                ? `Schlussrechnung — ${r.titel} (${formatEurBetrag(r.brutto)} brutto)`
                : `Abschlagsrechnung ${r.index} — ${r.titel} (${formatEurBetrag(r.brutto)} brutto)`,
          }))} value={versandRechnungId ?? '' == null ? '' : String(versandRechnungId ?? '')} placeholder="Auswählen…" onChange={(next) => { onVersandRechnungChange(next); }} />
      </label>
    </Card>
  )
}

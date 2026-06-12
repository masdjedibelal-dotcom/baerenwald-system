'use client'

import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'
import { ZahlungsplanEditor } from '@/components/rechnungen/ZahlungsplanEditor'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import type { RechnungWizardMeta, RechnungWizardZahlungsart } from '@/lib/rechnungen/rechnung-wizard-types'
import {
  abschlagBereitsAbgerechnet,
  abschlagZahlungstextFuerRechnung,
  berechneZahlungsplan,
  standardRechnungZahlungstext,
  type RechnungAbschlagLink,
  type Zahlungsplan,
  type ZahlungsplanZeileBerechnet,
} from '@/lib/rechnungen/zahlungsplan'

export function RechnungWizardZahlungCard({
  meta,
  onMetaChange,
  zahlungsplan,
  onZahlungsplanChange,
  gesamtNetto,
  zahlungszielTage,
  rechnungen,
  aktuelleZeile,
}: {
  meta: RechnungWizardMeta
  onMetaChange: (patch: Partial<RechnungWizardMeta>) => void
  zahlungsplan: Zahlungsplan
  onZahlungsplanChange: (plan: Zahlungsplan) => void
  gesamtNetto: number
  zahlungszielTage: number
  rechnungen: RechnungAbschlagLink[]
  aktuelleZeile: ZahlungsplanZeileBerechnet | null
}) {
  const kontext = berechneZahlungsplan(zahlungsplan, gesamtNetto)

  function setZahlungsart(art: RechnungWizardZahlungsart) {
    if (art === 'standard') {
      onMetaChange({
        zahlungsart: 'standard',
        abschlag_zeile_id: null,
        zahlungsbedingungen: standardRechnungZahlungstext(zahlungszielTage),
      })
      return
    }
    const zeile =
      kontext.zeilen.find((z) => z.id === meta.abschlag_zeile_id) ??
      kontext.zeilen.find((z) => !abschlagBereitsAbgerechnet(z.id, rechnungen)) ??
      kontext.zeilen[0] ??
      null
    onMetaChange({
      zahlungsart: 'abschlaege',
      abschlag_zeile_id: zeile?.id ?? null,
      zahlungsbedingungen: abschlagZahlungstextFuerRechnung(
        zahlungsplan,
        gesamtNetto,
        zahlungszielTage
      ),
    })
  }

  function setAbschlagZeile(zeileId: string) {
    onMetaChange({
      abschlag_zeile_id: zeileId,
      zahlungsbedingungen: abschlagZahlungstextFuerRechnung(
        zahlungsplan,
        gesamtNetto,
        zahlungszielTage
      ),
    })
  }

  function onPlanChange(plan: Zahlungsplan) {
    onZahlungsplanChange(plan)
    if (meta.zahlungsart !== 'abschlaege') return
    const nextKontext = berechneZahlungsplan(plan, gesamtNetto)
    const zeile =
      nextKontext.zeilen.find((z) => z.id === meta.abschlag_zeile_id) ??
      nextKontext.zeilen.find((z) => !abschlagBereitsAbgerechnet(z.id, rechnungen)) ??
      nextKontext.zeilen[0] ??
      null
    onMetaChange({
      abschlag_zeile_id: zeile?.id ?? null,
      zahlungsbedingungen: abschlagZahlungstextFuerRechnung(plan, gesamtNetto, zahlungszielTage),
    })
  }

  const abschlagOptions = kontext.zeilen
    .filter(
      (z) =>
        !abschlagBereitsAbgerechnet(z.id, rechnungen) || z.id === meta.abschlag_zeile_id
    )
    .map((z) => ({
      value: z.id,
      label: z.istSchluss
        ? `Schlussrechnung — ${z.titel} (${formatEurBetrag(z.brutto)} brutto)`
        : `Abschlag ${z.index} — ${z.titel} (${formatEurBetrag(z.brutto)} brutto)`,
    }))

  const form = (
    <div className="space-y-4">
      <label className="field">
        <span className="field-l">Zahlungsweise</span>
        <Select
          value={meta.zahlungsart}
          onChange={(e) => setZahlungsart(e.target.value as RechnungWizardZahlungsart)}
          options={[
            { value: 'standard', label: `Zahlbar innerhalb von ${zahlungszielTage} Tagen` },
            { value: 'abschlaege', label: 'Zahlung in Abschlägen' },
          ]}
        />
      </label>

      {meta.zahlungsart === 'abschlaege' ? (
        <>
          <p className="text-sm text-bw-text-muted">
            Die Leistungspositionen bleiben unverändert. Der Abschlagsplan erscheint unten auf der
            Rechnung statt des Standard-Zahlungstextes.
          </p>
          {gesamtNetto > 0 ? (
            <ZahlungsplanEditor
              plan={zahlungsplan}
              onChange={onPlanChange}
              gesamtNetto={gesamtNetto}
            />
          ) : null}
          <label className="field">
            <span className="field-l">Diese Rechnung stellt dar</span>
            <Select
              value={meta.abschlag_zeile_id ?? ''}
              onChange={(e) => setAbschlagZeile(e.target.value)}
              options={
                abschlagOptions.length
                  ? abschlagOptions
                  : [{ value: '', label: 'Kein Abschlag verfügbar' }]
              }
            />
          </label>
          {aktuelleZeile ? (
            <div className="rounded-lg border border-bw-border bg-bw-surface px-3 py-2 text-sm">
              <p className="font-medium text-bw-text">
                {aktuelleZeile.istSchluss
                  ? `Schlussrechnung — ${aktuelleZeile.titel}`
                  : `Abschlag ${aktuelleZeile.index} — ${aktuelleZeile.titel}`}
              </p>
              <p className="mt-0.5 tabular-nums text-bw-text-muted">
                Plan: {formatEurBetrag(aktuelleZeile.netto)} netto /{' '}
                {formatEurBetrag(aktuelleZeile.brutto)} brutto · Auftragssumme{' '}
                {formatEurBetrag(gesamtNetto)} netto
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      <label className="field">
        <span className="field-l">Zahlungsbedingungen (auf der Rechnung)</span>
        <Textarea
          rows={meta.zahlungsart === 'abschlaege' ? 6 : 2}
          value={meta.zahlungsbedingungen}
          onChange={(e) => onMetaChange({ zahlungsbedingungen: e.target.value })}
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
      {aktuelleZeile && meta.zahlungsart === 'abschlaege' ? (
        <MobileOverviewField
          label="Rechnungsbetrag"
          value={`${formatEurBetrag(aktuelleZeile.brutto)} brutto`}
        />
      ) : null}
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

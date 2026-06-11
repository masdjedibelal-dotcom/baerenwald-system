'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  berechneZahlungsplan,
  neueZahlungsplanZeile,
  zahlungsplanVorlage30_70,
  zahlungsplanVorlage3x,
  zahlungsplanVorlage50_50,
  type Zahlungsplan,
  type ZahlungsplanAbschlagTyp,
  type ZahlungsplanZeile,
} from '@/lib/rechnungen/zahlungsplan'

export function ZahlungsplanEditor({
  plan,
  onChange,
  gesamtNetto,
  mwstSatz = 19,
  compact = false,
  showTextVorlagen = false,
}: {
  plan: Zahlungsplan
  onChange: (plan: Zahlungsplan) => void
  gesamtNetto: number
  mwstSatz?: number
  compact?: boolean
  showTextVorlagen?: boolean
}) {
  const kontext = berechneZahlungsplan(plan, gesamtNetto, mwstSatz)

  function patchZeile(id: string, patch: Partial<ZahlungsplanZeile>) {
    onChange({
      ...plan,
      modus: 'abschlagsplan',
      zeilen: plan.zeilen.map((z) => (z.id === id ? { ...z, ...patch } : z)),
    })
  }

  function addZeile() {
    const restIdx = plan.zeilen.findIndex((z) => z.typ === 'rest')
    const neue = neueZahlungsplanZeile({ titel: 'Abschlag', typ: 'prozent', wert: 20 })
    if (restIdx >= 0) {
      const zeilen = [...plan.zeilen]
      zeilen.splice(restIdx, 0, neue)
      onChange({ ...plan, modus: 'abschlagsplan', zeilen })
    } else {
      onChange({ ...plan, modus: 'abschlagsplan', zeilen: [...plan.zeilen, neue] })
    }
  }

  function removeZeile(id: string) {
    const next = plan.zeilen.filter((z) => z.id !== id)
    onChange({ ...plan, modus: 'abschlagsplan', zeilen: next.length ? next : [neueZahlungsplanZeile()] })
  }

  function setVorlage(vorlage: Zahlungsplan) {
    onChange(vorlage)
  }

  return (
    <div className="space-y-3">
      {!compact ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setVorlage(zahlungsplanVorlage50_50())}>
            50 / 50
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setVorlage(zahlungsplanVorlage30_70())}>
            30 / 70
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setVorlage(zahlungsplanVorlage3x())}>
            3 Abschläge
          </button>
        </div>
      ) : null}

      <ul className="m-0 list-none space-y-3 p-0">
        {kontext.zeilen.map((z) => (
          <li key={z.id} className="rounded-lg border border-bw-border bg-[var(--app-card)] p-3">
            <div className="grid gap-2 sm:grid-cols-12 sm:items-end">
              <label className="field sm:col-span-4">
                <span className="field-l">Titel</span>
                <Input value={z.titel} onChange={(e) => patchZeile(z.id, { titel: e.target.value })} />
              </label>
              <div className="sm:col-span-3">
                <Select
                  label="Art"
                  name={`typ-${z.id}`}
                  value={z.typ}
                  onChange={(e) =>
                    patchZeile(z.id, { typ: e.target.value as ZahlungsplanAbschlagTyp })
                  }
                  options={[
                    { value: 'prozent', label: 'Prozent' },
                    { value: 'betrag', label: 'Betrag netto' },
                    { value: 'rest', label: 'Restbetrag' },
                  ]}
                />
              </div>
              <label className="field sm:col-span-3">
                <span className="field-l">{z.typ === 'rest' ? 'Rest' : z.typ === 'prozent' ? 'Prozent' : 'Betrag'}</span>
                <Input
                  type="number"
                  min={0}
                  step={z.typ === 'prozent' ? 1 : 0.01}
                  disabled={z.typ === 'rest'}
                  value={z.typ === 'rest' ? '' : z.wert}
                  placeholder={z.typ === 'rest' ? 'automatisch' : undefined}
                  onChange={(e) => patchZeile(z.id, { wert: Number(e.target.value) || 0 })}
                />
              </label>
              <div className="flex items-end justify-between gap-2 sm:col-span-2">
                <div className="text-xs text-bw-text-muted">
                  <div>netto {formatEurBetrag(z.netto)}</div>
                  <div>brutto {formatEurBetrag(z.brutto)}</div>
                </div>
                {plan.zeilen.length > 1 && z.typ !== 'rest' ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm shrink-0 text-bw-danger"
                    onClick={() => removeZeile(z.id)}
                    aria-label="Zeile entfernen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            {showTextVorlagen ? (
              <div className="mt-3 grid gap-2 border-t border-bw-border pt-3">
                <label className="field">
                  <span className="field-l">PDF-Einleitung (Vorlage)</span>
                  <Textarea
                    rows={2}
                    value={z.pdf_einleitung_vorlage ?? ''}
                    onChange={(e) => patchZeile(z.id, { pdf_einleitung_vorlage: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-l">Mail-Einleitung (Vorlage)</span>
                  <Textarea
                    rows={2}
                    value={z.mail_einleitung_vorlage ?? ''}
                    onChange={(e) => patchZeile(z.id, { mail_einleitung_vorlage: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-l">Mail-Betreff (Vorlage)</span>
                  <Input
                    value={z.mail_betreff_vorlage ?? ''}
                    onChange={(e) => patchZeile(z.id, { mail_betreff_vorlage: e.target.value })}
                  />
                </label>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className="btn btn-secondary btn-sm inline-flex gap-1.5" onClick={addZeile}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Abschlag hinzufügen
        </button>
        <p className="text-xs text-bw-text-muted">
          Auftragssumme netto {formatEurBetrag(gesamtNetto)} · brutto {formatEurBetrag(kontext.gesamtBrutto)}
        </p>
      </div>
    </div>
  )
}

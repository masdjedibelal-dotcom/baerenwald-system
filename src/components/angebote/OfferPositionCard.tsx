'use client'

import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { EuroNettoInput } from '@/components/ui/EuroNettoInput'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { cn } from '@/lib/utils'
import type { Gewerk, Handwerker, Preisliste } from '@/lib/types'

export type OfferPositionRow = {
  key: string
  gewerk_id: string
  preisliste_id: string
  leistung: string
  beschreibung: string
  einheit: string
  menge: number
  lohn_netto: number
  material_netto: number
  einkaufspreis: number | ''
  handwerker_id: string
  notiz_intern: string
  notiz_extern: string
  guInternOpen: boolean
}

type GewerkOption = { value: string; label: string }

type Props = {
  index: number
  row: OfferPositionRow
  gewerkSelectOptions: GewerkOption[]
  preislistenForGewerk: Preisliste[]
  handwerkerForGewerk: Handwerker[]
  selectedHandwerker: Handwerker | null
  hervorhebePreise: boolean
  onGewerkChange: (gewerkId: string) => void
  onPreislisteChange: (preislisteId: string) => void
  onPatch: (patch: Partial<OfferPositionRow>) => void
  onRemove: () => void
}

function hwLabel(h: Handwerker): string {
  const name = h.name?.trim() || '—'
  const firma = h.firma?.trim()
  return firma ? `${name} | ${firma}` : name
}

export function OfferPositionCard({
  index,
  row,
  gewerkSelectOptions,
  preislistenForGewerk,
  handwerkerForGewerk,
  selectedHandwerker,
  hervorhebePreise,
  onGewerkChange,
  onPreislisteChange,
  onPatch,
  onRemove,
}: Props) {
  const m = Number(row.menge) || 1
  const nettoStueck = (Number(row.lohn_netto) || 0) + (Number(row.material_netto) || 0)
  const nettoZeile = nettoStueck * m
  const ek =
    row.einkaufspreis === '' ? null : Number(row.einkaufspreis)
  const ekZeile = ek != null && Number.isFinite(ek) && ek > 0 ? ek * m : null
  const margeEuro = ekZeile != null ? nettoZeile - ekZeile : null
  const margePct =
    margeEuro != null && nettoZeile > 0
      ? Math.round((margeEuro / nettoZeile) * 1000) / 10
      : null

  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border border-bw-border bg-bw-card shadow-sm',
        'ring-1 ring-black/[0.02]'
      )}
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-bw-border bg-bw-hover/40 px-3 py-2.5 sm:px-4">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary"
          aria-hidden
        >
          {index + 1}
        </span>
        <label className="min-w-[140px] flex-1 space-y-0.5">
          <span className="sr-only">Gewerk</span>
          <select
            value={row.gewerk_id}
            onChange={(e) => onGewerkChange(e.target.value)}
            className="w-full min-h-[40px] rounded-lg border border-bw-border bg-surface px-2.5 text-sm font-medium text-ink focus:border-primary focus:ring-2 focus:ring-primary"
          >
            {gewerkSelectOptions.map((o) => (
              <option key={o.value || '_'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[160px] flex-[2] space-y-0.5">
          <span className="sr-only">Leistung</span>
          <select
            value={row.preisliste_id}
            onChange={(e) => onPreislisteChange(e.target.value)}
            disabled={!row.gewerk_id}
            className="w-full min-h-[40px] rounded-lg border border-bw-border bg-surface px-2.5 text-sm text-ink focus:border-primary focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            <option value="">Leistung wählen</option>
            {preislistenForGewerk.map((p) => (
              <option key={p.id} value={p.id}>
                {p.leistung}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="ml-auto inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-danger hover:bg-danger/10"
          aria-label="Position löschen"
          onClick={onRemove}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </header>

      <div className="grid gap-4 p-3 sm:grid-cols-2 sm:p-4">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-bw-light">Kalkulation (Kundensicht)</p>
          <div
            className={cn(
              'rounded-lg border border-bw-border bg-bw-hover/30 p-3',
              hervorhebePreise && 'ring-1 ring-amber-300'
            )}
          >
            {hervorhebePreise ? (
              <p className="mb-2 text-xs font-medium text-amber-950">Preis prüfen (Vorlage/Kopie).</p>
            ) : null}
            <p className="mb-2 text-xs font-medium text-bw-text-mid">Lohn (netto / Einheit)</p>
            <EuroNettoInput
              value={row.lohn_netto}
              onChange={(lohn_netto) => onPatch({ lohn_netto })}
            />
          </div>
          <div className="rounded-lg border border-bw-border bg-bw-hover/30 p-3">
            <p className="mb-2 text-xs font-medium text-bw-text-mid">Material (netto / Einheit)</p>
            <EuroNettoInput
              value={row.material_netto}
              onChange={(material_netto) => onPatch({ material_netto })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Menge"
              type="number"
              min={0.01}
              step={0.1}
              value={row.menge}
              onChange={(e) => onPatch({ menge: Number(e.target.value) || 1 })}
            />
            <Input
              label="Einheit"
              value={row.einheit}
              onChange={(e) => onPatch({ einheit: e.target.value })}
            />
          </div>
          <Textarea
            label="Beschreibung (Kundentext)"
            hint="Wird im Angebot / PDF angezeigt"
            value={row.beschreibung}
            onChange={(e) => onPatch({ beschreibung: e.target.value })}
            rows={2}
          />
        </div>

        <div className="space-y-3 border-t border-bw-border pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-bw-light">Ausführung</p>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-ink">Zugeordneter Handwerker</span>
            <select
              value={row.handwerker_id}
              onChange={(e) => onPatch({ handwerker_id: e.target.value })}
              disabled={!row.gewerk_id}
              className="w-full min-h-[44px] rounded-lg border border-bw-border bg-surface px-3 text-sm text-ink focus:border-primary focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="">— Keine Zuordnung —</option>
              {handwerkerForGewerk.map((h) => (
                <option key={h.id} value={h.id}>
                  {hwLabel(h)}
                </option>
              ))}
            </select>
          </label>
          {selectedHandwerker ? (
            <p className="text-xs text-bw-text-muted">
              {[selectedHandwerker.telefon, selectedHandwerker.email].filter(Boolean).join(' · ') ||
                'Keine Kontaktdaten hinterlegt.'}
            </p>
          ) : null}

          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-dashed border-bw-border bg-bw-hover/30 px-3 py-2 text-left text-sm font-medium text-ink hover:bg-bw-hover/60"
            onClick={() => onPatch({ guInternOpen: !row.guInternOpen })}
          >
            <span>GU-Intern</span>
            {row.guInternOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
            )}
          </button>
          {row.guInternOpen ? (
            <div className="space-y-3 rounded-lg border border-dashed border-bw-border bg-bw-bg/80 p-3">
              <Input
                label="Einkaufspreis (EK / Einheit)"
                type="number"
                min={0}
                step={5}
                value={row.einkaufspreis === '' ? '' : String(row.einkaufspreis)}
                onChange={(e) => {
                  const v = e.target.value
                  onPatch({ einkaufspreis: v === '' ? '' : Number(v) })
                }}
              />
              {ekZeile != null ? (
                <p className="text-xs text-bw-text-muted">
                  Marge (Zeile):{' '}
                  <span className="font-medium text-ink">
                    {margeEuro != null ? `${margeEuro.toLocaleString('de-DE')} €` : '—'}
                  </span>
                  {margePct != null ? (
                    <span className="text-bw-text-muted"> ({margePct} % vom Netto)</span>
                  ) : null}
                </p>
              ) : (
                <p className="text-xs text-bw-text-muted">EK eintragen für Marge-Hinweis.</p>
              )}
              <Textarea
                label="Notiz intern"
                value={row.notiz_intern}
                onChange={(e) => onPatch({ notiz_intern: e.target.value })}
                rows={2}
              />
            </div>
          ) : null}

          <Textarea
            label="Notiz für Kunden"
            value={row.notiz_extern}
            onChange={(e) => onPatch({ notiz_extern: e.target.value })}
            rows={2}
          />
        </div>
      </div>

      <footer className="border-t border-bw-border bg-bw-hover/25 px-3 py-2.5 sm:px-4">
        <p className="text-right text-sm font-bold text-ink">
          Gesamtpreis Position:{' '}
          <span className="tabular-nums">{nettoZeile.toLocaleString('de-DE')}</span> € netto
        </p>
      </footer>
    </article>
  )
}

export function gewerkOptionsFromList(gewerke: Gewerk[]): GewerkOption[] {
  return [
    { value: '', label: 'Gewerk wählen' },
    ...gewerke.filter((g) => g.aktiv).map((g) => ({ value: g.id, label: g.name })),
  ]
}

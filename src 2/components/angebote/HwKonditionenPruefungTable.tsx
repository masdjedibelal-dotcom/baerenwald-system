'use client'

/**
 * @deprecated Konditionen-Tabelle — nicht mehr im v3 Leistungen-Tab. Für Legacy/Angebot.
 */
import { cn } from '@/lib/utils'
import { betragAnzeige } from '@/lib/angebot-einfach'
import type { AngebotHandwerkerRow } from '@/lib/types'
import {
  hwKonditionDelta,
  hwKonditionenArtBadgeClass,
  hwKonditionenArtLabel,
  parseHwKonditionen,
  summeHwKonditionBrutto,
  summeHwKonditionNetto,
} from '@/lib/partner/hw-konditionen'

function deltaAnzeige(delta: number | null): string {
  if (delta == null) return '—'
  const prefix = delta > 0 ? '+' : ''
  return `${prefix}${betragAnzeige(delta, null, null)}`
}

export function HwKonditionenPruefungTable({
  z,
}: {
  z: Pick<
    AngebotHandwerkerRow,
    'hw_konditionen' | 'hw_preis_netto' | 'hw_preis_brutto'
  >
}) {
  const konditionen = parseHwKonditionen(z.hw_konditionen)
  if (!konditionen) return null

  const summeEk = summeHwKonditionNetto(konditionen.positionen, 'ek_netto')
  const summeHw = summeHwKonditionNetto(konditionen.positionen, 'hw_netto')
  const summeBrutto =
    z.hw_preis_brutto != null && z.hw_preis_brutto > 0
      ? z.hw_preis_brutto
      : summeHwKonditionBrutto(konditionen.positionen)
  const summeNetto =
    z.hw_preis_netto != null && z.hw_preis_netto > 0 ? z.hw_preis_netto : summeHw

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-bw-text-muted">Konditionen je Leistung</span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            hwKonditionenArtBadgeClass(konditionen.art)
          )}
        >
          {hwKonditionenArtLabel(konditionen.art)}
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border border-bw-border">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-bw-border bg-bw-bg-soft/60 text-left text-bw-text-muted">
              <th className="px-2 py-1.5 font-medium">Leistung</th>
              <th className="px-2 py-1.5 font-medium text-right">Vorschlag netto</th>
              <th className="px-2 py-1.5 font-medium text-right">Vergütung netto</th>
              <th className="px-2 py-1.5 font-medium text-right">Δ</th>
              <th className="px-2 py-1.5 font-medium text-center">Geändert</th>
            </tr>
          </thead>
          <tbody>
            {konditionen.positionen.map((p, i) => {
              const delta = hwKonditionDelta(p.ek_netto, p.hw_netto)
              return (
                <tr
                  key={p.position_id || `${p.leistung}-${i}`}
                  className={cn(
                    'border-b border-bw-border/60',
                    p.geaendert && 'bg-amber-50/90'
                  )}
                >
                  <td className="px-2 py-1.5 text-bw-text">
                    <span className="font-medium">{p.leistung}</span>
                    {p.beschreibung ? (
                      <span className="mt-0.5 block text-bw-text-muted">{p.beschreibung}</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {p.ek_netto != null && p.ek_netto > 0
                      ? betragAnzeige(p.ek_netto, null, null)
                      : 'Preis folgt'}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {betragAnzeige(p.hw_netto, null, null)}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-1.5 text-right tabular-nums',
                      delta != null && delta > 0 && 'text-amber-800',
                      delta != null && delta < 0 && 'text-emerald-800'
                    )}
                  >
                    {deltaAnzeige(delta)}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {p.geaendert ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-950">Ja</span>
                    ) : (
                      <span className="text-bw-text-muted">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-bw-bg-soft/40 font-medium text-bw-text">
              <td className="px-2 py-1.5">Gesamt</td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {summeEk > 0 ? betragAnzeige(summeEk, null, null) : '—'}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {betragAnzeige(summeNetto, null, null)}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {summeEk > 0 ? deltaAnzeige(summeHw - summeEk) : '—'}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-bw-text-muted">
        Nach Übernahme gilt je Leistung ein vereinbarter Netto-Preis (Einkaufspreis = Vergütung).
        Summe brutto: {betragAnzeige(summeBrutto, null, null)}
      </p>
    </div>
  )
}

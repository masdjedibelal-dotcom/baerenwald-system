'use client'

import { Percent, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  formatEurBetrag,
  gesamtrabattBetrag,
  getGesamtrabattZeile,
  neueGesamtrabattZeile,
  setGesamtrabattInZeilen,
  summeArtikelNetto,
  type DokumentGesamtrabattZeile,
  type DokumentZeile,
} from '@/lib/dokument-zeilen'
import { cn } from '@/lib/utils'

type Props = {
  zeilen: DokumentZeile[]
  onChange: (next: DokumentZeile[]) => void
  className?: string
  /** lex = Rechnung/Lexoffice-Zeilen, wizard = Angebots-Wizard unter Summen */
  variant?: 'lex' | 'wizard'
}

export function DokumentGesamtrabattPanel({
  zeilen,
  onChange,
  className,
  variant = 'wizard',
}: Props) {
  const artikelNetto = summeArtikelNetto(zeilen)
  const rabatt = getGesamtrabattZeile(zeilen)
  const abzug = gesamtrabattBetrag(zeilen, artikelNetto)
  const nettoNachRabatt = Math.round((artikelNetto - abzug) * 100) / 100

  function patchRabatt(patch: Partial<DokumentGesamtrabattZeile>) {
    onChange(setGesamtrabattInZeilen(zeilen, patch))
  }

  function removeRabatt() {
    onChange(setGesamtrabattInZeilen(zeilen, null))
  }

  function addRabatt() {
    onChange(setGesamtrabattInZeilen(zeilen, neueGesamtrabattZeile({ bezeichnung: 'Rabatt' })))
  }

  if (variant === 'lex') {
    if (!rabatt) {
      return (
        <div className={cn('mt-3 border-t border-bw-border pt-3', className)}>
          <button
            type="button"
            className="btn btn-ghost btn-sm gap-1.5 text-bw-primary"
            onClick={addRabatt}
          >
            <Percent className="h-3.5 w-3.5" />
            Gesamtrabatt auf Rechnungssumme
          </button>
        </div>
      )
    }
    return (
      <div className={cn('mt-3 space-y-2 border-t border-bw-border pt-3', className)}>
        <p className="text-[11px] font-medium uppercase tracking-wide text-bw-text-muted">
          Gesamtrabatt (auf alle Positionen)
        </p>
        <div className="lex-zeile lex-zeile--rabatt flex flex-wrap items-end gap-2">
          <label className="lex-form-field form-field min-w-[140px] flex-1">
            <span className="form-field-label">Bezeichnung</span>
            <input
              className="input w-full"
              value={rabatt.bezeichnung}
              onChange={(e) => patchRabatt({ bezeichnung: e.target.value })}
            />
          </label>
          <label className="lex-form-field form-field w-[110px] shrink-0">
            <span className="form-field-label">Art</span>
            <select
              className="input w-full"
              value={rabatt.modus}
              onChange={(e) =>
                patchRabatt({ modus: e.target.value as DokumentGesamtrabattZeile['modus'] })
              }
            >
              <option value="prozent">Prozent</option>
              <option value="betrag">Betrag</option>
            </select>
          </label>
          <label className="lex-form-field form-field w-[100px] shrink-0">
            <span className="form-field-label">Wert</span>
            <div className="relative">
              <input
                type="number"
                min={0}
                step="0.01"
                className="input w-full pr-7 tabular-nums"
                value={rabatt.wert || ''}
                onChange={(e) => patchRabatt({ wert: Math.max(0, Number(e.target.value) || 0) })}
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-bw-text-muted">
                {rabatt.modus === 'prozent' ? '%' : '€'}
              </span>
            </div>
          </label>
          <div className="flex min-w-[88px] shrink-0 items-center justify-end pb-0.5 text-[13px] font-semibold tabular-nums text-bw-text">
            −{formatEurBetrag(abzug)}
          </div>
          <button
            type="button"
            className="flex h-10 w-9 shrink-0 items-center justify-center text-bw-text-muted hover:text-status-cancel-text"
            onClick={removeRabatt}
            aria-label="Gesamtrabatt entfernen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {abzug > 0 ? (
          <p className="text-right text-[12px] text-bw-text-muted">
            Zwischensumme {formatEurBetrag(artikelNetto)} · Netto nach Rabatt{' '}
            <span className="font-semibold text-bw-text">{formatEurBetrag(nettoNachRabatt)}</span>
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-bw-border bg-bw-bg-soft/60 px-3 py-3',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-bw-text">
          <Percent className="mr-1.5 inline h-3.5 w-3.5 text-bw-primary" aria-hidden />
          Rabatt auf Gesamtsumme
        </p>
        {!rabatt ? (
          <Button type="button" variant="secondary" className="btn-sm gap-1" onClick={addRabatt}>
            <Plus className="h-3.5 w-3.5" />
            Rabatt hinzufügen
          </Button>
        ) : (
          <button
            type="button"
            className="text-xs text-bw-text-muted underline hover:text-bw-text"
            onClick={removeRabatt}
          >
            Rabatt entfernen
          </button>
        )}
      </div>

      {rabatt ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm sm:col-span-2">
            <span className="input-label">Bezeichnung</span>
            <input
              className="input w-full"
              value={rabatt.bezeichnung}
              onChange={(e) => patchRabatt({ bezeichnung: e.target.value })}
              placeholder="z. B. Rabatt"
            />
          </label>
          <label className="block text-sm">
            <span className="input-label">Art</span>
            <select
              className="input w-full"
              value={rabatt.modus}
              onChange={(e) =>
                patchRabatt({ modus: e.target.value as DokumentGesamtrabattZeile['modus'] })
              }
            >
              <option value="prozent">Prozent vom Netto</option>
              <option value="betrag">Fester Betrag (netto)</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="input-label">{rabatt.modus === 'prozent' ? 'Prozent' : 'Betrag'}</span>
            <div className="txt-prefix">
              <span className="prefix">{rabatt.modus === 'prozent' ? '%' : '€'}</span>
              <input
                className="input"
                type="number"
                min={0}
                step={rabatt.modus === 'prozent' ? '0.5' : '0.01'}
                value={rabatt.wert || ''}
                onChange={(e) => patchRabatt({ wert: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
          </label>
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-bw-text-muted">
          Gilt für die gesamte Rechnung bzw. das gesamte Angebot — nicht nur für ein einzelnes Gewerk.
          Pro Position bleibt der Rabatt in der Zeile erhalten.
        </p>
      )}

      {abzug > 0 ? (
        <div className="mt-3 flex flex-wrap justify-end gap-x-4 gap-y-1 border-t border-bw-border/80 pt-2 text-[12px] tabular-nums">
          <span className="text-bw-text-muted">
            Zwischensumme <span className="font-medium text-bw-text">{formatEurBetrag(artikelNetto)}</span>
          </span>
          <span className="text-amber-800">
            Rabatt <span className="font-semibold">−{formatEurBetrag(abzug)}</span>
          </span>
          <span className="font-semibold text-bw-text">Netto {formatEurBetrag(nettoNachRabatt)}</span>
        </div>
      ) : null}
    </div>
  )
}

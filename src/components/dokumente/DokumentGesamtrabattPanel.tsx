'use client'

<<<<<<< Updated upstream
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn, MockInput } from '@/components/mock-ui'
=======
import { Percent, Plus, Trash2 } from 'lucide-react'
import { MockBtn } from '@/components/mock-ui'
>>>>>>> Stashed changes
import { NachlassModusFields } from '@/components/posboard/NachlassModusFields'
import {
  formatEurBetrag,
  gesamtrabattBetrag,
  getGesamtrabattZeile,
  neueGesamtrabattZeile,
  setGesamtrabattInZeilen,
  summeArtikelBrutto,
  summeArtikelNetto,
  type DokumentGesamtrabattZeile,
  type DokumentZeile,
  type GesamtrabattModus,
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
  const artikelBrutto = summeArtikelBrutto(zeilen)
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

  function patchFromNachlassFields(next: { nachlassModus?: GesamtrabattModus; preis?: number }) {
    patchRabatt({
      ...(next.nachlassModus ? { modus: next.nachlassModus } : {}),
      ...(next.preis != null ? { wert: next.preis } : {}),
    })
  }

  if (variant === 'lex') {
    if (!rabatt) {
      return (
        <div className={cn('mt-3 border-t border-bw-border pt-3', className)}>
          <MockBtn kind="ghost" sm className="gap-1.5 text-bw-primary" type="button" onClick={addRabatt}>
            <MockIcon n="percentage" ctx="default" className="h-3.5 w-3.5" />
            Gesamtrabatt auf Rechnungssumme
          </MockBtn>
        </div>
      )
    }
    return (
      <div className={cn('mt-3 space-y-2 border-t border-bw-border pt-3', className)}>
        <p className="text-fs-caption font-medium uppercase tracking-wide text-bw-text-muted">
          Gesamtrabatt (auf alle Positionen)
        </p>
        <div className="lex-zeile lex-zeile--rabatt space-y-2">
          <label className="lex-form-field form-field block">
            <span className="form-field-label">Bezeichnung</span>
            <MockInput className="w-full" value={rabatt.bezeichnung} onChange={(e) => patchRabatt({ bezeichnung: e.target.value })} />
          </label>
          <NachlassModusFields
            modus={rabatt.modus}
            wert={rabatt.wert}
            artikelNetto={artikelNetto}
            artikelBrutto={artikelBrutto}
            inputClassName="input"
            selectClassName="input w-full"
            onChange={patchFromNachlassFields}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="text-fs-text font-semibold tabular-nums text-bw-text">
              −{formatEurBetrag(abzug)}
            </div>
            <MockBtn className="flex h-10 w-9 shrink-0 items-center justify-center text-bw-text-muted hover:text-status-cancel-text" type="button" onClick={removeRabatt} aria-label="Gesamtrabatt löschen">
              <MockIcon n="trash" ctx="default" className="h-4 w-4" />
            </MockBtn>
          </div>
        </div>
        {abzug > 0 ? (
          <p className="text-right text-fs-meta text-bw-text-muted">
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
        'rounded-card border border-bw-border bg-bw-bg-soft/60 px-3 py-3',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-fs-meta font-semibold text-bw-text">
          <MockIcon n="percentage" ctx="default" className="mr-1.5 inline h-3.5 w-3.5 text-bw-primary" aria-hidden />
          Rabatt auf Gesamtsumme
        </p>
        {!rabatt ? (
          <MockBtn type="button" kind="secondary" className="sm gap-1" onClick={addRabatt}>
<<<<<<< Updated upstream
            <MockIcon n="plus" ctx="default" className="h-3.5 w-3.5" />
=======
            <Plus className="h-3.5 w-3.5" />
>>>>>>> Stashed changes
            Rabatt hinzufügen
          </MockBtn>
        ) : (
          <MockBtn className="text-xs text-bw-text-muted underline hover:text-bw-text" type="button" onClick={removeRabatt}>
            Rabatt löschen
          </MockBtn>
        )}
      </div>

      {rabatt ? (
        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            <span className="input-label">Bezeichnung</span>
            <MockInput className="w-full" value={rabatt.bezeichnung} onChange={(e) => patchRabatt({ bezeichnung: e.target.value })} placeholder="z. B. Rabatt" />
          </label>
          <div className="form-grid">
            <NachlassModusFields
              modus={rabatt.modus}
              wert={rabatt.wert}
              artikelNetto={artikelNetto}
              artikelBrutto={artikelBrutto}
              inputClassName="input"
              selectClassName="input w-full"
              onChange={patchFromNachlassFields}
            />
          </div>
        </div>
      ) : (
        <p className="mt-2 text-fs-meta text-bw-text-muted">
          Gilt für die gesamte Rechnung bzw. das gesamte Angebot — nicht nur für ein einzelnes Gewerk.
          Pro Position bleibt der Rabatt in der Zeile erhalten.
        </p>
      )}

      {abzug > 0 ? (
        <div className="mt-3 flex flex-wrap justify-end gap-x-4 gap-y-1 border-t border-bw-border/80 pt-2 text-fs-meta tabular-nums">
          <span className="text-bw-text-muted">
            Zwischensumme <span className="font-medium text-bw-text">{formatEurBetrag(artikelNetto)}</span>
          </span>
          <span className="text-status-contact-text">
            Rabatt <span className="font-semibold">−{formatEurBetrag(abzug)}</span>
          </span>
          <span className="font-semibold text-bw-text">Netto {formatEurBetrag(nettoNachRabatt)}</span>
        </div>
      ) : null}
    </div>
  )
}

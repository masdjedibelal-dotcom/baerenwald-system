'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput, MockSelect } from '@/components/mock-ui/MockForm'
import type { ReactNode } from 'react'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { cn } from '@/lib/utils'
import { DokumentGesamtrabattPanel } from '@/components/dokumente/DokumentGesamtrabattPanel'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import { EuroNettoInput } from '@/components/ui/EuroNettoInput'
import {
  artikelZeilenNetto,
  formatEurBetrag,
  neueArtikelZeile,
  neueFreitextZeile,
  zeilenOhneGesamtrabatt,
  type DokumentArtikelZeile,
  type DokumentFreitextZeile,
  type DokumentZeile,
  type MwstSatzOption,
} from '@/lib/dokument-zeilen'
import {
  getHinweisForPosition,
  gewerkAusfuehrungBadge,
  gewerkById,
  normalizeGewerkAusfuehrung,
} from '@/lib/gewerke-ausfuehrung'
import type { Gewerk } from '@/lib/types'

const MWST_OPTIONS: { value: MwstSatzOption; label: string }[] = [
  { value: 19, label: 'USt 19 %' },
  { value: 7, label: 'USt 7 %' },
  { value: 0, label: 'USt 0 %' },
]

/** Kompaktes Feld wie Mock (.form-field + .input-label) */
function LexField({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('lex-form-field form-field', className)}>
      <span className="form-field-label">{label}</span>
      {children}
    </div>
  )
}

export function LexofficeDokumentEditor({
  zeilen,
  onChange,
  className,
  extraActions,
  gewerke = [],
  showGesamtrabattPanel = true,
}: {
  zeilen: DokumentZeile[]
  onChange: (next: DokumentZeile[]) => void
  className?: string
  /** z. B. „Position aus Preisliste“ im Angebots-Wizard */
  extraActions?: ReactNode
  /** Für Fachbetrieb-Badge und Hinweis-Felder */
  gewerke?: Gewerk[]
  /** Gesamtrabatt-Block unter den Positionen (z. B. in Rechnung-Zusammenfassung separat) */
  showGesamtrabattPanel?: boolean
}) {
  const listenZeilen = zeilenOhneGesamtrabatt(zeilen)

  function patchZeile(id: string, patch: Partial<DokumentZeile>) {
    onChange(
      zeilen.map((z) => (z.id === id ? ({ ...z, ...patch } as DokumentZeile) : z))
    )
  }

  function removeZeile(id: string) {
    onChange(zeilen.filter((z) => z.id !== id))
  }

  let artikelIndex = 0

  return (
    <div className={cn('lex-doc-editor', className)}>
      <div className="space-y-2">
        {listenZeilen.map((z) => {
          if (z.typ === 'artikel') {
            artikelIndex += 1
            const netto = artikelZeilenNetto(z)
            return (
              <div key={z.id} className="lex-zeile lex-zeile--artikel">
                <div className="lex-zeile-nr" aria-hidden>
                  {artikelIndex}
                </div>
                <LexField label="Leistung" className="lex-col-artikel">
                  {gewerke.length > 0 ? (
                    <MockSelect className="w-full" value={z.gewerk_id ?? ''} onChange={(e) => {
                        const gid = e.target.value
                        const g = gewerkById(gewerke, gid)
                        const hinweis = g ? getHinweisForPosition(g.id, gewerke) : ''
                        patchZeile(z.id, {
                          gewerk_id: gid,
                          gewerkName: g?.name ?? (gid ? 'Gewerk' : 'Freie Leistung'),
                          gewerk_slug: g?.slug ?? (gid ? '' : 'frei'),
                          positionBeschreibung: hinweis || undefined,
                        } as Partial<DokumentArtikelZeile>)
                      }}>
                      <option value="">Freie Leistung</option>
                      {gewerke
                        .filter((g) => g.aktiv !== false)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </MockSelect>
                  ) : z.gewerkName ? (
                    <span className="mb-1 block text-fs-caption text-bw-text-muted">{z.gewerkName}</span>
                  ) : null}
                  <div className="mb-1 flex flex-wrap items-center gap-1">
                    {(() => {
                      const g = gewerkById(gewerke, z.gewerk_id)
                      const badge = g
                        ? gewerkAusfuehrungBadge(normalizeGewerkAusfuehrung(g.ausfuehrung))
                        : null
                      return badge ? (
                        <span
                          className={cn(
                            'rounded-pill px-1.5 py-0.5 text-fs-caption font-medium',
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      ) : null
                    })()}
                  </div>
                  <MockInput className="w-full" value={z.bezeichnung} placeholder="Leistung / Positionsbezeichnung" onChange={(e) =>
                      patchZeile(z.id, { bezeichnung: e.target.value } as Partial<DokumentArtikelZeile>)} />
                  {(() => {
                    const hinweis = z.positionBeschreibung?.trim() ?? ''
                    const leistung = z.bezeichnung.trim()
                    const g = gewerkById(gewerke, z.gewerk_id)
                    const fachbetriebGewerk =
                      g && normalizeGewerkAusfuehrung(g.ausfuehrung) !== 'eigen'
                    const showHinweisField =
                      Boolean(hinweis && hinweis !== leistung) || Boolean(fachbetriebGewerk)
                    if (!showHinweisField) return null
                    return (
                      <RichTextEditor value={typeof (z.positionBeschreibung ?? '') === 'string' ? (z.positionBeschreibung ?? '') : ''} onChange={(__v) => patchZeile(z.id, {
                            positionBeschreibung: __v,
                          } as Partial<DokumentArtikelZeile>)} placeholder="Zusatz-Hinweis (z. B. Fachbetrieb)" minHeight={120} aria-label="Zusatz-Hinweis (z. B. Fachbetrieb)" />
                    )
                  })()}
                </LexField>
                <LexField label="Menge" className="lex-col-menge">
                  <ClearableNumberInput
                    min={0}
                    className="input w-full"
                    value={z.menge}
                    onValueChange={(menge) =>
                      patchZeile(z.id, { menge } as Partial<DokumentArtikelZeile>)
                    }
                  />
                </LexField>
                <LexField label="Einheit" className="lex-col-einheit">
                  <MockInput className="w-full" value={z.einheit} placeholder="Stk." onChange={(e) =>
                      patchZeile(z.id, { einheit: e.target.value } as Partial<DokumentArtikelZeile>)} />
                </LexField>
                <LexField label="VK (Netto)" className="lex-col-vk">
                  <EuroNettoInput
                    value={z.vkNetto}
                    onChange={(vkNetto) =>
                      patchZeile(z.id, { vkNetto } as Partial<DokumentArtikelZeile>)
                    }
                  />
                </LexField>
                <LexField label="Rabatt" className="lex-col-rabatt">
                  <div className="relative">
                    <ClearableNumberInput
                      min={0}
                      max={100}
                      className="input w-full pr-6"
                      value={z.rabattProzent ?? 0}
                      onValueChange={(rabattProzent) =>
                        patchZeile(z.id, { rabattProzent } as Partial<DokumentArtikelZeile>)
                      }
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fs-caption text-bw-text-muted">
                      %
                    </span>
                  </div>
                </LexField>
                <div className="lex-col-summe lex-form-field form-field min-w-0">
                  <span className="form-field-label">Summe</span>
                  <span className="block text-right text-fs-text font-semibold tabular-nums text-bw-text">
                    {formatEurBetrag(netto)}
                  </span>
                  <span className="form-field-label mt-1">USt</span>
                  <MockSelect className="w-full" value={z.mwstSatz} onChange={(e) =>
                      patchZeile(z.id, {
                        mwstSatz: Number(e.target.value) as MwstSatzOption,
                      } as Partial<DokumentArtikelZeile>)}>
                    {MWST_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </MockSelect>
                </div>
                <MockBtn className="lex-col-del flex h-10 w-9 items-center justify-center text-bw-text-muted hover:text-status-cancel-text" type="button" onClick={() => removeZeile(z.id)} aria-label="Zeile löschen">
                  <MockIcon n="trash" ctx="default" className="h-4 w-4" />
                </MockBtn>
              </div>
            )
          }

          if (z.typ === 'freitext') {
            return (
              <div key={z.id} className="lex-zeile lex-zeile--freitext">
                <div className="lex-zeile-icon text-bw-text-muted" aria-hidden>
                  <MockIcon n="list" ctx="default" className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <LexField label="Titel (optional)" className="block">
                    <MockInput className="w-full" value={z.titel} onChange={(e) =>
                        patchZeile(z.id, { titel: e.target.value } as Partial<DokumentFreitextZeile>)} />
                  </LexField>
                  <LexField label="Text (optional)" className="block">
                    <RichTextEditor value={typeof (z.text) === 'string' ? (z.text) : ''} onChange={(__v) => patchZeile(z.id, { text: __v } as Partial<DokumentFreitextZeile>)} minHeight={120} />
                  </LexField>
                </div>
                <MockBtn className="flex h-10 w-9 shrink-0 items-center justify-center self-start text-bw-text-muted hover:text-status-cancel-text" type="button" onClick={() => removeZeile(z.id)} aria-label="Freitext löschen">
                  <MockIcon n="trash" ctx="default" className="h-4 w-4" />
                </MockBtn>
              </div>
            )
          }

          return null
        })}
      </div>

      <div className="lex-doc-actions mt-3 flex flex-wrap items-center gap-2">
        <MockBtn kind="ghost" sm className="gap-1.5 border-bw-primary/40 text-bw-primary" type="button" onClick={() => onChange([...zeilen, neueArtikelZeile()])}>
          <MockIcon n="plus" ctx="default" className="h-3.5 w-3.5" />
          Artikel
        </MockBtn>
        <MockBtn kind="ghost" sm className="gap-1.5" type="button" onClick={() => onChange([...zeilen, neueFreitextZeile()])}>
          <MockIcon n="grip-vertical" ctx="default" className="h-3.5 w-3.5" />
          Freitext
        </MockBtn>
        {extraActions}
      </div>

      {showGesamtrabattPanel ? (
        <DokumentGesamtrabattPanel zeilen={zeilen} onChange={onChange} variant="lex" />
      ) : null}
    </div>
  )
}

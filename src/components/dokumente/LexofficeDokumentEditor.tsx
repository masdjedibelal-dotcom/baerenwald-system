'use client'

import type { ReactNode } from 'react'
import { AlignLeft, GripVertical, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DokumentGesamtrabattPanel } from '@/components/dokumente/DokumentGesamtrabattPanel'
import { EuroNettoInput } from '@/components/ui/EuroNettoInput'
import { Textarea } from '@/components/ui/Textarea'
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
                    <select
                      className="input w-full"
                      value={z.gewerk_id ?? ''}
                      onChange={(e) => {
                        const gid = e.target.value
                        const g = gewerkById(gewerke, gid)
                        const hinweis = g ? getHinweisForPosition(g.id, gewerke) : ''
                        patchZeile(z.id, {
                          gewerk_id: gid,
                          gewerkName: g?.name ?? (gid ? 'Gewerk' : 'Freie Leistung'),
                          gewerk_slug: g?.slug ?? (gid ? '' : 'frei'),
                          positionBeschreibung: hinweis || undefined,
                        } as Partial<DokumentArtikelZeile>)
                      }}
                    >
                      <option value="">Freie Leistung</option>
                      {gewerke
                        .filter((g) => g.aktiv !== false)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                  ) : z.gewerkName ? (
                    <span className="mb-1 block text-[10px] text-bw-text-muted">{z.gewerkName}</span>
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
                            'rounded px-1.5 py-0.5 text-[10px] font-medium',
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      ) : null
                    })()}
                  </div>
                  <input
                    className="input w-full"
                    value={z.bezeichnung}
                    placeholder="Leistung / Positionsbezeichnung"
                    onChange={(e) =>
                      patchZeile(z.id, { bezeichnung: e.target.value } as Partial<DokumentArtikelZeile>)
                    }
                  />
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
                      <Textarea
                        rows={2}
                        placeholder="Zusatz-Hinweis (z. B. Fachbetrieb)"
                        value={z.positionBeschreibung ?? ''}
                        onChange={(e) =>
                          patchZeile(z.id, {
                            positionBeschreibung: e.target.value,
                          } as Partial<DokumentArtikelZeile>)
                        }
                      />
                    )
                  })()}
                </LexField>
                <LexField label="Menge" className="lex-col-menge">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="input w-full tabular-nums"
                    value={z.menge}
                    onChange={(e) =>
                      patchZeile(z.id, {
                        menge: Math.max(Number(e.target.value) || 0, 0),
                      } as Partial<DokumentArtikelZeile>)
                    }
                  />
                </LexField>
                <LexField label="Einheit" className="lex-col-einheit">
                  <input
                    className="input w-full"
                    value={z.einheit}
                    placeholder="Stk."
                    onChange={(e) =>
                      patchZeile(z.id, { einheit: e.target.value } as Partial<DokumentArtikelZeile>)
                    }
                  />
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
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      className="input w-full pr-6 tabular-nums"
                      value={z.rabattProzent || ''}
                      onChange={(e) =>
                        patchZeile(z.id, {
                          rabattProzent: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                        } as Partial<DokumentArtikelZeile>)
                      }
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-bw-text-muted">
                      %
                    </span>
                  </div>
                </LexField>
                <div className="lex-col-summe lex-form-field form-field min-w-0">
                  <span className="form-field-label">Summe</span>
                  <span className="block text-right text-[13px] font-semibold tabular-nums text-bw-text">
                    {formatEurBetrag(netto)}
                  </span>
                  <span className="form-field-label mt-1">USt</span>
                  <select
                    className="input w-full"
                    value={z.mwstSatz}
                    onChange={(e) =>
                      patchZeile(z.id, {
                        mwstSatz: Number(e.target.value) as MwstSatzOption,
                      } as Partial<DokumentArtikelZeile>)
                    }
                  >
                    {MWST_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="lex-col-del flex h-10 w-9 items-center justify-center text-bw-text-muted hover:text-status-cancel-text"
                  onClick={() => removeZeile(z.id)}
                  aria-label="Zeile löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          }

          if (z.typ === 'freitext') {
            return (
              <div key={z.id} className="lex-zeile lex-zeile--freitext">
                <div className="lex-zeile-icon text-bw-text-muted" aria-hidden>
                  <AlignLeft className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <LexField label="Titel (optional)" className="block">
                    <input
                      className="input w-full"
                      value={z.titel}
                      onChange={(e) =>
                        patchZeile(z.id, { titel: e.target.value } as Partial<DokumentFreitextZeile>)
                      }
                    />
                  </LexField>
                  <LexField label="Text (optional)" className="block">
                    <Textarea
                      rows={2}
                      value={z.text}
                      onChange={(e) =>
                        patchZeile(z.id, { text: e.target.value } as Partial<DokumentFreitextZeile>)
                      }
                    />
                  </LexField>
                </div>
                <button
                  type="button"
                  className="flex h-10 w-9 shrink-0 items-center justify-center self-start text-bw-text-muted hover:text-status-cancel-text"
                  onClick={() => removeZeile(z.id)}
                  aria-label="Freitext löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          }

          return null
        })}
      </div>

      <div className="lex-doc-actions mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-secondary btn-sm gap-1.5 border-bw-primary/40 text-bw-primary"
          onClick={() => onChange([...zeilen, neueArtikelZeile()])}
        >
          <Plus className="h-3.5 w-3.5" />
          Artikel
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm gap-1.5"
          onClick={() => onChange([...zeilen, neueFreitextZeile()])}
        >
          <GripVertical className="h-3.5 w-3.5" />
          Freitext
        </button>
        {extraActions}
      </div>

      {showGesamtrabattPanel ? (
        <DokumentGesamtrabattPanel zeilen={zeilen} onChange={onChange} variant="lex" />
      ) : null}
    </div>
  )
}

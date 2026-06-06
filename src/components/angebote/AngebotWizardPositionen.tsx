'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  AlignLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ListFilter,
  Pencil,
  Percent,
  Plus,
  Trash2,
} from 'lucide-react'
import { DokumentGesamtrabattPanel } from '@/components/dokumente/DokumentGesamtrabattPanel'
import { EuroNettoInput } from '@/components/ui/EuroNettoInput'
import { Textarea } from '@/components/ui/Textarea'
import { richTextToPlain } from '@/lib/rich-text'
import { cn } from '@/lib/utils'
import {
  artikelZeilenNetto,
  formatEurBetrag,
  gesamtrabattBetrag,
  neueArtikelZeile,
  neueFreitextZeile,
  summeArtikelNetto,
  zeilenOhneGesamtrabatt,
  type DokumentArtikelZeile,
  type DokumentGesamtrabattZeile,
  type DokumentZeile,
  type MwstSatzOption,
} from '@/lib/dokument-zeilen'
import { berechneRechnung } from '@/lib/rechnung-berechnung'
import { GEWERK_SLUG_ANFAHRT, isAnfahrtZeile } from '@/lib/anfahrt-angebot'
import {
  KOSTEN_VERTEILUNG_LABELS,
  type KostenVerteilung,
} from '@/lib/angebot-kosten-split'
import {
  dokumentZeilenToAngebotPositionen,
} from '@/lib/dokument-zeilen'
import { preislisteEinheitspreisNetto } from '@/lib/angebote/angebot-positionen-from-lead'
import {
  getHinweisForPosition,
  gewerkById,
  positionKannFachbetriebHinweis,
} from '@/lib/gewerke-ausfuehrung'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { Gewerk, Preisliste } from '@/lib/types'

const EINHEITEN = ['Stück', 'Stk.', 'm²', 'm', 'lfm', 'h', 'Tag', 'pauschal', 'kg']

const MWST_OPTIONS: { value: MwstSatzOption; label: string }[] = [
  { value: 19, label: '19 %' },
  { value: 7, label: '7 %' },
  { value: 0, label: '0 %' },
]

function WizardField({
  label,
  hint,
  required,
  full,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  full?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('wizard-field', full && 'full')}>
      <span className="wizard-field-label">
        {label}
        {required ? <span className="text-bw-danger"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="wizard-field-hint">{hint}</span> : null}
    </div>
  )
}

function KostenverteilungField({
  value,
  onChange,
}: {
  value: KostenVerteilung
  onChange: (next: KostenVerteilung) => void
}) {
  return (
    <WizardField
      label="Kostenart"
      hint="Allgemein = keine Aufteilung im PDF; Arbeits- bzw. Materialkosten = 100 % in eine Kategorie (wird im PDF ausgewiesen)"
    >
      <select
        className="input w-full"
        value={value}
        onChange={(e) => onChange(e.target.value as KostenVerteilung)}
      >
        {(Object.entries(KOSTEN_VERTEILUNG_LABELS) as [KostenVerteilung, string][]).map(
          ([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          )
        )}
      </select>
    </WizardField>
  )
}

function FachbetriebHinweisCheckbox({
  gewerkId,
  gewerke,
  hinweisAnzeigen,
  positionBeschreibung,
  hinweisText,
  onPatch,
}: {
  gewerkId: string | undefined
  gewerke: Gewerk[]
  hinweisAnzeigen: boolean | undefined
  positionBeschreibung: string | undefined
  hinweisText: string
  onPatch: (patch: Partial<DokumentArtikelZeile>) => void
}) {
  return (
    <div className="full col-span-full rounded-lg border border-bw-border bg-bw-bg-soft/60 px-3 py-2.5">
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-bw-border text-bw-accent focus:ring-bw-accent"
          checked={hinweisAnzeigen !== false}
          onChange={(e) => {
            const an = e.target.checked
            const defaultHinweis = gewerkId ? getHinweisForPosition(gewerkId, gewerke) : ''
            const besch = positionBeschreibung?.trim() ?? ''
            onPatch({
              fachbetriebHinweisAnzeigen: an,
              ...(an && defaultHinweis && !besch
                ? { positionBeschreibung: defaultHinweis }
                : {}),
              ...(!an && defaultHinweis && besch === defaultHinweis
                ? { positionBeschreibung: undefined }
                : {}),
            })
          }}
        />
        <span className="min-w-0 text-[13px] leading-snug text-bw-text">
          <span className="font-medium text-ink">
            Hinweis „Ausführung durch zugelassenen Fachbetrieb“ in Angebot und Rechnung anzeigen
          </span>
          {hinweisText ? (
            <span className="mt-1 block text-xs text-bw-text-muted">{hinweisText}</span>
          ) : (
            <span className="mt-1 block text-xs text-bw-text-muted">
              Zusätzlich der Standard-Hinweis unter der Leistung im PDF.
            </span>
          )}
        </span>
      </label>
    </div>
  )
}

function zeileKind(z: DokumentZeile): 'artikel' | 'rabatt' | 'freitext' {
  if (z.typ === 'freitext') return 'freitext'
  if (z.typ === 'gesamtrabatt') return 'rabatt'
  return 'artikel'
}

function zeileDisplayNetto(z: DokumentZeile, zeilen: DokumentZeile[]): number {
  if (z.typ === 'artikel') return artikelZeilenNetto(z)
  if (z.typ === 'gesamtrabatt') {
    const artikelNetto = summeArtikelNetto(zeilen)
    return -gesamtrabattBetrag(zeilen, artikelNetto)
  }
  return 0
}

/** Nur Artikel-Zeilen zählen (1, 2, 3 …); Rabatt/Freitext ohne Pos.-Nr. */
function artikelPositionsNummer(zeilen: DokumentZeile[], index: number): number | null {
  if (zeilen[index]?.typ !== 'artikel') return null
  let n = 0
  for (let i = 0; i <= index; i++) {
    if (zeilen[i].typ === 'artikel') n++
  }
  return n
}

function PositionAccordionItem({
  index,
  z,
  zeilen,
  open,
  preislisteMode,
  gewerke,
  preislisten,
  onToggle,
  onClose,
  onPatch,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  lockGewerk = false,
}: {
  index: number
  z: DokumentZeile
  zeilen: DokumentZeile[]
  open: boolean
  preislisteMode: boolean
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  onToggle: () => void
  onClose: () => void
  onPatch: (patch: Partial<DokumentZeile>) => void
  onRemove: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  lockGewerk?: boolean
}) {
  const kind = zeileKind(z)
  const posNr = artikelPositionsNummer(zeilen, index)
  const total = zeileDisplayNetto(z, zeilen)
  const negative = total < 0

  const titel =
    z.typ === 'freitext'
      ? z.titel
      : z.typ === 'gesamtrabatt'
        ? z.bezeichnung
        : z.bezeichnung

  const meta =
    z.typ === 'artikel' && z.gewerkName && z.gewerk_slug !== GEWERK_SLUG_ANFAHRT
      ? z.gewerkName
      : null

  const beschreibungKurz = (() => {
    if (z.typ === 'artikel') {
      const plain = richTextToPlain(z.positionBeschreibung)
      if (!plain || plain === z.bezeichnung.trim()) return null
      return plain
    }
    if (z.typ === 'freitext') {
      const plain = richTextToPlain(z.text)
      return plain || null
    }
    if (z.typ === 'gesamtrabatt') {
      return z.modus === 'prozent' ? `${z.wert} % Nachlass` : 'Betrag-Nachlass'
    }
    return null
  })()

  const leistungenForGewerk = (gewerkId: string) =>
    preislisten.filter((p) => p.aktiv && p.gewerk_id === gewerkId)

  const fachbetriebHinweisAktiv =
    z.typ === 'artikel' && positionKannFachbetriebHinweis(z.gewerk_id, gewerke)
  const fachbetriebHinweisText =
    z.typ === 'artikel' && z.gewerk_id
      ? getHinweisForPosition(z.gewerk_id, gewerke)
      : ''
  const istAnfahrt = z.typ === 'artikel' && isAnfahrtZeile(z)
  const kostenverteilung: KostenVerteilung =
    z.typ === 'artikel' ? z.kostenverteilung ?? 'allgemein' : 'allgemein'

  function applyPreisliste(plId: string) {
    if (z.typ !== 'artikel') return
    const pl = preislisten.find((p) => p.id === plId)
    const g = gewerkById(gewerke, z.gewerk_id ?? '')
    if (!pl || !g) return
    const defaultMenge = pl.einheit === 'm²' || pl.einheit === 'm2' ? 20 : 1
    const menge = z.menge > 0 ? z.menge : defaultMenge
    const vkNetto = preislisteEinheitspreisNetto(pl)
    const hinweis = getHinweisForPosition(g.id, gewerke)
    const fachbetrieb = positionKannFachbetriebHinweis(g.id, gewerke)
    onPatch({
      bezeichnung: pl.leistung,
      menge,
      einheit: pl.einheit,
      vkNetto,
      gewerk_id: g.id,
      gewerkName: g.name,
      gewerk_slug: g.slug,
      preisliste_id: pl.id,
      positionBeschreibung: hinweis || undefined,
      fachbetriebHinweisAnzeigen: fachbetrieb ? true : undefined,
    } as Partial<DokumentArtikelZeile>)
  }

  function patchVkNetto(vk: number) {
    if (z.typ !== 'artikel') return
    const pl = z.preisliste_id ? preislisten.find((p) => p.id === z.preisliste_id) : null
    const catVk = pl ? preislisteEinheitspreisNetto(pl) : 0
    const abweichend = pl && Math.abs(vk - catVk) > 0.02
    onPatch({
      vkNetto: vk,
      ...(abweichend ? { preisliste_id: null } : {}),
    } as Partial<DokumentArtikelZeile>)
  }

  return (
    <div className={cn('pos-acc', `kind-${kind}`, open && 'open')}>
      <div
        className="pos-row"
        role="button"
        tabIndex={0}
        onClick={open ? undefined : onToggle}
        onKeyDown={(e) => {
          if (!open && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        <div className="pos-nr" aria-hidden={posNr == null}>
          {posNr != null ? (
            posNr
          ) : kind === 'rabatt' ? (
            <Percent className="h-3.5 w-3.5 text-bw-text-muted" aria-hidden />
          ) : kind === 'freitext' ? (
            <AlignLeft className="h-3.5 w-3.5 text-bw-text-muted" aria-hidden />
          ) : (
            <span className="text-bw-text-subtle">—</span>
          )}
        </div>
        <div className="pos-title">
          <div className="l">
            {titel?.trim() ? titel : <span className="text-bw-text-subtle">(ohne Bezeichnung)</span>}
          </div>
          {beschreibungKurz ? <div className="d">{beschreibungKurz}</div> : null}
          {meta ? <div className="meta">{meta}</div> : null}
        </div>
        <div className="pos-cell menge">
          {kind === 'freitext' ? (
            <span className="text-bw-text-subtle">—</span>
          ) : z.typ === 'artikel' ? (
            `${z.menge} ${z.einheit}`
          ) : (
            '1 pauschal'
          )}
        </div>
        <div className={cn('pos-cell preis', negative && 'negative')}>
          {kind === 'freitext' ? (
            <span className="text-bw-text-subtle">—</span>
          ) : (
            formatEurBetrag(total)
          )}
        </div>
        <div className="pos-cell steuer">
          {kind === 'freitext' ? '' : z.typ === 'artikel' ? `${z.mwstSatz}%` : '19%'}
        </div>
        <div className="pos-actions">
          {canMoveUp || canMoveDown ? (
            <div className="pos-reorder" aria-label="Reihenfolge">
            <button
              type="button"
              className="btn btn-ghost btn-sm pos-reorder-btn"
              title="Nach oben"
              aria-label="Position nach oben verschieben"
              disabled={!canMoveUp}
              onClick={(e) => {
                e.stopPropagation()
                onMoveUp?.()
              }}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm pos-reorder-btn"
              title="Nach unten"
              aria-label="Position nach unten verschieben"
              disabled={!canMoveDown}
              onClick={(e) => {
                e.stopPropagation()
                onMoveDown?.()
              }}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            title={open ? 'Schließen' : 'Bearbeiten'}
            onClick={(e) => {
              e.stopPropagation()
              if (open) onClose()
              else onToggle()
            }}
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            title="Entfernen"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {open ? (
        <>
          <div className="pos-edit-body">
            {z.typ === 'freitext' ? (
              <>
                <WizardField label="Überschrift" required full>
                  <input
                    className="input w-full"
                    value={z.titel}
                    onChange={(e) => onPatch({ titel: e.target.value })}
                    placeholder="z. B. Wichtiger Hinweis"
                    autoFocus
                  />
                </WizardField>
                <WizardField label="Beschreibung" full hint="Erscheint unter der Überschrift auf dem Angebot">
                  <Textarea
                    rows={3}
                    value={z.text}
                    onChange={(e) => onPatch({ text: e.target.value })}
                    placeholder="z. B. Hinweis zu Ablauf oder Garantie"
                  />
                </WizardField>
              </>
            ) : z.typ === 'gesamtrabatt' ? (
              <>
                <WizardField label="Bezeichnung" required full>
                  <input
                    className="input w-full"
                    value={z.bezeichnung}
                    onChange={(e) => onPatch({ bezeichnung: e.target.value })}
                    autoFocus
                  />
                </WizardField>
                <WizardField label="Art des Nachlasses">
                  <select
                    className="input w-full"
                    value={z.modus}
                    onChange={(e) =>
                      onPatch({ modus: e.target.value as DokumentGesamtrabattZeile['modus'] })
                    }
                  >
                    <option value="prozent">Prozent vom Netto</option>
                    <option value="betrag">Fester Betrag</option>
                  </select>
                </WizardField>
                <WizardField label={z.modus === 'prozent' ? 'Prozent' : 'Betrag netto'}>
                  <div className="txt-prefix">
                    <span className="prefix">{z.modus === 'prozent' ? '%' : '€'}</span>
                    <input
                      className="input"
                      type="number"
                      step={z.modus === 'prozent' ? '0.5' : '0.01'}
                      min={0}
                      value={z.wert}
                      onChange={(e) => onPatch({ wert: Number(e.target.value) || 0 })}
                    />
                  </div>
                </WizardField>
                <WizardField label="Abzug (netto)">
                  <div className="input flex min-h-[34px] items-center bg-bw-bg-soft text-[13px] font-semibold tabular-nums text-amber-800">
                    {formatEurBetrag(total)}
                  </div>
                </WizardField>
              </>
            ) : preislisteMode ? (
              <>
                {!lockGewerk ? (
                  <WizardField label="Gewerk" hint="nur intern · erscheint nicht auf der Rechnung">
                    <select
                      className="input w-full"
                      value={z.gewerk_id ?? ''}
                      onChange={(e) => {
                        const gid = e.target.value
                        const g = gewerkById(gewerke, gid)
                        onPatch({
                          gewerk_id: gid,
                          gewerkName: g?.name,
                          gewerk_slug: g?.slug,
                          bezeichnung: '',
                          preisliste_id: null,
                        } as Partial<DokumentArtikelZeile>)
                      }}
                    >
                      <option value="">Gewerk wählen…</option>
                      {gewerke
                        .filter((g) => g.aktiv !== false)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                  </WizardField>
                ) : null}
                <WizardField label="Leistung aus Liste" required>
                  <select
                    className="input w-full"
                    value={z.preisliste_id ?? ''}
                    onChange={(e) => applyPreisliste(e.target.value)}
                    disabled={!z.gewerk_id}
                  >
                    <option value="">
                      {z.gewerk_id ? 'Leistung wählen…' : 'Zuerst Gewerk wählen…'}
                    </option>
                    {leistungenForGewerk(z.gewerk_id ?? '').map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.leistung}
                      </option>
                    ))}
                  </select>
                </WizardField>
                {!istAnfahrt ? (
                  <KostenverteilungField
                    value={kostenverteilung}
                    onChange={(next) =>
                      onPatch({ kostenverteilung: next } as Partial<DokumentArtikelZeile>)
                    }
                  />
                ) : null}
                <WizardField label="Menge">
                  <div className="lead-leistung-menge">
                    <input
                      className="input min-w-0 flex-1"
                      type="number"
                      step="0.5"
                      min={0.01}
                      value={z.menge}
                      onChange={(e) =>
                        onPatch({ menge: Math.max(Number(e.target.value) || 0, 0.01) })
                      }
                    />
                    <select
                      className="input"
                      value={z.einheit}
                      onChange={(e) => onPatch({ einheit: e.target.value })}
                    >
                      {EINHEITEN.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </WizardField>
                <WizardField
                  label="Einzelpreis netto"
                  hint={
                    z.preisliste_id
                      ? 'Abweichung von der Liste wird als eigene Leistung gespeichert'
                      : undefined
                  }
                >
                  <EuroNettoInput value={z.vkNetto} onChange={patchVkNetto} />
                </WizardField>
                <WizardField label="Zeilensumme">
                  <div className="input flex min-h-[34px] items-center bg-bw-bg-soft text-[13px] font-semibold tabular-nums">
                    {formatEurBetrag(total)}
                  </div>
                </WizardField>
                {fachbetriebHinweisAktiv ? (
                  <FachbetriebHinweisCheckbox
                    gewerkId={z.gewerk_id}
                    gewerke={gewerke}
                    hinweisAnzeigen={z.fachbetriebHinweisAnzeigen}
                    positionBeschreibung={z.positionBeschreibung}
                    hinweisText={fachbetriebHinweisText}
                    onPatch={onPatch}
                  />
                ) : null}
              </>
            ) : (
              <>
                <WizardField label="Leistung" required full>
                  <input
                    className="input w-full"
                    value={z.bezeichnung}
                    onChange={(e) => onPatch({ bezeichnung: e.target.value })}
                    placeholder="z. B. Wände streichen"
                    autoFocus
                  />
                </WizardField>
                {!lockGewerk ? (
                  <WizardField label="Gewerk" hint="nur intern · erscheint nicht auf der Rechnung">
                    <select
                      className="input w-full"
                      value={z.gewerk_id ?? ''}
                      onChange={(e) => {
                        const gid = e.target.value
                        const g = gewerkById(gewerke, gid)
                        const hinweis = g ? getHinweisForPosition(g.id, gewerke) : ''
                        const fachbetrieb = positionKannFachbetriebHinweis(gid, gewerke)
                        onPatch({
                          gewerk_id: gid || undefined,
                          gewerkName: g?.name ?? (gid ? 'Gewerk' : 'Freie Leistung'),
                          gewerk_slug: g?.slug ?? (gid ? '' : 'frei'),
                          positionBeschreibung: hinweis || undefined,
                          fachbetriebHinweisAnzeigen: fachbetrieb ? true : undefined,
                        } as Partial<DokumentArtikelZeile>)
                      }}
                    >
                      <option value="">Gewerk wählen…</option>
                      {gewerke
                        .filter((g) => g.aktiv !== false)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                  </WizardField>
                ) : null}
                {fachbetriebHinweisAktiv ? (
                  <FachbetriebHinweisCheckbox
                    gewerkId={z.gewerk_id}
                    gewerke={gewerke}
                    hinweisAnzeigen={z.fachbetriebHinweisAnzeigen}
                    positionBeschreibung={z.positionBeschreibung}
                    hinweisText={fachbetriebHinweisText}
                    onPatch={onPatch}
                  />
                ) : null}
                <WizardField label="Beschreibung" full hint="Details für Kunden & spätere Rechnung">
                  <Textarea
                    rows={3}
                    value={z.positionBeschreibung ?? ''}
                    onChange={(e) => onPatch({ positionBeschreibung: e.target.value })}
                    placeholder="z. B. inkl. Untergrund vorbereiten, Material, Endreinigung"
                  />
                </WizardField>
                <WizardField label="Menge">
                  <div className="lead-leistung-menge">
                    <input
                      className="input min-w-0 flex-1"
                      type="number"
                      step="0.5"
                      min={0.01}
                      value={z.menge}
                      onChange={(e) =>
                        onPatch({ menge: Math.max(Number(e.target.value) || 0, 0.01) })
                      }
                    />
                    <select
                      className="input"
                      value={z.einheit}
                      onChange={(e) => onPatch({ einheit: e.target.value })}
                    >
                      {EINHEITEN.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </WizardField>
                <WizardField label="Einzelpreis netto">
                  <EuroNettoInput
                    value={z.vkNetto}
                    onChange={(vkNetto) => onPatch({ vkNetto })}
                  />
                </WizardField>
                {!istAnfahrt ? (
                  <KostenverteilungField
                    value={kostenverteilung}
                    onChange={(next) =>
                      onPatch({ kostenverteilung: next } as Partial<DokumentArtikelZeile>)
                    }
                  />
                ) : null}
                <WizardField label="Steuersatz">
                  <select
                    className="input w-full"
                    value={String(z.mwstSatz)}
                    onChange={(e) =>
                      onPatch({ mwstSatz: Number(e.target.value) as MwstSatzOption })
                    }
                  >
                    {MWST_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </WizardField>
                <WizardField label="Zeilensumme">
                  <div className="input flex min-h-[34px] items-center bg-bw-bg-soft text-[13px] font-semibold tabular-nums">
                    {formatEurBetrag(total)}
                  </div>
                </WizardField>
              </>
            )}
          </div>
          <div className="pos-edit-foot">
            <button type="button" className="btn btn-ghost btn-sm gap-1.5" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" />
              Entfernen
            </button>
            <div className="flex-1" />
            {kind !== 'freitext' ? (
              <span className="pos-sub-total">
                Zeilensumme<b>{formatEurBetrag(total)}</b>
              </span>
            ) : null}
            <button type="button" className="btn btn-primary btn-sm gap-1.5" onClick={onClose}>
              <Check className="h-3.5 w-3.5" />
              Fertig
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

export function AngebotWizardPositionen({
  zeilen,
  onChange,
  gewerke,
  preislisten,
  firm,
  titel = 'Positionen',
  untertitel,
  betweenListAndAddRow,
  hideTotals = false,
  hideTitle = false,
  hideAddRow = false,
  defaultGewerk,
  lockGewerk = false,
}: {
  zeilen: DokumentZeile[]
  onChange: (next: DokumentZeile[]) => void
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  firm: FirmenEinstellungen
  titel?: string
  untertitel?: string
  /** z. B. Anfahrtskosten — zwischen letzter Position und Hinzufügen-Buttons */
  betweenListAndAddRow?: ReactNode
  hideTotals?: boolean
  hideTitle?: boolean
  /** Keine Hinzufügen-Buttons (z. B. nur Anfahrt-Zeile). */
  hideAddRow?: boolean
  /** Neue Artikel-Zeilen erhalten dieses Gewerk (Projektangebot pro Gewerk-Block). */
  defaultGewerk?: {
    gewerkId: string
    gewerkName: string
    gewerkSlug: string
    gewerkBlockKey?: string
  }
  lockGewerk?: boolean
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [preislisteIds, setPreislisteIds] = useState<Set<string>>(() => {
    const ids = zeilen
      .filter(
        (row): row is DokumentArtikelZeile =>
          row.typ === 'artikel' && Boolean(row.preisliste_id)
      )
      .map((row) => row.id)
    return new Set(ids)
  })

  const summen = useMemo(() => {
    const pos = dokumentZeilenToAngebotPositionen(zeilen, firm, gewerke)
    const b = berechneRechnung(pos, { defaultMwstSatz: 19 })
    return {
      nettoMin: b.netto,
      nettoMax: b.netto,
      mwstBetragMin: b.mwst_betrag,
      mwstBetragMax: b.mwst_betrag,
      bruttoMin: b.brutto,
      bruttoMax: b.brutto,
    }
  }, [zeilen, firm])

  const listenZeilen = useMemo(() => zeilenOhneGesamtrabatt(zeilen), [zeilen])
  const artikelNettoSumme = useMemo(() => summeArtikelNetto(zeilen), [zeilen])
  const rabattAbzugSumme = useMemo(
    () => gesamtrabattBetrag(zeilen, artikelNettoSumme),
    [zeilen, artikelNettoSumme]
  )

  const patchZeile = useCallback(
    (id: string, patch: Partial<DokumentZeile>) => {
      onChange(zeilen.map((z) => (z.id === id ? ({ ...z, ...patch } as DokumentZeile) : z)))
    },
    [zeilen, onChange]
  )

  const removeZeile = useCallback(
    (id: string) => {
      onChange(zeilen.filter((z) => z.id !== id))
      if (openId === id) setOpenId(null)
      setPreislisteIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    },
    [zeilen, onChange, openId]
  )

  const moveZeile = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const i = zeilen.findIndex((z) => z.id === id)
      if (i < 0) return
      const j = direction === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= zeilen.length) return
      const next = [...zeilen]
      ;[next[i], next[j]] = [next[j], next[i]]
      onChange(next)
    },
    [zeilen, onChange]
  )

  const artikelPartial = useCallback((): Partial<DokumentArtikelZeile> => {
    if (!defaultGewerk?.gewerkId) return {}
    return {
      gewerk_id: defaultGewerk.gewerkId,
      gewerkName: defaultGewerk.gewerkName,
      gewerk_slug: defaultGewerk.gewerkSlug,
      gewerk_block_key: defaultGewerk.gewerkBlockKey,
    }
  }, [defaultGewerk])

  const blockKeyPartial = useCallback((): { gewerk_block_key?: string } => {
    const key = defaultGewerk?.gewerkBlockKey?.trim()
    return key ? { gewerk_block_key: key } : {}
  }, [defaultGewerk])

  const addZeile = useCallback(
    (z: DokumentZeile, opts?: { preisliste?: boolean }) => {
      onChange([...zeilen, z])
      setOpenId(z.id)
      if (opts?.preisliste) {
        setPreislisteIds((prev) => new Set(prev).add(z.id))
      }
    },
    [zeilen, onChange]
  )

  const caption =
    untertitel ??
    `${zeilen.length} Position${zeilen.length === 1 ? '' : 'en'} · klicke auf eine Zeile zum Bearbeiten`

  return (
    <>
      {!hideTitle || !hideTotals ? (
        <div className={cn('flex flex-wrap items-start justify-between gap-4', !hideTitle && 'mb-3.5')}>
          {!hideTitle ? (
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-bw-text">{titel}</h2>
              <p className="mt-0.5 text-[12.5px] text-bw-text-muted">{caption}</p>
            </div>
          ) : (
            <div />
          )}
          {!hideTotals ? (
            <div className="pos-totals min-w-[280px]">
              {rabattAbzugSumme > 0 ? (
                <div className="row">
                  <div className="lbl">Zwischensumme</div>
                  <div className="val">{formatEurBetrag(artikelNettoSumme)}</div>
                </div>
              ) : null}
              {rabattAbzugSumme > 0 ? (
                <div className="row">
                  <div className="lbl">Rabatt</div>
                  <div className="val text-amber-800">−{formatEurBetrag(rabattAbzugSumme)}</div>
                </div>
              ) : null}
              <div className="row">
                <div className="lbl">Netto</div>
                <div className="val">{formatEurBetrag(summen.nettoMin)}</div>
              </div>
              <div className="row">
                <div className="lbl">zzgl. USt.</div>
                <div className="val">{formatEurBetrag(summen.mwstBetragMin)}</div>
              </div>
              <div className="row grand">
                <div className="lbl">Brutto</div>
                <div className="val">{formatEurBetrag(summen.bruttoMin)}</div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {!hideTotals ? (
        <DokumentGesamtrabattPanel zeilen={zeilen} onChange={onChange} className="mb-4" />
      ) : null}

      <div className="pos-list">
        {listenZeilen.length === 0 ? (
          <div className="pos-empty">
            <p className="font-medium text-bw-text-mid">Noch keine Positionen</p>
            <p className="mt-1 text-xs text-bw-text-muted">Wähle unten eine Hinzufüge-Option</p>
          </div>
        ) : (
          listenZeilen.map((z, i) => (
            <PositionAccordionItem
              key={z.id}
              index={i}
              z={z}
              zeilen={listenZeilen}
              open={openId === z.id}
              preislisteMode={preislisteIds.has(z.id)}
              gewerke={gewerke}
              preislisten={preislisten}
              onToggle={() => setOpenId(openId === z.id ? null : z.id)}
              onClose={() => {
                setOpenId(null)
                if (z.typ !== 'artikel' || !z.preisliste_id) {
                  setPreislisteIds((prev) => {
                    const next = new Set(prev)
                    next.delete(z.id)
                    return next
                  })
                }
              }}
              onPatch={(patch) => patchZeile(z.id, patch)}
              onRemove={() => removeZeile(z.id)}
              canMoveUp={i > 0}
              canMoveDown={i < listenZeilen.length - 1}
              onMoveUp={() => moveZeile(z.id, 'up')}
              onMoveDown={() => moveZeile(z.id, 'down')}
              lockGewerk={lockGewerk}
            />
          ))
        )}
      </div>

      {betweenListAndAddRow ? (
        <div className="border-t border-hairline border-bw-border">{betweenListAndAddRow}</div>
      ) : null}

      {!hideAddRow ? (
      <div className="pos-add-row">
        <button
          type="button"
          className="pos-add-btn"
          onClick={() =>
            addZeile(neueArtikelZeile({ bezeichnung: 'Neue Position', ...artikelPartial() }))
          }
        >
          <span className="icon-wrap">
            <Plus className="h-4 w-4" />
          </span>
          <span className="lbl-block">
            <span>Freie Position</span>
            <span className="sub">leer anlegen</span>
          </span>
        </button>
        <button
          type="button"
          className="pos-add-btn"
          onClick={() => addZeile(neueArtikelZeile(artikelPartial()), { preisliste: true })}
        >
          <span className="icon-wrap">
            <ListFilter className="h-4 w-4" />
          </span>
          <span className="lbl-block">
            <span>Aus Preisliste</span>
            <span className="sub">Vorlage wählen</span>
          </span>
        </button>
        <button
          type="button"
          className="pos-add-btn"
          onClick={() => addZeile({ ...neueFreitextZeile(), ...blockKeyPartial() })}
        >
          <span className="icon-wrap">
            <AlignLeft className="h-4 w-4" />
          </span>
          <span className="lbl-block">
            <span>Freitext</span>
            <span className="sub">Hinweis ohne Preis</span>
          </span>
        </button>
      </div>
      ) : null}
    </>
  )
}

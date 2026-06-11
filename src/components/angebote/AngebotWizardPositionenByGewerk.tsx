'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { AngebotWizardPositionen } from '@/components/angebote/AngebotWizardPositionen'
import { DokumentGesamtrabattPanel } from '@/components/dokumente/DokumentGesamtrabattPanel'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'
import { toast } from '@/components/ui/app-toast'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  GEWERK_BLOCK_ANFAHRT,
  GEWERK_BLOCK_SONST,
  groupZeilenByGewerk,
  mergeGewerkBlocks,
  normalizeBlockZeilen,
  neueGewerkSection,
  type GewerkPositionsBlock,
} from '@/lib/angebote/angebot-gewerk-blocks'
import { neuePositionsId } from '@/lib/angebot-positionen'
import {
  dokumentZeilenToAngebotPositionen,
  formatEurBetrag,
  GEWERK_BESCHREIBUNG_TITEL,
  GEWERK_NAME_ALLGEMEIN,
  gesamtrabattBetrag,
  getGesamtrabattZeile,
  mitDokumentGesamtrabatt,
  neueFreitextZeile,
  summeArtikelNetto,
  type DokumentArtikelZeile,
  type DokumentFreitextZeile,
  type DokumentZeile,
} from '@/lib/dokument-zeilen'
import { berechneRechnung } from '@/lib/rechnung-berechnung'
import {
  anfahrtLeistungText,
  bindAnfahrtToGewerkBlock,
  createAnfahrtZeile,
  findAnfahrtZeile,
  hatAnfahrtFuerBlock,
  isAnfahrtZeile,
  ohneAnfahrtZeilen,
  rebindLooseAnfahrtZeilen,
} from '@/lib/anfahrt-angebot'
import { gewerkById } from '@/lib/gewerke-ausfuehrung'
import { cn } from '@/lib/utils'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { Gewerk, Preisliste } from '@/lib/types'

type PendingSection = {
  sectionKey: string
  gewerkId: string
  gewerkName: string
  gewerkSlug: string
}

function isGewerkBeschreibungZeile(z: DokumentZeile): z is DokumentFreitextZeile {
  return z.typ === 'freitext' && z.titel === GEWERK_BESCHREIBUNG_TITEL
}

function blockSummeNetto(zeilen: DokumentZeile[]): number {
  return summeArtikelNetto(zeilen)
}

function blockDisplayTitle(block: GewerkPositionsBlock): string {
  const fromArtikel = block.zeilen.find((z) => z.typ === 'artikel')?.gewerkName?.trim()
  return fromArtikel || block.gewerkName
}

function defaultPendingGewerkSection(
  gewerke: Gewerk[],
  defaultGewerkTitel?: string
): PendingSection[] {
  const titel = defaultGewerkTitel?.trim() || GEWERK_NAME_ALLGEMEIN
  const g = gewerke.find((x) => x.aktiv !== false && x.id)
  if (g) {
    const section = neueGewerkSection(g)
    return [
      {
        sectionKey: section.key,
        gewerkId: g.id,
        gewerkName: titel,
        gewerkSlug: g.slug,
      },
    ]
  }
  return [
    {
      sectionKey: neuePositionsId(),
      gewerkId: '',
      gewerkName: titel,
      gewerkSlug: 'sonst',
    },
  ]
}

const GEWERK_TITEL_HINT =
  'Überschrift des Gewerk-Abschnitts im Angebot (PDF), z. B. „Malerarbeiten“ oder „Elektroarbeiten“'
const GEWERK_BESCHREIBUNG_HINT =
  'Optional: Fließtext direkt unter dem Gewerk-Titel im PDF — z. B. Umfang oder Hinweise zum Abschnitt'

function GewerkBlockMeta({
  displayTitle,
  blockBeschreibung,
  onRename,
  onBeschreibungChange,
}: {
  displayTitle: string
  blockBeschreibung: string
  onRename: (name: string) => void
  onBeschreibungChange: (value: string) => void
}) {
  const isMobile = useIsMobile()
  const [titleDraft, setTitleDraft] = useState(displayTitle)

  useEffect(() => {
    setTitleDraft(displayTitle)
  }, [displayTitle])

  function commitTitleDraft() {
    const next = titleDraft.trim()
    if (!next) {
      toast.error('Gewerk-Titel darf nicht leer sein.')
      setTitleDraft(displayTitle)
      return
    }
    if (next !== displayTitle) onRename(next)
  }

  const editFields = (
    <div className="gewerk-block-meta-fields space-y-3">
      <label className="block min-w-0">
        <span className="input-label">Gewerk-Titel</span>
        <input
          className="input h-8 text-[13px] font-semibold"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitleDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitTitleDraft()
            }
          }}
          placeholder="z. B. Malerarbeiten"
          aria-label="Gewerk-Titel bearbeiten"
        />
        <p className="wizard-field-hint mt-1">{GEWERK_TITEL_HINT}</p>
      </label>
      <label className="block min-w-0">
        <span className="input-label">Beschreibung (optional)</span>
        <textarea
          className="input min-h-[72px] w-full resize-y text-[12px] leading-relaxed"
          value={blockBeschreibung}
          onChange={(e) => onBeschreibungChange(e.target.value)}
          placeholder="z. B. Wände und Decke inkl. Grundierung"
          aria-label={`Beschreibung für ${displayTitle}`}
        />
        <p className="wizard-field-hint mt-1">{GEWERK_BESCHREIBUNG_HINT}</p>
      </label>
    </div>
  )

  const overview = (
    <dl className="space-y-2">
      <MobileOverviewField label="Gewerk-Titel" value={displayTitle} />
      <MobileOverviewField
        label="Beschreibung (optional)"
        value={
          <span className="whitespace-pre-wrap text-bw-text-muted">
            {blockBeschreibung.trim() || '—'}
          </span>
        }
      />
    </dl>
  )

  if (!isMobile) {
    return editFields
  }

  return (
    <MobileEditableBlock sheetTitle="Gewerk bearbeiten" overview={overview} editLabel="Gewerk bearbeiten">
      {editFields}
    </MobileEditableBlock>
  )
}

export function AngebotWizardPositionenByGewerk({
  zeilen,
  onChange,
  gewerke,
  preislisten,
  firm,
  titel = 'Positionen',
  untertitel,
  betweenListAndAddRow,
  hideGewerkAddRow = false,
  ensureInitialGewerkBlock = false,
  defaultGewerkTitel,
}: {
  zeilen: DokumentZeile[]
  onChange: (next: DokumentZeile[]) => void
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  firm: FirmenEinstellungen
  titel?: string
  untertitel?: string
  betweenListAndAddRow?: ReactNode
  /** Einfaches Angebot: kein „Gewerk hinzufügen“, genau ein Abschnitt. */
  hideGewerkAddRow?: boolean
  /** Leerer Wizard: sofort einen bearbeitbaren Gewerk-Abschnitt anlegen. */
  ensureInitialGewerkBlock?: boolean
  defaultGewerkTitel?: string
}) {
  const [pendingSections, setPendingSections] = useState<PendingSection[]>([])
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set())
  const [addGewerkId, setAddGewerkId] = useState('')
  const ensuredInitialGewerkRef = useRef(false)

  const einfachSingleGewerk = hideGewerkAddRow && ensureInitialGewerkBlock

  const grouped = useMemo(() => groupZeilenByGewerk(zeilen, gewerke), [zeilen, gewerke])

  const mainBlocks = useMemo((): GewerkPositionsBlock[] => {
    const fromZeilen = grouped.filter((b) => b.key !== GEWERK_BLOCK_ANFAHRT)
    const keys = new Set(fromZeilen.map((b) => b.key))
    const pending: GewerkPositionsBlock[] = pendingSections
      .filter((p) => !keys.has(p.sectionKey))
      .map((p) => ({
        key: p.sectionKey,
        gewerkId: p.gewerkId,
        gewerkName: p.gewerkName,
        gewerkSlug: p.gewerkSlug,
        zeilen: [],
      }))
    return [...fromZeilen, ...pending]
  }, [grouped, pendingSections, gewerke])

  /** Einfaches Angebot: immer genau ein sichtbarer Gewerk-Abschnitt (auch ohne Positionen). */
  const displayBlocks = useMemo((): GewerkPositionsBlock[] => {
    if (!einfachSingleGewerk) return mainBlocks
    if (mainBlocks.length > 0) return mainBlocks
    const pending = defaultPendingGewerkSection(gewerke, defaultGewerkTitel)
    return pending.map((p) => ({
      key: p.sectionKey,
      gewerkId: p.gewerkId,
      gewerkName: p.gewerkName,
      gewerkSlug: p.gewerkSlug,
      zeilen: [],
    }))
  }, [einfachSingleGewerk, mainBlocks, gewerke, defaultGewerkTitel])

  const artikelNettoGesamt = useMemo(() => summeArtikelNetto(zeilen), [zeilen])
  const rabattAbzugGesamt = useMemo(
    () => gesamtrabattBetrag(zeilen, artikelNettoGesamt),
    [zeilen, artikelNettoGesamt]
  )
  const summenGesamt = useMemo(() => {
    const b = berechneRechnung(dokumentZeilenToAngebotPositionen(zeilen, firm, gewerke), {
      defaultMwstSatz: 19,
    })
    return {
      nettoMin: b.netto,
      mwstBetragMin: b.mwst_betrag,
      bruttoMin: b.brutto,
    }
  }, [zeilen, firm])

  const gesamtrabattZeile = useMemo(() => getGesamtrabattZeile(zeilen), [zeilen])

  const emitZeilen = useCallback(
    (blocks: GewerkPositionsBlock[]) => {
      onChange(mitDokumentGesamtrabatt(mergeGewerkBlocks(blocks), gesamtrabattZeile))
    },
    [onChange, gesamtrabattZeile]
  )

  useEffect(() => {
    if (!ensureInitialGewerkBlock || ensuredInitialGewerkRef.current) return
    if (zeilen.some((z) => z.typ === 'artikel') || pendingSections.length > 0) {
      ensuredInitialGewerkRef.current = true
      return
    }
    ensuredInitialGewerkRef.current = true
    const pending = defaultPendingGewerkSection(gewerke, defaultGewerkTitel)
    setPendingSections(pending)
    setOpenSections(new Set(pending.map((p) => p.sectionKey)))
  }, [ensureInitialGewerkBlock, zeilen, pendingSections.length, gewerke, defaultGewerkTitel])

  useEffect(() => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      for (const b of displayBlocks) next.add(b.key)
      return next
    })
  }, [displayBlocks])

  useEffect(() => {
    const activeKeys = new Set(
      grouped
        .filter((b) => b.key !== GEWERK_BLOCK_ANFAHRT && b.zeilen.length > 0)
        .map((b) => b.key)
    )
    setPendingSections((prev) => {
      const filtered = prev.filter((p) => !activeKeys.has(p.sectionKey))
      if (einfachSingleGewerk && filtered.length === 0) {
        const hasGrouped = grouped.some((b) => b.key !== GEWERK_BLOCK_ANFAHRT)
        if (!hasGrouped) return defaultPendingGewerkSection(gewerke, defaultGewerkTitel)
      }
      return filtered
    })
  }, [grouped, einfachSingleGewerk, gewerke, defaultGewerkTitel])

  /** Einfaches Angebot: Gewerk-Abschnitt wiederherstellen, wenn alle Positionen gelöscht wurden. */
  useEffect(() => {
    if (!einfachSingleGewerk) return
    const hasSection =
      grouped.some((b) => b.key !== GEWERK_BLOCK_ANFAHRT) || pendingSections.length > 0
    if (hasSection) return
    const pending = defaultPendingGewerkSection(gewerke, defaultGewerkTitel)
    setPendingSections(pending)
    setOpenSections(new Set(pending.map((p) => p.sectionKey)))
  }, [einfachSingleGewerk, grouped, pendingSections.length, gewerke, defaultGewerkTitel])

  useEffect(() => {
    const anf = findAnfahrtZeile(zeilen)
    if (!anf || anf.gewerk_block_key?.trim()) return
    const rebound = rebindLooseAnfahrtZeilen(zeilen)
    const reboundAnf = findAnfahrtZeile(rebound)
    if (reboundAnf?.gewerk_block_key?.trim()) onChange(rebound)
  }, [zeilen, onChange])

  /** Lose Anfahrt ohne Gewerk-Abschnitt: nur Anfahrt entfernen, nicht alle Positionen löschen. */
  useEffect(() => {
    if (mainBlocks.length > 0 || !findAnfahrtZeile(zeilen)) return
    onChange(mitDokumentGesamtrabatt(ohneAnfahrtZeilen(zeilen), gesamtrabattZeile))
  }, [mainBlocks.length, zeilen, onChange, gesamtrabattZeile])

  const rebuildZeilen = useCallback(
    (blocks: GewerkPositionsBlock[]) => {
      emitZeilen(blocks)
    },
    [emitZeilen]
  )

  const moveBlock = useCallback(
    (blockKey: string, direction: 'up' | 'down') => {
      if (einfachSingleGewerk) return
      const i = mainBlocks.findIndex((b) => b.key === blockKey)
      if (i < 0) return
      const j = direction === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= mainBlocks.length) return
      const next = [...mainBlocks]
      ;[next[i], next[j]] = [next[j], next[i]]
      emitZeilen(next)
    },
    [mainBlocks, emitZeilen, einfachSingleGewerk]
  )

  const renameBlockTitle = useCallback(
    (blockKey: string, newName: string) => {
      const nextBlocks = displayBlocks.map((b) => {
        if (b.key !== blockKey) return b
        return {
          ...b,
          gewerkName: newName,
          zeilen: b.zeilen.map((z) =>
            z.typ === 'artikel'
              ? {
                  ...z,
                  gewerkName: newName,
                  gewerk_block_key: z.gewerk_block_key ?? blockKey,
                }
              : z
          ),
        }
      })
      setPendingSections((prev) =>
        prev.map((p) => (p.sectionKey === blockKey ? { ...p, gewerkName: newName } : p))
      )
      rebuildZeilen(nextBlocks)
    },
    [displayBlocks, rebuildZeilen]
  )

  const setBlockBeschreibung = useCallback(
    (blockKey: string, text: string) => {
      const nextBlocks = displayBlocks.map((b) => {
        if (b.key !== blockKey) return b
        const rest = b.zeilen.filter((z) => !isGewerkBeschreibungZeile(z))
        if (!text.trim()) return { ...b, zeilen: rest }
        const existing = b.zeilen.find(isGewerkBeschreibungZeile)
        const beschreibung = existing
          ? { ...existing, text, gewerk_block_key: existing.gewerk_block_key ?? blockKey }
          : neueFreitextZeile({
              titel: GEWERK_BESCHREIBUNG_TITEL,
              text,
              gewerk_block_key: blockKey,
            })
        return { ...b, zeilen: [beschreibung, ...rest] }
      })
      rebuildZeilen(nextBlocks)
    },
    [displayBlocks, rebuildZeilen]
  )

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const gewerkeFuerNeueSection = useMemo(
    () => gewerke.filter((g) => g.aktiv !== false && g.id),
    [gewerke]
  )

  function handleAddGewerkSection() {
    const g = gewerkById(gewerke, addGewerkId)
    if (!g) {
      toast.error('Bitte ein Gewerk auswählen.')
      return
    }
    const section = neueGewerkSection(g)
    setPendingSections((p) => [
      ...p,
      {
        sectionKey: section.key,
        gewerkId: g.id,
        gewerkName: g.name,
        gewerkSlug: g.slug,
      },
    ])
    setOpenSections((s) => new Set(s).add(section.key))
    setAddGewerkId('')
  }

  function removeEmptySection(block: GewerkPositionsBlock) {
    if (block.zeilen.length > 0) return
    if (block.key === GEWERK_BLOCK_SONST) return
    setPendingSections((p) => p.filter((x) => x.sectionKey !== block.key))
    setOpenSections((s) => {
      const next = new Set(s)
      next.delete(block.key)
      return next
    })
  }

  const toggleBlockAnfahrt = useCallback(
    (block: GewerkPositionsBlock, displayTitle: string, checked: boolean) => {
      const blockRef = {
        key: block.key,
        gewerkId: block.gewerkId,
        gewerkName: displayTitle,
        gewerkSlug: block.gewerkSlug,
      }
      if (checked) {
        if (hatAnfahrtFuerBlock(block.zeilen, block.key)) return
        const anfahrt = bindAnfahrtToGewerkBlock(createAnfahrtZeile(firm), blockRef)
        const nextBlocks = displayBlocks.map((b) =>
          b.key === block.key
            ? { ...b, zeilen: normalizeBlockZeilen(b, [...b.zeilen, anfahrt]) }
            : b
        )
        emitZeilen(nextBlocks)
        return
      }
      if (!hatAnfahrtFuerBlock(block.zeilen, block.key)) return
      const nextBlocks = displayBlocks.map((b) =>
        b.key === block.key
          ? { ...b, zeilen: normalizeBlockZeilen(b, ohneAnfahrtZeilen(b.zeilen)) }
          : b
      )
      emitZeilen(nextBlocks)
    },
    [displayBlocks, emitZeilen, firm]
  )

  const zeilenCount = zeilen.filter((z) => z.typ === 'artikel').length
  const caption =
    untertitel ??
    `${zeilenCount} Position${zeilenCount === 1 ? '' : 'en'} · nach Gewerk gruppiert · Gewerke und Positionen per Pfeil verschieben`

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-bw-text">{titel}</h2>
          <p className="mt-0.5 text-[12.5px] text-bw-text-muted">{caption}</p>
        </div>
        <div className="pos-totals min-w-[280px]">
          {rabattAbzugGesamt > 0 ? (
            <div className="row">
              <div className="lbl">Zwischensumme</div>
              <div className="val">{formatEurBetrag(artikelNettoGesamt)}</div>
            </div>
          ) : null}
          {rabattAbzugGesamt > 0 ? (
            <div className="row">
              <div className="lbl">Rabatt</div>
              <div className="val text-amber-800">−{formatEurBetrag(rabattAbzugGesamt)}</div>
            </div>
          ) : null}
          <div className="row">
            <div className="lbl">Netto gesamt</div>
            <div className="val">{formatEurBetrag(summenGesamt.nettoMin)}</div>
          </div>
          <div className="row">
            <div className="lbl">zzgl. USt.</div>
            <div className="val">{formatEurBetrag(summenGesamt.mwstBetragMin)}</div>
          </div>
          <div className="row grand">
            <div className="lbl">Brutto</div>
            <div className="val">{formatEurBetrag(summenGesamt.bruttoMin)}</div>
          </div>
        </div>
      </div>

      <DokumentGesamtrabattPanel zeilen={zeilen} onChange={onChange} className="mb-4" />

      <div className="space-y-3">
        {displayBlocks.length === 0 ? (
          <div className="pos-empty rounded-lg border border-bw-border">
            <p className="font-medium text-bw-text-mid">Noch kein Gewerk angelegt</p>
            <p className="mt-1 text-xs text-bw-text-muted">
              Unten ein Gewerk hinzufügen und Positionen erfassen.
            </p>
            <p className="mt-2 text-[11px] text-bw-text-muted">
              Pro Gewerk-Abschnitt können Sie unten eigene Anfahrtskosten aktivieren.
            </p>
          </div>
        ) : (
          displayBlocks.map((block, blockIndex) => {
            const open = openSections.has(block.key)
            const netto = blockSummeNetto(block.zeilen)
            const posCount = block.zeilen.filter((z) => z.typ === 'artikel').length
            const canRemoveEmpty =
              !hideGewerkAddRow &&
              block.zeilen.length === 0 &&
              block.key !== GEWERK_BLOCK_SONST
            const displayTitle = blockDisplayTitle(block)
            const blockHatAnfahrt = hatAnfahrtFuerBlock(block.zeilen, block.key)
            const blockBeschreibungZeile = block.zeilen.find(isGewerkBeschreibungZeile)
            const blockBeschreibung = blockBeschreibungZeile?.text ?? ''
            const blockZeilenOhneBeschreibung = block.zeilen.filter(
              (z) =>
                !(z.typ === 'freitext' && z.titel === GEWERK_BESCHREIBUNG_TITEL)
            )

            return (
              <div key={block.key} className="pos-gewerk-section overflow-hidden rounded-lg border border-bw-border">
                <div className="flex items-stretch bg-bw-card">
                  <div className="flex min-h-[48px] min-w-0 flex-1 items-start gap-3 px-4 py-4">
                    {!einfachSingleGewerk && mainBlocks.length > 1 ? (
                      <div className="pos-reorder shrink-0" aria-label="Reihenfolge Gewerk">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm pos-reorder-btn"
                          title="Gewerk nach oben"
                          aria-label="Gewerk nach oben verschieben"
                          disabled={blockIndex === 0}
                          onClick={(e) => {
                            e.stopPropagation()
                            moveBlock(block.key, 'up')
                          }}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm pos-reorder-btn"
                          title="Gewerk nach unten"
                          aria-label="Gewerk nach unten verschieben"
                          disabled={blockIndex === displayBlocks.length - 1}
                          onClick={(e) => {
                            e.stopPropagation()
                            moveBlock(block.key, 'down')
                          }}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <GewerkBlockMeta
                        displayTitle={displayTitle}
                        blockBeschreibung={blockBeschreibung}
                        onRename={(name) => renameBlockTitle(block.key, name)}
                        onBeschreibungChange={(value) => setBlockBeschreibung(block.key, value)}
                      />
                      <div className="mt-0.5 text-[11px] text-bw-text-muted">
                        {posCount} Position{posCount === 1 ? '' : 'en'}
                        {blockZeilenOhneBeschreibung.some((z) => z.typ === 'freitext')
                          ? ' · inkl. Freitext'
                          : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mt-1 flex shrink-0 items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-bw-hover"
                      onClick={() => toggleSection(block.key)}
                      aria-expanded={open}
                      aria-label={open ? 'Gewerk einklappen' : 'Gewerk aufklappen'}
                    >
                      <span className="text-[13px] font-semibold tabular-nums text-bw-text">
                        {formatEurBetrag(netto)}
                      </span>
                      <ChevronDown
                        className={cn('h-4 w-4 shrink-0 text-bw-text-muted transition-transform', open && 'rotate-180')}
                        aria-hidden
                      />
                    </button>
                  </div>
                  {canRemoveEmpty ? (
                    <button
                      type="button"
                      className="btn btn-ghost shrink-0 rounded-none border-l border-bw-border px-3"
                      title="Leeren Gewerk-Abschnitt entfernen"
                      onClick={() => removeEmptySection(block)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                {open ? (
                  <div className="border-t border-bw-border bg-surface px-3 py-3">
                    <AngebotWizardPositionen
                      zeilen={blockZeilenOhneBeschreibung}
                      onChange={(next) => {
                        const blockRef = {
                          key: block.key,
                          gewerkId: block.gewerkId,
                          gewerkName: displayTitle,
                          gewerkSlug: block.gewerkSlug,
                        }
                        const anfahrt = next
                          .filter(
                            (z): z is DokumentArtikelZeile =>
                              z.typ === 'artikel' && isAnfahrtZeile(z)
                          )
                          .map((z) => bindAnfahrtToGewerkBlock(z, blockRef))
                        const rest = next.filter((z) => !isAnfahrtZeile(z))
                        const nextBlocks = displayBlocks.map((b) =>
                          b.key === block.key
                            ? {
                                ...b,
                                zeilen: normalizeBlockZeilen(b, [
                                  ...(blockBeschreibungZeile ? [blockBeschreibungZeile] : []),
                                  ...rest,
                                  ...anfahrt,
                                ]),
                              }
                            : b
                        )
                        emitZeilen(nextBlocks)
                      }}
                      gewerke={gewerke}
                      preislisten={preislisten}
                      firm={firm}
                      hideTitle
                      hideTotals
                      lockGewerk={Boolean(block.gewerkId)}
                      defaultGewerk={
                        block.gewerkId
                          ? {
                              gewerkId: block.gewerkId,
                              gewerkName: displayTitle,
                              gewerkSlug: block.gewerkSlug,
                              gewerkBlockKey: block.key,
                            }
                          : undefined
                      }
                      betweenListAndAddRow={
                        <div className="px-3 py-2.5">
                          <label className="flex cursor-pointer flex-wrap items-center gap-2 text-[13px] text-bw-text">
                            <input
                              type="checkbox"
                              checked={blockHatAnfahrt}
                              onChange={(e) =>
                                toggleBlockAnfahrt(block, displayTitle, e.target.checked)
                              }
                            />
                            <span className="font-medium">{anfahrtLeistungText(firm)}</span>
                            <span className="text-[11px] text-bw-text-muted">
                              nur für dieses Gewerk
                            </span>
                          </label>
                        </div>
                      }
                    />
                  </div>
                ) : null}
              </div>
            )
          })
        )}
      </div>

      {betweenListAndAddRow ? (
        <div className="mt-3 rounded-lg border border-bw-border bg-bw-card px-3 py-2.5">
          {betweenListAndAddRow}
        </div>
      ) : null}

      {!hideGewerkAddRow ? (
        <div className="pos-gewerk-add-row">
          <span className="pos-gewerk-add-label">Gewerk hinzufügen</span>
          <select
            className="input"
            value={addGewerkId}
            onChange={(e) => setAddGewerkId(e.target.value)}
            aria-label="Gewerk auswählen"
          >
            <option value="">Gewerk wählen…</option>
            {gewerkeFuerNeueSection.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-sm gap-1"
            disabled={!addGewerkId}
            onClick={handleAddGewerkSection}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Abschnitt
          </button>
        </div>
      ) : null}
    </>
  )
}

'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import { updateAuftragPositionSteuerung } from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'
import {
  sendAuftragLeistungenAnHandwerkerV3,
  zuweiseHandwerkerAnPositionenV3,
} from '@/app/(dashboard)/auftraege/leistungen-steuerung-v3-actions'
import type { HandwerkerGewerkListeEintrag } from '@/app/(dashboard)/angebote/actions'
import type { AuftragPosition } from '@/lib/types'
import { richTextToPlain } from '@/lib/rich-text'
import { BEREICH_LABELS, cn } from '@/lib/utils'
import { handwerkerInitialen } from '@/components/auftraege/leistungen-v3/utils'
import { HandwerkerSuchenSheet } from '@/components/auftraege/leistungen-v3/HandwerkerSuchenSheet'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'

function ymdToDisplay(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return ymd
  return `${m[3]}.${m[2]}.${m[1]}`
}

function displayToYmd(display: string): string {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(display.trim())
  if (!m) return display
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

function numInput(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return ''
  return String(Math.round(v * 100) / 100)
}

function parseNum(raw: string): number | null {
  const n = Number(String(raw).replace(',', '.').trim())
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

function gewerkeLabel(h: HandwerkerGewerkListeEintrag): string {
  const raw = h.gewerke ?? []
  if (!raw.length) return ''
  return raw
    .map((s) => BEREICH_LABELS[s] ?? s.replace(/_/g, ' '))
    .filter(Boolean)
    .join(' · ')
}

export function AuftragLeistungZuweisungModal({
  open,
  onClose,
  auftragId,
  angebotId = null,
  projektName = 'Projekt',
  positionIds,
  positionen,
  gewerke = [],
  onDone,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  angebotId?: string | null
  projektName?: string
  positionIds: string[]
  positionen: AuftragPosition[]
  gewerke?: { id: string; name: string; slug: string }[]
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [dirty, setDirty] = useState(false)
  const [selectedHwIds, setSelectedHwIds] = useState<Set<string>>(() => new Set())
  const [selectedHwRows, setSelectedHwRows] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [partnerNetto, setPartnerNetto] = useState('')
  const [zeitModus, setZeitModus] = useState<'zeitraum' | 'tag'>('zeitraum')
  const [von, setVon] = useState('')
  const [bis, setBis] = useState('')

  const selectedPositions = useMemo(
    () => positionen.filter((p) => positionIds.includes(p.id)),
    [positionen, positionIds]
  )
  const sample = selectedPositions[0]
  const isSingle = selectedPositions.length === 1
  const subtitle = isSingle
    ? sample?.leistung_name?.trim() || 'Leistung'
    : `${selectedPositions.length} Leistungen`

  useEffect(() => {
    if (!open) {
      setSelectedHwIds(new Set())
      setSelectedHwRows([])
      setPickerOpen(false)
      setDirty(false)
      return
    }
    if (!sample) return
    setTitel(sample.leistung_name?.trim() || '')
    setBeschreibung(richTextToPlain(sample.beschreibung ?? '') || '')
    setPartnerNetto(numInput(sample.preis_partner))
    const start = sample.start_datum?.slice(0, 10) || ''
    const end = sample.end_datum?.slice(0, 10) || ''
    setVon(start ? ymdToDisplay(start) : '')
    setBis(end ? ymdToDisplay(end) : '')
    setZeitModus(start && end && start === end ? 'tag' : 'zeitraum')
    if (sample.handwerker_id) {
      setSelectedHwIds(new Set([sample.handwerker_id]))
      // Zeile wird beim Öffnen des Pickers / Übernehmen befüllt; Platzhalter bis dahin
      setSelectedHwRows((prev) => {
        const hit = prev.find((h) => h.id === sample.handwerker_id)
        if (hit) return [hit]
        return [
          {
            id: sample.handwerker_id!,
            name: 'Zugewiesener Partner',
            firma: null,
            telefon: null,
            letzter_einsatz: null,
            verfuegbar: true,
            gewerke: sample.gewerk_slug ? [sample.gewerk_slug] : null,
          },
        ]
      })
    } else {
      setSelectedHwIds(new Set())
      setSelectedHwRows([])
    }
    setDirty(false)
  }, [open, sample])

  function removeHw(id: string) {
    setDirty(true)
    setSelectedHwIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setSelectedHwRows((prev) => prev.filter((h) => h.id !== id))
  }

  function confirm() {
    const ids = Array.from(selectedHwIds)
    if (!ids.length) {
      toast.error('Bitte mindestens einen Handwerker auswählen.')
      return
    }
    const primaryHw = ids[0]
    const ekNum = parseNum(partnerNetto)
    if (ekNum == null || ekNum <= 0) {
      toast.error('Partner-EK (netto) muss größer als 0 € sein.')
      return
    }
    const vonYmd = von.trim() ? displayToYmd(von) : null
    const bisYmd =
      zeitModus === 'tag'
        ? vonYmd
        : bis.trim()
          ? displayToYmd(bis)
          : vonYmd

    startTransition(async () => {
      if (isSingle && sample) {
        const patch = await updateAuftragPositionSteuerung(sample.id, auftragId, {
          leistung_name: titel.trim() || sample.leistung_name,
          beschreibung: beschreibung.trim() || null,
          preis_partner: ekNum,
          start_datum: vonYmd,
          end_datum: bisYmd,
        })
        if (!patch.ok) {
          toast.error(patch.message)
          return
        }
      }

      const assign = await zuweiseHandwerkerAnPositionenV3({
        auftragId,
        positionIds,
        handwerkerId: primaryHw,
        ekNetto: ekNum,
      })
      if (!assign.ok) {
        toast.error(assign.message)
        return
      }

      const sent = await sendAuftragLeistungenAnHandwerkerV3({
        auftragId,
        angebotId,
        projektName,
        gewerke,
        positionIds,
      })
      if (!sent.ok) {
        toast.error(sent.message)
        return
      }

      toast.success(
        sent.gesendet === 1
          ? 'Anfrage an Handwerker gesendet'
          : `${sent.gesendet} Anfragen an Handwerker gesendet`
      )
      onDone()
      onClose()
    })
  }

  const ekOk = (() => {
    const n = parseNum(partnerNetto)
    return n != null && n > 0
  })()
  const canSend = !pending && selectedHwIds.size > 0 && ekOk

  const selectedDisplay = useMemo(() => {
    return selectedHwRows.filter((h) => selectedHwIds.has(h.id))
  }, [selectedHwRows, selectedHwIds])

  return (
    <>
      <EditorSheet
        open={open}
        onClose={onClose}
        title="Zuweisung"
        context="detail"
        dirty={dirty}
        size="lg"
        compose
        composeLabel={pending ? 'Senden…' : 'Senden'}
        confirmBusy={pending}
        confirmDisabled={!canSend}
        onConfirm={confirm}
        className="hw-anfrage-modal"
        bodyClassName="hw-anfrage-body"
      >
        <p className="mb-3 text-[length:var(--fs-text)] text-bw-text-muted">{subtitle}</p>
        {isSingle ? (
          <>
            <label className="hw-anfrage-field">
              <span className="hw-anfrage-label">Titel</span>
              <input
                className="input"
                value={titel}
                onChange={(e) => {
                  setDirty(true)
                  setTitel(e.target.value)
                }}
                disabled={pending}
              />
            </label>

            <div className="hw-anfrage-field">
              <KiAssistFieldLabel
                label="Beschreibung"
                value={beschreibung}
                onApply={(text) => {
                  setDirty(true)
                  setBeschreibung(text)
                }}
                extraHint="Leistungsbeschreibung für die Handwerker-Anfrage (Partner-Portal / Mail)."
                disabled={pending}
              >
                <textarea
                  className="input ta"
                  rows={5}
                  value={beschreibung}
                  onChange={(e) => {
                    setDirty(true)
                    setBeschreibung(e.target.value)
                  }}
                  disabled={pending}
                />
              </KiAssistFieldLabel>
            </div>

            <label className="hw-anfrage-field">
              <span className="hw-anfrage-label">Partner-EK netto *</span>
              <div className="txt-prefix">
                <span className="prefix" aria-hidden>
                  €
                </span>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="0.01"
                  required
                  value={partnerNetto}
                  onChange={(e) => {
                    setDirty(true)
                    setPartnerNetto(e.target.value)
                  }}
                  disabled={pending}
                  aria-invalid={!ekOk && partnerNetto.trim() !== ''}
                />
              </div>
              {!ekOk ? (
                <span className="hw-anfrage-hint" style={{ color: 'var(--red, #b91c1c)', fontSize: 'var(--fs-meta)' }}>
                  Pflicht — größer als 0 €
                </span>
              ) : null}
            </label>

            <div className="hw-anfrage-section">
              <div className="hw-anfrage-section-head">
                <span>Zeitraum</span>
              </div>
              <div className="hw-anfrage-seg" role="group" aria-label="Zeitraum-Modus">
                <button
                  type="button"
                  className={cn('hw-anfrage-seg-btn', zeitModus === 'zeitraum' && 'is-active')}
                  onClick={() => {
                    setDirty(true)
                    setZeitModus('zeitraum')
                  }}
                  disabled={pending}
                >
                  Zeitraum
                </button>
                <button
                  type="button"
                  className={cn('hw-anfrage-seg-btn', zeitModus === 'tag' && 'is-active')}
                  onClick={() => {
                    setDirty(true)
                    setZeitModus('tag')
                    if (von) setBis(von)
                  }}
                  disabled={pending}
                >
                  Einzelner Tag
                </button>
              </div>
              <div className={cn('hw-anfrage-date-row', zeitModus === 'tag' && 'hw-anfrage-date-row--single')}>
                <label className="hw-anfrage-field">
                  <span className="hw-anfrage-label">{zeitModus === 'tag' ? 'Datum' : 'Von'}</span>
                  <div className="hw-anfrage-date-field">
                    <input
                      type="date"
                      className="input"
                      value={von.trim() ? displayToYmd(von) : ''}
                      onChange={(e) => {
                        setDirty(true)
                        const v = e.target.value
                        setVon(v ? ymdToDisplay(v) : '')
                        if (zeitModus === 'tag') setBis(v ? ymdToDisplay(v) : '')
                      }}
                      disabled={pending}
                    />
                    <button
                      type="button"
                      className="hw-anfrage-date-icon"
                      tabIndex={-1}
                      disabled={pending}
                      aria-label="Kalender öffnen"
                      onClick={(e) => {
                        const input = (e.currentTarget.parentElement?.querySelector(
                          'input[type="date"]'
                        ) ?? null) as HTMLInputElement | null
                        try {
                          input?.showPicker?.()
                        } catch {
                          input?.focus()
                          input?.click()
                        }
                      }}
                    >
                      <MockIcon ctx="btn" n="calendar" size={15} />
                    </button>
                  </div>
                </label>
                {zeitModus === 'zeitraum' ? (
                  <label className="hw-anfrage-field">
                    <span className="hw-anfrage-label">Bis</span>
                    <div className="hw-anfrage-date-field">
                      <input
                        type="date"
                        className="input"
                        value={bis.trim() ? displayToYmd(bis) : ''}
                        onChange={(e) => {
                          setDirty(true)
                          const v = e.target.value
                          setBis(v ? ymdToDisplay(v) : '')
                        }}
                        disabled={pending}
                      />
                      <button
                        type="button"
                        className="hw-anfrage-date-icon"
                        tabIndex={-1}
                        disabled={pending}
                        aria-label="Kalender öffnen"
                        onClick={(e) => {
                          const input = (e.currentTarget.parentElement?.querySelector(
                            'input[type="date"]'
                          ) ?? null) as HTMLInputElement | null
                          try {
                            input?.showPicker?.()
                          } catch {
                            input?.focus()
                            input?.click()
                          }
                        }}
                      >
                        <MockIcon ctx="btn" n="calendar" size={15} />
                      </button>
                    </div>
                  </label>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <p className="text-[length:var(--fs-text)] text-bw-text-muted">
            {selectedPositions.length} Leistungen — Partner Netto und Handwerker gelten für alle
            Ausgewählten.
          </p>
        )}

        {!isSingle ? (
          <label className="hw-anfrage-field">
            <span className="hw-anfrage-label">Partner-EK netto *</span>
            <div className="txt-prefix">
              <span className="prefix" aria-hidden>
                €
              </span>
              <input
                type="number"
                className="input"
                step="0.01"
                min="0.01"
                required
                value={partnerNetto}
                onChange={(e) => {
                  setDirty(true)
                  setPartnerNetto(e.target.value)
                }}
                disabled={pending}
                aria-invalid={!ekOk && partnerNetto.trim() !== ''}
              />
            </div>
            {!ekOk ? (
              <span className="hw-anfrage-hint" style={{ color: 'var(--red, #b91c1c)', fontSize: 'var(--fs-meta)' }}>
                Pflicht — größer als 0 €
              </span>
            ) : null}
          </label>
        ) : null}

        <div className="hw-anfrage-section">
          <div className="hw-anfrage-section-head">
            <span>Handwerker anfragen</span>
            {selectedHwIds.size > 0 ? <span>{selectedHwIds.size} ausgewählt</span> : null}
          </div>

          {selectedDisplay.length > 0 ? (
            <ul className="hw-anfrage-list">
              {selectedDisplay.map((h) => {
                const displayName = h.firma?.trim() || h.name
                const label = gewerkeLabel(h) || sample?.gewerk_name || '—'
                const rating = h.bewertung ?? null
                return (
                  <li key={h.id}>
                    <div className="hw-anfrage-row is-selected">
                      <span className="hw-anfrage-avatar" aria-hidden>
                        {handwerkerInitialen(displayName)}
                      </span>
                      <span className="hw-anfrage-row-text">
                        <span className="hw-anfrage-row-name">{displayName}</span>
                        <span className="hw-anfrage-row-meta">
                          {label}
                          {rating != null ? (
                            <>
                              {' '}
                              <span className="hw-anfrage-star">★</span> {rating.toFixed(1)}
                            </>
                          ) : null}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="hw-anfrage-remove"
                        aria-label={`${displayName} entfernen`}
                        disabled={pending}
                        onClick={() => removeHw(h.id)}
                      >
                        <MockIcon ctx="btn" n="x" size={14} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-[length:var(--fs-meta)] text-bw-text-muted">Noch kein Handwerker gewählt.</p>
          )}

          <button
            type="button"
            className="pos-add-btn w-full"
            disabled={pending}
            onClick={() => setPickerOpen(true)}
          >
            <span className="icon-wrap">
              <MockIcon ctx="default" n="search" size={16} />
            </span>
            <span>Handwerker suchen</span>
          </button>
        </div>
      </EditorSheet>

      <HandwerkerSuchenSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        gewerke={gewerke}
        preferredGewerkSlug={sample?.gewerk_slug ?? null}
        selectedIds={selectedHwIds}
        onConfirm={(ids, rows) => {
          setDirty(true)
          setSelectedHwIds(ids)
          setSelectedHwRows(rows)
        }}
      />
    </>
  )
}

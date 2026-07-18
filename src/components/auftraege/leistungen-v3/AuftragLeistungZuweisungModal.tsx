'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockModal } from '@/components/mock-ui/MockModal'
import { toast } from '@/components/ui/app-toast'
import { listHandwerkerAuswahlFuerGewerk } from '@/app/(dashboard)/auftraege/handwerker-actions'
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

function gewerkeLabel(h: HandwerkerGewerkListeEintrag & { gewerke?: string[] | null }): string {
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
  const [loading, setLoading] = useState(false)
  const [empfohlen, setEmpfohlen] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [alle, setAlle] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [selectedHwIds, setSelectedHwIds] = useState<Set<string>>(() => new Set())

  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [vk, setVk] = useState('')
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
    if (!open || !sample) return
    let cancelled = false
    setLoading(true)
    void listHandwerkerAuswahlFuerGewerk({
      gewerkId: null,
      gewerkSlug: sample.gewerk_slug,
    }).then((r) => {
      if (cancelled) return
      if (!r.ok) {
        toast.error(r.message)
        setLoading(false)
        return
      }
      setEmpfohlen(r.empfohlen)
      setAlle(r.alle)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, sample])

  useEffect(() => {
    if (!open) {
      setSelectedHwIds(new Set())
      return
    }
    if (!sample) return
    setTitel(sample.leistung_name?.trim() || '')
    setBeschreibung(richTextToPlain(sample.beschreibung ?? '') || '')
    setVk(numInput(sample.preis_vk))
    setPartnerNetto(numInput(sample.preis_partner))
    const start = sample.start_datum?.slice(0, 10) || ''
    const end = sample.end_datum?.slice(0, 10) || ''
    setVon(start ? ymdToDisplay(start) : '')
    setBis(end ? ymdToDisplay(end) : '')
    setZeitModus(start && end && start === end ? 'tag' : 'zeitraum')
    if (sample.handwerker_id) setSelectedHwIds(new Set([sample.handwerker_id]))
    else setSelectedHwIds(new Set())
  }, [open, sample])

  const merged = useMemo(() => {
    const seen = new Set<string>()
    const out: HandwerkerGewerkListeEintrag[] = []
    for (const h of [...empfohlen, ...alle]) {
      if (seen.has(h.id)) continue
      seen.add(h.id)
      out.push(h)
    }
    return out
  }, [empfohlen, alle])

  function toggleHw(id: string) {
    setSelectedHwIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function confirm() {
    const ids = Array.from(selectedHwIds)
    if (!ids.length) {
      toast.error('Bitte mindestens einen Handwerker auswählen.')
      return
    }
    const primaryHw = ids[0]
    const vkNum = parseNum(vk)
    const ekNum = parseNum(partnerNetto)
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
          preis_vk: vkNum,
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

  return (
    <MockModal
      open={open}
      onClose={onClose}
      className="hw-anfrage-modal"
      icon="send"
      title="Handwerker anfragen"
      sub={subtitle}
      footer={
        <>
          <button type="button" className="hw-anfrage-cancel" onClick={onClose} disabled={pending}>
            Abbrechen
          </button>
          <div style={{ flex: 1 }} />
          <MockBtn
            kind="primary"
            icon="send"
            disabled={pending || loading || selectedHwIds.size === 0}
            onClick={confirm}
          >
            {pending ? 'Senden…' : 'Anfrage senden'}
          </MockBtn>
        </>
      }
    >
      <div className="hw-anfrage-body">
        {isSingle ? (
          <>
            <label className="hw-anfrage-field">
              <span className="hw-anfrage-label">Titel</span>
              <input
                className="input"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                disabled={pending}
              />
            </label>

            <label className="hw-anfrage-field">
              <span className="hw-anfrage-label">Beschreibung</span>
              <textarea
                className="input ta"
                rows={2}
                value={beschreibung}
                onChange={(e) => setBeschreibung(e.target.value)}
                disabled={pending}
              />
            </label>

            <div className="hw-anfrage-price-row">
              <label className="hw-anfrage-field">
                <span className="hw-anfrage-label">Verkaufspreis (netto)</span>
                <div className="txt-prefix">
                  <span className="prefix" aria-hidden>
                    €
                  </span>
                  <input
                    type="number"
                    className="input"
                    step="0.01"
                    min="0"
                    value={vk}
                    onChange={(e) => setVk(e.target.value)}
                    disabled={pending}
                  />
                </div>
              </label>
              <label className="hw-anfrage-field">
                <span className="hw-anfrage-label">Partner Netto (Richtwert)</span>
                <div className="txt-prefix">
                  <span className="prefix" aria-hidden>
                    €
                  </span>
                  <input
                    type="number"
                    className="input"
                    step="0.01"
                    min="0"
                    value={partnerNetto}
                    onChange={(e) => setPartnerNetto(e.target.value)}
                    disabled={pending}
                  />
                </div>
              </label>
            </div>

            <div className="hw-anfrage-section">
              <div className="hw-anfrage-section-head">
                <span>Zeitraum</span>
              </div>
              <div className="hw-anfrage-seg" role="group" aria-label="Zeitraum-Modus">
                <button
                  type="button"
                  className={cn('hw-anfrage-seg-btn', zeitModus === 'zeitraum' && 'is-active')}
                  onClick={() => setZeitModus('zeitraum')}
                  disabled={pending}
                >
                  Zeitraum
                </button>
                <button
                  type="button"
                  className={cn('hw-anfrage-seg-btn', zeitModus === 'tag' && 'is-active')}
                  onClick={() => {
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
                  <input
                    type="date"
                    className="input"
                    value={von.trim() ? displayToYmd(von) : ''}
                    onChange={(e) => {
                      const v = e.target.value
                      setVon(v ? ymdToDisplay(v) : '')
                      if (zeitModus === 'tag') setBis(v ? ymdToDisplay(v) : '')
                    }}
                    disabled={pending}
                  />
                </label>
                {zeitModus === 'zeitraum' ? (
                  <label className="hw-anfrage-field">
                    <span className="hw-anfrage-label">Bis</span>
                    <input
                      type="date"
                      className="input"
                      value={bis.trim() ? displayToYmd(bis) : ''}
                      onChange={(e) => {
                        const v = e.target.value
                        setBis(v ? ymdToDisplay(v) : '')
                      }}
                      disabled={pending}
                    />
                  </label>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-bw-text-muted">
            {selectedPositions.length} Leistungen — Partner Netto und Handwerker gelten für alle
            Ausgewählten.
          </p>
        )}

        {!isSingle ? (
          <label className="hw-anfrage-field">
            <span className="hw-anfrage-label">Partner Netto (Richtwert)</span>
            <div className="txt-prefix">
              <span className="prefix" aria-hidden>
                €
              </span>
              <input
                type="number"
                className="input"
                step="0.01"
                min="0"
                value={partnerNetto}
                onChange={(e) => setPartnerNetto(e.target.value)}
                disabled={pending}
              />
            </div>
          </label>
        ) : null}

        <div className="hw-anfrage-section">
          <div className="hw-anfrage-section-head">
            <span>Handwerker anfragen</span>
            <span>{selectedHwIds.size} ausgewählt</span>
          </div>

          {loading ? (
            <p className="text-sm text-bw-text-muted">Lade Handwerker…</p>
          ) : merged.length === 0 ? (
            <p className="text-sm text-bw-text-muted">Keine aktiven Handwerker gefunden.</p>
          ) : (
            <ul className="hw-anfrage-list">
              {merged.map((h) => {
                const checked = selectedHwIds.has(h.id)
                const label =
                  gewerkeLabel(h as HandwerkerGewerkListeEintrag & { gewerke?: string[] | null }) ||
                  sample?.gewerk_name ||
                  '—'
                const rating = h.bewertung ?? null
                const displayName = h.firma?.trim() || h.name
                return (
                  <li key={h.id}>
                    <button
                      type="button"
                      className={cn('hw-anfrage-row', checked && 'is-selected')}
                      onClick={() => toggleHw(h.id)}
                      disabled={pending}
                    >
                      <span
                        className={cn('hw-anfrage-check', checked && 'is-checked')}
                        aria-hidden
                      >
                        {checked ? '✓' : ''}
                      </span>
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
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </MockModal>
  )
}

'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import type { HandwerkerGewerkListeEintrag } from '@/app/(dashboard)/angebote/actions'
import { anfrageHandwerkerAnfragen } from '@/app/(dashboard)/anfragen/anfrage-handwerker-anfragen-actions'
import { HandwerkerSuchenSheet } from '@/components/auftraege/leistungen-v3/HandwerkerSuchenSheet'
import { handwerkerInitialen } from '@/components/auftraege/leistungen-v3/utils'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { BEREICH_LABELS } from '@/lib/utils'

function gewerkeLabel(h: HandwerkerGewerkListeEintrag): string {
  const raw = h.gewerke ?? []
  if (!raw.length) return ''
  return raw
    .map((s) => BEREICH_LABELS[s] ?? s.replace(/_/g, ' '))
    .filter(Boolean)
    .join(' · ')
}

export function AnfrageHandwerkerAnfragenSheet({
  open,
  onClose,
  leadId,
  titelDefault,
  beschreibungDefault,
  gewerke = [],
  onDone,
}: {
  open: boolean
  onClose: () => void
  leadId: string
  titelDefault: string
  beschreibungDefault: string
  gewerke?: { id: string; name: string; slug: string }[]
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [dirty, setDirty] = useState(false)
  const [selectedHwIds, setSelectedHwIds] = useState<Set<string>>(() => new Set())
  const [selectedHwRows, setSelectedHwRows] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [titel, setTitel] = useState(titelDefault)
  const [beschreibung, setBeschreibung] = useState(beschreibungDefault)
  const [notiz, setNotiz] = useState('')

  useEffect(() => {
    if (!open) {
      setSelectedHwIds(new Set())
      setSelectedHwRows([])
      setPickerOpen(false)
      setDirty(false)
      setNotiz('')
      return
    }
    setTitel(titelDefault)
    setBeschreibung(beschreibungDefault)
  }, [open, titelDefault, beschreibungDefault])

  const selectedDisplay = useMemo(() => {
    const byId = new Map(selectedHwRows.map((h) => [h.id, h]))
    return Array.from(selectedHwIds)
      .map((id) => byId.get(id))
      .filter(Boolean) as HandwerkerGewerkListeEintrag[]
  }, [selectedHwRows, selectedHwIds])

  const canSend = selectedHwIds.size > 0 && titel.trim().length > 0 && !pending

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
    if (!titel.trim()) {
      toast.error('Titel fehlt.')
      return
    }
    setPickerOpen(false)
    startTransition(async () => {
      const res = await anfrageHandwerkerAnfragen({
        leadId,
        handwerkerIds: ids,
        titel: titel.trim(),
        beschreibung: beschreibung.trim(),
        notiz: notiz.trim(),
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(
        res.gesendet === 1
          ? 'Anfrage an Handwerker gesendet'
          : `${res.gesendet} Anfragen an Handwerker gesendet`
      )
      onDone()
      onClose()
    })
  }

  return (
    <>
      <EditorSheet
        open={open}
        onClose={onClose}
        title="Handwerker vorab anfragen"
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
        overlayClassName={pickerOpen ? 'editor-sheet-overlay--recessed' : undefined}
      >
        <div className="hw-anfrage-section">
          <div className="hw-anfrage-section-head">
            <span>Partner suchen</span>
            {selectedHwIds.size > 0 ? <span>{selectedHwIds.size} ausgewählt</span> : null}
          </div>

          <input
            className="sel w-full"
            readOnly
            placeholder="Partner suchen…"
            disabled={pending}
            aria-label="Partner suchen"
            onFocus={(e) => {
              e.currentTarget.blur()
              if (!pending) setPickerOpen(true)
            }}
            onClick={() => {
              if (!pending) setPickerOpen(true)
            }}
          />

          {selectedDisplay.length > 0 ? (
            <ul className="hw-anfrage-list mt-3">
              {selectedDisplay.map((h) => {
                const displayName = h.firma?.trim() || h.name
                const label = gewerkeLabel(h)
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
                          {label || '—'}
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
          ) : null}
        </div>

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

        <label className="hw-anfrage-field">
          <span className="hw-anfrage-label">Beschreibung</span>
          <textarea
            className="input min-h-[88px]"
            value={beschreibung}
            onChange={(e) => {
              setDirty(true)
              setBeschreibung(e.target.value)
            }}
            disabled={pending}
          />
        </label>

        <label className="hw-anfrage-field">
          <span className="hw-anfrage-label">Notiz</span>
          <textarea
            className="input min-h-[64px]"
            value={notiz}
            onChange={(e) => {
              setDirty(true)
              setNotiz(e.target.value)
            }}
            disabled={pending}
          />
        </label>
      </EditorSheet>

      <HandwerkerSuchenSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        gewerke={gewerke}
        selectedIds={selectedHwIds}
        onConfirm={(ids, rows) => {
          setDirty(true)
          setSelectedHwIds(ids)
          setSelectedHwRows(rows)
          setPickerOpen(false)
        }}
      />
    </>
  )
}

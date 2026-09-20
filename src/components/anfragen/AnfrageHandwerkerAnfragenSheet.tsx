'use client'
import { MockBtn } from '@/components/mock-ui'
import { MockInput, MockTextarea } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import type { HandwerkerGewerkListeEintrag } from '@/app/(dashboard)/angebote/actions'
import { anfrageHandwerkerAnfragen } from '@/app/(dashboard)/anfragen/anfrage-handwerker-anfragen-actions'
import { HandwerkerSuchenSheet } from '@/components/auftraege/leistungen-v3/HandwerkerSuchenSheet'
import { handwerkerInitialen } from '@/components/auftraege/leistungen-v3/utils'
import { PosBoard } from '@/components/posboard/PosBoard'
import { posBoardToPartnerLvVorgabe } from '@/lib/angebote/partner-lv'
import { type PosBoardLine } from '@/lib/posboard/pos-board-line'
import type { Preisliste } from '@/lib/types'
import { BEREICH_LABELS } from '@/lib/utils'
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

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
  preislisten = [],
  onDone,
}: {
  open: boolean
  onClose: () => void
  leadId: string
  titelDefault: string
  beschreibungDefault: string
  gewerke?: { id: string; name: string; slug: string }[]
  preislisten?: Preisliste[]
  onDone: () => void
}) {
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const [pending, startTransition] = useTransition()
  const [dirty, setDirty] = useState(false)
  const [selectedHwIds, setSelectedHwIds] = useState<Set<string>>(() => new Set())
  const [selectedHwRows, setSelectedHwRows] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [titel, setTitel] = useState(titelDefault)
  const [beschreibung, setBeschreibung] = useState(beschreibungDefault)
  const [notiz, setNotiz] = useState('')
  const [positionen, setPositionen] = useState<PosBoardLine[]>([])

  useEffect(() => {
    if (!open) {
      setSelectedHwIds(new Set())
      setSelectedHwRows([])
      setPickerOpen(false)
      setDirty(false)
      setNotiz('')
      setPositionen([])
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
      applyFieldErrors({ _form: TOAST.bitte_mindestens_einen_partner_auswaehlen })
      return
    }
    if (!titel.trim()) {
      applyFieldErrors({ titel: TOAST.titel_fehlt })
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
        positionen: posBoardToPartnerLvVorgabe(positionen),
      })
      if (!res.ok) {
        toast.systemError(res)
        return
      }
      toast.success(
        res.gesendet === 1
          ? 'Anfrage an Partner gesendet'
          : `${res.gesendet} Anfragen an Partner gesendet`
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
        title="LV anfragen"
        context="detail"
        dirty={dirty}
        size="lg"
        compose
        composeLabel={pending ? 'Senden…' : 'Senden'}
        confirmBusy={pending}
        confirmDisabled={pending}
        onConfirm={confirm}
        className="hw-anfrage-modal"
        bodyClassName="hw-anfrage-body"
        overlayClassName={pickerOpen ? 'editor-sheet-overlay--recessed' : undefined}
      >
      {fieldErrors._form ? <p className="field-error" role="alert">{fieldErrors._form}</p> : null}
                <div className="hw-anfrage-section">
          <div className="hw-anfrage-section-head">
            <span>Partner suchen</span>
            {selectedHwIds.size > 0 ? <span>{selectedHwIds.size} ausgewählt</span> : null}
          </div>

          <MockInput className="sel w-full" readOnly placeholder="Partner suchen…" disabled={pending} aria-label="Partner suchen" onFocus={(e) => {
              e.currentTarget.blur()
              if (!pending) setPickerOpen(true)
            }} onClick={() => {
              if (!pending) setPickerOpen(true)
            }} />

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
                      <MockBtn className="hw-anfrage-remove" type="button" aria-label={`${displayName} löschen`} disabled={pending} onClick={() => removeHw(h.id)}>
                        <MockIcon ctx="btn" n="x" size={14} />
                      </MockBtn>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>

        <label className="hw-anfrage-field">
          <span className="hw-anfrage-label">Titel</span>
          <MockInput value={titel} onChange={(e) => {
              setDirty(true)
              setTitel(e.target.value)
            }} disabled={pending} />
        </label>

        <label className="hw-anfrage-field">
          <span className="hw-anfrage-label">Beschreibung</span>
          <MockTextarea className="min-h-[88px]" value={beschreibung} onChange={(e) => {
              setDirty(true)
              setBeschreibung(e.target.value)
            }} disabled={pending} />
        </label>

        <label className="hw-anfrage-field">
          <span className="hw-anfrage-label">Notiz</span>
          <MockTextarea className="min-h-[64px]" value={notiz} onChange={(e) => {
              setDirty(true)
              setNotiz(e.target.value)
            }} disabled={pending} />
        </label>

        <div className="hw-anfrage-field">
          <span className="hw-anfrage-label">Leistungen</span>
          <PosBoard
            positionen={positionen}
            onChange={(next) => {
              setDirty(true)
              setPositionen(next)
            }}
            showUst={false}
            showTotals={false}
            title=""
            preislisten={preislisten}
            gewerke={gewerke.map((g) => g.name).filter(Boolean)}
          />
        </div>
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

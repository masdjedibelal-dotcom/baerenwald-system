'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { openDeleteConfirm } from '@/components/ui/ConfirmPopup'
import { useTransition } from '@/components/ui/action-busy'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useState } from 'react'
<<<<<<< Updated upstream
=======
import { Download, FileText, Plus, Trash2 } from 'lucide-react'
import { MockBtn } from '@/components/mock-ui'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
>>>>>>> Stashed changes
import { toast } from '@/components/ui/app-toast'
import {
  createAuftragWochenbericht,
  deleteAuftragWochenbericht,
  generateUndSpeichereRegieSammelPdf,
  generateUndSpeichereWochenberichtPdf,
  updateAuftragWochenbericht,
} from '@/app/(dashboard)/auftraege/baustelle-actions'
import type { AuftragWochenbericht } from '@/lib/auftraege/baustelle-types'
import { isoKalenderwoche } from '@/lib/auftraege/kalenderwoche'
import { formatDatum } from '@/lib/utils'
import { heuteYmd } from '@/lib/angebot-einfach'
import { TOAST } from '@/lib/copy'

export function BaustelleWochenberichteCard({
  auftragId,
  wochenberichte,
  onChanged,
}: {
  auftragId: string
  wochenberichte: AuftragWochenbericht[]
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [kw, setKw] = useState(() => isoKalenderwoche(heuteYmd()).kw)
  const [jahr, setJahr] = useState(() => isoKalenderwoche(heuteYmd()).jahr)
  const [fazit, setFazit] = useState('')
  const [ausblick, setAusblick] = useState('')
  const [editDrafts, setEditDrafts] = useState<
    Record<string, { fazit: string; ausblick: string }>
  >({})

  function draftFor(w: AuftragWochenbericht) {
    return editDrafts[w.id] ?? { fazit: w.fazit ?? '', ausblick: w.ausblick ?? '' }
  }

  function setDraft(w: AuftragWochenbericht, patch: Partial<{ fazit: string; ausblick: string }>) {
    setEditDrafts((prev) => {
      const cur = prev[w.id] ?? { fazit: w.fazit ?? '', ausblick: w.ausblick ?? '' }
      return { ...prev, [w.id]: { ...cur, ...patch } }
    })
  }

  function create() {
    startTransition(async () => {
      const r = await createAuftragWochenbericht({
        auftrag_id: auftragId,
        kalenderwoche: kw,
        jahr,
        fazit: fazit || null,
        ausblick: ausblick || null,
      })
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.wochenbericht_angelegt)
      setFazit('')
      setAusblick('')
      onChanged()
    })
  }

  function saveText(w: AuftragWochenbericht, nextFazit: string, nextAusblick: string) {
    startTransition(async () => {
      const r = await updateAuftragWochenbericht(w.id, auftragId, {
        fazit: nextFazit,
        ausblick: nextAusblick,
      })
      if (!r.ok) toast.systemError(r)
      else {
        toast.success(TOAST.wochenbericht_gespeichert)
        setEditDrafts((prev) => {
          const next = { ...prev }
          delete next[w.id]
          return next
        })
        onChanged()
      }
    })
  }

  function remove(id: string) {
    openDeleteConfirm('Wochenbericht löschen?', async () => {
      const r = await deleteAuftragWochenbericht(id, auftragId)
      if (!r.ok) {
        toast.systemError(r)
        throw new Error(r.message)
      }
      onChanged()
    })
  }

  function generatePdf(w: AuftragWochenbericht) {
    startTransition(async () => {
      const r = await generateUndSpeichereWochenberichtPdf(w.id, auftragId)
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.wochenbericht_pdf_erstellt)
      onChanged()
    })
  }

  function generateRegiePdf(w: AuftragWochenbericht) {
    startTransition(async () => {
      const r = await generateUndSpeichereRegieSammelPdf(auftragId, w.kalenderwoche, w.jahr)
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.regiebericht_pdf_erstellt)
      onChanged()
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-bw-border bg-bw-bg/40 p-3 space-y-3">
        <p className="text-[length:var(--fs-text)] font-medium text-bw-text">Neuer Wochenbericht</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <MockField label="Kalenderwoche"><MockInput type="number" min={1} max={53} value={kw} onChange={(e) => setKw(Number(e.target.value) || 1)} /></MockField>
          <MockField label="Jahr"><MockInput type="number" value={jahr} onChange={(e) => setJahr(Number(e.target.value) || new Date().getFullYear())} /></MockField>
        </div>
<<<<<<< Updated upstream
        <MockField label="Wochenzusammenfassung"><RichTextEditor value={typeof (fazit) === 'string' ? (fazit) : ''} onChange={(__v) => setFazit(__v)} minHeight={120} aria-label="Wochenzusammenfassung" /></MockField>
        <MockField label="Ausblick"><RichTextEditor value={typeof (ausblick) === 'string' ? (ausblick) : ''} onChange={(__v) => setAusblick(__v)} minHeight={120} aria-label="Ausblick" /></MockField>
        <MockBtn type="button" kind="secondary" sm className="gap-1" disabled={pending} onClick={create}>
          <MockIcon n="plus" ctx="default" className="h-3.5 w-3.5" />
=======
        <Textarea label="Wochenzusammenfassung" value={fazit} onChange={(e) => setFazit(e.target.value)} rows={2} />
        <Textarea label="Ausblick" value={ausblick} onChange={(e) => setAusblick(e.target.value)} rows={2} />
        <MockBtn type="button" kind="secondary" sm className="gap-1" disabled={pending} onClick={create}>
          <Plus className="h-3.5 w-3.5" />
>>>>>>> Stashed changes
          Wochenbericht anlegen
        </MockBtn>
      </div>

      {wochenberichte.length ? (
        <div className="space-y-2">
          {wochenberichte.map((w) => {
            const wn = String(w.wochen_nummer).padStart(2, '0')
            const open = expandedId === w.id
            const draft = draftFor(w)
            const dirty =
              draft.fazit !== (w.fazit ?? '') || draft.ausblick !== (w.ausblick ?? '')
            return (
              <div key={w.id} className="rounded-button border border-bw-border">
                <MockBtn fullWidth className="flex items-center gap-3 px-3 py-2.5 text-left hover:bg-bw-hover/50" type="button" onClick={() => setExpandedId(open ? null : w.id)}>
                  <MockIcon n="file-text" ctx="default" className="h-4 w-4 shrink-0 text-bw-text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[length:var(--fs-text)] font-medium text-bw-text">
                      Wochenbericht {wn} — KW {w.kalenderwoche}/{w.jahr}
                    </p>
                    <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
                      {formatDatum(w.von_datum)} – {formatDatum(w.bis_datum)}
                    </p>
                  </div>
                </MockBtn>
                {open ? (
                  <div className="space-y-3 border-t border-bw-border px-3 py-3">
                    <MockField label="Wochenzusammenfassung"><RichTextEditor value={typeof (draft.fazit) === 'string' ? (draft.fazit) : ''} onChange={(__v) => setDraft(w, { fazit: __v })} minHeight={120} aria-label="Wochenzusammenfassung" /></MockField>
                    <MockField label="Ausblick"><RichTextEditor value={typeof (draft.ausblick) === 'string' ? (draft.ausblick) : ''} onChange={(__v) => setDraft(w, { ausblick: __v })} minHeight={120} aria-label="Ausblick" /></MockField>
                    {dirty ? (
                      <div className="flex flex-wrap gap-2">
                        <MockBtn
                          type="button"
                          kind="ghost" sm
                          disabled={pending}
                          onClick={() =>
                            setEditDrafts((prev) => {
                              const next = { ...prev }
                              delete next[w.id]
                              return next
                            })
                          }
                        >
                          Abbrechen
                        </MockBtn>
                        <MockBtn
                          type="button"
                          kind="primary" sm
                          disabled={pending}
                          onClick={() => saveText(w, draft.fazit, draft.ausblick)}
                        >
                          Speichern
                        </MockBtn>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <MockBtn
                        type="button"
                        kind="primary" sm
                        className="gap-1"
                        disabled={pending || dirty}
                        onClick={() => generatePdf(w)}
                      >
                        <MockIcon n="download" ctx="default" className="h-3.5 w-3.5" />
                        PDF erstellen
                      </MockBtn>
                      <MockBtn
                        type="button"
                        kind="secondary" sm
                        className="gap-1"
                        disabled={pending || dirty}
                        onClick={() => generateRegiePdf(w)}
                      >
                        Regiebericht KW
                      </MockBtn>
                      <a
                        href={`/api/auftraege/${auftragId}/wochenbericht/${w.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn ghost sm inline-flex gap-1"
                      >
                        Vorschau
                      </a>
                      {w.pdf_url ? (
                        <a
                          href={w.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn ghost sm"
                        >
                          Gespeichertes PDF
                        </a>
                      ) : null}
                      <MockBtn type="button" kind="ghost" sm onClick={() => remove(w.id)}>
<<<<<<< Updated upstream
                        <MockIcon n="trash" ctx="default" className="h-3.5 w-3.5" />
=======
                        <Trash2 className="h-3.5 w-3.5" />
>>>>>>> Stashed changes
                      </MockBtn>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">Noch keine Wochenberichte.</p>
      )}
    </div>
  )
}

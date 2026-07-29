'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useState } from 'react'
import { Download, FileText, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
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
        toast.error(r.message)
        return
      }
      toast.success('Wochenbericht angelegt')
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
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Wochenbericht gespeichert')
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
    if (!confirm('Wochenbericht löschen?')) return
    startTransition(async () => {
      const r = await deleteAuftragWochenbericht(id, auftragId)
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  function generatePdf(w: AuftragWochenbericht) {
    startTransition(async () => {
      const r = await generateUndSpeichereWochenberichtPdf(w.id, auftragId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Wochenbericht-PDF erstellt')
      onChanged()
    })
  }

  function generateRegiePdf(w: AuftragWochenbericht) {
    startTransition(async () => {
      const r = await generateUndSpeichereRegieSammelPdf(auftragId, w.kalenderwoche, w.jahr)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Regiebericht-PDF erstellt')
      onChanged()
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-bw-border bg-bw-bg/40 p-3 space-y-3">
        <p className="text-[length:var(--fs-text)] font-medium text-bw-text">Neuer Wochenbericht</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Kalenderwoche"
            type="number"
            min={1}
            max={53}
            value={kw}
            onChange={(e) => setKw(Number(e.target.value) || 1)}
          />
          <Input
            label="Jahr"
            type="number"
            value={jahr}
            onChange={(e) => setJahr(Number(e.target.value) || new Date().getFullYear())}
          />
        </div>
        <Textarea label="Wochenzusammenfassung" value={fazit} onChange={(e) => setFazit(e.target.value)} rows={2} />
        <Textarea label="Ausblick" value={ausblick} onChange={(e) => setAusblick(e.target.value)} rows={2} />
        <Button type="button" variant="secondary" size="sm" className="gap-1" disabled={pending} onClick={create}>
          <Plus className="h-3.5 w-3.5" />
          Wochenbericht anlegen
        </Button>
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
              <div key={w.id} className="rounded-lg border border-bw-border">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-bw-hover/50"
                  onClick={() => setExpandedId(open ? null : w.id)}
                >
                  <FileText className="h-4 w-4 shrink-0 text-bw-text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[length:var(--fs-text)] font-medium text-bw-text">
                      Wochenbericht {wn} — KW {w.kalenderwoche}/{w.jahr}
                    </p>
                    <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
                      {formatDatum(w.von_datum)} – {formatDatum(w.bis_datum)}
                    </p>
                  </div>
                </button>
                {open ? (
                  <div className="space-y-3 border-t border-bw-border px-3 py-3">
                    <Textarea
                      label="Wochenzusammenfassung"
                      value={draft.fazit}
                      onChange={(e) => setDraft(w, { fazit: e.target.value })}
                      rows={3}
                    />
                    <Textarea
                      label="Ausblick"
                      value={draft.ausblick}
                      onChange={(e) => setDraft(w, { ausblick: e.target.value })}
                      rows={2}
                    />
                    {dirty ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
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
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={pending}
                          onClick={() => saveText(w, draft.fazit, draft.ausblick)}
                        >
                          Speichern
                        </Button>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="gap-1"
                        disabled={pending || dirty}
                        onClick={() => generatePdf(w)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF erstellen
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="gap-1"
                        disabled={pending || dirty}
                        onClick={() => generateRegiePdf(w)}
                      >
                        Regiebericht KW
                      </Button>
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
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(w.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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

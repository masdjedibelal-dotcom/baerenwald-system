'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/layout/EmptyState'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  addLeadNotizRow,
  deleteLeadNotizRow,
  insertKalenderTermin,
  updateLeadVorOrtNotizen,
} from '@/app/(dashboard)/anfragen/actions'
import { deleteKalenderTermin, saveKalenderTermin } from '@/app/(dashboard)/kalender/actions'
import { toast } from '@/components/ui/app-toast'
import type { AngebotStatus, KalenderTermin, LeadNotizRow } from '@/lib/types'
import { ANGEBOT_STATUS_LABELS, formatPreis, formatRelativeDate } from '@/lib/utils'

function angebotStatusHub(s: string): 'new' | 'contacted' | 'offer' | 'order' | 'done' | 'cancel' {
  if (s === 'kunde_akzeptiert') return 'order'
  if (s === 'gesendet_kunde' || s === 'gesendet_handwerker') return 'offer'
  if (s === 'abgelehnt') return 'cancel'
  if (s === 'entwurf') return 'new'
  return 'contacted'
}

export function VorOrtTermineTab({
  leadId,
  termine,
  vorOrtNotiz,
  onReload,
}: {
  leadId: string
  termine: KalenderTermin[]
  vorOrtNotiz: string
  onReload: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [neuOpen, setNeuOpen] = useState(false)
  const [edit, setEdit] = useState<KalenderTermin | null>(null)
  const [titel, setTitel] = useState('')
  const [datum, setDatum] = useState('')
  const [uhrVon, setUhrVon] = useState('')
  const [adresse, setAdresse] = useState('')
  const [notiz, setNotiz] = useState('')
  const [notizFeld, setNotizFeld] = useState(vorOrtNotiz)
  const saveVorOrtTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setNotizFeld(vorOrtNotiz)
  }, [vorOrtNotiz])

  const besichtigungen = useMemo(
    () =>
      [...termine].filter((t) => t.typ === 'besichtigung').sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime()),
    [termine]
  )

  useEffect(() => {
    return () => {
      if (saveVorOrtTimer.current) clearTimeout(saveVorOrtTimer.current)
    }
  }, [])

  function scheduleVorOrtSave(text: string) {
    if (saveVorOrtTimer.current) clearTimeout(saveVorOrtTimer.current)
    saveVorOrtTimer.current = setTimeout(() => {
      void (async () => {
        const r = await updateLeadVorOrtNotizen(leadId, text)
        if (!r.ok) toast.error(r.message)
        else router.refresh()
      })()
    }, 800)
  }

  function openNeu() {
    setEdit(null)
    setTitel('Besichtigung')
    setDatum('')
    setUhrVon('')
    setAdresse('')
    setNotiz('')
    setNeuOpen(true)
  }

  function openEdit(t: KalenderTermin) {
    setEdit(t)
    setTitel(t.titel || 'Besichtigung')
    setDatum(t.datum?.slice(0, 10) ?? '')
    setUhrVon(t.uhrzeit_von?.slice(0, 5) ?? '')
    setAdresse(t.adresse ?? '')
    setNotiz(t.beschreibung ?? '')
    setNeuOpen(true)
  }

  async function saveTermin() {
    if (!datum.trim()) {
      toast.error('Bitte Datum wählen.')
      return
    }
    startTransition(async () => {
      if (edit?.id) {
        const res = await saveKalenderTermin({
          id: edit.id,
          titel: titel.trim() || 'Besichtigung',
          typ: 'besichtigung',
          datum,
          uhrzeit_von: uhrVon.trim() || null,
          uhrzeit_bis: null,
          adresse: adresse.trim() || null,
          beschreibung: notiz.trim() || null,
          lead_id: leadId,
          auftrag_id: null,
        })
        if (!res.ok) {
          toast.error(res.message)
          return
        }
      } else {
        const ins = await insertKalenderTermin({
          lead_id: leadId,
          titel: titel.trim() || 'Besichtigung',
          datum,
          uhrzeit_von: uhrVon.trim() || null,
          uhrzeit_bis: null,
          typ: 'besichtigung',
          adresse: adresse.trim() || null,
          beschreibung: notiz.trim() || null,
        })
        if (!ins.ok) {
          toast.error(ins.message)
          return
        }
      }
      toast.success('Termin gespeichert')
      setNeuOpen(false)
      setEdit(null)
      onReload()
      router.refresh()
    })
  }

  async function loeschen(id: string) {
    if (!window.confirm('Termin löschen?')) return
    startTransition(async () => {
      const r = await deleteKalenderTermin(id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      onReload()
      router.refresh()
    })
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-bw-text">Vor-Ort Termine</h3>
        <button type="button" onClick={openNeu} className="btn btn-primary btn-sm">
          + Termin
        </button>
      </div>

      {besichtigungen.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-2xl" aria-hidden>
            📍
          </div>
          <p className="mt-2 text-sm font-medium text-bw-text">Noch kein Vor-Ort Termin</p>
          <p className="mt-1 text-xs text-bw-text-muted">Erstelle einen Termin für die Besichtigung.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {besichtigungen.map((termin) => (
            <div key={termin.id} className="flex items-start justify-between rounded-lg bg-bw-hover p-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-bw-text">{termin.titel || 'Vor-Ort Termin'}</div>
                <div className="mt-0.5 text-xs text-bw-text-muted">
                  {new Date(termin.datum).toLocaleDateString('de', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                  {termin.uhrzeit_von ? ` · ${termin.uhrzeit_von.slice(0, 5)} Uhr` : ''}
                </div>
                {termin.adresse ? <div className="mt-0.5 text-xs text-bw-text-muted">📍 {termin.adresse}</div> : null}
                {termin.beschreibung ? (
                  <div className="mt-1 text-xs italic text-bw-text-muted">{termin.beschreibung}</div>
                ) : null}
              </div>
              <div className="ml-2 flex shrink-0 gap-1">
                <button type="button" className="rounded p-1.5 text-bw-text-muted hover:text-bw-text" onClick={() => openEdit(termin)}>
                  ✏️
                </button>
                <button
                  type="button"
                  className="rounded p-1.5 text-bw-text-muted hover:text-status-cancel-text"
                  onClick={() => void loeschen(termin.id)}
                  disabled={pending}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-bw-border pt-4">
        <h3 className="mb-3 text-sm font-medium text-bw-text">Vor-Ort Notizen</h3>
        <textarea
          className="input"
          rows={4}
          placeholder="Beobachtungen, Maße, Besonderheiten…"
          value={notizFeld}
          onChange={(e) => {
            const v = e.target.value
            setNotizFeld(v)
            scheduleVorOrtSave(v)
          }}
        />
        <p className="mt-1 text-xs text-bw-text-muted">Wird automatisch gespeichert</p>
      </div>

      <Modal open={neuOpen} onClose={() => setNeuOpen(false)} title={edit ? 'Termin bearbeiten' : 'Vor-Ort Termin'}>
        <div className="space-y-4">
          <Input label="Titel" placeholder="Besichtigung Bad" value={titel} onChange={(e) => setTitel(e.target.value)} />
          <div className="form-grid-2 grid gap-3 md:grid-cols-2">
            <Input label="Datum *" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} required />
            <Input label="Uhrzeit" type="time" value={uhrVon} onChange={(e) => setUhrVon(e.target.value)} />
          </div>
          <Input label="Adresse" placeholder="Straße, PLZ Ort" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
          <textarea className="input min-h-[72px]" placeholder="Notiz…" rows={3} value={notiz} onChange={(e) => setNotiz(e.target.value)} />
          <div className="flex justify-end gap-2 border-t border-bw-border pt-4">
            <Button type="button" variant="secondary" onClick={() => setNeuOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" loading={pending} onClick={() => void saveTermin()}>
              Speichern
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export function LeadNotizenListeTab({
  leadId,
  notizen,
  onReload,
}: {
  leadId: string
  notizen: LeadNotizRow[]
  onReload: () => void
}) {
  const router = useRouter()
  const [neue, setNeue] = useState('')
  const [mitDatei, setMitDatei] = useState(false)
  const [pending, startTransition] = useTransition()

  async function speichern() {
    const t = neue.trim()
    if (!t) return
    startTransition(async () => {
      const r = await addLeadNotizRow(leadId, t, null)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setNeue('')
      setMitDatei(false)
      onReload()
      router.refresh()
    })
  }

  async function loeschen(id: string) {
    if (!window.confirm('Notiz löschen?')) return
    startTransition(async () => {
      const r = await deleteLeadNotizRow(id, leadId)
      if (!r.ok) toast.error(r.message)
      else {
        onReload()
        router.refresh()
      }
    })
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <textarea
          className="input"
          rows={3}
          placeholder="Notiz hinzufügen…"
          value={neue}
          onChange={(e) => setNeue(e.target.value)}
        />
        <div className="mt-2 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-bw-text-muted">
            <input type="checkbox" checked={mitDatei} onChange={(e) => setMitDatei(e.target.checked)} className="rounded" />
            Datei anhängen
          </label>
          <button type="button" disabled={!neue.trim() || pending} onClick={() => void speichern()} className="btn btn-primary btn-sm">
            Speichern
          </button>
        </div>
        {mitDatei ? (
          <p className="mt-2 text-xs text-bw-text-muted">
            Datei-Upload: bitte zunächst ohne Anhang speichern; Storage-Anbindung kann ergänzt werden.
          </p>
        ) : null}
      </div>

      {notizen.length === 0 ? (
        <div className="py-8 text-center text-sm text-bw-text-muted">Noch keine Notizen</div>
      ) : (
        <div className="space-y-3">
          {notizen.map((n) => (
            <div key={n.id} className="rounded-lg bg-bw-hover p-3">
              <div className="mb-1 flex justify-between">
                <span className="text-xs text-bw-text-muted">
                  {formatRelativeDate(n.created_at)}
                  {n.user_profiles?.name ? ` · ${n.user_profiles.name}` : ''}
                </span>
                <button
                  type="button"
                  className="text-xs text-bw-text-muted hover:text-status-cancel-text"
                  onClick={() => void loeschen(n.id)}
                >
                  ×
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm text-bw-text">{n.inhalt}</p>
              {n.datei_url ? (
                <a href={n.datei_url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1.5 text-xs text-bw-link">
                  📎 Anhang öffnen
                </a>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type AngebotZeile = {
  id: string
  status: string
  gesamt_fix?: number | null
  gesamt_min: number | null
  gesamt_max: number | null
  created_at?: string | null
}

export function AngeboteListeTab({ leadId, angebote }: { leadId: string; angebote: AngebotZeile[] }) {
  const router = useRouter()
  const rows = useMemo(
    () =>
      [...angebote].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      ),
    [angebote]
  )

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-bw-text">Angebote</h3>
        <Link href={`/angebote/neu?lead_id=${leadId}`} className="btn btn-primary btn-sm">
          + Angebot erstellen
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Noch kein Angebot"
          description="Erstelle ein Angebot basierend auf den Projektdetails."
          action={
            <Link href={`/angebote/neu?lead_id=${leadId}`} className="btn btn-primary btn-sm">
              + Angebot erstellen
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {rows.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => router.push(`/angebote/${a.id}/bearbeiten`)}
              className="flex w-full items-center justify-between rounded-lg bg-bw-hover p-3 text-left transition-colors hover:bg-bw-border"
            >
              <div>
                <div className="text-sm font-medium text-bw-text">
                  {formatPreis(a.gesamt_fix ?? null, a.gesamt_min, a.gesamt_max)}
                </div>
                <div className="mt-0.5 text-xs text-bw-text-muted">
                  {a.created_at ? new Date(a.created_at).toLocaleDateString('de') : '—'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={angebotStatusHub(a.status)} label={ANGEBOT_STATUS_LABELS[a.status as AngebotStatus] ?? a.status} />
                <span className="text-bw-text-muted">→</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

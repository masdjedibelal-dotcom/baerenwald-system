'use client'

import { useEffect, useState, useTransition } from 'react'
import { Mail, Pencil, Phone, Plus, Trash2, UserRound } from 'lucide-react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import {
  createObjektKontakt,
  deleteObjektKontakt,
  updateObjektKontakt,
} from '@/app/actions/objektakte-actions'
import {
  OBJEKT_KONTAKT_ROLLE_LABELS,
  OBJEKT_KONTAKT_ROLLEN,
} from '@/lib/objektakte/labels'
import type { ObjektKontakt, ObjektKontaktInput, ObjektKontaktRolle } from '@/lib/objektakte/types'
import { toast } from '@/components/ui/app-toast'

const ROLLE_OPTIONS = OBJEKT_KONTAKT_ROLLEN.map((r) => ({
  value: r,
  label: OBJEKT_KONTAKT_ROLLE_LABELS[r],
}))

export function ObjektKontakteSection({
  kundeId,
  objektId,
  kontakte: initial,
  onChanged,
}: {
  kundeId: string
  objektId: string
  kontakte: ObjektKontakt[]
  onChanged: () => void
}) {
  const [liste, setListe] = useState(initial)
  const [modalOpen, setModalOpen] = useState(false)
  const [edit, setEdit] = useState<ObjektKontakt | null>(null)
  const [pending, startTransition] = useTransition()

  const [rolle, setRolle] = useState<ObjektKontaktRolle>('hausmeister')
  const [name, setName] = useState('')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [notiz, setNotiz] = useState('')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setListe(initial)
  }, [initial])

  function openNeu() {
    setEdit(null)
    setRolle('hausmeister')
    setName('')
    setTelefon('')
    setEmail('')
    setNotiz('')
    setErr(null)
    setModalOpen(true)
  }

  function openBearbeiten(k: ObjektKontakt) {
    setEdit(k)
    setRolle(k.rolle)
    setName(k.name)
    setTelefon(k.telefon ?? '')
    setEmail(k.email ?? '')
    setNotiz(k.notiz ?? '')
    setErr(null)
    setModalOpen(true)
  }

  function speichern() {
    const payload: ObjektKontaktInput = {
      rolle,
      name,
      telefon,
      email,
      notiz,
    }
    setErr(null)
    startTransition(async () => {
      if (edit) {
        const r = await updateObjektKontakt(kundeId, objektId, edit.id, payload)
        if (!r.ok) {
          setErr(r.message)
          return
        }
        setListe((prev) =>
          prev.map((k) =>
            k.id === edit.id
              ? {
                  ...k,
                  ...payload,
                  telefon: payload.telefon?.trim() || null,
                  email: payload.email?.trim() || null,
                  notiz: payload.notiz?.trim() || null,
                  name: payload.name.trim(),
                }
              : k
          )
        )
        toast.success('Kontakt gespeichert')
      } else {
        const r = await createObjektKontakt(kundeId, objektId, payload)
        if (!r.ok) {
          setErr(r.message)
          return
        }
        setListe((prev) => [...prev, r.kontakt])
        toast.success('Kontakt angelegt')
      }
      setModalOpen(false)
      onChanged()
    })
  }

  function entfernen(k: ObjektKontakt) {
    if (!confirm(`Kontakt „${k.name}“ entfernen?`)) return
    startTransition(async () => {
      const r = await deleteObjektKontakt(kundeId, objektId, k.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setListe((prev) => prev.filter((x) => x.id !== k.id))
      toast.success('Kontakt entfernt')
      onChanged()
    })
  }

  return (
    <>
      <MockCard
        collapsible
        title={
          <>
            <UserRound className="inline h-4 w-4 text-bw-primary" aria-hidden /> Kontakte vor Ort
          </>
        }
        actions={
          <button type="button" className="btn btn-ghost btn-sm gap-1" onClick={openNeu}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Hinzufügen
          </button>
        }
      >
        <p className="mb-3 text-[12px] text-bw-text-muted">
          Hausmeister, Beirat, Notfallkontakte — für die Disposition.
        </p>
        {liste.length === 0 ? (
          <p className="text-[13px] text-bw-text-muted">Noch keine Kontakte hinterlegt.</p>
        ) : (
          <ul className="divide-y divide-bw-border rounded-lg border border-bw-border">
            {liste.map((k) => (
              <li key={k.id} className="flex gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-bw-text">{k.name}</span>
                    <span className="rounded bg-bw-muted px-1.5 py-0.5 text-[10px] font-medium text-bw-text-muted">
                      {OBJEKT_KONTAKT_ROLLE_LABELS[k.rolle]}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                    {k.telefon ? (
                      <a href={`tel:${k.telefon}`} className="inline-flex items-center gap-1 text-bw-link">
                        <Phone className="h-3 w-3" aria-hidden />
                        {k.telefon}
                      </a>
                    ) : null}
                    {k.email ? (
                      <a href={`mailto:${k.email}`} className="inline-flex items-center gap-1 text-bw-link">
                        <Mail className="h-3 w-3" aria-hidden />
                        {k.email}
                      </a>
                    ) : null}
                  </div>
                  {k.notiz ? <p className="mt-1 text-[12px] text-bw-text-muted">{k.notiz}</p> : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-label="Bearbeiten"
                    onClick={() => openBearbeiten(k)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-danger"
                    aria-label="Löschen"
                    disabled={pending}
                    onClick={() => entfernen(k)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </MockCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={edit ? 'Kontakt bearbeiten' : 'Kontakt anlegen'}
      >
        <div className="space-y-3 p-1">
          <Select
            label="Rolle"
            name="rolle"
            value={rolle}
            onChange={(e) => setRolle(e.target.value as ObjektKontaktRolle)}
            options={ROLLE_OPTIONS}
          />
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Telefon" value={telefon} onChange={(e) => setTelefon(e.target.value)} type="tel" />
          <Input label="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          <Textarea label="Notiz" value={notiz} onChange={(e) => setNotiz(e.target.value)} rows={3} />
          {err ? <p className="text-sm text-danger">{err}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={speichern} disabled={pending}>
              Speichern
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

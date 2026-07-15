'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Home, Mail, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  createEinheitBewohner,
  deleteEinheitBewohner,
  updateEinheitBewohner,
} from '@/app/actions/objektakte-actions'
import type { EinheitBewohner, ObjektEinheit } from '@/lib/objektakte/types'
import { toast } from '@/components/ui/app-toast'

export function ObjektBewohnerSection({
  kundeId,
  objektId,
  einheiten,
  bewohner: initial,
  onChanged,
}: {
  kundeId: string
  objektId: string
  einheiten: ObjektEinheit[]
  bewohner: EinheitBewohner[]
  onChanged: () => void
}) {
  const [liste, setListe] = useState(initial)
  const [modalOpen, setModalOpen] = useState(false)
  const [edit, setEdit] = useState<EinheitBewohner | null>(null)
  const [pending, startTransition] = useTransition()

  const [einheitId, setEinheitId] = useState('')
  const [name, setName] = useState('')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const einheitOptions = useMemo(
    () => [
      { value: '', label: '— Einheit wählen —' },
      ...einheiten.map((e) => ({ value: e.id, label: e.bezeichnung })),
    ],
    [einheiten]
  )

  useEffect(() => {
    setListe(initial)
  }, [initial])

  function openNeu() {
    setEdit(null)
    setEinheitId(einheiten[0]?.id ?? '')
    setName('')
    setTelefon('')
    setEmail('')
    setErr(null)
    setModalOpen(true)
  }

  function openBearbeiten(b: EinheitBewohner) {
    setEdit(b)
    setEinheitId(b.objekt_einheit_id)
    setName(b.name)
    setTelefon(b.telefon ?? '')
    setEmail(b.email ?? '')
    setErr(null)
    setModalOpen(true)
  }

  function speichern() {
    setErr(null)
    startTransition(async () => {
      if (edit) {
        const r = await updateEinheitBewohner(kundeId, objektId, edit.id, {
          name,
          telefon,
          email,
        })
        if (!r.ok) {
          setErr(r.message)
          return
        }
        setListe((prev) =>
          prev.map((b) =>
            b.id === edit.id
              ? {
                  ...b,
                  name: name.trim(),
                  telefon: telefon.trim() || null,
                  email: email.trim() || null,
                }
              : b
          )
        )
        toast.success('Bewohner gespeichert')
      } else {
        const r = await createEinheitBewohner(kundeId, objektId, {
          objekt_einheit_id: einheitId,
          name,
          telefon,
          email,
        })
        if (!r.ok) {
          setErr(r.message)
          return
        }
        setListe((prev) => [...prev, r.bewohner])
        toast.success('Bewohner angelegt')
      }
      setModalOpen(false)
      onChanged()
    })
  }

  function entfernen(b: EinheitBewohner) {
    if (!confirm(`Bewohner „${b.name}“ entfernen?`)) return
    startTransition(async () => {
      const r = await deleteEinheitBewohner(kundeId, objektId, b.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setListe((prev) => prev.filter((x) => x.id !== b.id))
      toast.success('Bewohner entfernt')
      onChanged()
    })
  }

  return (
    <>
      <MockCard
        collapsible
        title={
          <>
            <Home className="inline h-4 w-4 text-bw-primary" aria-hidden /> Bewohner
          </>
        }
        actions={
          <button
            type="button"
            className="btn btn-ghost btn-sm gap-1"
            onClick={openNeu}
            disabled={einheiten.length === 0}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Hinzufügen
          </button>
        }
      >
        <p className="mb-3 text-[12px] text-bw-text-muted">
          Bewohner je Einheit — Einheiten werden im HV-Portal gepflegt.
        </p>
        {einheiten.length === 0 ? (
          <p className="text-[13px] text-bw-text-muted">
            Noch keine Einheiten für dieses Objekt. Bitte im Auftraggeber-Portal unter „Einheiten“ anlegen.
          </p>
        ) : liste.length === 0 ? (
          <p className="text-[13px] text-bw-text-muted">Noch keine Bewohner hinterlegt.</p>
        ) : (
          <ul className="divide-y divide-bw-border rounded-lg border border-bw-border">
            {liste.map((b) => (
              <li key={b.id} className="flex gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-bw-text">{b.name}</span>
                    <span className="text-[11px] text-bw-text-muted">
                      {b.objekt_einheiten?.bezeichnung ?? 'Einheit'}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
                    {b.telefon ? (
                      <a href={`tel:${b.telefon}`} className="inline-flex items-center gap-1 text-bw-link">
                        <Phone className="h-3 w-3" aria-hidden />
                        {b.telefon}
                      </a>
                    ) : null}
                    {b.email ? (
                      <a href={`mailto:${b.email}`} className="inline-flex items-center gap-1 text-bw-link">
                        <Mail className="h-3 w-3" aria-hidden />
                        {b.email}
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-label="Bearbeiten"
                    onClick={() => openBearbeiten(b)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-danger"
                    aria-label="Löschen"
                    disabled={pending}
                    onClick={() => entfernen(b)}
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
        title={edit ? 'Bewohner bearbeiten' : 'Bewohner anlegen'}
      >
        <div className="space-y-3 p-1">
          {!edit ? (
            <Select
              label="Einheit"
              name="einheit"
              value={einheitId}
              onChange={(e) => setEinheitId(e.target.value)}
              options={einheitOptions}
            />
          ) : (
            <p className="text-sm text-bw-text-muted">
              Einheit: {edit.objekt_einheiten?.bezeichnung ?? '—'}
            </p>
          )}
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Telefon" value={telefon} onChange={(e) => setTelefon(e.target.value)} type="tel" />
          <Input label="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          {err ? <p className="text-sm text-danger">{err}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={speichern} disabled={pending || (!edit && !einheitId)}>
              Speichern
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

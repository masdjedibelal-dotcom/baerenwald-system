'use client'

import { useState, useTransition } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/app-toast'
import {
  deleteKommunikationMailVorlage,
  saveKommunikationMailVorlage,
  type KommunikationMailVorlage,
} from '@/app/(dashboard)/kommunikation/actions'
import { KOMMUNIKATION_VORLAGE_KONTEXT_OPTIONS } from '@/lib/kommunikation/types'

export function KommunikationVorlagenClient({
  initial,
}: {
  initial: KommunikationMailVorlage[]
}) {
  const [rows, setRows] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [edit, setEdit] = useState<{
    id?: string
    name: string
    kontext_typ: KommunikationMailVorlage['kontext_typ']
    betreff: string
    body_text: string
  } | null>(null)

  function openNew() {
    setEdit({
      name: '',
      kontext_typ: 'alle',
      betreff: '',
      body_text: '<p></p>',
    })
    setEditOpen(true)
  }

  function openRow(r: KommunikationMailVorlage) {
    setEdit({
      id: r.id,
      name: r.name,
      kontext_typ: r.kontext_typ,
      betreff: r.betreff,
      body_text: r.body_text,
    })
    setEditOpen(true)
  }

  function save() {
    if (!edit) return
    startTransition(async () => {
      const res = await saveKommunikationMailVorlage(edit)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('Gespeichert')
      setEditOpen(false)
      if (edit.id) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === edit.id
              ? { ...r, ...edit, id: edit.id }
              : r
          )
        )
      } else {
        setRows((prev) => [
          ...prev,
          {
            id: res.id,
            name: edit.name,
            kontext_typ: edit.kontext_typ,
            betreff: edit.betreff,
            body_text: edit.body_text,
            sort_order: prev.length,
          },
        ])
      }
    })
  }

  function remove(id: string) {
    if (!confirm('Vorlage löschen?')) return
    startTransition(async () => {
      const res = await deleteKommunikationMailVorlage(id)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setRows((prev) => prev.filter((r) => r.id !== id))
      toast.success('Gelöscht')
    })
  }

  return (
    <>
      <Card
        title="Vorlagen"
        action={
          <Button type="button" variant="primary" className="btn-sm" onClick={openNew}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Neu
          </Button>
        }
      >
        {rows.length === 0 ? (
          <p className="text-sm text-bw-text-muted">Noch keine Vorlagen angelegt.</p>
        ) : (
          <ul className="divide-y divide-bw-border">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                <div className="min-w-0">
                  <p className="font-medium text-bw-text">{r.name}</p>
                  <p className="text-xs text-bw-text-muted">
                    {KOMMUNIKATION_VORLAGE_KONTEXT_OPTIONS.find((o) => o.value === r.kontext_typ)?.label ??
                      r.kontext_typ}
                    {r.betreff ? ` · ${r.betreff}` : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => openRow(r)}
                    aria-label="Bearbeiten"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-red-700"
                    onClick={() => remove(r.id)}
                    aria-label="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={editOpen && !!edit}
        onClose={() => setEditOpen(false)}
        title={edit?.id ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
        size="md"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" loading={pending} onClick={save}>
              Speichern
            </Button>
          </div>
        }
      >
        {edit ? (
          <div className="space-y-3">
            <Input label="Name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            <Select
              label="Kontext"
              name="vorlage-kontext"
              value={edit.kontext_typ}
              onChange={(e) =>
                setEdit({
                  ...edit,
                  kontext_typ: e.target.value as KommunikationMailVorlage['kontext_typ'],
                })
              }
              options={KOMMUNIKATION_VORLAGE_KONTEXT_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
            <Input
              label="Betreff (optional)"
              value={edit.betreff}
              onChange={(e) => setEdit({ ...edit, betreff: e.target.value })}
            />
            <Textarea
              label="Nachricht"
              rows={8}
              value={edit.body_text}
              onChange={(e) => setEdit({ ...edit, body_text: e.target.value })}
            />
          </div>
        ) : null}
      </Modal>
    </>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockModal } from '@/components/mock-ui/MockModal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
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
      <MockCard
        title="Vorlagen"
        icon="mail"
        actions={
          <MockBtn kind="primary" sm icon="plus" onClick={openNew}>
            Neu
          </MockBtn>
        }
      >
        {rows.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Noch keine Vorlagen angelegt.</p>
        ) : (
          <div style={{ margin: -14 }}>
            <div className="list-row head" style={{ gridTemplateColumns: '1fr auto' }}>
              <div>Vorlage</div>
              <div />
            </div>
            {rows.map((r) => (
              <div
                key={r.id}
                className="list-row"
                style={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                    {KOMMUNIKATION_VORLAGE_KONTEXT_OPTIONS.find((o) => o.value === r.kontext_typ)?.label ??
                      r.kontext_typ}
                    {r.betreff ? ` · ${r.betreff}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" className="qa-btn" onClick={() => openRow(r)} aria-label="Bearbeiten">
                    <MockIcon n="pencil" size={15} />
                  </button>
                  <button type="button" className="qa-btn" onClick={() => remove(r.id)} aria-label="Löschen">
                    <MockIcon n="trash" size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </MockCard>

      <MockModal
        open={editOpen && !!edit}
        onClose={() => setEditOpen(false)}
        icon="mail"
        title={edit?.id ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
        sub="Kommunikation"
        footer={
          <>
            <MockBtn sm kind="ghost" onClick={() => setEditOpen(false)}>
              Abbrechen
            </MockBtn>
            <div style={{ flex: 1 }} />
            <MockBtn sm kind="primary" icon="check" onClick={save} disabled={pending}>
              Speichern
            </MockBtn>
          </>
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
      </MockModal>
    </>
  )
}

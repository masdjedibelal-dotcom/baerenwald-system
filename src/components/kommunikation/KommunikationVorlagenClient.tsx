'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { openDeleteConfirm } from '@/components/ui/ConfirmPopup'
import { useTransition } from '@/components/ui/action-busy'
import { Combobox } from '@/components/ui/Combobox'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import {
  deleteKommunikationMailVorlage,
  saveKommunikationMailVorlage,
  type KommunikationMailVorlage,
} from '@/app/(dashboard)/kommunikation/actions'
import { KOMMUNIKATION_VORLAGE_KONTEXT_OPTIONS } from '@/lib/kommunikation/types'
import { TOAST } from '@/lib/copy'

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
        toast.systemError(res)
        return
      }
      toast.success(TOAST.gespeichert)
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
    openDeleteConfirm('Vorlage löschen?', async () => {
      const res = await deleteKommunikationMailVorlage(id)
      if (!res.ok) {
        toast.systemError(res)
        throw new Error(res.message)
      }
      setRows((prev) => prev.filter((r) => r.id !== id))
      toast.success(TOAST.geloescht)
    })
  }

  return (
    <>
      <Card
        title="Vorlagen"
        action={
          <MockBtn type="button" kind="primary" sm onClick={openNew}>
            <MockIcon n="plus" ctx="default" className="h-3.5 w-3.5" aria-hidden />
            Neu
          </MockBtn>
        }
      >
        {rows.length === 0 ? (
          <p className="text-[length:var(--fs-text)] text-bw-text-muted">Noch keine Vorlagen angelegt.</p>
        ) : (
          <ul className="divide-y divide-bw-border">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                <div className="min-w-0">
                  <p className="font-medium text-bw-text">{r.name}</p>
                  <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
                    {KOMMUNIKATION_VORLAGE_KONTEXT_OPTIONS.find((o) => o.value === r.kontext_typ)?.label ??
                      r.kontext_typ}
                    {r.betreff ? ` · ${r.betreff}` : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  <MockBtn kind="ghost" sm type="button" onClick={() => openRow(r)} aria-label="Bearbeiten">
                    <MockIcon n="pencil" ctx="default" className="h-4 w-4" />
                  </MockBtn>
                  <MockBtn kind="ghost" sm className="text-danger" type="button" onClick={() => remove(r.id)} aria-label="Löschen">
                    <MockIcon n="trash" ctx="default" className="h-4 w-4" />
                  </MockBtn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <EditorSheet
        open={editOpen && !!edit}
        onClose={() => setEditOpen(false)}
        title={edit?.id ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
        context="detail"
        size="md"
        confirmBusy={pending}
        onConfirm={save}
      >
        {edit ? (
          <div className="space-y-3">
            <MockField label="Name"><MockInput value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></MockField>
            <Combobox label="Kontext" id="vorlage-kontext" name="vorlage-kontext" options={KOMMUNIKATION_VORLAGE_KONTEXT_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))} value={edit.kontext_typ == null ? '' : String(edit.kontext_typ)} placeholder="Auswählen…" onChange={(next) => { setEdit({
                  ...edit,
                  kontext_typ: next as KommunikationMailVorlage['kontext_typ'],
                }); }} />
            <KiAssistFieldLabel
              label="Betreff (optional)"
              value={edit.betreff}
              onApply={(text) => setEdit({ ...edit, betreff: text })}
              multiline={false}
            >
              <MockInput value={edit.betreff} onChange={(e) => setEdit({ ...edit, betreff: e.target.value })} />
            </KiAssistFieldLabel>
            <KiAssistFieldLabel
              label="Nachricht"
              value={edit.body_text}
              onApply={(text) => setEdit({ ...edit, body_text: text })}
            >
              <RichTextEditor value={typeof (edit.body_text) === 'string' ? (edit.body_text) : ''} onChange={(__v) => setEdit({ ...edit, body_text: __v })} minHeight={192} />
            </KiAssistFieldLabel>
          </div>
        ) : null}
      </EditorSheet>
    </>
  )
}

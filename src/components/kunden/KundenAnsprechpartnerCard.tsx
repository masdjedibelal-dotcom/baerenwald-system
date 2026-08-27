'use client'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockModal } from '@/components/mock-ui/MockModal'
import { ListRowCheck } from '@/components/ui/ListRowCheck'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { toast } from '@/components/ui/app-toast'
import { useTransition } from '@/components/ui/action-busy'
import {
  deleteKundenAnsprechpartner,
  listKundenAnsprechpartner,
  saveKundenAnsprechpartner,
} from '@/app/actions/kunden-ansprechpartner'
import type { KundeAnsprechpartner } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

/** Typische Rollen in einer Hausverwaltung (kein Objekt-Hausmeister — der gehört ans Objekt). */
export const ANSPRECHPARTNER_ROLLEN = [
  { value: '', label: 'Rolle wählen…' },
  { value: 'Objektleiter', label: 'Objektleiter' },
  { value: 'Verwaltung', label: 'Verwaltung' },
  { value: 'Buchhaltung', label: 'Buchhaltung' },
  { value: 'Geschäftsführung', label: 'Geschäftsführung' },
  { value: 'Eigentümervertretung', label: 'Eigentümervertretung' },
  { value: 'Technik', label: 'Technik' },
  { value: 'Empfang', label: 'Empfang' },
  { value: 'Sonstiges', label: 'Sonstiges' },
] as const

function sortAnsprechpartner(rows: KundeAnsprechpartner[]): KundeAnsprechpartner[] {
  return [...rows].sort((a, b) => {
    if (Boolean(a.ist_primaer) !== Boolean(b.ist_primaer)) {
      return a.ist_primaer ? -1 : 1
    }
    const so = (a.sort_order ?? 0) - (b.sort_order ?? 0)
    if (so !== 0) return so
    return a.name.localeCompare(b.name, 'de')
  })
}

function rolleSelectValue(rolle: string): string {
  const t = rolle.trim()
  if (!t) return ''
  if (ANSPRECHPARTNER_ROLLEN.some((o) => o.value === t)) return t
  return 'Sonstiges'
}

export function KundenAnsprechpartnerCard({
  kundeId,
  initial = [],
  onChanged,
  className,
}: {
  kundeId: string
  initial?: KundeAnsprechpartner[]
  onChanged?: () => void
  className?: string
}) {
  const isMobile = useIsMobile()
  const [rows, setRows] = useState(() => sortAnsprechpartner(initial))
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<KundeAnsprechpartner | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [rolle, setRolle] = useState('')
  const [istPrimaer, setIstPrimaer] = useState(false)
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeletePending, setBulkDeletePending] = useState(false)

  useEffect(() => {
    setRows(sortAnsprechpartner(initial))
  }, [initial])

  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(rows.map((r) => r.id))
      let changed = false
      const next: Record<string, boolean> = {}
      for (const [id, on] of Object.entries(prev)) {
        if (!ids.has(id)) {
          changed = true
          continue
        }
        if (on) next[id] = true
      }
      return changed ? next : prev
    })
  }, [rows])

  const dirty = useMemo(() => {
    if (!edit) {
      return Boolean(name.trim() || email.trim() || telefon.trim() || rolle.trim() || istPrimaer)
    }
    return (
      name.trim() !== edit.name.trim() ||
      (email.trim() || '') !== (edit.email ?? '').trim() ||
      (telefon.trim() || '') !== (edit.telefon ?? '').trim() ||
      (rolle.trim() || '') !== (edit.rolle ?? '').trim() ||
      Boolean(istPrimaer) !== Boolean(edit.ist_primaer)
    )
  }, [edit, name, email, telefon, rolle, istPrimaer])

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  )
  const selectedCount = selectedIds.length
  const selectedRows = useMemo(
    () => rows.filter((r) => selected[r.id]),
    [rows, selected]
  )
  const allSelected = rows.length > 0 && selectedCount === rows.length

  function toggleSel(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleAll() {
    if (allSelected) {
      setSelected({})
      return
    }
    const next: Record<string, boolean> = {}
    for (const r of rows) next[r.id] = true
    setSelected(next)
  }

  function openNeu() {
    setEdit(null)
    setName('')
    setEmail('')
    setTelefon('')
    setRolle('')
    setIstPrimaer(false)
    setOpen(true)
  }

  function openEdit(r: KundeAnsprechpartner) {
    setEdit(r)
    setName(r.name)
    setEmail(r.email ?? '')
    setTelefon(r.telefon ?? '')
    setRolle(r.rolle ?? '')
    setIstPrimaer(Boolean(r.ist_primaer))
    setOpen(true)
  }

  function openBearbeitenBulk() {
    if (selectedRows.length !== 1) return
    openEdit(selectedRows[0]!)
  }

  function reload() {
    startTransition(async () => {
      const next = await listKundenAnsprechpartner(kundeId)
      setRows(sortAnsprechpartner(next))
      onChanged?.()
    })
  }

  function speichern() {
    if (!name.trim()) {
      toast.error('Name ist Pflicht.')
      return
    }
    startTransition(async () => {
      const r = await saveKundenAnsprechpartner(
        kundeId,
        {
          name,
          email,
          telefon,
          rolle,
          ist_primaer: istPrimaer,
        },
        edit?.id
      )
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(edit ? 'Ansprechpartner aktualisiert' : 'Ansprechpartner angelegt')
      setOpen(false)
      setSelected({})
      reload()
    })
  }

  async function runBulkDelete() {
    if (!selectedRows.length || bulkDeletePending) return
    setBulkDeletePending(true)
    try {
      const failed: string[] = []
      for (const r of selectedRows) {
        const res = await deleteKundenAnsprechpartner(kundeId, r.id)
        if (!res.ok) failed.push(r.name)
      }
      setSelected({})
      setBulkDeleteOpen(false)
      if (failed.length) {
        toast.error(
          failed.length === 1
            ? `„${failed[0]}“ konnte nicht gelöscht werden.`
            : `${failed.length} Ansprechpartner konnten nicht gelöscht werden.`
        )
      } else {
        toast.success(
          selectedRows.length === 1
            ? 'Ansprechpartner gelöscht'
            : `${selectedRows.length} Ansprechpartner gelöscht`
        )
      }
      reload()
    } finally {
      setBulkDeletePending(false)
    }
  }

  function rowBody(r: KundeAnsprechpartner) {
    const kontakt = [r.email, r.telefon].filter(Boolean).join(' · ') || '—'
    const isChecked = Boolean(selected[r.id])
    return (
      <div
        key={r.id}
        className={cn(
          isMobile ? 'ap-mobile-card ap-mobile-card--row' : 'ap-list__row ap-list__row--select',
          isChecked && 'is-checked'
        )}
      >
        <ListRowCheck
          checked={isChecked}
          onToggle={() => toggleSel(r.id)}
          title={`${r.name} auswählen`}
        />
        <button
          type="button"
          className={isMobile ? 'ap-mobile-card__hit' : 'ap-list__hit'}
          onClick={() => openEdit(r)}
        >
          {isMobile ? (
            <>
              <div className="ap-mobile-card__top">
                <span className="ap-mobile-card__name">{r.name}</span>
                {r.ist_primaer ? <span className="ap-badge">Primär</span> : null}
              </div>
              {r.rolle ? <div className="ap-mobile-card__meta">{r.rolle}</div> : null}
              <div className="ap-mobile-card__meta">{kontakt}</div>
            </>
          ) : (
            <>
              <span className="ap-list__name-cell">
                {r.name}
                {r.ist_primaer ? <span className="ap-badge">Primär</span> : null}
              </span>
              <span className="ap-list__dim">{r.rolle || '—'}</span>
              <span className="ap-list__dim">{kontakt}</span>
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <MockCard
      title="Ansprechpartner"
      icon="users"
      className={cn(className)}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {rows.length > 0 ? (
            <MockBtn
              sm
              kind="ghost"
              onClick={toggleAll}
              title={allSelected ? 'Auswahl aufheben' : 'Alle auswählen'}
            >
              {allSelected ? 'Keine' : 'Alle'}
            </MockBtn>
          ) : null}
            <MockBtn sm kind="primary" icon="plus" onClick={openNeu}>
              Hinzufügen
            </MockBtn>
        </div>
      }
    >
      {selectedCount > 0 ? (
        <div className="bulkbar">
          <span className="bulkbar-count">
            <b>{selectedCount}</b> ausgewählt
          </span>
          <div style={{ flex: 1 }} />
          {selectedCount === 1 ? (
            <MockBtn kind="ghost" sm icon="pencil" onClick={openBearbeitenBulk} disabled={pending}>
              Bearbeiten
            </MockBtn>
          ) : null}
          <MockBtn
            kind="danger"
            sm
            icon="trash"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={bulkDeletePending || pending}
          >
            Löschen
          </MockBtn>
          <MockBtn
            kind="ghost"
            sm
            className="qa-btn bulkbar-clear"
            icon="x"
            onClick={() => setSelected({})}
            title="Auswahl aufheben"
          />
        </div>
      ) : null}

      <MockModal
        open={bulkDeleteOpen}
        onClose={() => {
          if (!bulkDeletePending) setBulkDeleteOpen(false)
        }}
        icon="trash"
        title={
          selectedCount === 1
            ? 'Ansprechpartner löschen?'
            : `${selectedCount} Ansprechpartner löschen?`
        }
        sub="Dauerhaft entfernen."
        size="sm"
        footer={
          <>
            <MockBtn kind="ghost" disabled={bulkDeletePending} onClick={() => setBulkDeleteOpen(false)}>
              Abbrechen
            </MockBtn>
            <div style={{ flex: 1 }} />
            <MockBtn
              kind="danger"
              icon={bulkDeletePending ? undefined : 'trash'}
              disabled={bulkDeletePending}
              onClick={() => void runBulkDelete()}
            >
              {bulkDeletePending ? 'Wird gelöscht…' : 'Löschen'}
            </MockBtn>
          </>
        }
      >
        <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.5 }}>
          {bulkDeletePending
            ? 'Bitte warten…'
            : selectedCount === 1
              ? `„${selectedRows[0]?.name ?? 'Ansprechpartner'}“ wird unwiderruflich gelöscht.`
              : `${selectedCount} ausgewählte Ansprechpartner werden unwiderruflich gelöscht.`}
        </div>
      </MockModal>

      {rows.length === 0 ? (
        <MockEmpty
          icon="users"
          title="Noch keine Ansprechpartner"
          hint="Weitere E-Mails und Kontakte ohne neuen Kunden-Account. Über „+“ oben hinzufügen."
        />
      ) : isMobile ? (
        <div className="ap-cards vg-selectmode">{rows.map(rowBody)}</div>
      ) : (
        <div className="ap-list vg-selectmode">
          <div className="ap-list__head ap-list__head--select">
            <span aria-hidden />
            <span>Name</span>
            <span>Rolle</span>
            <span>Kontakt</span>
          </div>
          {rows.map(rowBody)}
        </div>
      )}

      <EditorSheet
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? 'Ansprechpartner bearbeiten' : 'Neuer Ansprechpartner'}
        dirty={dirty}
        size="md"
        compose={Boolean(edit)}
        composeLabel="Speichern"
        onConfirm={speichern}
        confirmDisabled={!name.trim() || pending}
        confirmBusy={pending}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            required
            value={name}
            disabled={pending}
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            label="Rolle"
            value={rolleSelectValue(rolle)}
            options={ANSPRECHPARTNER_ROLLEN.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            disabled={pending}
            onChange={(e) => setRolle(e.target.value)}
          />
          <Input
            label="E-Mail"
            type="email"
            value={email}
            disabled={pending}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Telefon"
            value={telefon}
            disabled={pending}
            onChange={(e) => setTelefon(e.target.value)}
          />
          <label className="ap-check">
            <input
              type="checkbox"
              checked={istPrimaer}
              disabled={pending}
              onChange={(e) => setIstPrimaer(e.target.checked)}
            />
            <span>Primärer Ansprechpartner</span>
          </label>
        </div>
      </EditorSheet>
    </MockCard>
  )
}

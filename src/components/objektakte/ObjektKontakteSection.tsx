'use client'
import { MockBtn } from '@/components/mock-ui'
import { ListBulkBar } from '@/components/mock-ui/ListBulkBar'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { useTransition } from '@/components/ui/action-busy'
import { Combobox } from '@/components/ui/Combobox'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useEffect, useMemo, useState } from 'react'
import { LIST } from '@/lib/crm-labels'
import { exportSimpleCsv } from '@/lib/mock-list-export'
import { ListRowCheck } from '@/components/ui/ListRowCheck'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { ConfirmPopup } from '@/components/ui/ConfirmPopup'
import {
  createObjektKontakt,
  deleteObjektKontakt,
  restoreObjektKontakt,
  updateObjektKontakt,
} from '@/app/actions/objektakte-actions'
import {
  OBJEKT_KONTAKT_ROLLE_LABELS,
  OBJEKT_KONTAKT_ROLLEN,
} from '@/lib/objektakte/labels'
import type { ObjektKontakt, ObjektKontaktInput, ObjektKontaktRolle } from '@/lib/objektakte/types'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { toast } from '@/components/ui/app-toast'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'
import { TOAST } from '@/lib/copy'
import { deleteWithUndo } from '@/lib/ui/delete-with-undo'

const KONTAKT_LIST_COLS = '28px minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 1.4fr) 44px'

const ROLLE_OPTIONS = OBJEKT_KONTAKT_ROLLEN.filter((r) => r !== 'hausmeister').map((r) => ({
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
  const isMobile = useIsMobile()
  const [liste, setListe] = useState(initial)
  const [modalOpen, setModalOpen] = useState(false)
  const [edit, setEdit] = useState<ObjektKontakt | null>(null)
  const [pending, startTransition] = useTransition()

  const [rolle, setRolle] = useState<ObjektKontaktRolle>('beirat')
  const [name, setName] = useState('')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [notiz, setNotiz] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeletePending, setBulkDeletePending] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ObjektKontakt | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  useEffect(() => {
    setListe(initial)
  }, [initial])

  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(liste.map((k) => k.id))
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
  }, [liste])

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  )
  const selectedCount = selectedIds.length
  const selectedRows = useMemo(
    () => liste.filter((k) => selected[k.id]),
    [liste, selected]
  )
  const allSelected = liste.length > 0 && selectedCount === liste.length

  function toggleSel(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleAll() {
    if (allSelected) {
      setSelected({})
      return
    }
    const next: Record<string, boolean> = {}
    for (const k of liste) next[k.id] = true
    setSelected(next)
  }

  function openNeu() {
    setEdit(null)
    setRolle('beirat')
    setName('')
    setTelefon('')
    setEmail('')
    setNotiz('')
    setErr(null)
    setDirty(false)
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
    setDirty(false)
    setModalOpen(true)
  }

  function openBearbeitenBulk() {
    if (selectedRows.length !== 1) return
    openBearbeiten(selectedRows[0]!)
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
        toast.success(TOAST.kontakt_gespeichert)
      } else {
        const r = await createObjektKontakt(kundeId, objektId, payload)
        if (!r.ok) {
          setErr(r.message)
          return
        }
        setListe((prev) => [...prev, r.kontakt])
        toast.success(TOAST.kontakt_angelegt)
      }
      setDirty(false)
      setModalOpen(false)
      setSelected({})
      onChanged()
    })
  }

  function bulkExport() {
    exportSimpleCsv(
      'kontakte-auswahl',
      selectedRows.map((k) => ({
        Name: k.name,
        Rolle: OBJEKT_KONTAKT_ROLLE_LABELS[k.rolle] ?? k.rolle,
        Telefon: k.telefon ?? '',
        Email: k.email ?? '',
        Notiz: k.notiz ?? '',
      }))
    )
  }

  async function runBulkDelete() {
    if (!selectedRows.length || bulkDeletePending) return
    setBulkDeletePending(true)
    const snapshot = selectedRows
    const ids = new Set(snapshot.map((k) => k.id))
    setBulkDeleteOpen(false)
    setSelected({})
    deleteWithUndo({
      key: `objekt-kontakte-bulk:${[...ids].sort().join(',')}`,
      removeOptimistic: () =>
        setListe((prev) => prev.filter((x) => !ids.has(x.id))),
      restoreOptimistic: () =>
        setListe((prev) => {
          const have = new Set(prev.map((x) => x.id))
          return [...snapshot.filter((s) => !have.has(s.id)), ...prev]
        }),
      commitImmediate: true,
      commit: async () => {
        const failed: string[] = []
        for (const k of snapshot) {
          const r = await deleteObjektKontakt(kundeId, objektId, k.id)
          if (!r.ok) failed.push(k.name)
        }
        if (failed.length) {
          toast.error(
            failed.length === 1
              ? `„${failed[0]}“ konnte nicht gelöscht werden.`
              : `${failed.length} Kontakte konnten nicht gelöscht werden.`
          )
        }
        onChanged()
      },
      restore: async () => {
        for (const k of snapshot) {
          await restoreObjektKontakt(kundeId, objektId, k.id)
        }
        onChanged()
      },
      message: TOAST.geloescht,
    })
    setBulkDeletePending(false)
  }

  async function runSingleDelete() {
    if (!deleteTarget || deletePending) return
    const target = deleteTarget
    setDeleteTarget(null)
    setDeletePending(false)
    setSelected((prev) => {
      const next = { ...prev }
      delete next[target.id]
      return next
    })
    scheduleKontaktDelete(target)
  }

  function scheduleKontaktDelete(target: ObjektKontakt) {
    deleteWithUndo({
      key: `objekt-kontakt:${target.id}`,
      removeOptimistic: () =>
        setListe((prev) => prev.filter((x) => x.id !== target.id)),
      restoreOptimistic: () =>
        setListe((prev) =>
          prev.some((x) => x.id === target.id) ? prev : [...prev, target]
        ),
      commitImmediate: true,
      commit: async () => {
        const r = await deleteObjektKontakt(kundeId, objektId, target.id)
        if (!r.ok) {
          toast.systemError(r)
          setListe((prev) =>
            prev.some((x) => x.id === target.id) ? prev : [...prev, target]
          )
          return
        }
        onChanged()
      },
      restore: async () => {
        const r = await restoreObjektKontakt(kundeId, objektId, target.id)
        if (!r.ok) toast.systemError(r)
        else onChanged()
      },
      message: TOAST.geloescht,
    })
  }

  function kontaktRowMenu(k: ObjektKontakt): EntityMenuItem[] {
    return [
      {
        icon: 'pencil',
        label: 'Bearbeiten',
        onClick: () => openBearbeiten(k),
      },
      'sep',
      {
        icon: 'trash',
        label: 'Löschen',
        danger: true,
        onClick: () => scheduleKontaktDelete(k),
      },
    ]
  }

  function rowBody(k: ObjektKontakt) {
    const kontaktZeile =
      [k.telefon?.trim(), k.email?.trim()].filter(Boolean).join(' · ') || '—'
    const isChecked = Boolean(selected[k.id])
    const rolleLabel = OBJEKT_KONTAKT_ROLLE_LABELS[k.rolle]
    return (
      <div
        key={k.id}
        className={cn(
          isMobile ? 'ap-mobile-card ap-mobile-card--row' : 'ap-list__row ap-list__row--select',
          isChecked && 'is-checked'
        )}
        style={isMobile ? undefined : { gridTemplateColumns: KONTAKT_LIST_COLS }}
      >
        <ListRowCheck
          checked={isChecked}
          onToggle={() => toggleSel(k.id)}
          title={`${k.name} auswählen`}
        />
        <MockBtn className={isMobile ? 'ap-mobile-card__hit' : 'ap-list__hit'} type="button" onClick={() => openBearbeiten(k)}>
          {isMobile ? (
            <>
              <div className="ap-mobile-card__top">
                <span className="ap-mobile-card__name">{k.name}</span>
              </div>
              <div className="ap-mobile-card__meta">{rolleLabel}</div>
              <div className="ap-mobile-card__meta">{kontaktZeile}</div>
              {k.notiz ? <div className="ap-mobile-card__meta">{k.notiz}</div> : null}
            </>
          ) : (
            <>
              <span className="ap-list__name-cell">
                {k.name}
                {k.notiz ? (
                  <span className="ap-list__dim" style={{ display: 'block', marginTop: 2 }}>
                    {k.notiz}
                  </span>
                ) : null}
              </span>
              <span className="ap-list__dim">{rolleLabel}</span>
              <span className="ap-list__dim">{kontaktZeile}</span>
            </>
          )}
        </MockBtn>
        <div
          className="row-actions always"
          onClick={(e) => e.stopPropagation()}
          style={{ justifyContent: 'flex-end' }}
        >
          <MockEntityRowMenu items={kontaktRowMenu(k)} title={k.name} />
        </div>
      </div>
    )
  }

  return (
    <>
      <MockCard
        title={liste.length ? `Kontakte vor Ort · ${liste.length}` : 'Kontakte vor Ort'}
        icon="user"
        actions={
          <MockBtn sm kind="primary" icon="plus" onClick={openNeu}>
            {LIST.hinzufuegen}
          </MockBtn>
        }
      >
        {selectedCount > 0 ? (
          <ListBulkBar
            selectedCount={selectedCount}
            onClear={() => setSelected({})}
            onExport={bulkExport}
            onDelete={() => setBulkDeleteOpen(true)}
            onToggleAll={toggleAll}
            allSelected={allSelected}
            onEdit={openBearbeitenBulk}
            deleteDisabled={bulkDeletePending || pending}
            deletePending={bulkDeletePending}
            className="mb-3"
          />
        ) : null}

        {liste.length === 0 ? (
          <MockEmpty icon="user" title="Noch keine Kontakte" />
        ) : isMobile ? (
          <div className="ap-cards vg-selectmode">{liste.map(rowBody)}</div>
        ) : (
          <div className="ap-list vg-selectmode">
            <div
              className="ap-list__head ap-list__head--select"
              style={{ gridTemplateColumns: KONTAKT_LIST_COLS }}
            >
              <span aria-hidden />
              <span>Name</span>
              <span>Rolle</span>
              <span>Kontakt</span>
              <span aria-hidden />
            </div>
            {liste.map(rowBody)}
          </div>
        )}
      </MockCard>

      <ConfirmPopup
        open={bulkDeleteOpen}
        onClose={() => {
          if (!bulkDeletePending) setBulkDeleteOpen(false)
        }}
        title={selectedCount === 1 ? 'Kontakt löschen?' : `${selectedCount} Kontakte löschen?`}
        danger
        busy={bulkDeletePending}
        confirmLabel={bulkDeletePending ? 'Wird gelöscht…' : 'Löschen'}
        onConfirm={() => void runBulkDelete()}
      >
        <p className="m-0 mb-2" style={{ color: 'var(--text-3)' }}>
          Dauerhaft entfernen.
        </p>
        <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.5 }}>
          {bulkDeletePending
            ? 'Bitte warten…'
            : selectedCount === 1
              ? `„${selectedRows[0]?.name ?? 'Kontakt'}“ wird unwiderruflich gelöscht.`
              : `${selectedCount} ausgewählte Kontakte werden unwiderruflich gelöscht.`}
        </div>
      </ConfirmPopup>

      <ConfirmPopup
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deletePending) setDeleteTarget(null)
        }}
        title="Kontakt löschen?"
        danger
        busy={deletePending}
        confirmLabel={deletePending ? 'Wird gelöscht…' : 'Löschen'}
        onConfirm={() => void runSingleDelete()}
      >
        <p className="m-0 mb-2" style={{ color: 'var(--text-3)' }}>
          Dauerhaft entfernen.
        </p>
        <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.5 }}>
          {deletePending
            ? 'Bitte warten…'
            : `„${deleteTarget?.name ?? 'Kontakt'}“ wird unwiderruflich gelöscht.`}
        </div>
      </ConfirmPopup>

      <EditorSheet
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Kontakt"
        context="detail"
        dirty={dirty}
        confirmBusy={pending}
        onConfirm={speichern}
      >
        <div className="space-y-3">
          <Combobox label="Rolle" id="rolle" name="rolle" options={ROLLE_OPTIONS} value={rolle == null ? '' : String(rolle)} placeholder="Auswählen…" onChange={(next) => {
              setDirty(true)
              setRolle(next as ObjektKontaktRolle)
            }} />
          <MockField label="Name" required><MockInput value={name} onChange={(e) => {
              setDirty(true)
              setName(e.target.value)
            }} required /></MockField>
          <MockField label="Telefon"><MockInput type="tel" value={telefon} onChange={(e) => {
              setDirty(true)
              setTelefon(e.target.value)
            }} /></MockField>
          <MockField label="E-Mail"><MockInput type="email" value={email} onChange={(e) => {
              setDirty(true)
              setEmail(e.target.value)
            }} /></MockField>
          <MockField label="Notiz"><RichTextEditor value={typeof (notiz) === 'string' ? (notiz) : ''} onChange={(__v) => {setDirty(true)
              setNotiz(__v)}} minHeight={120} aria-label="Notiz" /></MockField>
          {err ? <p className="text-[length:var(--fs-text)] text-danger">{err}</p> : null}
        </div>
      </EditorSheet>
    </>
  )
}

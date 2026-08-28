'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { ListBulkBar } from '@/components/mock-ui/ListBulkBar'
import { MockModal } from '@/components/mock-ui/MockModal'
import { LIST } from '@/lib/crm-labels'
import { exportSimpleCsv } from '@/lib/mock-list-export'
import { ListRowCheck } from '@/components/ui/ListRowCheck'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  createEinheitBewohner,
  deleteEinheitBewohner,
  updateEinheitBewohner,
} from '@/app/actions/objektakte-actions'
import type { EinheitBewohner, ObjektEinheit } from '@/lib/objektakte/types'
import { toast } from '@/components/ui/app-toast'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

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
  const isMobile = useIsMobile()
  const [liste, setListe] = useState(initial)
  const [modalOpen, setModalOpen] = useState(false)
  const [edit, setEdit] = useState<EinheitBewohner | null>(null)
  const [pending, startTransition] = useTransition()

  const [einheitId, setEinheitId] = useState('')
  const [name, setName] = useState('')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeletePending, setBulkDeletePending] = useState(false)

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

  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(liste.map((b) => b.id))
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
    () => liste.filter((b) => selected[b.id]),
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
    for (const b of liste) next[b.id] = true
    setSelected(next)
  }

  function openNeu() {
    setEdit(null)
    setEinheitId(einheiten[0]?.id ?? '')
    setName('')
    setTelefon('')
    setEmail('')
    setErr(null)
    setDirty(false)
    setModalOpen(true)
  }

  function openBearbeiten(b: EinheitBewohner) {
    setEdit(b)
    setEinheitId(b.objekt_einheit_id)
    setName(b.name)
    setTelefon(b.telefon ?? '')
    setEmail(b.email ?? '')
    setErr(null)
    setDirty(false)
    setModalOpen(true)
  }

  function openBearbeitenBulk() {
    if (selectedRows.length !== 1) return
    openBearbeiten(selectedRows[0]!)
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
      setDirty(false)
      setModalOpen(false)
      setSelected({})
      onChanged()
    })
  }

  function bulkExport() {
    exportSimpleCsv(
      'bewohner-auswahl',
      selectedRows.map((b) => ({
        Name: b.name,
        Einheit: b.objekt_einheiten?.bezeichnung ?? '',
        Telefon: b.telefon ?? '',
        Email: b.email ?? '',
      }))
    )
  }

  async function runBulkDelete() {
    if (!selectedRows.length || bulkDeletePending) return
    setBulkDeletePending(true)
    try {
      const failed: string[] = []
      for (const b of selectedRows) {
        const r = await deleteEinheitBewohner(kundeId, objektId, b.id)
        if (!r.ok) {
          failed.push(b.name)
          continue
        }
        setListe((prev) => prev.filter((x) => x.id !== b.id))
      }
      setSelected({})
      setBulkDeleteOpen(false)
      if (failed.length) {
        toast.error(
          failed.length === 1
            ? `„${failed[0]}“ konnte nicht gelöscht werden.`
            : `${failed.length} Bewohner konnten nicht gelöscht werden.`
        )
      } else {
        toast.success(
          selectedRows.length === 1
            ? 'Bewohner gelöscht'
            : `${selectedRows.length} Bewohner gelöscht`
        )
      }
      onChanged()
    } finally {
      setBulkDeletePending(false)
    }
  }

  function rowBody(b: EinheitBewohner) {
    const kontaktZeile = [b.telefon?.trim(), b.email?.trim()].filter(Boolean).join(' · ') || '—'
    const einheitLabel = b.objekt_einheiten?.bezeichnung ?? 'Einheit'
    const isChecked = Boolean(selected[b.id])
    return (
      <div
        key={b.id}
        className={cn(
          isMobile ? 'ap-mobile-card ap-mobile-card--row' : 'ap-list__row ap-list__row--select',
          isChecked && 'is-checked'
        )}
      >
        <ListRowCheck
          checked={isChecked}
          onToggle={() => toggleSel(b.id)}
          title={`${b.name} auswählen`}
        />
        <button
          type="button"
          className={isMobile ? 'ap-mobile-card__hit' : 'ap-list__hit'}
          onClick={() => openBearbeiten(b)}
        >
          {isMobile ? (
            <>
              <div className="ap-mobile-card__top">
                <span className="ap-mobile-card__name">{b.name}</span>
              </div>
              <div className="ap-mobile-card__meta">{einheitLabel}</div>
              <div className="ap-mobile-card__meta">{kontaktZeile}</div>
            </>
          ) : (
            <>
              <span className="ap-list__name-cell">{b.name}</span>
              <span className="ap-list__dim">{einheitLabel}</span>
              <span className="ap-list__dim">{kontaktZeile}</span>
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <>
      <MockCard
        title={liste.length ? `Bewohner · ${liste.length}` : 'Bewohner'}
        icon="users"
        actions={
          <MockBtn
            sm
            kind="primary"
            icon="plus"
            onClick={openNeu}
            disabled={einheiten.length === 0}
          >
            {LIST.hinzufuegen}
          </MockBtn>
        }
      >
        <p className="mb-3 text-[length:var(--fs-meta)] leading-relaxed" style={{ color: 'var(--text-3)' }}>
          Bewohner je Einheit — Einheiten werden im HV-Portal gepflegt.
        </p>

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

        {einheiten.length === 0 ? (
          <MockEmpty
            icon="users"
            title="Noch keine Einheiten"
            hint="Bitte zuerst Einheiten anlegen"
          />
        ) : liste.length === 0 ? (
          <MockEmpty
            icon="users"
            title="Noch keine Bewohner"
            hint="Über „+“ oben hinzufügen."
          />
        ) : isMobile ? (
          <div className="ap-cards vg-selectmode">{liste.map(rowBody)}</div>
        ) : (
          <div className="ap-list vg-selectmode">
            <div className="ap-list__head ap-list__head--select">
              <span aria-hidden />
              <span>Name</span>
              <span>Einheit</span>
              <span>Kontakt</span>
            </div>
            {liste.map(rowBody)}
          </div>
        )}
      </MockCard>

      <MockModal
        open={bulkDeleteOpen}
        onClose={() => {
          if (!bulkDeletePending) setBulkDeleteOpen(false)
        }}
        icon="trash"
        title={selectedCount === 1 ? 'Bewohner löschen?' : `${selectedCount} Bewohner löschen?`}
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
              ? `„${selectedRows[0]?.name ?? 'Bewohner'}“ wird unwiderruflich gelöscht.`
              : `${selectedCount} ausgewählte Bewohner werden unwiderruflich gelöscht.`}
        </div>
      </MockModal>

      <EditorSheet
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Bewohner"
        context="detail"
        dirty={dirty}
        confirmBusy={pending}
        confirmDisabled={pending || (!edit && !einheitId)}
        onConfirm={speichern}
      >
        <div className="space-y-3">
          {!edit ? (
            <Select
              label="Einheit"
              name="einheit"
              value={einheitId}
              onChange={(e) => {
                setDirty(true)
                setEinheitId(e.target.value)
              }}
              options={einheitOptions}
            />
          ) : (
            <p className="text-[length:var(--fs-text)]" style={{ color: 'var(--text-3)' }}>
              Einheit: {edit.objekt_einheiten?.bezeichnung ?? '—'}
            </p>
          )}
          <Input
            label="Name"
            value={name}
            onChange={(e) => {
              setDirty(true)
              setName(e.target.value)
            }}
            required
          />
          <Input
            label="Telefon"
            value={telefon}
            onChange={(e) => {
              setDirty(true)
              setTelefon(e.target.value)
            }}
            type="tel"
          />
          <Input
            label="E-Mail"
            value={email}
            onChange={(e) => {
              setDirty(true)
              setEmail(e.target.value)
            }}
            type="email"
          />
          {err ? <p className="text-[length:var(--fs-text)] text-danger">{err}</p> : null}
        </div>
      </EditorSheet>
    </>
  )
}

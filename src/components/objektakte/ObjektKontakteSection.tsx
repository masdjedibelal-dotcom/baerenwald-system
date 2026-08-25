'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockModal } from '@/components/mock-ui/MockModal'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
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
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

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
      setDirty(false)
      setModalOpen(false)
      setSelected({})
      onChanged()
    })
  }

  async function runBulkDelete() {
    if (!selectedRows.length || bulkDeletePending) return
    setBulkDeletePending(true)
    try {
      const failed: string[] = []
      for (const k of selectedRows) {
        const r = await deleteObjektKontakt(kundeId, objektId, k.id)
        if (!r.ok) {
          failed.push(k.name)
          continue
        }
        setListe((prev) => prev.filter((x) => x.id !== k.id))
      }
      setSelected({})
      setBulkDeleteOpen(false)
      if (failed.length) {
        toast.error(
          failed.length === 1
            ? `„${failed[0]}“ konnte nicht gelöscht werden.`
            : `${failed.length} Kontakte konnten nicht gelöscht werden.`
        )
      } else {
        toast.success(
          selectedRows.length === 1 ? 'Kontakt gelöscht' : `${selectedRows.length} Kontakte gelöscht`
        )
      }
      onChanged()
    } finally {
      setBulkDeletePending(false)
    }
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
      >
        <div
          className="vg-check"
          onClick={(e) => {
            e.stopPropagation()
            toggleSel(k.id)
          }}
          role="checkbox"
          aria-checked={isChecked}
          aria-label={`${k.name} auswählen`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              toggleSel(k.id)
            }
          }}
        >
          <span className={cn('vg-box', isChecked && 'on')}>
            {isChecked ? <MockIcon ctx="default" n="check" size={12} /> : null}
          </span>
        </div>
        <button
          type="button"
          className={isMobile ? 'ap-mobile-card__hit' : 'ap-list__hit'}
          onClick={() => openBearbeiten(k)}
        >
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
        </button>
      </div>
    )
  }

  return (
    <>
      <MockCard
        title={liste.length ? `Kontakte vor Ort · ${liste.length}` : 'Kontakte vor Ort'}
        icon="user"
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {liste.length > 0 ? (
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
        <p className="mb-3 text-[length:var(--fs-meta)] leading-relaxed" style={{ color: 'var(--text-3)' }}>
          Beirat, Notfall, Dienstleister — der Hausmeister steht in der Karte darüber und bleibt hiervon unberührt.
        </p>

        {selectedCount > 0 ? (
          <div className="bulkbar" style={{ marginBottom: 12 }}>
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

        {liste.length === 0 ? (
          <MockEmpty
            icon="user"
            title="Noch keine Kontakte"
            hint="Kontakt hinzufügen — Hausmeister bitte in der Karte darüber anlegen."
            action={
              <MockBtn kind="primary" icon="plus" onClick={openNeu}>
                Hinzufügen
              </MockBtn>
            }
          />
        ) : isMobile ? (
          <div className="ap-cards vg-selectmode">{liste.map(rowBody)}</div>
        ) : (
          <div className="ap-list vg-selectmode">
            <div className="ap-list__head ap-list__head--select">
              <span aria-hidden />
              <span>Name</span>
              <span>Rolle</span>
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
        title={selectedCount === 1 ? 'Kontakt löschen?' : `${selectedCount} Kontakte löschen?`}
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
              ? `„${selectedRows[0]?.name ?? 'Kontakt'}“ wird unwiderruflich gelöscht.`
              : `${selectedCount} ausgewählte Kontakte werden unwiderruflich gelöscht.`}
        </div>
      </MockModal>

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
          <Select
            label="Rolle"
            name="rolle"
            value={rolle}
            onChange={(e) => {
              setDirty(true)
              setRolle(e.target.value as ObjektKontaktRolle)
            }}
            options={ROLLE_OPTIONS}
          />
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
          <Textarea
            label="Notiz"
            value={notiz}
            onChange={(e) => {
              setDirty(true)
              setNotiz(e.target.value)
            }}
            rows={3}
          />
          {err ? <p className="text-[length:var(--fs-text)] text-danger">{err}</p> : null}
        </div>
      </EditorSheet>
    </>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import { KundenObjektModal } from '@/components/kunden/KundenObjektModal'
import {
  deleteKundenObjekt,
  fetchKundenObjektListenStats,
  type KundenObjektListenStats,
} from '@/app/actions/kunden-objekte'
import {
  filterObjekteFuerKunde,
  kundenObjektKurzlabel,
  kundenObjektStrasseZeile,
} from '@/lib/kunden-objekte'
import { toast } from '@/components/ui/app-toast'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { ListBulkBar } from '@/components/mock-ui/ListBulkBar'
import { MockModal } from '@/components/mock-ui/MockModal'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { LIST } from '@/lib/crm-labels'
import { exportSimpleCsv } from '@/lib/mock-list-export'
import { ListRowCheck } from '@/components/ui/ListRowCheck'
import type { EntityMenuItem } from '@/lib/entity-menu'
import type { KundenObjekt } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

const OBJEKT_LIST_COLS = '28px minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.7fr) 44px'

type Props = {
  kundeId: string
  objekte: KundenObjekt[]
  verwaltungName?: string
  /** Anfrage/Wizard: aktuell gewähltes Objekt */
  selectedId?: string | null
  onSelect?: (objektId: string | null) => void
  onChanged: () => void
  /** Nur Dropdown + Hinzufügen (Wizard) */
  variant?: 'full' | 'select'
  className?: string
}

export function KundenObjekteCard({
  kundeId,
  objekte,
  verwaltungName,
  selectedId,
  onSelect,
  onChanged,
  variant = 'full',
  className,
}: Props) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [modalOpen, setModalOpen] = useState(false)
  const [editObjekt, setEditObjekt] = useState<KundenObjekt | null>(null)
  const [localObjekte, setLocalObjekte] = useState(() => filterObjekteFuerKunde(objekte, kundeId))
  const [statsById, setStatsById] = useState<Record<string, KundenObjektListenStats>>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeletePending, setBulkDeletePending] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<KundenObjekt | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  useEffect(() => {
    setLocalObjekte(filterObjekteFuerKunde(objekte, kundeId))
  }, [kundeId, objekte])

  const liste = useMemo(() => {
    const ids = new Set<string>()
    const merged: KundenObjekt[] = []
    for (const o of [...localObjekte, ...objekte]) {
      if (o.kunde_id !== kundeId || ids.has(o.id)) continue
      ids.add(o.id)
      merged.push(o)
    }
    return merged.sort((a, b) => a.titel.localeCompare(b.titel, 'de'))
  }, [localObjekte, objekte, kundeId])

  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(liste.map((o) => o.id))
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

  useEffect(() => {
    if (variant !== 'full' || liste.length === 0) return
    let cancelled = false
    void fetchKundenObjektListenStats(
      kundeId,
      liste.map((o) => o.id)
    ).then((next) => {
      if (!cancelled) setStatsById(next)
    })
    return () => {
      cancelled = true
    }
  }, [liste, variant, kundeId])

  const selectOptions = useMemo(
    () => [
      { value: '', label: '— Objekt wählen —' },
      ...liste.map((o) => ({ value: o.id, label: kundenObjektKurzlabel(o) })),
    ],
    [liste]
  )

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  )
  const selectedCount = selectedIds.length
  const selectedRows = useMemo(
    () => liste.filter((o) => selected[o.id]),
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
    for (const o of liste) next[o.id] = true
    setSelected(next)
  }

  function openNeu() {
    setEditObjekt(null)
    setModalOpen(true)
  }

  function openBearbeiten() {
    if (selectedRows.length !== 1) return
    openBearbeitenObjekt(selectedRows[0]!)
  }

  function openBearbeitenObjekt(o: KundenObjekt) {
    setEditObjekt(o)
    setModalOpen(true)
  }

  async function confirmDeleteEinzel() {
    if (!deleteTarget || deletePending) return
    setDeletePending(true)
    try {
      const r = await deleteKundenObjekt(deleteTarget.id, kundeId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setLocalObjekte((prev) => prev.filter((x) => x.id !== deleteTarget.id))
      if (selectedId === deleteTarget.id) onSelect?.(null)
      setDeleteTarget(null)
      toast.success('Objekt gelöscht')
      onChanged()
    } finally {
      setDeletePending(false)
    }
  }

  function objektRowMenu(o: KundenObjekt): EntityMenuItem[] {
    return [
      {
        icon: 'pencil',
        label: 'Bearbeiten',
        onClick: () => openBearbeitenObjekt(o),
      },
      'sep',
      {
        icon: 'trash',
        label: 'Löschen',
        danger: true,
        onClick: () => setDeleteTarget(o),
      },
    ]
  }

  function statsLabel(o: KundenObjekt): string {
    const st = statsById[o.id]
    if (!st) return '—'
    if (st.mieterTotal > 0) {
      return `${st.mieterTotal} ${st.mieterTotal === 1 ? 'Mieter' : 'Mieter'}`
    }
    if (st.einheitenTotal > 0) {
      return `${st.einheitenTotal} ${st.einheitenTotal === 1 ? 'Einheit' : 'Einheiten'}`
    }
    return '—'
  }

  function objektRow(o: KundenObjekt) {
    const strasse = kundenObjektStrasseZeile(o) || '—'
    const ort = [o.plz?.trim(), o.ort?.trim()].filter(Boolean).join(' ')
    const adresse = [strasse !== '—' ? strasse : null, ort || null].filter(Boolean).join(', ') || '—'
    const isChecked = Boolean(selected[o.id])
    const bezug = statsLabel(o)

    return (
      <div
        key={o.id}
        className={cn(
          isMobile ? 'ap-mobile-card ap-mobile-card--row' : 'ap-list__row ap-list__row--select',
          isChecked && 'is-checked',
          selectedId === o.id && 'is-checked'
        )}
        style={isMobile ? undefined : { gridTemplateColumns: OBJEKT_LIST_COLS }}
      >
        <ListRowCheck
          checked={isChecked}
          onToggle={() => toggleSel(o.id)}
          title={`${o.titel} auswählen`}
        />
        <button
          type="button"
          className={isMobile ? 'ap-mobile-card__hit' : 'ap-list__hit'}
          onClick={() => openAkte(o)}
        >
          {isMobile ? (
            <>
              <div className="ap-mobile-card__top">
                <span className="ap-mobile-card__name">{o.titel}</span>
              </div>
              <div className="ap-mobile-card__meta">{adresse}</div>
              {bezug !== '—' ? <div className="ap-mobile-card__meta">{bezug}</div> : null}
            </>
          ) : (
            <>
              <span className="ap-list__name-cell">{o.titel}</span>
              <span className="ap-list__dim">{adresse}</span>
              <span className="ap-list__dim">{bezug}</span>
            </>
          )}
        </button>
        <div
          className="row-actions always"
          onClick={(e) => e.stopPropagation()}
          style={{ justifyContent: 'flex-end' }}
        >
          <MockEntityRowMenu items={objektRowMenu(o)} title={o.titel} />
        </div>
      </div>
    )
  }

  function openAkte(o: KundenObjekt) {
    router.push(`/kunden/${kundeId}/objekte/${o.id}`)
  }

  function onObjektSaved(o: KundenObjekt) {
    if (o.kunde_id !== kundeId) return
    setLocalObjekte((prev) => {
      const fuerKunde = filterObjekteFuerKunde(prev, kundeId)
      const idx = fuerKunde.findIndex((x) => x.id === o.id)
      if (idx >= 0) {
        const next = [...fuerKunde]
        next[idx] = o
        return next
      }
      return [...fuerKunde, o]
    })
    onSelect?.(o.id)
    setSelected({})
    onChanged()
  }

  function bulkExport() {
    exportSimpleCsv(
      'objekte-auswahl',
      selectedRows.map((o) => ({
        Objekt: o.titel,
        Adresse: kundenObjektStrasseZeile(o) ?? '',
        Bezug: kundenObjektKurzlabel(o),
      }))
    )
  }

  async function runBulkDelete() {
    if (!selectedRows.length || bulkDeletePending) return
    setBulkDeletePending(true)
    try {
      const failed: string[] = []
      for (const o of selectedRows) {
        const r = await deleteKundenObjekt(o.id, kundeId)
        if (!r.ok) {
          failed.push(o.titel)
          continue
        }
        setLocalObjekte((prev) => prev.filter((x) => x.id !== o.id))
        if (selectedId === o.id) onSelect?.(null)
      }
      setSelected({})
      setBulkDeleteOpen(false)
      if (failed.length) {
        toast.error(
          failed.length === 1
            ? `„${failed[0]}“ konnte nicht gelöscht werden.`
            : `${failed.length} Objekte konnten nicht gelöscht werden.`
        )
      } else {
        toast.success(
          selectedRows.length === 1 ? 'Objekt gelöscht' : `${selectedRows.length} Objekte gelöscht`
        )
      }
      onChanged()
    } finally {
      setBulkDeletePending(false)
    }
  }

  const selectBlock = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <Select
          label="Objekt für dieses Angebot"
          name="kunde_objekt"
          value={selectedId ?? ''}
          onChange={(e) => onSelect?.(e.target.value.trim() || null)}
          options={selectOptions}
        />
      </div>
      <Button type="button" variant="primary" size="sm" className="shrink-0 gap-1.5" onClick={openNeu}>
        <Plus className="h-4 w-4" aria-hidden />
        Objekt hinzufügen
      </Button>
    </div>
  )

  const modal = (
    <KundenObjektModal
      open={modalOpen}
      onClose={() => setModalOpen(false)}
      kundeId={kundeId}
      verwaltungName={verwaltungName}
      editObjekt={editObjekt}
      onSaved={onObjektSaved}
    />
  )

  if (variant === 'select') {
    return (
      <MockCard title="Objekt" icon="building" className={cn('dshell-framed', className)}>
        {selectBlock}
        {modal}
      </MockCard>
    )
  }

  return (
    <>
      <MockCard
        title={liste.length ? `Objekte · ${liste.length}` : 'Objekte'}
        icon="building"
        className={className}
        actions={
          <MockBtn sm kind="primary" icon="plus" onClick={openNeu}>
            {LIST.hinzufuegen}
          </MockBtn>
        }
      >
        {onSelect ? <div className="mb-4">{selectBlock}</div> : null}

        {selectedCount > 0 ? (
          <ListBulkBar
            selectedCount={selectedCount}
            onClear={() => setSelected({})}
            onExport={bulkExport}
            onDelete={() => setBulkDeleteOpen(true)}
            onToggleAll={toggleAll}
            allSelected={allSelected}
            onEdit={openBearbeiten}
            deletePending={bulkDeletePending}
            className="mb-3"
          />
        ) : null}

        {liste.length === 0 ? (
          <MockEmpty icon="building" title="Noch keine Objekte" />
        ) : isMobile ? (
          <div className="ap-cards vg-selectmode">{liste.map(objektRow)}</div>
        ) : (
          <div className="ap-list vg-selectmode">
            <div
              className="ap-list__head ap-list__head--select"
              style={{ gridTemplateColumns: OBJEKT_LIST_COLS }}
            >
              <span aria-hidden />
              <span>Objekt</span>
              <span>Adresse</span>
              <span>Bezug</span>
              <span aria-hidden />
            </div>
            {liste.map(objektRow)}
          </div>
        )}
      </MockCard>

      <MockModal
        open={bulkDeleteOpen}
        onClose={() => {
          if (!bulkDeletePending) setBulkDeleteOpen(false)
        }}
        icon="trash"
        title={selectedCount === 1 ? 'Objekt löschen?' : `${selectedCount} Objekte löschen?`}
        sub="Einheiten und Kontakte gehen mit verloren."
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
              ? `„${selectedRows[0]?.titel ?? 'Objekt'}“ wird unwiderruflich gelöscht.`
              : `${selectedCount} ausgewählte Objekte werden unwiderruflich gelöscht.`}
        </div>
      </MockModal>

      <MockModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deletePending) setDeleteTarget(null)
        }}
        icon="trash"
        title="Objekt löschen?"
        sub="Einheiten und Kontakte gehen mit verloren."
        size="sm"
        footer={
          <>
            <MockBtn kind="ghost" disabled={deletePending} onClick={() => setDeleteTarget(null)}>
              Abbrechen
            </MockBtn>
            <div style={{ flex: 1 }} />
            <MockBtn
              kind="danger"
              icon={deletePending ? undefined : 'trash'}
              disabled={deletePending}
              onClick={() => void confirmDeleteEinzel()}
            >
              {deletePending ? 'Wird gelöscht…' : 'Löschen'}
            </MockBtn>
          </>
        }
      >
        <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.5 }}>
          {deletePending
            ? 'Bitte warten…'
            : `„${deleteTarget?.titel ?? 'Objekt'}“ wird unwiderruflich gelöscht.`}
        </div>
      </MockModal>

      {modal}
    </>
  )
}

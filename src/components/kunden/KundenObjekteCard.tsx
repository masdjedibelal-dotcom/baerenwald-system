'use client'
import { useTransition } from '@/components/ui/action-busy'

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
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockModal } from '@/components/mock-ui/MockModal'
import type { KundenObjekt } from '@/lib/types'
import { cn } from '@/lib/utils'

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
  const [modalOpen, setModalOpen] = useState(false)
  const [editObjekt, setEditObjekt] = useState<KundenObjekt | null>(null)
  const [pending, startTransition] = useTransition()
  const [localObjekte, setLocalObjekte] = useState(() => filterObjekteFuerKunde(objekte, kundeId))
  const [statsById, setStatsById] = useState<Record<string, KundenObjektListenStats>>({})
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeletePending, setBulkDeletePending] = useState(false)

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
    setEditObjekt(selectedRows[0]!)
    setModalOpen(true)
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
    <div className={cn('objekte-tab', className)}>
      <div className="objekte-tab__head">
        <span className="objekte-tab__title">Objekte</span>
        <div style={{ flex: 1 }} />
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

      {onSelect ? <div className="mb-4">{selectBlock}</div> : null}

      {selectedCount > 0 ? (
        <div className="bulkbar">
          <span className="bulkbar-count">
            <b>{selectedCount}</b> ausgewählt
          </span>
          <div style={{ flex: 1 }} />
          {selectedCount === 1 ? (
            <MockBtn kind="ghost" sm icon="pencil" onClick={openBearbeiten} disabled={pending}>
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

      {liste.length === 0 ? (
        <MockEmpty
          icon="building"
          title="Noch keine Objekte"
          hint="Objekt anlegen für Gebäude, WEGs und Melde-Links"
          action={
            <MockBtn kind="primary" icon="plus" onClick={openNeu}>
              Hinzufügen
            </MockBtn>
          }
        />
      ) : (
        <div className="objekte-cards vg-selectmode">
          {liste.map((o) => {
            const strasse = kundenObjektStrasseZeile(o) || '—'
            const st = statsById[o.id]
            const mieterAnzahl =
              st && st.mieterTotal > 0
                ? st.mieterTotal
                : st && st.einheitenTotal > 0
                  ? st.einheitenTotal
                  : null
            const isChecked = Boolean(selected[o.id])

            return (
              <div
                key={o.id}
                className={cn(
                  'card objekte-card dshell-framed',
                  selectedId === o.id && 'is-sel',
                  isChecked && 'objekte-card--checked'
                )}
              >
                <div className="objekte-card__body">
                  <div
                    className="vg-check"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSel(o.id)
                    }}
                    role="checkbox"
                    aria-checked={isChecked}
                    aria-label={`${o.titel} auswählen`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleSel(o.id)
                      }
                    }}
                  >
                    <span className={cn('vg-box', isChecked && 'on')}>
                      {isChecked ? <MockIcon ctx="default" n="check" size={12} /> : null}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="objekte-card__main objekte-card__hit"
                    onClick={() => openAkte(o)}
                  >
                    <div className="objekte-card__name">{o.titel}</div>
                    <div className="objekte-card__sub" title={strasse}>
                      {strasse}
                    </div>
                    {mieterAnzahl != null ? (
                      <div className="objekte-card__meta">{mieterAnzahl} Mieter</div>
                    ) : null}
                  </button>
                  <MockIcon
                    ctx="default"
                    n="chevron-right"
                    size={16}
                    className="objekte-card__chevron"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal}
    </div>
  )
}

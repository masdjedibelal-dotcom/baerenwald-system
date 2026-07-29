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
import { buildMeldeLink } from '@/lib/org/org-portal-helpers'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { KundenObjekt } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  kundeId: string
  objekte: KundenObjekt[]
  verwaltungName?: string
  /** Org-Kennung für Melde-Links */
  orgKennung?: string | null
  /** Anfrage/Wizard: aktuell gewähltes Objekt */
  selectedId?: string | null
  onSelect?: (objektId: string | null) => void
  onChanged: () => void
  /** Nur Dropdown + Hinzufügen (Wizard) */
  variant?: 'full' | 'select'
  className?: string
}

const COLS = 'minmax(0, 1.6fr) 140px 110px 28px'

export function KundenObjekteCard({
  kundeId,
  objekte,
  verwaltungName,
  orgKennung,
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

  const orgSlug = orgKennung?.trim().toLowerCase() || null

  const selectOptions = useMemo(
    () => [
      { value: '', label: '— Objekt wählen —' },
      ...liste.map((o) => ({ value: o.id, label: kundenObjektKurzlabel(o) })),
    ],
    [liste]
  )

  function openNeu() {
    setEditObjekt(null)
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
    onChanged()
  }

  function entfernen(o: KundenObjekt) {
    if (!confirm(`Objekt „${o.titel}“ wirklich löschen?`)) return
    startTransition(async () => {
      const r = await deleteKundenObjekt(o.id, kundeId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setLocalObjekte((prev) => prev.filter((x) => x.id !== o.id))
      if (selectedId === o.id) onSelect?.(null)
      toast.success('Objekt gelöscht')
      onChanged()
    })
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
      <Button type="button" variant="secondary" size="sm" className="shrink-0 gap-1.5" onClick={openNeu}>
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
      <MockCard title="Objekt" icon="building" className={className}>
        <p className="mb-3 text-[12px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
          Ausführungsort für das Angebot (erscheint im PDF unter „Durchführung in:“).
        </p>
        {selectBlock}
        {modal}
      </MockCard>
    )
  }

  return (
    <div className={cn('objekte-tab', className)}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          paddingBottom: 8,
          borderBottom: '0.5px solid var(--border)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--fs-meta)',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
          }}
        >
          Objekte
        </span>
        <div style={{ flex: 1 }} />
        <MockBtn sm kind="ghost" icon="plus" onClick={openNeu}>
          Objekt
        </MockBtn>
      </div>

      {onSelect ? <div className="mb-4">{selectBlock}</div> : null}

      {liste.length === 0 ? (
        <MockEmpty
          icon="building"
          title="Noch keine Objekte"
          hint="Objekt anlegen für Gebäude, WEGs und Melde-Links"
          action={
            <MockBtn kind="primary" icon="plus" onClick={openNeu}>
              Objekt anlegen
            </MockBtn>
          }
        />
      ) : (
        <div className="listcard">
          <div className="list-row head" style={{ gridTemplateColumns: COLS }} aria-hidden>
            <div>Objekt</div>
            <div>Einheiten</div>
            <div>Miete</div>
            <div />
          </div>
          {liste.map((o) => {
            const str = kundenObjektStrasseZeile(o)
            const ortZeile = [o.plz?.trim(), o.ort?.trim()].filter(Boolean).join(' ')
            const sub = [str, ortZeile].filter(Boolean).join(' · ') || '—'
            const st = statsById[o.id]
            const einheitenLabel =
              st && st.einheitenTotal > 0
                ? `${st.einheitenVermietet}/${st.einheitenTotal} vermietet`
                : o.einheiten_hinweis?.trim() || '—'
            const mieteLabel = '—'

            return (
              <div
                key={o.id}
                role="button"
                tabIndex={0}
                className={cn('list-row', selectedId === o.id && 'sel')}
                style={{ gridTemplateColumns: COLS, alignItems: 'center' }}
                onClick={() => openAkte(o)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openAkte(o)
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (pending) return
                  if (confirm(`Objekt „${o.titel}“ löschen?`)) entfernen(o)
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="lc-title" style={{ fontWeight: 600 }}>
                    {o.titel}
                  </div>
                  <div
                    className="lc-sub"
                    style={{
                      color: 'var(--text-3)',
                      fontSize: 'var(--fs-meta)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={sub}
                  >
                    {sub}
                  </div>
                </div>
                <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)' }}>{einheitenLabel}</div>
                <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)' }}>{mieteLabel}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--text-4)' }}>
                  <MockIcon ctx="default" n="chevron-right" size={16} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {orgSlug && liste.some((o) => o.melde_slug?.trim()) ? (
        <p style={{ marginTop: 12, fontSize: 'var(--fs-meta)', color: 'var(--text-4)' }}>
          Melde-Links:{' '}
          {liste
            .filter((o) => o.melde_slug?.trim())
            .slice(0, 2)
            .map((o) => (
              <button
                key={o.id}
                type="button"
                className="btn ghost sm"
                style={{ marginRight: 4 }}
                onClick={() => {
                  const url = buildMeldeLink(orgSlug, o.melde_slug!)
                  void navigator.clipboard.writeText(url).then(
                    () => toast.success('Melde-Link kopiert'),
                    () => toast.error('Kopieren fehlgeschlagen')
                  )
                }}
              >
                {o.titel}
              </button>
            ))}
        </p>
      ) : null}

      {modal}
    </div>
  )
}

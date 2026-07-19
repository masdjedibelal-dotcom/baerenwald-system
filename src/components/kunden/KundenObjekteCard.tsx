'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { KundenObjektModal } from '@/components/kunden/KundenObjektModal'
import { deleteKundenObjekt } from '@/app/actions/kunden-objekte'
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
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import type { EntityMenuItem } from '@/lib/entity-menu'
import type { KundenObjekt } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  kundeId: string
  objekte: KundenObjekt[]
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

const COLS = 'minmax(0, 1.4fr) minmax(0, 1.2fr) 140px 44px'

export function KundenObjekteCard({
  kundeId,
  objekte,
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

  function kopierenLink(url: string) {
    void navigator.clipboard.writeText(url).then(
      () => toast.success('Melde-Link kopiert'),
      () => toast.error('Kopieren fehlgeschlagen')
    )
  }

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

  function openBearbeiten(o: KundenObjekt) {
    setEditObjekt(o)
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

  function rowMenuItems(o: KundenObjekt): EntityMenuItem[] {
    const items: EntityMenuItem[] = [
      { icon: 'external-link', label: 'Öffnen', onClick: () => openAkte(o) },
      { icon: 'pencil', label: 'Bearbeiten', onClick: () => openBearbeiten(o) },
    ]
    if (orgSlug && o.melde_slug?.trim()) {
      const url = buildMeldeLink(orgSlug, o.melde_slug)
      items.push(
        'sep',
        { icon: 'copy', label: 'Melde-Link kopieren', onClick: () => kopierenLink(url) },
        {
          icon: 'external-link',
          label: 'Melde-Link öffnen',
          onClick: () => window.open(url, '_blank', 'noopener,noreferrer'),
        }
      )
    }
    items.push('sep', {
      icon: 'trash',
      label: 'Löschen',
      danger: true,
      onClick: () => {
        if (pending) return
        entfernen(o)
      },
    })
    return items
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
    <MockCard
      title={liste.length ? `Objekte · ${liste.length}` : 'Objekte'}
      icon="building"
      className={className}
      actions={
        <MockBtn sm kind="ghost" icon="plus" onClick={openNeu}>
          Hinzufügen
        </MockBtn>
      }
    >
      <p className="mb-3 text-[12px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
        Gebäude, WEGs und weitere Objekte dieses Kunden — für Angebote und Ausführungsort.
      </p>

      {onSelect ? <div className="mb-4">{selectBlock}</div> : null}

      {liste.length === 0 ? (
        <MockEmpty
          icon="building"
          title="Noch keine Objekte"
          hint="Objekt hinzufügen für Angebote und Melde-Links"
        />
      ) : (
        <div className="listcard">
          <div className="list-row head" style={{ gridTemplateColumns: COLS }} aria-hidden>
            <div>Objekt</div>
            <div>Adresse</div>
            <div>Melde-Link</div>
            <div />
          </div>
          {liste.map((o) => {
            const adresse =
              [kundenObjektStrasseZeile(o), [o.plz, o.ort].filter(Boolean).join(' ')]
                .filter(Boolean)
                .join(', ') || '—'
            const meldeAktiv = Boolean(orgSlug && o.melde_slug?.trim() && o.melde_aktiv !== false)
            const meldeInaktiv = Boolean(orgSlug && o.melde_slug?.trim() && o.melde_aktiv === false)
            return (
              <div
                key={o.id}
                role="button"
                tabIndex={0}
                className={cn('list-row', selectedId === o.id && 'sel')}
                style={{ gridTemplateColumns: COLS }}
                onClick={() => openAkte(o)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openAkte(o)
                  }
                }}
              >
                <div className="lc-title" style={{ fontWeight: 600 }}>
                  {o.titel}
                </div>
                <div
                  className="lc-sub"
                  style={{
                    color: 'var(--text-2)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={adresse}
                >
                  {adresse}
                </div>
                <div className="lc-pills">
                  {meldeAktiv ? (
                    <span className="pill-tag" style={{ cursor: 'default' }}>
                      Aktiv
                    </span>
                  ) : meldeInaktiv ? (
                    <span className="pill-tag" style={{ cursor: 'default', opacity: 0.7 }}>
                      Inaktiv
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-3)' }}>—</span>
                  )}
                </div>
                <div
                  className="row-actions always"
                  onClick={(e) => e.stopPropagation()}
                  style={{ justifyContent: 'flex-end' }}
                >
                  <MockEntityRowMenu items={rowMenuItems(o)} title="Objekt" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal}
    </MockCard>
  )
}

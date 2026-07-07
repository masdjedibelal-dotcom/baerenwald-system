'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Building2, Copy, ExternalLink, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { KundenObjektModal } from '@/components/kunden/KundenObjektModal'
import { deleteKundenObjekt } from '@/app/actions/kunden-objekte'
import {
  filterObjekteFuerKunde,
  kundenObjektKurzlabel,
  kundenObjektStrasseZeile,
} from '@/lib/kunden-objekte'
import { toast } from '@/components/ui/app-toast'
import { buildMeldeLink } from '@/lib/org/org-portal-helpers'
import type { KundenObjekt } from '@/lib/types'

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

  if (variant === 'select') {
    return (
      <Card collapsible title="Objekt" className={className}>
        <p className="mb-3 text-[12px] leading-relaxed text-bw-text-muted">
          Ausführungsort für das Angebot (erscheint im PDF unter „Durchführung in:“).
        </p>
        {selectBlock}
        <KundenObjektModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          kundeId={kundeId}
          editObjekt={editObjekt}
          onSaved={onObjektSaved}
        />
      </Card>
    )
  }

  return (
    <Card
      collapsible
      title={
        <>
          <Building2 className="inline h-4 w-4 text-bw-primary" aria-hidden /> Objekte
        </>
      }
      className={className}
      action={
        <button type="button" className="btn btn-ghost btn-sm gap-1" onClick={openNeu}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Hinzufügen
        </button>
      }
    >
      <p className="mb-3 text-[12px] leading-relaxed text-bw-text-muted">
        Gebäude, WEGs und weitere Objekte dieses Kunden — für Angebote und Ausführungsort.
      </p>

      {onSelect ? <div className="mb-4">{selectBlock}</div> : null}

      {liste.length === 0 ? (
        <p className="text-[13px] text-bw-text-muted">Noch keine Objekte hinterlegt.</p>
      ) : (
        <ul className="divide-y divide-bw-border rounded-lg border border-bw-border">
          {liste.map((o) => (
            <li key={o.id} className="flex gap-3 px-3 py-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-bw-text-muted" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-bw-text">{o.titel}</p>
                <p className="text-[12px] text-bw-text-muted">
                  {[kundenObjektStrasseZeile(o), [o.plz, o.ort].filter(Boolean).join(' ')]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
                {orgSlug && o.melde_slug?.trim() ? (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        o.melde_aktiv !== false
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-bw-muted text-bw-text-muted'
                      }`}
                    >
                      {o.melde_aktiv !== false ? 'Melde-Link aktiv' : 'Melde-Link inaktiv'}
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-[11px] text-bw-primary hover:underline"
                      onClick={() => kopierenLink(buildMeldeLink(orgSlug, o.melde_slug))}
                    >
                      <Copy className="h-3 w-3" aria-hidden />
                      Link kopieren
                    </button>
                    <a
                      href={buildMeldeLink(orgSlug, o.melde_slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-bw-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" aria-hidden />
                      Öffnen
                    </a>
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-label="Bearbeiten"
                  onClick={() => openBearbeiten(o)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-danger"
                  aria-label="Löschen"
                  disabled={pending}
                  onClick={() => entfernen(o)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <KundenObjektModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        kundeId={kundeId}
        editObjekt={editObjekt}
        onSaved={onObjektSaved}
      />
    </Card>
  )
}

'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/app-toast'
import {
  listDuplikatKandidaten,
  zusammenfuehrenLeadDuplikat,
} from '@/app/(dashboard)/anfragen/duplikat-actions'
import { dismissDuplikatBand } from '@/app/(dashboard)/anfragen/actions'

/** Phase 10: Duplikat-Band im Anfrage-Detail. */
export function DuplikatBand({
  leadId,
  duplikatHinweis,
  duplikatBandDismissed,
  zusammengefuehrtIn,
  forceOpen,
  onForceOpenHandled,
  onDismissed,
}: {
  leadId: string
  duplikatHinweis?: boolean | null
  duplikatBandDismissed?: boolean | null
  zusammengefuehrtIn?: string | null
  /** ⋯-Menü „Zusammenführen“ öffnet den Merge-Flow */
  forceOpen?: boolean
  onForceOpenHandled?: () => void
  onDismissed?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [kandidaten, setKandidaten] = useState<{ id: string; label: string }[]>([])
  const [zielId, setZielId] = useState('')
  const [open, setOpen] = useState(false)

  const alreadyMerged = Boolean(zusammengefuehrtIn)
  const bandVisible = Boolean(duplikatHinweis) && !duplikatBandDismissed && !alreadyMerged
  const menuOnly = Boolean(duplikatBandDismissed || forceOpen) && !alreadyMerged

  useEffect(() => {
    if (!duplikatHinweis && !open && !forceOpen && !duplikatBandDismissed) return
    void listDuplikatKandidaten(leadId).then((r) => {
      if (!r.ok) return
      setKandidaten(r.kandidaten)
      if (r.kandidaten[0]?.id) setZielId((prev) => prev || r.kandidaten[0]!.id)
    })
  }, [leadId, duplikatHinweis, open, forceOpen, duplikatBandDismissed])

  useEffect(() => {
    if (!forceOpen) return
    setOpen(true)
    onForceOpenHandled?.()
  }, [forceOpen, onForceOpenHandled])

  if (alreadyMerged) {
    return (
      <div
        className="rounded-lg border border-bw-border bg-bw-surface-2/50 px-3 py-2.5 text-[length:var(--fs-text)] text-bw-text"
        role="status"
      >
        Diese Anfrage wurde zusammengeführt →{' '}
        <a className="font-medium underline" href={`/anfragen/${zusammengefuehrtIn}`}>
          Ziel öffnen
        </a>
        . Bleibt in der Liste sichtbar.
      </div>
    )
  }

  if (!bandVisible && !(menuOnly && open)) return null

  function merge() {
    if (!zielId) {
      toast.error('Bitte Ziel-Anfrage wählen.')
      return
    }
    startTransition(async () => {
      const r = await zusammenfuehrenLeadDuplikat({
        doppelterLeadId: leadId,
        zielLeadId: zielId,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Zusammengeführt — Duplikat bleibt sichtbar', {
        action: {
          label: 'Zum Ziel',
          onClick: () => router.push(`/anfragen/${zielId}`),
        },
      })
      setOpen(false)
      router.refresh()
    })
  }

  function dismiss() {
    startTransition(async () => {
      const r = await dismissDuplikatBand(leadId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setOpen(false)
      onDismissed?.()
      router.refresh()
    })
  }

  if (!bandVisible && open) {
    return (
      <div
        className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[length:var(--fs-text)] text-amber-950"
        role="status"
      >
        <p className="font-medium">Zusammenführen</p>
        <MergeForm
          kandidaten={kandidaten}
          zielId={zielId}
          setZielId={setZielId}
          pending={pending}
          onMerge={merge}
          onCancel={() => setOpen(false)}
        />
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[length:var(--fs-text)] text-amber-950"
      role="status"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">Mögliches Duplikat</p>
          <p className="mt-0.5 text-[length:var(--fs-meta)] text-amber-900/90">
            Gleiche Tel/Mail oder gleiches Objekt in den letzten 30 Tagen — prüfen und ggf.
            zusammenführen.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 text-[length:var(--fs-meta)] underline"
          onClick={dismiss}
          disabled={pending}
        >
          Schließen
        </button>
      </div>
      {!open ? (
        <button
          type="button"
          className="mt-2 text-[length:var(--fs-meta)] font-semibold underline"
          onClick={() => setOpen(true)}
        >
          Zusammenführen
        </button>
      ) : (
        <MergeForm
          kandidaten={kandidaten}
          zielId={zielId}
          setZielId={setZielId}
          pending={pending}
          onMerge={merge}
          onCancel={() => setOpen(false)}
        />
      )}
    </div>
  )
}

function MergeForm({
  kandidaten,
  zielId,
  setZielId,
  pending,
  onMerge,
  onCancel,
}: {
  kandidaten: { id: string; label: string }[]
  zielId: string
  setZielId: (id: string) => void
  pending: boolean
  onMerge: () => void
  onCancel: () => void
}) {
  return (
    <div className="mt-2 space-y-2">
      <label className="block text-[length:var(--fs-meta)] font-medium">
        Ziel-Anfrage behalten
        <select
          className="mt-1 w-full rounded-md border border-amber-500/30 bg-white px-2 py-1.5 text-[length:var(--fs-text)]"
          value={zielId}
          onChange={(e) => setZielId(e.target.value)}
        >
          <option value="">— wählen —</option>
          {kandidaten.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button type="button" className="text-[length:var(--fs-meta)] underline" onClick={onCancel}>
          Abbrechen
        </button>
        <button
          type="button"
          className="rounded-md bg-amber-900 px-2.5 py-1 text-[length:var(--fs-meta)] font-medium text-white disabled:opacity-50"
          disabled={pending || !zielId}
          onClick={onMerge}
        >
          Zusammenführen
        </button>
      </div>
    </div>
  )
}

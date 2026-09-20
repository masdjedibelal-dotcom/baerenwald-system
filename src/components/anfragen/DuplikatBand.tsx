'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockSelect } from '@/components/mock-ui/MockForm'
import { afterServerActionRefresh } from '@/lib/crm-client-refresh'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/app-toast'
import {
  listDuplikatKandidaten,
  zusammenfuehrenLeadDuplikat,
} from '@/app/(dashboard)/anfragen/duplikat-actions'
import { dismissDuplikatBand } from '@/app/(dashboard)/anfragen/actions'
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

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
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
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
        className="rounded-card border border-bw-border bg-bw-surface-2/50 px-3 py-2.5 text-[length:var(--fs-text)] text-bw-text"
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
      applyFieldErrors({ _form: TOAST.bitte_ziel_anfrage_waehlen })
      return
    }
    startTransition(async () => {
      const r = await zusammenfuehrenLeadDuplikat({
        doppelterLeadId: leadId,
        zielLeadId: zielId,
      })
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.zusammengefuehrt_duplikat_bleibt_sichtbar, {
        action: {
          label: 'Zum Ziel',
          onClick: () => router.push(`/anfragen/${zielId}`),
        },
      })
      setOpen(false)
      afterServerActionRefresh()
    })
  }

  function dismiss() {
    startTransition(async () => {
      const r = await dismissDuplikatBand(leadId)
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      setOpen(false)
      if (onDismissed) onDismissed()
      else afterServerActionRefresh()
    })
  }

  if (!bandVisible && open) {
    return (
      <div
        className="rounded-card border border-[color-mix(in_srgb,var(--yel-tx)_40%,var(--border))] bg-[var(--yel-bg)]0/10 px-3 py-2.5 text-[length:var(--fs-text)] text-[var(--yel-tx)]"
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
      className="rounded-card border border-[color-mix(in_srgb,var(--yel-tx)_40%,var(--border))] bg-[var(--yel-bg)]0/10 px-3 py-2.5 text-[length:var(--fs-text)] text-[var(--yel-tx)]"
      role="status"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">Mögliches Duplikat</p>
          <p className="mt-0.5 text-[length:var(--fs-meta)] text-[var(--yel-tx)]">
            Gleiche Tel/Mail oder gleiches Objekt in den letzten 30 Tagen — prüfen und ggf.
            zusammenführen.
          </p>
        </div>
        <MockBtn className="shrink-0 text-[length:var(--fs-meta)] underline" type="button" onClick={dismiss} disabled={pending}>
          Abbrechen
        </MockBtn>
      </div>
      {!open ? (
        <MockBtn className="mt-2 text-[length:var(--fs-meta)] font-semibold underline" type="button" onClick={() => setOpen(true)}>
          Zusammenführen
        </MockBtn>
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
        <MockSelect className="mt-1 w-full rounded-field border border-[color-mix(in_srgb,var(--yel-tx)_30%,var(--border))] bg-white px-2 py-1.5 text-[length:var(--fs-text)]" value={zielId} onChange={(e) => setZielId(e.target.value)}>
          <option value="">— wählen —</option>
          {kandidaten.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </MockSelect>
      </label>
      <div className="flex gap-2">
        <MockBtn className="text-[length:var(--fs-meta)] underline" type="button" onClick={onCancel}>
          Abbrechen
        </MockBtn>
        <MockBtn className="rounded-button bg-[var(--yel-tx)] px-2.5 py-1 text-[length:var(--fs-meta)] font-medium text-white disabled:opacity-50" type="button" disabled={pending || !zielId} onClick={onMerge}>
          Zusammenführen
        </MockBtn>
      </div>
    </div>
  )
}

'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { useEffect, useRef, useState, useTransition } from 'react'
import {
  ensureAndLoadFachdokuSlots,
  uploadCrmFachdokuSlot,
} from '@/app/(dashboard)/auftraege/fachdoku-actions'
import {
  fachdokuChipLabel,
  fachdokuOffenCount,
  type FachdokuSlotRow,
} from '@/lib/auftraege/fachdoku-slots'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/app-toast'
import { cn } from '@/lib/utils'
import { TOAST } from '@/lib/copy'

export function AuftragFachdokuCard({
  auftragId,
  onChanged,
}: {
  auftragId: string
  onChanged?: () => void
}) {
  const [slots, setSlots] = useState<FachdokuSlotRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void ensureAndLoadFachdokuSlots(auftragId).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (res.ok) setSlots(res.slots)
      else setSlots([])
    })
    return () => {
      cancelled = true
    }
  }, [auftragId])

  if (loading) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted">Fachnachweise werden geladen…</p>
      </Card>
    )
  }

  if (!slots.length) return null

  const chip = fachdokuChipLabel(slots)
  const offen = fachdokuOffenCount(slots)

  function onFile(slotId: string, file: File) {
    setBusyId(slotId)
    startTransition(async () => {
      const res = await uploadCrmFachdokuSlot({ auftragId, slotId, file })
      setBusyId(null)
      if (!res.ok) {
        toast.systemError(res)
        return
      }
      setSlots(res.slots)
      toast.success(TOAST.fachnachweis_gespeichert)
      onChanged?.()
    })
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Fachnachweise</h3>
          <p className="mt-0.5 text-xs text-muted">
            Soft-Hinweis — Abnahme wird nicht blockiert. Upload auch wenn der Partner die
            Datei per Mail schickt.
          </p>
        </div>
        {chip ? (
          <span
            className={cn(
              'rounded-pill border px-2.5 py-0.5 text-fs-caption font-semibold',
              offen > 0
                ? 'border-status-contact-bg bg-status-contact-bg text-status-contact-text'
                : 'border-status-order-bg bg-status-order-bg text-status-order-text'
            )}
          >
            {chip}
          </span>
        ) : null}
      </div>
      <ul className="divide-y divide-border">
        {slots.map((s) => {
          const done = String(s.status).toLowerCase() === 'erledigt'
          const href = s.signed_url?.trim()
          return (
            <li key={s.id} className="flex items-center gap-2 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{s.label}</p>
                <p className="text-xs text-muted">
                  {done
                    ? `${s.datei_name ?? 'Datei'} · ${
                        s.uploaded_by_role === 'crm' ? 'CRM' : 'Partner'
                      }`
                    : 'Offen'}
                </p>
              </div>
              <span
                className={cn(
                  'rounded-pill px-2 py-0.5 text-fs-caption font-bold',
                  done ? 'bg-status-order-bg text-status-order-text' : 'bg-status-contact-bg text-status-contact-text'
                )}
              >
                {done ? 'Erledigt' : 'Offen'}
              </span>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-pill border border-border text-muted hover:bg-canvas"
                  title="Ansehen"
                >
                  <MockIcon n="eye" ctx="default" className="h-3.5 w-3.5" />
                </a>
              ) : null}
              <input
                ref={(el) => {
                  inputRefs.current[s.id] = el
                }}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) onFile(s.id, f)
                }}
              />
              <MockBtn
                type="button" sm
                kind="secondary"
                disabled={pending || busyId === s.id}
                onClick={() => inputRefs.current[s.id]?.click()}
              >
                <MockIcon n="upload" ctx="default" className="mr-1 h-3.5 w-3.5" />
                {busyId === s.id ? '…' : done ? 'Ersetzen' : 'Upload'}
              </MockBtn>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

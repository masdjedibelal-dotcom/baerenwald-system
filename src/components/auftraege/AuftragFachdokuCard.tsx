'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Eye, Upload } from 'lucide-react'

import {
  ensureAndLoadFachdokuSlots,
  uploadCrmFachdokuSlot,
} from '@/app/(dashboard)/auftraege/fachdoku-actions'
import {
  fachdokuChipLabel,
  fachdokuOffenCount,
  type FachdokuSlotRow,
} from '@/lib/auftraege/fachdoku-slots'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { toast } from '@/components/ui/app-toast'
import { cn } from '@/lib/utils'

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
        toast.error(res.message)
        return
      }
      setSlots(res.slots)
      toast.success('Fachnachweis gespeichert')
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
              'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
              offen > 0
                ? 'border-amber-200 bg-amber-50 text-amber-950'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
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
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                )}
              >
                {done ? 'Erledigt' : 'Offen'}
              </span>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted hover:bg-canvas"
                  title="Ansehen"
                >
                  <Eye className="h-3.5 w-3.5" />
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
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending || busyId === s.id}
                onClick={() => inputRefs.current[s.id]?.click()}
              >
                <Upload className="mr-1 h-3.5 w-3.5" />
                {busyId === s.id ? '…' : done ? 'Ersetzen' : 'Upload'}
              </Button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

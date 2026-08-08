'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { anfrageHandwerkerBautagebuchEintrag } from '@/app/(dashboard)/auftraege/bautagebuch-actions'
import type { AuftragHandwerkerRow, AuftragPosition } from '@/lib/types'
import { cn } from '@/lib/utils'

type HwOpt = { id: string; name: string; email?: string | null }

/**
 * Tagebuch anfordern: Handwerker wählen → Leistungen anhaken → Senden.
 * Nur Aufforderung zum Eintrag — keine Auftragsänderung / keine Bestätigungspflicht.
 */
export function TagebuchAnfordernSheet({
  open,
  onClose,
  auftragId,
  auftragHandwerker,
  positionen,
  onSent,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  auftragHandwerker: AuftragHandwerkerRow[]
  positionen: AuftragPosition[]
  onSent?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [handwerkerId, setHandwerkerId] = useState('')
  const [selectedPos, setSelectedPos] = useState<Set<string>>(() => new Set())
  const [notiz, setNotiz] = useState('')

  const hwOptions = useMemo(() => {
    const map = new Map<string, HwOpt>()
    for (const row of auftragHandwerker) {
      const id = row.handwerker_id?.trim()
      if (!id) continue
      const name =
        row.handwerker?.name?.trim() ||
        (typeof row.handwerker === 'object' && row.handwerker && 'name' in row.handwerker
          ? String((row.handwerker as { name?: string }).name ?? '').trim()
          : '') ||
        'Handwerker'
      if (!map.has(id)) {
        map.set(id, {
          id,
          name,
          email: row.handwerker?.email ?? null,
        })
      }
    }
    for (const p of positionen) {
      const id = p.handwerker_id?.trim()
      if (!id || map.has(id)) continue
      map.set(id, { id, name: 'Zugewiesener Partner', email: null })
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }, [auftragHandwerker, positionen])

  const leistungen = useMemo(() => {
    if (!handwerkerId) return []
    return positionen.filter(
      (p) =>
        p.handwerker_id === handwerkerId &&
        (p.aenderung_typ ?? '').toLowerCase() !== 'entfernt'
    )
  }, [positionen, handwerkerId])

  useEffect(() => {
    if (!open) return
    const first = hwOptions[0]?.id ?? ''
    setHandwerkerId(first)
    setSelectedPos(new Set())
    setNotiz('')
  }, [open, hwOptions])

  useEffect(() => {
    if (!handwerkerId) {
      setSelectedPos(new Set())
      return
    }
    setSelectedPos(new Set(leistungen.map((p) => p.id)))
  }, [handwerkerId, leistungen])

  function togglePos(id: string) {
    setSelectedPos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function send() {
    if (!handwerkerId) {
      toast.error('Bitte Handwerker wählen.')
      return
    }
    startTransition(async () => {
      const res = await anfrageHandwerkerBautagebuchEintrag({
        auftragId,
        handwerkerId,
        notiz: notiz.trim() || null,
        positionIds: Array.from(selectedPos),
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('Tagebuch-Update angefordert — Partner wird benachrichtigt.')
      onClose()
      onSent?.()
    })
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Tagebuch anfordern"
      subtitle="Partner erhält nur die Aufforderung zum Tagebuch-Eintrag"
      context="detail"
      size="md"
      confirmBusy={pending}
      onConfirm={send}
      confirmDisabled={!handwerkerId || pending || !hwOptions.length}
    >
      {!hwOptions.length ? (
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">
          Noch kein Handwerker diesem Auftrag zugewiesen. Zuerst unter Leistungen zuweisen.
        </p>
      ) : (
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <Select
            label="Handwerker"
            required
            value={handwerkerId}
            onChange={(e) => setHandwerkerId(e.target.value)}
            options={hwOptions.map((h) => ({
              value: h.id,
              label: h.name,
              sub: h.email?.trim() || undefined,
            }))}
          />

          <div>
            <div className="input-label mb-2">Gewerke / Leistungen</div>
            {!leistungen.length ? (
              <p className="text-[length:var(--fs-text)] text-bw-text-muted">
                Diesem Partner sind keine Leistungen zugewiesen — Anforderung gilt für den ganzen
                Auftrag.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {leistungen.map((p) => {
                  const checked = selectedPos.has(p.id)
                  const label = p.leistung_name?.trim() || 'Leistung'
                  const gewerk = p.gewerk_name?.trim()
                  return (
                    <li key={p.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5',
                          checked
                            ? 'border-[var(--green)] bg-[color-mix(in_srgb,var(--green)_8%,transparent)]'
                            : 'border-[var(--border)]'
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={checked}
                          onChange={() => togglePos(p.id)}
                        />
                        <span className="min-w-0">
                          <span className="block text-[length:var(--fs-text)] font-medium text-bw-text">
                            {label}
                          </span>
                          {gewerk ? (
                            <span className="text-[length:var(--fs-meta)] text-bw-text-muted">
                              {gewerk}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <Textarea
            label="Notiz an Partner (optional)"
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            rows={3}
            placeholder="z. B. Bitte Fortschritt und Fotos von heute nachtragen…"
          />
        </div>
      )}
    </EditorSheet>
  )
}

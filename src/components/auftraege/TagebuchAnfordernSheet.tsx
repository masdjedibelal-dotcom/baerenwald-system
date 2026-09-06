'use client'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
import { anfrageHandwerkerBautagebuchEintrag } from '@/app/(dashboard)/auftraege/bautagebuch-actions'
import type { AngebotHandwerkerRow, AuftragHandwerkerRow, AuftragPosition } from '@/lib/types'
import { cn } from '@/lib/utils'

type HwOpt = { id: string; name: string; email?: string | null }

type HwLite = {
  id?: string
  name?: string | null
  email?: string | null
}

/** PostgREST liefert Joins teils als Objekt, teils als 1-Element-Array. */
function unwrapHandwerker(raw: unknown): HwLite | null {
  if (!raw) return null
  if (Array.isArray(raw)) {
    const first = raw[0]
    return first && typeof first === 'object' ? (first as HwLite) : null
  }
  if (typeof raw === 'object') return raw as HwLite
  return null
}

function isPlaceholderName(name: string): boolean {
  const n = name.trim().toLowerCase()
  return !n || n === 'zugewiesener partner' || n === 'handwerker'
}

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
  angebotHandwerker,
  onSent,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  auftragHandwerker: AuftragHandwerkerRow[]
  positionen: AuftragPosition[]
  /** Fallback: Partner aus Angebotsphase (falls noch nicht in auftrag_handwerker). */
  angebotHandwerker?: AngebotHandwerkerRow[] | null
  onSent?: () => void
}) {
  const [pending, setPending] = useState(false)
  const [handwerkerId, setHandwerkerId] = useState('')
  const [selectedPos, setSelectedPos] = useState<Set<string>>(() => new Set())
  const [notiz, setNotiz] = useState('')

  const hwOptions = useMemo(() => {
    const map = new Map<string, HwOpt>()

    const upsert = (idRaw: string | null | undefined, hw: HwLite | null) => {
      const id = idRaw?.trim()
      if (!id) return
      const name = hw?.name?.trim() || ''
      const email = hw?.email?.trim() || null
      const existing = map.get(id)
      if (!existing) {
        map.set(id, {
          id,
          name: name || 'Zugewiesener Partner',
          email,
        })
        return
      }
      if (name && isPlaceholderName(existing.name)) {
        existing.name = name
      }
      if (email && !existing.email) existing.email = email
    }

    for (const row of auftragHandwerker) {
      upsert(row.handwerker_id, unwrapHandwerker(row.handwerker))
    }

    for (const p of positionen) {
      if ((p.aenderung_typ ?? '').toLowerCase() === 'entfernt') continue
      upsert(p.handwerker_id, unwrapHandwerker(p.handwerker))
    }

    for (const row of angebotHandwerker ?? []) {
      const st = String(row.status ?? '')
        .trim()
        .toLowerCase()
      if (st === 'abgelehnt' || st === 'ersetzt') continue
      upsert(row.handwerker_id, unwrapHandwerker(row.handwerker))
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }, [auftragHandwerker, positionen, angebotHandwerker])

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
    if (!handwerkerId || pending) {
      if (!handwerkerId) toast.error('Bitte Handwerker wählen.')
      return
    }
    setPending(true)
    void actionBusy
      .run('Tagebuch wird angefordert…', async () => {
        const res = await anfrageHandwerkerBautagebuchEintrag({
          auftragId,
          handwerkerId,
          notiz: notiz.trim() || null,
          positionIds: Array.from(selectedPos),
        })
        if (!res.ok) {
          toast.error(res.message)
          throw new Error(res.message)
        }
        toast.success('Tagebuch-Update angefordert — Partner wird benachrichtigt.')
        onClose()
        onSent?.()
      })
      .finally(() => setPending(false))
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Tagebuch anfordern"
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
            long
            plain
            placeholder="z. B. Bitte Fortschritt und Fotos von heute nachtragen…"
          />
        </div>
      )}
    </EditorSheet>
  )
}

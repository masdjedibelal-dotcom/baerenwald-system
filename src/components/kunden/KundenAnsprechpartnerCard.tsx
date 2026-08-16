'use client'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { toast } from '@/components/ui/app-toast'
import { useTransition } from '@/components/ui/action-busy'
import {
  deleteKundenAnsprechpartner,
  listKundenAnsprechpartner,
  saveKundenAnsprechpartner,
} from '@/app/actions/kunden-ansprechpartner'
import type { KundeAnsprechpartner } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

/** Typische Rollen in einer Hausverwaltung (kein Objekt-Hausmeister — der gehört ans Objekt). */
export const ANSPRECHPARTNER_ROLLEN = [
  { value: '', label: 'Rolle wählen…' },
  { value: 'Objektleiter', label: 'Objektleiter' },
  { value: 'Verwaltung', label: 'Verwaltung' },
  { value: 'Buchhaltung', label: 'Buchhaltung' },
  { value: 'Geschäftsführung', label: 'Geschäftsführung' },
  { value: 'Eigentümervertretung', label: 'Eigentümervertretung' },
  { value: 'Technik', label: 'Technik' },
  { value: 'Empfang', label: 'Empfang' },
  { value: 'Sonstiges', label: 'Sonstiges' },
] as const

function sortAnsprechpartner(rows: KundeAnsprechpartner[]): KundeAnsprechpartner[] {
  return [...rows].sort((a, b) => {
    if (Boolean(a.ist_primaer) !== Boolean(b.ist_primaer)) {
      return a.ist_primaer ? -1 : 1
    }
    const so = (a.sort_order ?? 0) - (b.sort_order ?? 0)
    if (so !== 0) return so
    return a.name.localeCompare(b.name, 'de')
  })
}

function rolleSelectValue(rolle: string): string {
  const t = rolle.trim()
  if (!t) return ''
  if (ANSPRECHPARTNER_ROLLEN.some((o) => o.value === t)) return t
  return 'Sonstiges'
}

export function KundenAnsprechpartnerCard({
  kundeId,
  initial = [],
  onChanged,
  className,
}: {
  kundeId: string
  initial?: KundeAnsprechpartner[]
  onChanged?: () => void
  className?: string
}) {
  const isMobile = useIsMobile()
  const [rows, setRows] = useState(() => sortAnsprechpartner(initial))
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<KundeAnsprechpartner | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [rolle, setRolle] = useState('')
  const [istPrimaer, setIstPrimaer] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setRows(sortAnsprechpartner(initial))
  }, [initial])

  const dirty = useMemo(() => {
    if (!edit) {
      return Boolean(name.trim() || email.trim() || telefon.trim() || rolle.trim() || istPrimaer)
    }
    return (
      name.trim() !== edit.name.trim() ||
      (email.trim() || '') !== (edit.email ?? '').trim() ||
      (telefon.trim() || '') !== (edit.telefon ?? '').trim() ||
      (rolle.trim() || '') !== (edit.rolle ?? '').trim() ||
      Boolean(istPrimaer) !== Boolean(edit.ist_primaer)
    )
  }, [edit, name, email, telefon, rolle, istPrimaer])

  function openNeu() {
    setEdit(null)
    setName('')
    setEmail('')
    setTelefon('')
    setRolle('')
    setIstPrimaer(false)
    setOpen(true)
  }

  function openEdit(r: KundeAnsprechpartner) {
    setEdit(r)
    setName(r.name)
    setEmail(r.email ?? '')
    setTelefon(r.telefon ?? '')
    setRolle(r.rolle ?? '')
    setIstPrimaer(Boolean(r.ist_primaer))
    setOpen(true)
  }

  function reload() {
    startTransition(async () => {
      const next = await listKundenAnsprechpartner(kundeId)
      setRows(sortAnsprechpartner(next))
      onChanged?.()
    })
  }

  function speichern() {
    if (!name.trim()) {
      toast.error('Name ist Pflicht.')
      return
    }
    startTransition(async () => {
      const r = await saveKundenAnsprechpartner(
        kundeId,
        {
          name,
          email,
          telefon,
          rolle,
          ist_primaer: istPrimaer,
        },
        edit?.id
      )
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(edit ? 'Ansprechpartner aktualisiert' : 'Ansprechpartner angelegt')
      setOpen(false)
      reload()
    })
  }

  function entfernen(r: KundeAnsprechpartner) {
    if (!confirm(`„${r.name}“ wirklich löschen?`)) return
    startTransition(async () => {
      const res = await deleteKundenAnsprechpartner(kundeId, r.id)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('Gelöscht')
      setOpen(false)
      setEdit(null)
      reload()
    })
  }

  return (
    <div className={cn('ap-card', className)}>
      <div className="ap-card__head">
        <span className="ap-card__title">Ansprechpartner</span>
        <div style={{ flex: 1 }} />
        <MockBtn sm kind="primary" icon="plus" onClick={openNeu}>
          Ansprechpartner
        </MockBtn>
      </div>

      {rows.length === 0 ? (
        <MockEmpty
          icon="users"
          title="Noch keine Ansprechpartner"
          hint="Weitere E-Mails und Kontakte ohne neuen Kunden-Account"
          action={
            <MockBtn kind="primary" icon="plus" onClick={openNeu}>
              Ansprechpartner anlegen
            </MockBtn>
          }
        />
      ) : isMobile ? (
        <div className="ap-cards">
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              className="ap-mobile-card"
              onClick={() => openEdit(r)}
            >
              <div className="ap-mobile-card__top">
                <span className="ap-mobile-card__name">{r.name}</span>
                {r.ist_primaer ? <span className="ap-badge">Primär</span> : null}
              </div>
              {r.rolle ? <div className="ap-mobile-card__meta">{r.rolle}</div> : null}
              <div className="ap-mobile-card__meta">
                {[r.email, r.telefon].filter(Boolean).join(' · ') || '—'}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="ap-list">
          <div className="ap-list__head ap-list__head--simple">
            <span>Name</span>
            <span>Rolle</span>
            <span>Kontakt</span>
          </div>
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              className="ap-list__row ap-list__row--openable"
              onClick={() => openEdit(r)}
            >
              <span className="ap-list__name-cell">
                {r.name}
                {r.ist_primaer ? <span className="ap-badge">Primär</span> : null}
              </span>
              <span className="ap-list__dim">{r.rolle || '—'}</span>
              <span className="ap-list__dim">
                {[r.email, r.telefon].filter(Boolean).join(' · ') || '—'}
              </span>
            </button>
          ))}
        </div>
      )}

      <EditorSheet
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? 'Ansprechpartner bearbeiten' : 'Neuer Ansprechpartner'}
        dirty={dirty}
        size="md"
        compose={Boolean(edit)}
        composeLabel="Speichern"
        onConfirm={speichern}
        confirmDisabled={!name.trim() || pending}
        confirmBusy={pending}
      >
        <div className="space-y-4">
          <Input
            label="Name"
            required
            value={name}
            disabled={pending}
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            label="Rolle"
            value={rolleSelectValue(rolle)}
            options={ANSPRECHPARTNER_ROLLEN.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            disabled={pending}
            onChange={(e) => setRolle(e.target.value)}
          />
          <Input
            label="E-Mail"
            type="email"
            value={email}
            disabled={pending}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Telefon"
            value={telefon}
            disabled={pending}
            onChange={(e) => setTelefon(e.target.value)}
          />
          <label className="ap-check">
            <input
              type="checkbox"
              checked={istPrimaer}
              disabled={pending}
              onChange={(e) => setIstPrimaer(e.target.checked)}
            />
            <span>Primärer Ansprechpartner</span>
          </label>
          {edit ? (
            <button
              type="button"
              className="btn ghost sm"
              disabled={pending}
              onClick={() => entfernen(edit)}
            >
              <MockIcon ctx="btn" n="trash" size={14} /> Löschen
            </button>
          ) : null}
        </div>
      </EditorSheet>
    </div>
  )
}

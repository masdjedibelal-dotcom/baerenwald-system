'use client'

import { useEffect, useState } from 'react'
import { EditorSheet, useEditorSheetRequestClose } from '@/components/surfaces/EditorSheet'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockIcon } from '@/components/mock-ui/MockIcon'
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

function AnsprechpartnerEditorFooter({
  pending,
  canSave,
  onSave,
}: {
  pending: boolean
  canSave: boolean
  onSave: () => void
}) {
  const requestClose = useEditorSheetRequestClose()
  return (
    <div className="zahlplan-editor-footer">
      <MockBtn kind="ghost" disabled={pending} onClick={() => requestClose?.()}>
        Abbrechen
      </MockBtn>
      <MockBtn kind="primary" icon="check" disabled={!canSave || pending} onClick={onSave}>
        {pending ? 'Speichern…' : 'Speichern'}
      </MockBtn>
    </div>
  )
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
  const [rows, setRows] = useState<KundeAnsprechpartner[]>(initial)
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<KundeAnsprechpartner | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [rolle, setRolle] = useState('')
  const [istPrimaer, setIstPrimaer] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setRows(initial)
  }, [initial])

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
      setRows(next)
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
          <div className="ap-list__head">
            <span>Name</span>
            <span>E-Mail</span>
            <span>Telefon</span>
            <span />
          </div>
          {rows.map((r) => (
            <div key={r.id} className="ap-list__row">
              <button type="button" className="ap-list__name" onClick={() => openEdit(r)}>
                {r.name}
                {r.ist_primaer ? <span className="ap-badge">Primär</span> : null}
                {r.rolle ? <span className="ap-list__rolle">{r.rolle}</span> : null}
              </button>
              <span className="ap-list__dim">{r.email || '—'}</span>
              <span className="ap-list__dim">{r.telefon || '—'}</span>
              <div className="ap-list__actions">
                <MockBtn sm kind="ghost" icon="pen" title="Bearbeiten" onClick={() => openEdit(r)} />
                <MockBtn
                  sm
                  kind="ghost"
                  icon="trash"
                  title="Löschen"
                  onClick={() => entfernen(r)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <EditorSheet
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? 'Ansprechpartner' : 'Neuer Ansprechpartner'}
        dirty={Boolean(name.trim() || email.trim() || telefon.trim() || rolle.trim())}
        size="md"
        footer={
          <AnsprechpartnerEditorFooter
            pending={pending}
            canSave={Boolean(name.trim())}
            onSave={speichern}
          />
        }
      >
        <label className="hw-anfrage-field">
          <span className="hw-anfrage-label">Name *</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="hw-anfrage-field">
          <span className="hw-anfrage-label">E-Mail</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="hw-anfrage-field">
          <span className="hw-anfrage-label">Telefon</span>
          <input className="input" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
        </label>
        <label className="hw-anfrage-field">
          <span className="hw-anfrage-label">Rolle</span>
          <input
            className="input"
            placeholder="z. B. Buchhaltung"
            value={rolle}
            onChange={(e) => setRolle(e.target.value)}
          />
        </label>
        <label className="ap-check">
          <input
            type="checkbox"
            checked={istPrimaer}
            onChange={(e) => setIstPrimaer(e.target.checked)}
          />
          <span>Primärer Ansprechpartner</span>
        </label>
        {edit ? (
          <button
            type="button"
            className="btn ghost sm mt-2"
            disabled={pending}
            onClick={() => {
              setOpen(false)
              entfernen(edit)
            }}
          >
            <MockIcon ctx="btn" n="trash" size={14} /> Löschen
          </button>
        ) : null}
      </EditorSheet>
    </div>
  )
}

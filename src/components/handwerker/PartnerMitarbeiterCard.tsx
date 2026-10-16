'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  deletePartnerMitarbeiter,
  listPartnerMitarbeiter,
  savePartnerMitarbeiter,
} from '@/app/(dashboard)/handwerker/mitarbeiter-actions'
import { MockBtn } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import { openDeleteConfirm } from '@/components/ui/ConfirmPopup'
import { useIsMobile } from '@/hooks/useIsMobile'
import { safeAction } from '@/lib/actions/safe-action'
import { LIST } from '@/lib/crm-labels'
import type { EntityMenuItem } from '@/lib/entity-menu'
import type { PartnerMitarbeiter } from '@/lib/partner/mitarbeiter'
import { cn } from '@/lib/utils'

const COLS = 'minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 1.4fr) 44px'

/**
 * Mitarbeiter des Partners (wie Ansprechpartner beim Kunden): Name, Rolle, E-Mail, Telefon.
 * Einsätze können einem Mitarbeiter zugeordnet werden; mit Zugang sieht er sie nach der Annahme im Portal.
 */
export function PartnerMitarbeiterCard({ handwerkerId, className }: { handwerkerId: string; className?: string }) {
  const isMobile = useIsMobile()
  const [rows, setRows] = useState<PartnerMitarbeiter[] | null>(null)
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<PartnerMitarbeiter | null>(null)
  const [name, setName] = useState('')
  const [rolle, setRolle] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [pending, setPending] = useState(false)

  const laden = useCallback(async () => {
    const r = await safeAction(listPartnerMitarbeiter(handwerkerId))
    setRows(r.ok ? r.liste : [])
  }, [handwerkerId])

  useEffect(() => {
    void laden()
  }, [laden])

  function oeffnen(m: PartnerMitarbeiter | null) {
    setEdit(m)
    setName(m?.name ?? '')
    setRolle(m?.rolle ?? '')
    setEmail(m?.email ?? '')
    setTelefon(m?.telefon ?? '')
    setOpen(true)
  }

  async function speichern() {
    if (!name.trim()) {
      toast.error('Name ist Pflicht.')
      return
    }
    setPending(true)
    const r = await safeAction(savePartnerMitarbeiter({ id: edit?.id, handwerkerId, name, rolle, email, telefon }))
    setPending(false)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    toast.success(edit ? 'Mitarbeiter gespeichert' : 'Mitarbeiter angelegt')
    setOpen(false)
    void laden()
  }

  function entfernen(m: PartnerMitarbeiter) {
    openDeleteConfirm(
      'Mitarbeiter entfernen?',
      async () => {
        const r = await safeAction(deletePartnerMitarbeiter(m.id, handwerkerId))
        if (!r.ok) {
          toast.error(r.message)
          throw new Error(r.message)
        }
        toast.success('Mitarbeiter entfernt')
        void laden()
      },
      { sub: m.name }
    )
  }

  function menu(m: PartnerMitarbeiter): EntityMenuItem[] {
    return [
      { icon: 'pencil', label: 'Bearbeiten', onClick: () => oeffnen(m) },
      'sep',
      { icon: 'trash', label: 'Entfernen', danger: true, onClick: () => entfernen(m) },
    ]
  }

  function zeile(m: PartnerMitarbeiter) {
    const kontakt = [m.email, m.telefon].filter(Boolean).join(' · ') || '—'
    return (
      <div
        key={m.id}
        className={isMobile ? 'ap-mobile-card ap-mobile-card--row' : 'ap-list__row'}
        style={isMobile ? undefined : { gridTemplateColumns: COLS }}
      >
        <MockBtn className={isMobile ? 'ap-mobile-card__hit' : 'ap-list__hit'} type="button" onClick={() => oeffnen(m)}>
          {isMobile ? (
            <>
              <div className="ap-mobile-card__top">
                <span className="ap-mobile-card__name">{m.name}</span>
                {m.hat_zugang ? <span className="ap-badge">Zugang</span> : null}
              </div>
              {m.rolle ? <div className="ap-mobile-card__meta">{m.rolle}</div> : null}
              <div className="ap-mobile-card__meta">{kontakt}</div>
            </>
          ) : (
            <>
              <span className="ap-list__name-cell">
                {m.name}
                {m.hat_zugang ? <span className="ap-badge">Zugang</span> : null}
              </span>
              <span className="ap-list__dim">{m.rolle || '—'}</span>
              <span className="ap-list__dim">{kontakt}</span>
            </>
          )}
        </MockBtn>
        <div className="row-actions always" onClick={(e) => e.stopPropagation()} style={{ justifyContent: 'flex-end' }}>
          <MockEntityRowMenu items={menu(m)} title={m.name} />
        </div>
      </div>
    )
  }

  return (
    <MockCard
      title="Mitarbeiter"
      icon="users"
      className={cn(className)}
      actions={
        <MockBtn sm kind="primary" icon="plus" onClick={() => oeffnen(null)}>
          {LIST.hinzufuegen}
        </MockBtn>
      }
    >
      {rows == null ? (
        <p className="m-0 text-[length:var(--fs-meta)] text-[var(--text-3)]">Wird geladen …</p>
      ) : rows.length === 0 ? (
        <MockEmpty icon="users" title="Noch keine Mitarbeiter" hint="Über „+“ oben hinzufügen — z. B. Polier oder Monteur vor Ort." />
      ) : isMobile ? (
        <div className="ap-cards">{rows.map(zeile)}</div>
      ) : (
        <div className="ap-list">
          <div className="ap-list__head" style={{ gridTemplateColumns: COLS }}>
            <span>Name</span>
            <span>Rolle</span>
            <span>Kontakt</span>
            <span aria-hidden />
          </div>
          {rows.map(zeile)}
        </div>
      )}

      <EditorSheet
        open={open}
        onClose={() => setOpen(false)}
        title={edit ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
        size="md"
        compose={Boolean(edit)}
        composeLabel="Speichern"
        onConfirm={speichern}
        confirmDisabled={pending}
        confirmBusy={pending}
      >
        <div className="space-y-4">
          <MockField label="Name" required>
            <MockInput required value={name} disabled={pending} onChange={(e) => setName(e.target.value)} />
          </MockField>
          <MockField label="Rolle">
            <MockInput value={rolle} placeholder="z. B. Polier, Monteur" disabled={pending} onChange={(e) => setRolle(e.target.value)} />
          </MockField>
          <MockField label="E-Mail">
            <MockInput type="email" value={email} disabled={pending} onChange={(e) => setEmail(e.target.value)} />
          </MockField>
          <MockField label="Telefon">
            <MockInput value={telefon} disabled={pending} onChange={(e) => setTelefon(e.target.value)} />
          </MockField>
        </div>
      </EditorSheet>
    </MockCard>
  )
}

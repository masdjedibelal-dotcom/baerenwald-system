'use client'
import { MockBtn } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockField, MockInput, MockSelect } from '@/components/mock-ui/MockForm'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { useTransition } from '@/components/ui/action-busy'
import { useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { toast } from '@/components/ui/app-toast'
import { EinstellungenSectionHeading } from '@/components/einstellungen/EinstellungenUi'
import type { BenutzerZeile } from '@/app/(dashboard)/einstellungen/benutzer/actions'
import {
  inviteBenutzer,
  loadBenutzerListe,
  updateBenutzerProfil,
} from '@/app/(dashboard)/einstellungen/benutzer/actions'
import { TOAST } from '@/lib/copy'

const COLS = '1.4fr 1.6fr 1.1fr 0.9fr'

function rolleLabel(rolle: BenutzerZeile['rolle']): string {
  return rolle === 'admin' ? 'Administrator' : 'Mitarbeiter'
}

export function BenutzerEinstellungenClient({ initial }: { initial: BenutzerZeile[] }) {
  const isMobile = useIsMobile()
  const [rows, setRows] = useState(initial)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRolle, setInviteRolle] = useState<'admin' | 'manager'>('manager')
  const [edit, setEdit] = useState<BenutzerZeile | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editTelefon, setEditTelefon] = useState('')
  const [editRolle, setEditRolle] = useState<'admin' | 'manager'>('manager')
  const [pending, startTransition] = useTransition()

  async function refresh() {
    const next = await loadBenutzerListe()
    setRows(next)
  }

  function openEdit(u: BenutzerZeile) {
    setEdit(u)
    setEditName(u.name)
    setEditEmail(u.email)
    setEditTelefon(u.telefon)
    setEditRolle(u.rolle)
  }

  function sendInvite() {
    startTransition(async () => {
      const r = await inviteBenutzer(inviteEmail, inviteName, inviteRolle)
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(r.message ?? 'Einladung versendet')
      setInviteOpen(false)
      setInviteEmail('')
      setInviteName('')
      await refresh()
    })
  }

  function saveEdit() {
    if (!edit) return
    startTransition(async () => {
      const r = await updateBenutzerProfil(edit.id, {
        name: editName,
        email: editEmail,
        rolle: editRolle,
        telefon: editTelefon,
      })
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.gespeichert)
      setEdit(null)
      await refresh()
    })
  }

  const inviteBtn = (
    <MockBtn sm icon="plus" kind="primary" onClick={() => setInviteOpen(true)}>
      Einladen
    </MockBtn>
  )

  const empty = (
    <p className="m-0 py-2 text-[length:var(--fs-text)] text-[var(--text-3)]">
      Noch keine Benutzer.
    </p>
  )

  const mobileList =
    rows.length === 0 ? (
      empty
    ) : (
      <div className="dok-mobiles">
        {rows.map((u) => {
          const tel = u.telefon?.trim() || ''
          const mail = u.email?.trim() || ''
          return (
            <div
              key={u.id}
              role="button"
              tabIndex={0}
              className={`dok-mobile${!u.aktiv ? ' opacity-55' : ''}`}
              style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
              onClick={() => openEdit(u)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openEdit(u)
                }
              }}
            >
              <div className="dok-mobile__head">
                <span className="dok-mobile__title">
                  {u.name}
                  {!u.aktiv ? (
                    <span style={{ color: 'var(--text-4)', fontWeight: 400 }}> · deaktiviert</span>
                  ) : null}
                </span>
                <div className="dok-mobile__badge">
                  <MockBadge kind="plain">{rolleLabel(u.rolle)}</MockBadge>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  marginTop: 4,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 'var(--fs-text)',
                    color: 'var(--text-3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={mail || undefined}
                >
                  {mail || '—'}
                </span>
                <span
                  style={{
                    fontSize: 'var(--fs-meta)',
                    color: 'var(--text-4)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={tel || undefined}
                >
                  {tel || '—'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )

  const desktopList =
    rows.length === 0 ? (
      empty
    ) : (
      <div style={{ margin: 0 }}>
        <div className="list-row head" style={{ gridTemplateColumns: COLS }}>
          <div>Name</div>
          <div>E-Mail</div>
          <div>Telefon</div>
          <div>Rolle</div>
        </div>
        {rows.map((u) => (
          <div
            key={u.id}
            role="button"
            tabIndex={0}
            className="list-row"
            style={{
              gridTemplateColumns: COLS,
              cursor: 'pointer',
              alignItems: 'center',
              opacity: u.aktiv ? 1 : 0.55,
            }}
            onClick={() => openEdit(u)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openEdit(u)
              }
            }}
          >
            <div
              style={{
                fontSize: 'var(--fs-text)',
                fontWeight: 600,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {u.name}
              {!u.aktiv ? (
                <span style={{ color: 'var(--text-4)', fontWeight: 400 }}> · deaktiviert</span>
              ) : null}
            </div>
            <div
              style={{
                fontSize: 'var(--fs-text)',
                color: 'var(--text-2)',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {u.email || '—'}
            </div>
            <div
              style={{
                fontSize: 'var(--fs-meta)',
                color: 'var(--text-3)',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {u.telefon?.trim() || '—'}
            </div>
            <div>
              <MockBadge kind="plain">{rolleLabel(u.rolle)}</MockBadge>
            </div>
          </div>
        ))}
      </div>
    )

  return (
    <>
      {isMobile ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <EinstellungenSectionHeading>Teammitglieder</EinstellungenSectionHeading>
            {inviteBtn}
          </div>
          {mobileList}
        </div>
      ) : (
        <MockCard title="Teammitglieder" icon="users" actions={inviteBtn}>
          {desktopList}
        </MockCard>
      )}

      <EditorSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Benutzer einladen"
        context="detail"
        confirmBusy={pending}
        onConfirm={() => sendInvite()}
      >
        <div className="space-y-3">
          <MockField label="E-Mail" required><MockInput type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></MockField>
          <MockField label="Name"><MockInput value={inviteName} onChange={(e) => setInviteName(e.target.value)} /></MockField>
          <div>
            <label className="input-label" htmlFor="invite-rolle">
              Rolle
            </label>
            <MockSelect id="invite-rolle" className="max-w-xs w-full" value={inviteRolle} onChange={(e) => setInviteRolle(e.target.value as 'admin' | 'manager')}>
              <option value="manager">Mitarbeiter</option>
              <option value="admin">Administrator</option>
            </MockSelect>
          </div>
        </div>
      </EditorSheet>

      <EditorSheet
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title="Benutzer bearbeiten"
        context="detail"
        confirmBusy={pending}
        onConfirm={() => saveEdit()}
      >
        <div className="space-y-3">
          <MockField label="Name"><MockInput value={editName} onChange={(e) => setEditName(e.target.value)} /></MockField>
          <MockField label="E-Mail" required><MockInput type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} /></MockField>
          <MockField label="Handy / Direktwahl"><MockInput type="tel" value={editTelefon} onChange={(e) => setEditTelefon(e.target.value)} placeholder="+49 …" /></MockField>
          <div>
            <label className="input-label" htmlFor="edit-rolle">
              Rolle
            </label>
            <MockSelect id="edit-rolle" className="max-w-xs w-full" value={editRolle} onChange={(e) => setEditRolle(e.target.value as 'admin' | 'manager')}>
              <option value="manager">Mitarbeiter</option>
              <option value="admin">Administrator</option>
            </MockSelect>
          </div>
        </div>
      </EditorSheet>
    </>
  )
}

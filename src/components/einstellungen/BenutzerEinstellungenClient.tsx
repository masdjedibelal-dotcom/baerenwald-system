'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/app-toast'
import type { BenutzerZeile } from '@/app/(dashboard)/einstellungen/benutzer/actions'
import {
  inviteBenutzer,
  loadBenutzerListe,
  setBenutzerAktiv,
  updateBenutzerProfil,
} from '@/app/(dashboard)/einstellungen/benutzer/actions'

const COLS = '42px 2fr 1.5fr 1fr 90px'

function Sec({
  title,
  actions,
  children,
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          paddingBottom: 8,
          borderBottom: '0.5px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.01em' }}>{title}</span>
        <div style={{ flex: 1 }} />
        {actions}
      </div>
      <div>{children}</div>
    </div>
  )
}

function initialsFromName(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  if (parts.length === 1 && parts[0]!.length >= 2) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }
  const local = email.split('@')[0] ?? '?'
  return local.slice(0, 2).toUpperCase() || '?'
}

function rolleLabel(rolle: BenutzerZeile['rolle']): string {
  return rolle === 'admin' ? 'Inhaber' : 'Projektleitung'
}

function avatarColor(u: BenutzerZeile, index: number): string {
  if (u.rolle === 'admin') return 'green'
  const cycle = ['', 'yellow', ''] as const
  return cycle[index % cycle.length] ?? ''
}

export function BenutzerEinstellungenClient({ initial }: { initial: BenutzerZeile[] }) {
  const router = useRouter()
  const [rows, setRows] = useState(initial)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRolle, setInviteRolle] = useState<'admin' | 'manager'>('manager')
  const [edit, setEdit] = useState<BenutzerZeile | null>(null)
  const [editName, setEditName] = useState('')
  const [editTelefon, setEditTelefon] = useState('')
  const [editRolle, setEditRolle] = useState<'admin' | 'manager'>('manager')
  const [pending, startTransition] = useTransition()

  async function refresh() {
    const next = await loadBenutzerListe()
    setRows(next)
    router.refresh()
  }

  function openEdit(u: BenutzerZeile) {
    setEdit(u)
    setEditName(u.name)
    setEditTelefon(u.telefon)
    setEditRolle(u.rolle)
  }

  function sendInvite() {
    startTransition(async () => {
      const r = await inviteBenutzer(inviteEmail, inviteName, inviteRolle)
      if (!r.ok) {
        toast.error(r.message)
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
        rolle: editRolle,
        telefon: editTelefon,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gespeichert')
      setEdit(null)
      await refresh()
    })
  }

  function removeUser(u: BenutzerZeile) {
    startTransition(async () => {
      const r = await setBenutzerAktiv(u.id, false)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Teammitglied entfernt')
      await refresh()
    })
  }

  return (
    <>
      <Sec
        title="Teammitglieder"
        actions={
          <MockBtn sm icon="plus" kind="primary" onClick={() => setInviteOpen(true)}>
            Einladen
          </MockBtn>
        }
      >
        {rows.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '8px 0' }}>Noch keine Benutzer.</p>
        ) : (
          <div style={{ margin: 0 }}>
            <div className="list-row head" style={{ gridTemplateColumns: COLS }}>
              <div />
              <div>Name</div>
              <div>E-Mail</div>
              <div>Rolle</div>
              <div />
            </div>
            {rows.map((u, i) => {
              const initials = initialsFromName(u.name, u.email)
              const color = avatarColor(u, i)
              return (
                <div
                  key={u.id}
                  className="list-row"
                  style={{
                    gridTemplateColumns: COLS,
                    cursor: 'default',
                    alignItems: 'center',
                    opacity: u.aktiv ? 1 : 0.55,
                  }}
                >
                  <div className={`avatar ${color}`.trim()} aria-hidden>
                    {initials}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.name}
                    {!u.aktiv ? (
                      <span style={{ color: 'var(--text-4)', fontWeight: 400 }}> · deaktiviert</span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.email || '—'}
                  </div>
                  <div>
                    <MockBadge kind="plain">{rolleLabel(u.rolle)}</MockBadge>
                  </div>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} className="row-actions always">
                    <MockEntityRowMenu
                      items={[
                        {
                          icon: 'pencil',
                          label: 'Bearbeiten',
                          onClick: () => openEdit(u),
                        },
                        {
                          icon: 'user',
                          label: 'Rolle ändern',
                          onClick: () => openEdit(u),
                        },
                        {
                          icon: 'mail',
                          label: 'Mail schreiben',
                          onClick: () => {
                            if (u.email) window.open(`mailto:${u.email}`)
                          },
                        },
                        'sep' as const,
                        ...(u.aktiv
                          ? [
                              {
                                icon: 'trash' as const,
                                label: 'Entfernen',
                                danger: true as const,
                                onClick: () => removeUser(u),
                              },
                            ]
                          : [
                              {
                                icon: 'check' as const,
                                label: 'Aktivieren',
                                onClick: () => {
                                  startTransition(async () => {
                                    const r = await setBenutzerAktiv(u.id, true)
                                    if (!r.ok) {
                                      toast.error(r.message)
                                      return
                                    }
                                    toast.success('Wieder aktiviert')
                                    await refresh()
                                  })
                                },
                              },
                            ]),
                      ]}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Sec>

      <EditorSheet
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Benutzer einladen"
        context="detail"
        confirmBusy={pending}
        onConfirm={() => sendInvite()}
      >
        <div className="space-y-3">
          <Input
            label="E-Mail"
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Input label="Name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
          <p className="text-xs text-bw-text-muted">
            Nur CRM-Mitarbeiter. Handwerker-, Partner- und Kunden-Logins werden hier nicht
            verwaltet — bitte eine eigene Mitarbeiter-E-Mail verwenden.
          </p>
          <div>
            <label className="input-label" htmlFor="invite-rolle">
              Rolle
            </label>
            <select
              id="invite-rolle"
              className="input max-w-xs w-full"
              value={inviteRolle}
              onChange={(e) => setInviteRolle(e.target.value as 'admin' | 'manager')}
            >
              <option value="manager">Projektleitung</option>
              <option value="admin">Inhaber</option>
            </select>
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
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input
            label="Handy / Direktwahl"
            type="tel"
            value={editTelefon}
            onChange={(e) => setEditTelefon(e.target.value)}
            placeholder="+49 …"
          />
          <div>
            <label className="input-label" htmlFor="edit-rolle">
              Rolle
            </label>
            <select
              id="edit-rolle"
              className="input max-w-xs w-full"
              value={editRolle}
              onChange={(e) => setEditRolle(e.target.value as 'admin' | 'manager')}
            >
              <option value="manager">Projektleitung</option>
              <option value="admin">Inhaber</option>
            </select>
          </div>
        </div>
      </EditorSheet>
    </>
  )
}

'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockCard } from '@/components/mock-ui/MockCard'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { DokMobileCard } from '@/components/ui/DokMobileCard'
import { Input } from '@/components/ui/Input'
import { useIsMobile } from '@/hooks/useIsMobile'
import { toast } from '@/components/ui/app-toast'
import type { BenutzerZeile } from '@/app/(dashboard)/einstellungen/benutzer/actions'
import {
  inviteBenutzer,
  loadBenutzerListe,
  updateBenutzerProfil,
} from '@/app/(dashboard)/einstellungen/benutzer/actions'

const COLS = '42px 2fr 1.5fr 1fr'

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
  const isMobile = useIsMobile()
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

  return (
    <>
      <MockCard
        title="Teammitglieder"
        icon="users"
        actions={
          <MockBtn sm icon="plus" kind="primary" onClick={() => setInviteOpen(true)}>
            Einladen
          </MockBtn>
        }
      >
        {rows.length === 0 ? (
          <p className="m-0 py-2 text-[length:var(--fs-text)] text-[var(--text-3)]">
            Noch keine Benutzer.
          </p>
        ) : isMobile ? (
          <div className="dok-cards">
            {rows.map((u, i) => {
              const initials = initialsFromName(u.name, u.email)
              const color = avatarColor(u, i)
              return (
                <DokMobileCard
                  key={u.id}
                  title={u.name}
                  meta={
                    [u.email || null, !u.aktiv ? 'deaktiviert' : null].filter(Boolean).join(' · ') ||
                    null
                  }
                  onClick={() => openEdit(u)}
                  badge={<MockBadge kind="plain">{rolleLabel(u.rolle)}</MockBadge>}
                  className={!u.aktiv ? 'opacity-55' : undefined}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className={`avatar ${color}`.trim()} aria-hidden>
                      {initials}
                    </div>
                  </div>
                </DokMobileCard>
              )
            })}
          </div>
        ) : (
          <div style={{ margin: 0 }}>
            <div className="list-row head" style={{ gridTemplateColumns: COLS }}>
              <div />
              <div>Name</div>
              <div>E-Mail</div>
              <div>Rolle</div>
            </div>
            {rows.map((u, i) => {
              const initials = initialsFromName(u.name, u.email)
              const color = avatarColor(u, i)
              return (
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
                  <div className={`avatar ${color}`.trim()} aria-hidden>
                    {initials}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--fs-text)',
                      fontWeight: 500,
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
                      fontSize: 'var(--fs-meta)',
                      color: 'var(--text-3)',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {u.email || '—'}
                  </div>
                  <div>
                    <MockBadge kind="plain">{rolleLabel(u.rolle)}</MockBadge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </MockCard>

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
          <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
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

'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/app-toast'
import type { BenutzerZeile } from '@/app/(dashboard)/einstellungen/benutzer/actions'
import {
  inviteBenutzer,
  loadBenutzerListe,
  setBenutzerAktiv,
  updateBenutzerProfil,
} from '@/app/(dashboard)/einstellungen/benutzer/actions'
import { useRouter } from 'next/navigation'

export function BenutzerEinstellungenClient({ initial }: { initial: BenutzerZeile[] }) {
  const router = useRouter()
  const [rows, setRows] = useState(initial)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRolle, setInviteRolle] = useState<'admin' | 'manager'>('manager')
  const [edit, setEdit] = useState<BenutzerZeile | null>(null)
  const [editName, setEditName] = useState('')
  const [editRolle, setEditRolle] = useState<'admin' | 'manager'>('manager')
  const [pending, startTransition] = useTransition()

  async function refresh() {
    const next = await loadBenutzerListe()
    setRows(next)
    router.refresh()
  }

  function sendInvite() {
    startTransition(async () => {
      const r = await inviteBenutzer(inviteEmail, inviteName, inviteRolle)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Einladung versendet')
      setInviteOpen(false)
      setInviteEmail('')
      setInviteName('')
      await refresh()
    })
  }

  function saveEdit() {
    if (!edit) return
    startTransition(async () => {
      const r = await updateBenutzerProfil(edit.id, { name: editName, rolle: editRolle })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gespeichert')
      setEdit(null)
      await refresh()
    })
  }

  async function toggleAktiv(u: BenutzerZeile, aktiv: boolean) {
    const r = await setBenutzerAktiv(u.id, aktiv)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    toast.success(aktiv ? 'Wieder aktiviert' : 'Deaktiviert')
    await refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="primary" onClick={() => setInviteOpen(true)}>
          + Benutzer einladen
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((u) => (
          <Card key={u.id} title={u.name}>
            <p className="mb-1 text-sm text-bw-light">{u.email}</p>
            <p className="mb-3 text-sm">
              Rolle: <strong>{u.rolle}</strong> · Status:{' '}
              <strong>{u.aktiv ? 'aktiv' : 'deaktiviert'}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEdit(u)
                  setEditName(u.name)
                  setEditRolle(u.rolle)
                }}
              >
                Bearbeiten
              </Button>
              <Button
                type="button"
                variant={u.aktiv ? 'danger' : 'secondary'}
                size="sm"
                onClick={() => void toggleAktiv(u, !u.aktiv)}
              >
                {u.aktiv ? 'Deaktivieren' : 'Aktivieren'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Benutzer einladen"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" loading={pending} onClick={() => sendInvite()}>
              Einladen
            </Button>
          </div>
        }
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
          <div>
            <label className="input-label" htmlFor="invite-rolle">
              Rolle
            </label>
            <select
              id="invite-rolle"
              className="input max-w-xs"
              value={inviteRolle}
              onChange={(e) => setInviteRolle(e.target.value as 'admin' | 'manager')}
            >
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title="Benutzer bearbeiten"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEdit(null)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" loading={pending} onClick={() => saveEdit()}>
              Speichern
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <div>
            <label className="input-label" htmlFor="edit-rolle">
              Rolle
            </label>
            <select
              id="edit-rolle"
              className="input max-w-xs"
              value={editRolle}
              onChange={(e) => setEditRolle(e.target.value as 'admin' | 'manager')}
            >
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}

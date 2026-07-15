'use client'

import { useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { toast } from '@/components/ui/app-toast'
import {
  EinstellungenListBody,
  EinstellungenListItem,
  EinstellungenListMeta,
} from '@/components/einstellungen/EinstellungenUi'
import type { BenutzerZeile } from '@/app/(dashboard)/einstellungen/benutzer/actions'
import {
  inviteBenutzer,
  loadBenutzerListe,
  setBenutzerAktiv,
  syncBenutzerPartnerPortal,
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
  const [editTelefon, setEditTelefon] = useState('')
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
      <Card
        title="Team"
        action={
          <Button type="button" variant="primary" className="btn-sm" onClick={() => setInviteOpen(true)}>
            + Einladen
          </Button>
        }
      >
        <EinstellungenListBody empty={rows.length === 0 ? 'Noch keine Benutzer.' : undefined}>
          {rows.map((u) => (
            <EinstellungenListItem key={u.id}>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-bw-text">{u.name}</p>
                <EinstellungenListMeta>{u.email}</EinstellungenListMeta>
                <EinstellungenListMeta className="mt-0.5">
                  {u.rolle === 'admin' ? 'Admin' : 'Manager'}
                  {u.telefon ? ` · ${u.telefon}` : ' · Kein Handy'}
                  {u.partnerPortal ? ' · Partner-Portal' : ' · Nur CRM'}
                </EinstellungenListMeta>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={u.aktiv ? 'done' : 'cancel'}
                  label={u.aktiv ? 'Aktiv' : 'Deaktiviert'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="btn-sm"
                  onClick={() => {
                    setEdit(u)
                    setEditName(u.name)
                    setEditTelefon(u.telefon)
                    setEditRolle(u.rolle)
                  }}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Bearbeiten
                </Button>
                {!u.partnerPortal ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const r = await syncBenutzerPartnerPortal(u.id)
                        if (!r.ok) {
                          toast.error(r.message)
                          return
                        }
                        toast.success(
                          r.handwerkerName
                            ? `Partner-Portal verknüpft (${r.handwerkerName})`
                            : 'Kein Handwerker-Stamm mit dieser E-Mail gefunden'
                        )
                        await refresh()
                      })
                    }}
                  >
                    Portal verknüpfen
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant={u.aktiv ? 'danger' : 'secondary'}
                  size="sm"
                  onClick={() => void toggleAktiv(u, !u.aktiv)}
                >
                  {u.aktiv ? 'Deaktivieren' : 'Aktivieren'}
                </Button>
              </div>
            </EinstellungenListItem>
          ))}
        </EinstellungenListBody>
      </Card>

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
          <p className="text-xs text-bw-text-muted">
            Nutze dieselbe E-Mail wie im Handwerker-Stamm — dann funktioniert ein Login für CRM und
            Partner-Portal.
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
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}

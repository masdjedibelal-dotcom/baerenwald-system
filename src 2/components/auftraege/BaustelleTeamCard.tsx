'use client'

import { useState, useTransition } from 'react'
import { Mail, Phone, Plus, User, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/app-toast'
import { saveAuftragBaustelleTeam } from '@/app/(dashboard)/auftraege/baustelle-actions'
import type { AuftragBaustelleTeam } from '@/lib/auftraege/baustelle-types'

export function BaustelleTeamCard({
  auftragId,
  team: initial,
  onChanged,
}: {
  auftragId: string
  team: AuftragBaustelleTeam
  onChanged: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [team, setTeam] = useState<AuftragBaustelleTeam>(initial)
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const r = await saveAuftragBaustelleTeam(auftragId, team)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Team gespeichert')
      setEditing(false)
      onChanged()
    })
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 shrink-0 text-bw-text-muted" aria-hidden />
              <span className="font-medium text-bw-text">
                {team.bauleiter_name?.trim() || 'Bauleiter noch nicht hinterlegt'}
              </span>
            </div>
            {team.bauleiter_telefon?.trim() ? (
              <p className="flex items-center gap-2 text-sm text-bw-text-muted">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {team.bauleiter_telefon}
              </p>
            ) : null}
            {team.bauleiter_email?.trim() ? (
              <p className="flex items-center gap-2 text-sm text-bw-text-muted">
                <Mail className="h-3.5 w-3.5" aria-hidden />
                {team.bauleiter_email}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Bearbeiten
          </Button>
        </div>

        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-bw-text-muted">
            <Users className="h-3.5 w-3.5" aria-hidden />
            Mannschaft ({team.bau_mannschaft.length})
          </p>
          {team.bau_mannschaft.length ? (
            <div className="flex flex-wrap gap-1.5">
              {team.bau_mannschaft.map((n) => (
                <span
                  key={n}
                  className="rounded-full border border-bw-border bg-bw-bg px-2.5 py-0.5 text-xs text-bw-text"
                >
                  {n}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-bw-text-muted">Noch keine Mitarbeiter hinterlegt.</p>
          )}
        </div>

        {(team.bau_nachunternehmer_name?.trim() || team.bau_nachunternehmer_firma?.trim()) && (
          <div className="rounded-lg border border-bw-border bg-bw-bg/50 px-3 py-2 text-sm">
            <p className="text-xs font-medium text-bw-text-muted">Nachunternehmer (Info)</p>
            <p className="text-bw-text">
              {[team.bau_nachunternehmer_firma, team.bau_nachunternehmer_name]
                .map((x) => x?.trim())
                .filter(Boolean)
                .join(' — ')}
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Input
        label="Bauleiter"
        value={team.bauleiter_name ?? ''}
        onChange={(e) => setTeam((t) => ({ ...t, bauleiter_name: e.target.value }))}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Telefon"
          value={team.bauleiter_telefon ?? ''}
          onChange={(e) => setTeam((t) => ({ ...t, bauleiter_telefon: e.target.value }))}
        />
        <Input
          label="E-Mail"
          type="email"
          value={team.bauleiter_email ?? ''}
          onChange={(e) => setTeam((t) => ({ ...t, bauleiter_email: e.target.value }))}
        />
      </div>

      <div className="form-field">
        <label className="form-field-label">Mannschaft</label>
        <div className="space-y-2">
          {team.bau_mannschaft.map((name, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => {
                  const next = [...team.bau_mannschaft]
                  next[i] = e.target.value
                  setTeam((t) => ({ ...t, bau_mannschaft: next }))
                }}
                placeholder="Name"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Entfernen"
                onClick={() =>
                  setTeam((t) => ({
                    ...t,
                    bau_mannschaft: t.bau_mannschaft.filter((_, j) => j !== i),
                  }))
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setTeam((t) => ({ ...t, bau_mannschaft: [...t.bau_mannschaft, ''] }))}
          >
            <Plus className="h-3.5 w-3.5" />
            Mitarbeiter hinzufügen
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Nachunternehmer Firma"
          value={team.bau_nachunternehmer_firma ?? ''}
          onChange={(e) => setTeam((t) => ({ ...t, bau_nachunternehmer_firma: e.target.value }))}
        />
        <Input
          label="Nachunternehmer Ansprechpartner"
          value={team.bau_nachunternehmer_name ?? ''}
          onChange={(e) => setTeam((t) => ({ ...t, bau_nachunternehmer_name: e.target.value }))}
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="primary" size="sm" disabled={pending} onClick={save}>
          Speichern
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setTeam(initial)
            setEditing(false)
          }}
        >
          Abbrechen
        </Button>
      </div>
    </div>
  )
}

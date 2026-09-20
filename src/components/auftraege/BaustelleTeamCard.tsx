'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { useTransition } from '@/components/ui/action-busy'
import { useState } from 'react'
import { toast } from '@/components/ui/app-toast'
import { saveAuftragBaustelleTeam } from '@/app/(dashboard)/auftraege/baustelle-actions'
import type { AuftragBaustelleTeam } from '@/lib/auftraege/baustelle-types'
import { TOAST } from '@/lib/copy'

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
        toast.systemError(r)
        return
      }
      toast.success(TOAST.team_gespeichert)
      setEditing(false)
      onChanged()
    })
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-[length:var(--fs-text)]">
              <MockIcon n="user" ctx="default" className="h-4 w-4 shrink-0 text-bw-text-muted" aria-hidden />
              <span className="font-medium text-bw-text">
                {team.bauleiter_name?.trim() || 'Bauleiter noch nicht hinterlegt'}
              </span>
            </div>
            {team.bauleiter_telefon?.trim() ? (
              <p className="flex items-center gap-2 text-[length:var(--fs-text)] text-bw-text-muted">
                <MockIcon n="phone" ctx="default" className="h-3.5 w-3.5" aria-hidden />
                {team.bauleiter_telefon}
              </p>
            ) : null}
            {team.bauleiter_email?.trim() ? (
              <p className="flex items-center gap-2 text-[length:var(--fs-text)] text-bw-text-muted">
                <MockIcon n="mail" ctx="default" className="h-3.5 w-3.5" aria-hidden />
                {team.bauleiter_email}
              </p>
            ) : null}
          </div>
          <MockBtn type="button" kind="secondary" sm onClick={() => setEditing(true)}>
            Bearbeiten
          </MockBtn>
        </div>

        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[length:var(--fs-meta)] font-medium uppercase tracking-wide text-bw-text-muted">
            <MockIcon n="users" ctx="default" className="h-3.5 w-3.5" aria-hidden />
            Mannschaft ({team.bau_mannschaft.length})
          </p>
          {team.bau_mannschaft.length ? (
            <div className="flex flex-wrap gap-1.5">
              {team.bau_mannschaft.map((n) => (
                <span
                  key={n}
                  className="rounded-pill border border-bw-border bg-bw-bg px-2.5 py-0.5 text-[length:var(--fs-meta)] text-bw-text"
                >
                  {n}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[length:var(--fs-text)] text-bw-text-muted">Noch keine Mitarbeiter hinterlegt.</p>
          )}
        </div>

        {(team.bau_nachunternehmer_name?.trim() || team.bau_nachunternehmer_firma?.trim()) && (
          <div className="rounded-card border border-bw-border bg-bw-bg/50 px-3 py-2 text-[length:var(--fs-text)]">
            <p className="text-[length:var(--fs-meta)] font-medium text-bw-text-muted">Nachunternehmer (Info)</p>
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
      <MockField label="Bauleiter"><MockInput value={team.bauleiter_name ?? ''} onChange={(e) => setTeam((t) => ({ ...t, bauleiter_name: e.target.value }))} /></MockField>
      <div className="grid gap-3 sm:grid-cols-2">
        <MockField label="Telefon"><MockInput value={team.bauleiter_telefon ?? ''} onChange={(e) => setTeam((t) => ({ ...t, bauleiter_telefon: e.target.value }))} /></MockField>
        <MockField label="E-Mail"><MockInput type="email" value={team.bauleiter_email ?? ''} onChange={(e) => setTeam((t) => ({ ...t, bauleiter_email: e.target.value }))} /></MockField>
      </div>

      <div className="form-field">
        <label className="form-field-label">Mannschaft</label>
        <div className="space-y-2">
          {team.bau_mannschaft.map((name, i) => (
            <div key={i} className="flex gap-2">
              <MockInput value={name} onChange={(e) => {
                  const next = [...team.bau_mannschaft]
                  next[i] = e.target.value
                  setTeam((t) => ({ ...t, bau_mannschaft: next }))
                }} placeholder="Name" />
              <MockBtn
                type="button"
                kind="ghost" sm
                aria-label="Löschen"
                onClick={() =>
                  setTeam((t) => ({
                    ...t,
                    bau_mannschaft: t.bau_mannschaft.filter((_, j) => j !== i),
                  }))
                }
              >
                <MockIcon n="x" ctx="default" className="h-4 w-4" />
              </MockBtn>
            </div>
          ))}
          <MockBtn
            type="button"
            kind="ghost" sm
            className="gap-1"
            onClick={() => setTeam((t) => ({ ...t, bau_mannschaft: [...t.bau_mannschaft, ''] }))}
          >
            <MockIcon n="plus" ctx="default" className="h-3.5 w-3.5" />
            Mitarbeiter hinzufügen
          </MockBtn>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MockField label="Nachunternehmer Firma"><MockInput value={team.bau_nachunternehmer_firma ?? ''} onChange={(e) => setTeam((t) => ({ ...t, bau_nachunternehmer_firma: e.target.value }))} /></MockField>
        <MockField label="Nachunternehmer Ansprechpartner"><MockInput value={team.bau_nachunternehmer_name ?? ''} onChange={(e) => setTeam((t) => ({ ...t, bau_nachunternehmer_name: e.target.value }))} /></MockField>
      </div>

      <div className="flex gap-2">
        <MockBtn
          type="button"
          kind="secondary" sm
          disabled={pending}
          onClick={() => {
            setTeam(initial)
            setEditing(false)
          }}
        >
          Abbrechen
        </MockBtn>
        <MockBtn type="button" kind="primary" sm disabled={pending} onClick={save}>
          Speichern
        </MockBtn>
      </div>
    </div>
  )
}

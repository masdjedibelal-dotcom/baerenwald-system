'use client'

import { useEffect, useState, useTransition } from 'react'
import { Building2, Copy, ExternalLink, Mail } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { saveKundeOrganisation } from '@/app/actions/kunden-organisation'
import { buildMeldeLink } from '@/lib/org/org-portal-helpers'
import { suggestOrgKennungFromName } from '@/lib/org/slug'
import { buildPortalLoginLink } from '@/lib/portal-utils'
import { toast } from '@/components/ui/app-toast'
import type { FreigabeModus, Kunde, PortalModus } from '@/lib/types'

type Props = {
  kunde: Pick<
    Kunde,
    | 'id'
    | 'name'
    | 'email'
    | 'portal_modus'
    | 'org_kennung'
    | 'org_anzeigename'
    | 'org_logo_url'
    | 'freigabe_modus'
    | 'freigabe_schwelle_eur'
    | 'notfall_direkt'
  >
  hasPortalAccount?: boolean
  onInvitePortal?: () => void
  onSaved?: () => void
}

const PORTAL_MODUS_OPTS = [
  { value: 'privat', label: 'Privat (MeinBärenwald)' },
  { value: 'organisation', label: 'Organisation (Auftraggeber-Portal)' },
]

const FREIGABE_MODUS_OPTS = [
  { value: 'direkt', label: 'Direkt — ohne Org-Freigabe' },
  { value: 'freigabe', label: 'Freigabe — Organisation muss freigeben' },
]

export function KundenOrganisationTab({
  kunde,
  hasPortalAccount,
  onInvitePortal,
  onSaved,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [portalModus, setPortalModus] = useState<PortalModus>(kunde.portal_modus ?? 'privat')
  const [orgKennung, setOrgKennung] = useState(kunde.org_kennung ?? '')
  const [orgAnzeigename, setOrgAnzeigename] = useState(kunde.org_anzeigename ?? '')
  const [orgLogoUrl, setOrgLogoUrl] = useState(kunde.org_logo_url ?? '')
  const [freigabeModus, setFreigabeModus] = useState<FreigabeModus>(kunde.freigabe_modus ?? 'direkt')
  const [schwelle, setSchwelle] = useState(
    kunde.freigabe_schwelle_eur != null ? String(kunde.freigabe_schwelle_eur) : ''
  )
  const [notfallDirekt, setNotfallDirekt] = useState(kunde.notfall_direkt !== false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setPortalModus(kunde.portal_modus ?? 'privat')
    setOrgKennung(kunde.org_kennung ?? '')
    setOrgAnzeigename(kunde.org_anzeigename ?? '')
    setOrgLogoUrl(kunde.org_logo_url ?? '')
    setFreigabeModus(kunde.freigabe_modus ?? 'direkt')
    setSchwelle(kunde.freigabe_schwelle_eur != null ? String(kunde.freigabe_schwelle_eur) : '')
    setNotfallDirekt(kunde.notfall_direkt !== false)
  }, [kunde])

  const istOrganisation = portalModus === 'organisation'
  const meldeBasisLink = orgKennung.trim() ? buildMeldeLink(orgKennung) : null

  function vorschlagKennung() {
    const basis = kunde.org_anzeigename?.trim() || kunde.name?.trim() || ''
    if (!basis) return
    setOrgKennung(suggestOrgKennungFromName(basis))
  }

  function speichern() {
    setErr(null)
    startTransition(async () => {
      const schwelleNum = schwelle.trim() ? Number(schwelle.replace(',', '.')) : null
      const r = await saveKundeOrganisation(kunde.id, {
        portal_modus: portalModus,
        org_kennung: istOrganisation ? orgKennung : null,
        org_anzeigename: orgAnzeigename || null,
        org_logo_url: orgLogoUrl || null,
        freigabe_modus: freigabeModus,
        freigabe_schwelle_eur: schwelleNum,
        notfall_direkt: notfallDirekt,
      })
      if (!r.ok) {
        setErr(r.message)
        return
      }
      toast.success('Organisationseinstellungen gespeichert')
      onSaved?.()
    })
  }

  async function kopieren(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} kopiert`)
    } catch {
      toast.error('Kopieren fehlgeschlagen')
    }
  }

  return (
    <Card
      title={
        <>
          <Building2 className="inline h-4 w-4 text-bw-primary" aria-hidden /> Organisation & Portal
        </>
      }
    >
      <p className="mb-4 text-[12px] leading-relaxed text-bw-text-muted">
        Auftraggeber-Modus für Hausverwaltungen und Gewerbe: Melde-Links, Freigabe-Workflow und
        Zugang zum Auftraggeber-Portal unter <code className="text-[11px]">/portal</code>.
      </p>

      <div className="space-y-3">
        <Select
          label="Portal-Modus"
          name="portal_modus"
          value={portalModus}
          onChange={(e) => setPortalModus(e.target.value as PortalModus)}
          options={PORTAL_MODUS_OPTS}
        />

        {istOrganisation ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Input
                  label="Org-Kennung (URL-Slug)"
                  placeholder="z. B. musterverwaltung"
                  value={orgKennung}
                  onChange={(e) => setOrgKennung(e.target.value)}
                  hint="Pflicht — wird in Melde-Links verwendet: /melden/{org_kennung}"
                  required
                />
              </div>
              <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={vorschlagKennung}>
                Vorschlag
              </Button>
            </div>

            <Input
              label="Anzeigename"
              placeholder="z. B. Muster Hausverwaltung GmbH"
              value={orgAnzeigename}
              onChange={(e) => setOrgAnzeigename(e.target.value)}
            />

            <Input
              label="Logo-URL"
              placeholder="https://…"
              value={orgLogoUrl}
              onChange={(e) => setOrgLogoUrl(e.target.value)}
            />

            {meldeBasisLink ? (
              <div className="rounded-lg border border-bw-border bg-bw-muted/30 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-bw-text-muted">
                  Melde-Link (Organisation)
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <a
                    href={meldeBasisLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-[13px] text-bw-primary underline-offset-2 hover:underline"
                  >
                    {meldeBasisLink}
                  </a>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-label="Link kopieren"
                    onClick={() => void kopieren(meldeBasisLink, 'Melde-Link')}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={meldeBasisLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    aria-label="Link öffnen"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ) : null}

            <div className="border-t border-bw-border pt-3">
              <p className="mb-2 text-[12px] font-medium text-bw-text">Freigabe-Workflow</p>
              <Select
                label="Freigabe-Modus"
                name="freigabe_modus"
                value={freigabeModus}
                onChange={(e) => setFreigabeModus(e.target.value as FreigabeModus)}
                options={FREIGABE_MODUS_OPTS}
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input
                  label="Schwelle (€)"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Leer = nur nach Modus"
                  value={schwelle}
                  onChange={(e) => setSchwelle(e.target.value)}
                />
                <label className="flex items-center gap-2 self-end pb-2 text-[13px] text-bw-text">
                  <input
                    type="checkbox"
                    checked={notfallDirekt}
                    onChange={(e) => setNotfallDirekt(e.target.checked)}
                    className="rounded border-bw-border"
                  />
                  Notfall umgeht Freigabe
                </label>
              </div>
            </div>
          </>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-bw-border pt-3">
          {onInvitePortal ? (
            <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={onInvitePortal}>
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {hasPortalAccount ? 'Portal-Einladung erneut senden' : 'MeinBärenwald-Einladung senden'}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void kopieren(buildPortalLoginLink(), 'Portal-Login')}
          >
            Portal-Login kopieren
          </Button>
        </div>

        {err ? <p className="text-sm text-danger">{err}</p> : null}

        <div className="flex justify-end pt-1">
          <Button type="button" variant="primary" loading={pending} onClick={speichern}>
            Speichern
          </Button>
        </div>
      </div>
    </Card>
  )
}

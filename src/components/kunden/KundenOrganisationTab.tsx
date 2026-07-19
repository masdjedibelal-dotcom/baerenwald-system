'use client'

import { useEffect, useState, useTransition } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { MockBtn, MockChip } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
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
    <div className="space-y-4">
      <MockCard
        title="Organisation & Portal"
        icon="plug"
        actions={
          <MockBtn kind="primary" sm disabled={pending} onClick={speichern}>
            {pending ? 'Speichern…' : 'Speichern'}
          </MockBtn>
        }
      >
        <p className="mb-4 text-[12px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
          Auftraggeber-Modus für Hausverwaltungen und Gewerbe: Melde-Links, Freigabe-Workflow und
          Zugang zum Auftraggeber-Portal.
        </p>

        <MockFormSection title="Portal-Modus" icon="plug">
          <MockField label="Modus" full>
            <div className="chiprow">
              <MockChip
                active={portalModus === 'privat'}
                onClick={() => setPortalModus('privat')}
              >
                Privat (MeinBärenwald)
              </MockChip>
              <MockChip
                active={portalModus === 'organisation'}
                onClick={() => setPortalModus('organisation')}
              >
                Organisation (Auftraggeber-Portal)
              </MockChip>
            </div>
          </MockField>
        </MockFormSection>

        {istOrganisation ? (
          <>
            <MockFormSection title="Organisation" icon="building" className="mt-4">
              <MockField
                label="Org-Kennung (URL-Slug)"
                required
                hint="Pflicht — wird in Melde-Links verwendet: /melden/{org_kennung}"
                full
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="txt"
                    style={{ flex: 1 }}
                    placeholder="z. B. musterverwaltung"
                    value={orgKennung}
                    onChange={(e) => setOrgKennung(e.target.value)}
                  />
                  <MockBtn sm kind="ghost" onClick={vorschlagKennung}>
                    Vorschlag
                  </MockBtn>
                </div>
              </MockField>
              <MockField label="Anzeigename" full>
                <input
                  className="txt"
                  placeholder="z. B. Muster Hausverwaltung GmbH"
                  value={orgAnzeigename}
                  onChange={(e) => setOrgAnzeigename(e.target.value)}
                />
              </MockField>
              <MockField label="Logo-URL" full>
                <input
                  className="txt"
                  placeholder="https://…"
                  value={orgLogoUrl}
                  onChange={(e) => setOrgLogoUrl(e.target.value)}
                />
              </MockField>
            </MockFormSection>

            {meldeBasisLink ? (
              <div className="listcard mt-3" style={{ padding: '12px 14px' }}>
                <div
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-3)', marginBottom: 6 }}
                >
                  Melde-Link (Organisation)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <a
                    href={meldeBasisLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 13,
                      color: 'var(--green)',
                    }}
                  >
                    {meldeBasisLink}
                  </a>
                  <MockBtn
                    sm
                    kind="ghost"
                    icon="copy"
                    title="Link kopieren"
                    onClick={() => void kopieren(meldeBasisLink, 'Melde-Link')}
                  />
                  <a
                    href={meldeBasisLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn ghost sm icon"
                    aria-label="Link öffnen"
                    title="Link öffnen"
                  >
                    <MockIcon ctx="btn" n="external-link" size={14} />
                  </a>
                </div>
              </div>
            ) : null}

            <MockFormSection title="Freigabe-Workflow" icon="shield-check" className="mt-4">
              <MockField label="Freigabe-Modus" full>
                <div className="chiprow">
                  <MockChip
                    active={freigabeModus === 'direkt'}
                    onClick={() => setFreigabeModus('direkt')}
                  >
                    Direkt — ohne Org-Freigabe
                  </MockChip>
                  <MockChip
                    active={freigabeModus === 'freigabe'}
                    onClick={() => setFreigabeModus('freigabe')}
                  >
                    Freigabe — Organisation muss freigeben
                  </MockChip>
                </div>
              </MockField>
              <MockField label="Schwelle (€)" hint="Leer = nur nach Modus">
                <input
                  className="txt"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="z. B. 500"
                  value={schwelle}
                  onChange={(e) => setSchwelle(e.target.value)}
                />
              </MockField>
              <MockField label="Notfall">
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    cursor: 'pointer',
                    minHeight: 36,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={notfallDirekt}
                    onChange={(e) => setNotfallDirekt(e.target.checked)}
                  />
                  Notfall umgeht Freigabe
                </label>
              </MockField>
            </MockFormSection>
          </>
        ) : null}

        {err ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--red-tx, #b91c1c)' }}>
            {err}
          </p>
        ) : null}
      </MockCard>

      <MockCard title="Portal-Zugang" icon="mail">
        <p className="mb-3 text-[12px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
          Einladung und Login für das Kunden- bzw. Auftraggeber-Portal.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {onInvitePortal ? (
            <MockBtn sm kind="ghost" icon="mail" onClick={onInvitePortal}>
              {hasPortalAccount
                ? 'Kundenportal-Link erneut versenden'
                : 'Kundenportal-Link versenden'}
            </MockBtn>
          ) : null}
          <MockBtn
            sm
            kind="ghost"
            icon="copy"
            onClick={() => void kopieren(buildPortalLoginLink(), 'Portal-Login')}
          >
            Portal-Login kopieren
          </MockBtn>
        </div>
      </MockCard>
    </div>
  )
}

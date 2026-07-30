'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useRef, useState } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { saveKundeOrganisation } from '@/app/actions/kunden-organisation'
import { FreigabeRegelnEditor } from '@/components/org/FreigabeRegelnEditor'
import { buildMeldeLink } from '@/lib/org/org-portal-helpers'
import { suggestOrgKennungFromName } from '@/lib/org/slug'
import { toast } from '@/components/ui/app-toast'
import type { FreigabeModus, Kunde } from '@/lib/types'

type Props = {
  kunde: Pick<
    Kunde,
    | 'id'
    | 'name'
    | 'org_kennung'
    | 'org_anzeigename'
    | 'org_logo_url'
    | 'freigabe_modus'
    | 'freigabe_schwelle_eur'
    | 'notfall_direkt'
  >
  onSaved?: () => void
}

export function KundenOrganisationTab({ kunde, onSaved }: Props) {
  const [pending, startTransition] = useTransition()
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [orgKennung, setOrgKennung] = useState(kunde.org_kennung ?? '')
  const [orgAnzeigename, setOrgAnzeigename] = useState(kunde.org_anzeigename ?? '')
  const [orgLogoUrl, setOrgLogoUrl] = useState(kunde.org_logo_url ?? '')
  const [freigabeModus, setFreigabeModus] = useState<FreigabeModus>(kunde.freigabe_modus ?? 'freigabe')
  const [schwelle, setSchwelle] = useState(
    kunde.freigabe_schwelle_eur != null ? String(Math.round(Number(kunde.freigabe_schwelle_eur))) : '500'
  )
  const [notfallDirekt, setNotfallDirekt] = useState(kunde.notfall_direkt !== false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setOrgKennung(kunde.org_kennung ?? '')
    setOrgAnzeigename(kunde.org_anzeigename ?? '')
    setOrgLogoUrl(kunde.org_logo_url ?? '')
    setFreigabeModus(kunde.freigabe_modus ?? 'freigabe')
    setSchwelle(
      kunde.freigabe_schwelle_eur != null
        ? String(Math.round(Number(kunde.freigabe_schwelle_eur)))
        : '500'
    )
    setNotfallDirekt(kunde.notfall_direkt !== false)
  }, [kunde])

  const meldeBasisLink = orgKennung.trim() ? buildMeldeLink(orgKennung) : null

  function vorschlagKennung() {
    const basis = orgAnzeigename.trim() || kunde.org_anzeigename?.trim() || kunde.name?.trim() || ''
    if (!basis) return
    setOrgKennung(suggestOrgKennungFromName(basis))
  }

  function speichern() {
    setErr(null)
    startTransition(async () => {
      const schwelleNum = schwelle.trim() ? Number(schwelle.replace(',', '.')) : null
      const r = await saveKundeOrganisation(kunde.id, {
        portal_modus: 'organisation',
        org_kennung: orgKennung,
        org_anzeigename: orgAnzeigename || null,
        org_logo_url: orgLogoUrl || null,
        freigabe_modus: freigabeModus,
        freigabe_schwelle_eur: schwelleNum,
        notfall_direkt: notfallDirekt,
        kleinreparaturen_ohne_angebot: false,
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

  async function uploadLogo(file: File) {
    setLogoUploading(true)
    setErr(null)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('filename', file.name || 'org-logo.png')
      const res = await fetch('/api/einstellungen/logo', { method: 'POST', body: fd })
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !json.url) {
        throw new Error(json.error || 'Upload fehlgeschlagen')
      }
      setOrgLogoUrl(json.url)
      toast.success('Logo hochgeladen')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload fehlgeschlagen'
      setErr(msg)
      toast.error(msg)
    } finally {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  return (
      <MockCard
        title="Organisation & Portal"
        icon="building"
        actions={
          <MockBtn kind="primary" sm disabled={pending || logoUploading} onClick={speichern}>
            {pending ? 'Speichern…' : 'Speichern'}
          </MockBtn>
        }
      >
        <p className="mb-4 text-[12px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
          Auftraggeber-Modus für Hausverwaltungen: Melde-Links und Freigabe-Workflow für das
          Auftraggeber-Portal.
        </p>

        <MockFormSection title="Organisation" icon="building">
          <MockField
            label="Org-Kennung (URL-Slug)"
            required
            hint="Wird in Melde-Links verwendet: /melden/{org_kennung}"
            full
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="txt"
                style={{ flex: 1 }}
                placeholder="z. B. musterverwaltung"
                value={orgKennung}
                onChange={(e) => setOrgKennung(e.target.value)}
                disabled={pending}
              />
              <button type="button" className="link" onClick={vorschlagKennung} disabled={pending}>
                Vorschlag
              </button>
            </div>
          </MockField>

          <MockField label="Anzeigename" full>
            <input
              className="txt"
              placeholder="z. B. Muster Hausverwaltung GmbH"
              value={orgAnzeigename}
              onChange={(e) => setOrgAnzeigename(e.target.value)}
              disabled={pending}
            />
          </MockField>

          <MockField label="Logo" full hint="Wird im Auftraggeber-Portal und auf Melde-Seiten gezeigt.">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 10,
                  border: '0.5px solid var(--border)',
                  background: 'var(--bg-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {orgLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={orgLogoUrl}
                    alt="Organisationslogo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <MockIcon ctx="default" n="photo" size={22} />
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void uploadLogo(file)
                  }}
                />
                <MockBtn
                  sm
                  kind="ghost"
                  disabled={pending || logoUploading}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logoUploading ? 'Lädt…' : 'Hochladen'}
                </MockBtn>
                {orgLogoUrl ? (
                  <MockBtn
                    sm
                    kind="ghost"
                    disabled={pending || logoUploading}
                    onClick={() => setOrgLogoUrl('')}
                  >
                    Entfernen
                  </MockBtn>
                ) : null}
              </div>
            </div>
          </MockField>

          <MockField label="Melde-Link (Organisation)" full>
            {meldeBasisLink ? (
              <div
                className="txt"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--bg-soft)',
                  cursor: 'default',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 13,
                    color: 'var(--text-2)',
                  }}
                >
                  {meldeBasisLink}
                </span>
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
            ) : (
              <p className="text-[12px]" style={{ color: 'var(--text-3)', margin: 0 }}>
                Nach gültiger Org-Kennung erscheint hier der Melde-Link.
              </p>
            )}
          </MockField>
        </MockFormSection>

        <FreigabeRegelnEditor
          className="mt-5"
          disabled={pending}
          value={{
            freigabe_modus: freigabeModus,
            freigabe_schwelle_eur: schwelle,
            notfall_direkt: notfallDirekt,
          }}
          onChange={(next) => {
            setFreigabeModus(next.freigabe_modus)
            setSchwelle(next.freigabe_schwelle_eur)
            setNotfallDirekt(next.notfall_direkt)
          }}
        />

        {err ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--red-tx, #b91c1c)' }}>
            {err}
          </p>
        ) : null}
      </MockCard>
  )
}

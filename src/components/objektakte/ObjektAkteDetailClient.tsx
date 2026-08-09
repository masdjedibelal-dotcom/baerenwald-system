'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MeldeLinksCard } from '@/components/kunden/MeldeLinksCard'
import { FreigabeSettingsCard } from '@/components/org/FreigabeSettingsCard'
import { ObjektAkteReadOnlySection } from '@/components/objektakte/ObjektAkteReadOnlySection'
import { ObjektEinheitenSection } from '@/components/objektakte/ObjektEinheitenSection'
import { ObjektKontakteSection } from '@/components/objektakte/ObjektKontakteSection'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'
import { VorgaengeListeClient } from '@/components/vorgaenge/VorgaengeListeClient'
import { updateKundenObjektFreigabe } from '@/app/actions/kunden-objekte'
import { kundenObjektStrasseZeile } from '@/lib/kunden-objekte'
import type { ObjektAkteDetailPayload } from '@/lib/objektakte/types'
import type { Kunde, KundenObjekt } from '@/lib/types'
import type { VorgangListeRow } from '@/lib/vorgang/types'

type ObjektAkteTab = 'uebersicht' | 'einheiten' | 'vorgaenge' | 'akte'

function objektErbtFreigabe(o: KundenObjekt): boolean {
  return o.freigabe_schwelle_eur == null && o.notfall_direkt == null
}

export function ObjektAkteDetailClient({
  kunde,
  objekt,
  akte,
  vorgaengeRows = [],
}: {
  kunde: Pick<
    Kunde,
    | 'id'
    | 'name'
    | 'vorname'
    | 'nachname'
    | 'org_kennung'
    | 'freigabe_schwelle_eur'
    | 'notfall_direkt'
  >
  objekt: KundenObjekt
  akte: ObjektAkteDetailPayload
  vorgaengeRows?: VorgangListeRow[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<ObjektAkteTab>('uebersicht')
  const [freigabeErben, setFreigabeErben] = useState(() => objektErbtFreigabe(objekt))

  useEffect(() => {
    setFreigabeErben(objektErbtFreigabe(objekt))
  }, [objekt.id, objekt.freigabe_schwelle_eur, objekt.notfall_direkt])

  const orgSlug = kunde.org_kennung?.trim().toLowerCase() || null
  const objektMeldeSlug = objekt.melde_slug?.trim() || null
  const zeigtMeldeLinks = Boolean(orgSlug && objektMeldeSlug)
  const zeigtFreigabe = Boolean(orgSlug)

  const kundeFreigabeDefaults = {
    notfall_direkt: kunde.notfall_direkt ?? true,
    freigabe_schwelle_eur:
      kunde.freigabe_schwelle_eur != null ? Number(kunde.freigabe_schwelle_eur) : null,
  }

  const adresse = [kundenObjektStrasseZeile(objekt), [objekt.plz, objekt.ort].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')

  function refresh() {
    router.refresh()
  }

  const einheiten = useMemo(
    () => akte.einheiten.filter((e) => e.aktiv !== false),
    [akte.einheiten]
  )

  const einheitenAnzahl = useMemo(() => {
    if (einheiten.length > 0) return einheiten.length
    const m = objekt.einheiten_hinweis?.match(/\d+/)
    return m ? Number(m[0]) : 0
  }, [einheiten.length, objekt.einheiten_hinweis])

  const vermietet = useMemo(() => {
    const occupied = new Set(
      akte.bewohner.filter((b) => b.aktiv !== false).map((b) => b.objekt_einheit_id)
    )
    return einheiten.filter((e) => occupied.has(e.id)).length
  }, [akte.bewohner, einheiten])

  const flaecheGesamt = useMemo(
    () =>
      einheiten.reduce((s, e) => s + (e.wohnflaeche_m2 != null ? Number(e.wohnflaeche_m2) : 0), 0),
    [einheiten]
  )

  const akteCount = akte.notizen.length + akte.dokumente.length + akte.fremdVorgaenge.length

  const kundeVorgaenge = useMemo(
    () => vorgaengeRows.filter((r) => r.kundeId === kunde.id),
    [vorgaengeRows, kunde.id]
  )

  const overview = (
    <div className="space-y-4">
      <div className="card">
        <div className="card-h">
          <div className="card-title title">Objektdaten</div>
        </div>
        <div className="card-b">
          <div className="vgid">
            <div className="vgid-name">{objekt.titel}</div>
            {adresse ? <div className="vgid-meta">{adresse}</div> : null}
            <div className="vgid-chips" style={{ marginTop: 10 }}>
              <span className="vgid-chip ghost">
                <MockIcon ctx="default" n="building" size={14} />
                {einheitenAnzahl} Einheiten
              </span>
              <span className="vgid-chip ghost">
                <MockIcon ctx="default" n="users" size={14} />
                {vermietet} vermietet
              </span>
              {flaecheGesamt > 0 ? (
                <span className="vgid-chip ghost">
                  <MockIcon ctx="default" n="building" size={14} />
                  {Math.round(flaecheGesamt)} m²
                </span>
              ) : null}
            </div>
          </div>
          <p style={{ marginTop: 12, fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
            Verwaltung:{' '}
            <Link href={`/kunden/${kunde.id}`} className="text-bw-link hover:underline">
              {kunde.name}
            </Link>
          </p>
        </div>
      </div>

      {zeigtMeldeLinks && orgSlug && objektMeldeSlug ? (
        <MeldeLinksCard
          orgSlug={orgSlug}
          meldeSlug={objektMeldeSlug}
          qrLabel="QR-Code Objekt"
          aushangPdfHref={`/api/objekte/${objekt.id}/aushang-pdf`}
        />
      ) : null}

      {zeigtFreigabe ? (
        <FreigabeSettingsCard
          value={
            freigabeErben
              ? { notfall_direkt: null, freigabe_schwelle_eur: null }
              : {
                  notfall_direkt:
                    objekt.notfall_direkt != null
                      ? Boolean(objekt.notfall_direkt)
                      : kundeFreigabeDefaults.notfall_direkt,
                  freigabe_schwelle_eur:
                    objekt.freigabe_schwelle_eur != null
                      ? Number(objekt.freigabe_schwelle_eur)
                      : null,
                }
          }
          kundeDefaults={kundeFreigabeDefaults}
          erben={freigabeErben}
          onErbenChange={setFreigabeErben}
          onSave={async (next) =>
            updateKundenObjektFreigabe(objekt.id, kunde.id, {
              notfall_direkt: next.notfall_direkt,
              freigabe_schwelle_eur: next.freigabe_schwelle_eur,
            })
          }
          onSaved={() => refresh()}
        />
      ) : null}

      <ObjektKontakteSection
        kundeId={kunde.id}
        objektId={objekt.id}
        kontakte={akte.kontakte}
        onChanged={refresh}
      />
    </div>
  )

  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'uebersicht',
      label: 'Übersicht',
      icon: 'layout-dashboard',
      render: () => overview,
    },
    {
      id: 'einheiten',
      label: 'Einheiten',
      icon: 'building',
      count: einheiten.length || undefined,
      render: () => (
        <ObjektEinheitenSection
          kundeId={kunde.id}
          objektId={objekt.id}
          einheiten={akte.einheiten}
          bewohner={akte.bewohner}
          onChanged={refresh}
        />
      ),
    },
    {
      id: 'vorgaenge',
      label: 'Vorgänge',
      icon: 'folders',
      count: kundeVorgaenge.length || undefined,
      render: () => (
        <Suspense fallback={<CrmInlineLoading label="Vorgänge werden geladen …" />}>
          <VorgaengeListeClient
            rows={vorgaengeRows}
            embedded
            restrictKundeId={kunde.id}
          />
        </Suspense>
      ),
    },
    {
      id: 'akte',
      label: 'Akte',
      icon: 'file-text',
      count: akteCount || undefined,
      render: () => <ObjektAkteReadOnlySection data={akte} />,
    },
  ]

  return (
    <EntityDetailLayout
      crumbBackHref={`/kunden/${kunde.id}`}
      crumbBackLabel="Zurück zu Details"
      head={{
        title: objekt.titel,
        titleBadges:
          vermietet > 0 ? <MockBadge kind="aktiv">Vermietet</MockBadge> : null,
        badges: adresse ? <span>{adresse}</span> : null,
      }}
    >
      <DetailShell
        groups={detailShellGroups}
        value={tab}
        onChange={(id) => setTab(id as ObjektAkteTab)}
      />
    </EntityDetailLayout>
  )
}

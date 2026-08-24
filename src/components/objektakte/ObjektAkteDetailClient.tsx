'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EntityDetailLayout } from '@/components/layout/EntityDetailLayout'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MeldeLinksCard } from '@/components/kunden/MeldeLinksCard'
import { KundenObjektModal } from '@/components/kunden/KundenObjektModal'
import { FreigabeSettingsCard } from '@/components/org/FreigabeSettingsCard'
import { ObjektAkteReadOnlySection } from '@/components/objektakte/ObjektAkteReadOnlySection'
import { ObjektEinheitenSection } from '@/components/objektakte/ObjektEinheitenSection'
import { ObjektHausmeisterCard } from '@/components/objektakte/ObjektHausmeisterCard'
import { ObjektKontakteSection } from '@/components/objektakte/ObjektKontakteSection'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'
import { VorgaengeListeClient } from '@/components/vorgaenge/VorgaengeListeClient'
import {
  deleteKundenObjekt,
  updateKundenObjektFreigabe,
} from '@/app/actions/kunden-objekte'
import { toast } from '@/components/ui/app-toast'
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
  const [editOpen, setEditOpen] = useState(false)
  const [objektState, setObjektState] = useState(objekt)

  useEffect(() => {
    setFreigabeErben(objektErbtFreigabe(objekt))
  }, [objekt.id, objekt.freigabe_schwelle_eur, objekt.notfall_direkt])

  useEffect(() => {
    setObjektState(objekt)
  }, [objekt])

  const orgSlug = kunde.org_kennung?.trim().toLowerCase() || null
  const objektMeldeSlug = objektState.melde_slug?.trim() || null
  const zeigtMeldeLinks = Boolean(orgSlug && objektMeldeSlug)
  const zeigtFreigabe = Boolean(orgSlug)

  const kundeFreigabeDefaults = {
    notfall_direkt: kunde.notfall_direkt ?? true,
    freigabe_schwelle_eur:
      kunde.freigabe_schwelle_eur != null ? Number(kunde.freigabe_schwelle_eur) : null,
  }

  const adresse = [
    kundenObjektStrasseZeile(objektState),
    [objektState.plz, objektState.ort].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ')

  function refresh() {
    router.refresh()
  }

  function loeschen() {
    if (
      !confirm(
        `Objekt „${objektState.titel}“ wirklich löschen? Zugehörige Einheiten/Kontakte gehen mit verloren.`
      )
    ) {
      return
    }
    void (async () => {
      const r = await deleteKundenObjekt(objektState.id, kunde.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Objekt gelöscht')
      router.push(`/kunden/${kunde.id}`)
      router.refresh()
    })()
  }

  const einheiten = useMemo(
    () => akte.einheiten.filter((e) => e.aktiv !== false),
    [akte.einheiten]
  )

  const bewohnerAktiv = useMemo(
    () => akte.bewohner.filter((b) => b.aktiv !== false),
    [akte.bewohner]
  )

  const einheitenAnzahl = einheiten.length
  const personenAnzahl = bewohnerAktiv.length

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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <MockBtn sm kind="ghost" icon="pencil" onClick={() => setEditOpen(true)}>
              Bearbeiten
            </MockBtn>
            <MockBtn sm kind="ghost" onClick={loeschen}>
              Löschen
            </MockBtn>
          </div>
        </div>
        <div className="card-b">
          <div className="vgid">
            <div className="vgid-name">{objektState.titel}</div>
            {adresse ? <div className="vgid-meta">{adresse}</div> : null}
            <div className="vgid-chips" style={{ marginTop: 10 }}>
              <span className="vgid-chip ghost">
                <MockIcon ctx="default" n="building" size={14} />
                {einheitenAnzahl} {einheitenAnzahl === 1 ? 'Einheit' : 'Einheiten'}
              </span>
              <span className="vgid-chip ghost">
                <MockIcon ctx="default" n="users" size={14} />
                {personenAnzahl} Personen
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
          aushangPdfHref={`/api/objekte/${objektState.id}/aushang-pdf`}
        />
      ) : null}

      {zeigtFreigabe ? (
        <FreigabeSettingsCard
          value={
            freigabeErben
              ? { notfall_direkt: null, freigabe_schwelle_eur: null }
              : {
                  notfall_direkt:
                    objektState.notfall_direkt != null
                      ? Boolean(objektState.notfall_direkt)
                      : kundeFreigabeDefaults.notfall_direkt,
                  freigabe_schwelle_eur:
                    objektState.freigabe_schwelle_eur != null
                      ? Number(objektState.freigabe_schwelle_eur)
                      : null,
                }
          }
          kundeDefaults={kundeFreigabeDefaults}
          erben={freigabeErben}
          onErbenChange={setFreigabeErben}
          onSave={async (next) =>
            updateKundenObjektFreigabe(objektState.id, kunde.id, {
              notfall_direkt: next.notfall_direkt,
              freigabe_schwelle_eur: next.freigabe_schwelle_eur,
            })
          }
          onSaved={() => refresh()}
        />
      ) : null}

      <ObjektHausmeisterCard
        kundeId={kunde.id}
        objektId={objektState.id}
        liste={akte.orgHausmeisterListe}
        amObjekt={akte.hausmeisterAmObjekt}
        onChanged={refresh}
      />

      <ObjektKontakteSection
        kundeId={kunde.id}
        objektId={objektState.id}
        kontakte={akte.kontakte.filter((k) => k.rolle !== 'hausmeister')}
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
      count: einheitenAnzahl || undefined,
      render: () => (
        <ObjektEinheitenSection
          kundeId={kunde.id}
          objektId={objektState.id}
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
    <>
      <EntityDetailLayout
        crumbBackHref={`/kunden/${kunde.id}`}
        crumbBackLabel="Zurück zu Details"
        head={{
          title: objektState.titel,
          titleBadges:
            einheitenAnzahl > 0 ? (
              <MockBadge kind="aktiv">
                {einheitenAnzahl} {einheitenAnzahl === 1 ? 'Einheit' : 'Einheiten'}
              </MockBadge>
            ) : null,
          badges: adresse ? <span>{adresse}</span> : null,
        }}
      >
        <DetailShell
          groups={detailShellGroups}
          value={tab}
          onChange={(id) => setTab(id as ObjektAkteTab)}
        />
      </EntityDetailLayout>

      <KundenObjektModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        kundeId={kunde.id}
        verwaltungName={kunde.name}
        editObjekt={objektState}
        onSaved={(next) => {
          setObjektState(next)
          setEditOpen(false)
          refresh()
        }}
      />
    </>
  )
}

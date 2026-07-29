'use client'

import Link from 'next/link'
import { Suspense, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DetailHead } from '@/components/layout/DetailHead'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { ObjektAkteReadOnlySection } from '@/components/objektakte/ObjektAkteReadOnlySection'
import { ObjektEinheitenSection } from '@/components/objektakte/ObjektEinheitenSection'
import { ObjektKontakteSection } from '@/components/objektakte/ObjektKontakteSection'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'
import { VorgaengeListeClient } from '@/components/vorgaenge/VorgaengeListeClient'
import { kundenObjektStrasseZeile } from '@/lib/kunden-objekte'
import type { ObjektAkteDetailPayload } from '@/lib/objektakte/types'
import type { Kunde, KundenObjekt } from '@/lib/types'
import type { VorgangListeRow } from '@/lib/vorgang/types'

type ObjektAkteTab = 'uebersicht' | 'einheiten' | 'vorgaenge' | 'akte'

export function ObjektAkteDetailClient({
  kunde,
  objekt,
  akte,
  vorgaengeRows = [],
}: {
  kunde: Pick<Kunde, 'id' | 'name' | 'vorname' | 'nachname'>
  objekt: KundenObjekt
  akte: ObjektAkteDetailPayload
  vorgaengeRows?: VorgangListeRow[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<ObjektAkteTab>('uebersicht')

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
            {objekt.einheiten_hinweis?.trim() ? (
              <div className="vgid-meta" style={{ marginTop: 4 }}>
                {objekt.einheiten_hinweis.trim()}
              </div>
            ) : null}
            <div className="vgid-chips" style={{ marginTop: 10 }}>
              <span className="vgid-chip ghost">
                <MockIcon ctx="default" n="building" size={14} />
                {einheiten.length} Einheiten
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
    <div className="space-y-4 pb-6">
      <DetailHead
        title={objekt.titel}
        titleBadges={
          vermietet > 0 ? <MockBadge kind="aktiv">Vermietet</MockBadge> : (
            <MockBadge kind="storniert">Frei</MockBadge>
          )
        }
        badges={adresse ? <span>{adresse}</span> : null}
        actions={
          <a
            className="btn ghost sm"
            href={`/api/objekte/${objekt.id}/aushang-pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Aushang PDF
          </a>
        }
      />

      <DetailShell
        groups={detailShellGroups}
        value={tab}
        onChange={(id) => setTab(id as ObjektAkteTab)}
      />
    </div>
  )
}

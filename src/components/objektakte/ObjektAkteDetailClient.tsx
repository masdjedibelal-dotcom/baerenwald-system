'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { DetailHead } from '@/components/layout/DetailHead'
import { DetailShell, type DetailShellGroup } from '@/components/mock-ui/DetailShell'
import { ObjektAkteReadOnlySection } from '@/components/objektakte/ObjektAkteReadOnlySection'
import { ObjektBewohnerSection } from '@/components/objektakte/ObjektBewohnerSection'
import { ObjektKontakteSection } from '@/components/objektakte/ObjektKontakteSection'
import { kundenObjektKurzlabel, kundenObjektStrasseZeile } from '@/lib/kunden-objekte'
import type { ObjektAkteDetailPayload } from '@/lib/objektakte/types'
import type { Kunde, KundenObjekt } from '@/lib/types'

type ObjektAkteTab = 'kontakte' | 'bewohner' | 'akte'

export function ObjektAkteDetailClient({
  kunde,
  objekt,
  akte,
}: {
  kunde: Pick<Kunde, 'id' | 'name'>
  objekt: KundenObjekt
  akte: ObjektAkteDetailPayload
}) {
  const router = useRouter()
  const [tab, setTab] = useState<ObjektAkteTab>('kontakte')

  const adresse = [kundenObjektStrasseZeile(objekt), [objekt.plz, objekt.ort].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')

  function refresh() {
    router.refresh()
  }

  const akteCount = akte.notizen.length + akte.dokumente.length + akte.fremdVorgaenge.length

  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'kontakte',
      label: 'Kontakte vor Ort',
      icon: 'user',
      count: akte.kontakte.length || undefined,
      render: () => (
        <ObjektKontakteSection
          kundeId={kunde.id}
          objektId={objekt.id}
          kontakte={akte.kontakte}
          onChanged={refresh}
        />
      ),
    },
    {
      id: 'bewohner',
      label: 'Bewohner',
      icon: 'users',
      count: akte.bewohner.length || undefined,
      render: () => (
        <ObjektBewohnerSection
          kundeId={kunde.id}
          objektId={objekt.id}
          einheiten={akte.einheiten}
          bewohner={akte.bewohner}
          onChanged={refresh}
        />
      ),
    },
    {
      id: 'akte',
      label: 'Objektakte',
      icon: 'file-text',
      count: akteCount || undefined,
      render: () => <ObjektAkteReadOnlySection data={akte} />,
    },
  ]

  return (
    <div className="space-y-4 pb-6">
      <DetailHead
        title={objekt.titel}
        sub={
          <Link href={`/kunden/${kunde.id}`} className="text-bw-link hover:underline">
            ← {kunde.name}
          </Link>
        }
        meta={
          adresse ? (
            <span className="inline-flex items-center gap-1 text-sm text-bw-text-muted">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {adresse}
            </span>
          ) : null
        }
      />

      <p className="text-[12px] text-bw-text-muted">
        Objektakte · {kundenObjektKurzlabel(objekt)} — Kontakte und Bewohner für die Disposition.
      </p>

      <DetailShell
        groups={detailShellGroups}
        value={tab}
        onChange={(id) => setTab(id as ObjektAkteTab)}
      />
    </div>
  )
}

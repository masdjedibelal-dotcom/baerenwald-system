'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { DetailHead } from '@/components/layout/DetailHead'
import { ObjektAkteReadOnlySection } from '@/components/objektakte/ObjektAkteReadOnlySection'
import { ObjektBewohnerSection } from '@/components/objektakte/ObjektBewohnerSection'
import { ObjektKontakteSection } from '@/components/objektakte/ObjektKontakteSection'
import { kundenObjektKurzlabel, kundenObjektStrasseZeile } from '@/lib/kunden-objekte'
import type { ObjektAkteDetailPayload } from '@/lib/objektakte/types'
import type { Kunde, KundenObjekt } from '@/lib/types'

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

  const adresse = [kundenObjektStrasseZeile(objekt), [objekt.plz, objekt.ort].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')

  function refresh() {
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 md:px-6">
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

      <ObjektKontakteSection
        kundeId={kunde.id}
        objektId={objekt.id}
        kontakte={akte.kontakte}
        onChanged={refresh}
      />

      <ObjektBewohnerSection
        kundeId={kunde.id}
        objektId={objekt.id}
        einheiten={akte.einheiten}
        bewohner={akte.bewohner}
        onChanged={refresh}
      />

      <ObjektAkteReadOnlySection data={akte} />
    </div>
  )
}

'use client'

import { useEffect, useState, useTransition } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { toast } from '@/components/ui/app-toast'
import {
  loadZeitenAbgleich,
  type ZeitenAbgleichZeile,
} from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import {
  createPartnerGutschriftEntwurfFromLebenszyklus,
  createRechnungEntwurfFromPositionLebenszyklus,
  pruefeSchwelleWeitereArbeitUndNachtrag,
} from '@/app/(dashboard)/auftraege/lebenszyklus-abrechnung-actions'
import { formatZeitMinuten } from '@/lib/auftraege/position-lebenszyklus'
import { formatDatum } from '@/lib/utils'
import { useRouter } from 'next/navigation'

/** §6: Zeiten-Abgleich + Entwürfe Gutschrift/Rechnung + Schwellen-Guard. */
export function AuftragLebenszyklusAbschlussCard({ auftragId }: { auftragId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [zeilen, setZeilen] = useState<ZeitenAbgleichZeile[]>([])

  useEffect(() => {
    startTransition(async () => {
      setZeilen(await loadZeitenAbgleich(auftragId))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auftragId])

  function rechnung() {
    startTransition(async () => {
      const r = await createRechnungEntwurfFromPositionLebenszyklus(auftragId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Rechnungs-Entwurf erstellt')
      router.push(`/rechnungen/${r.rechnungId}`)
    })
  }

  function gutschrift() {
    startTransition(async () => {
      const r = await createPartnerGutschriftEntwurfFromLebenszyklus(auftragId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gutschrift-Entwurf erstellt')
      router.push(`/rechnungen/${r.rechnungId}`)
    })
  }

  function schwelle() {
    startTransition(async () => {
      const r = await pruefeSchwelleWeitereArbeitUndNachtrag(auftragId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      if (!r.freigabeNoetig) {
        toast.success(`Keine Freigabe nötig (${r.betragEur.toFixed(2)} €)`)
        return
      }
      toast.success(`Nachtragsfreigabe angelegt (${r.betragEur.toFixed(2)} €)`)
    })
  }

  return (
    <MockCard title="Abschluss & Abrechnung (Lebenszyklus)">
      <p className="mb-3 text-[12px] text-bw-text-muted">
        Partner-Zeit vs. Tagesspanne (Direkt-Fotos). Entwürfe auch ohne Partner-Abschluss-Button.
      </p>

      {zeilen.length === 0 ? (
        <p className="mb-3 text-[12px] text-bw-text-muted">Noch keine Zeiten/Fotos dokumentiert.</p>
      ) : (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-bw-border text-bw-text-muted">
                <th className="py-1.5 pr-2 font-medium">Tag</th>
                <th className="py-1.5 pr-2 font-medium">Partner</th>
                <th className="py-1.5 pr-2 font-medium">Tagesspanne</th>
                <th className="py-1.5 pr-2 font-medium">Δ</th>
                <th className="py-1.5 font-medium">Fotos</th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => (
                <tr key={z.tag} className="border-b border-bw-border/60">
                  <td className="py-1.5 pr-2">{formatDatum(z.tag)}</td>
                  <td className="py-1.5 pr-2">{formatZeitMinuten(z.partnerMinuten)}</td>
                  <td className="py-1.5 pr-2">{formatZeitMinuten(z.spanneMinuten)}</td>
                  <td className="py-1.5 pr-2">{formatZeitMinuten(Math.abs(z.deltaMinuten))}</td>
                  <td className="py-1.5">{z.fotoCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <MockBtn kind="primary" sm disabled={pending} onClick={rechnung}>
          Rechnungs-Entwurf
        </MockBtn>
        <MockBtn kind="ghost" sm disabled={pending} onClick={gutschrift}>
          Gutschrift-Entwurf
        </MockBtn>
        <MockBtn kind="ghost" sm disabled={pending} onClick={schwelle}>
          Schwellen-Guard prüfen
        </MockBtn>
        <a
          className="btn ghost sm"
          href={`/api/auftraege/${auftragId}/regiebericht-lebenszyklus`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Regiebericht-PDF
        </a>
      </div>
    </MockCard>
  )
}

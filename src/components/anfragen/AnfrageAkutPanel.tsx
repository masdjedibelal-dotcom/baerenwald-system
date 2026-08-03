'use client'

import { useTransition } from '@/components/ui/action-busy'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { setLeadAlsAkut } from '@/app/(dashboard)/anfragen/actions'
import {
  buildAnfrageSchwellenHinweis,
  leadIstAkut,
  resolveAnfrageFreigabeRegeln,
} from '@/lib/anfragen/anfrage-akut-schwelle'
import { cn } from '@/lib/utils'
import type { LeadDetail } from '@/lib/types'

export function AnfrageAkutPanel({
  lead,
  onDirektBeauftragen,
}: {
  lead: LeadDetail
  onDirektBeauftragen?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const istAkut = leadIstAkut(lead)
  const org = lead.auftraggeber
  const objekt = lead.kunden_objekte
  const regeln = resolveAnfrageFreigabeRegeln({
    portalModus: org?.portal_modus,
    freigabeModus: org?.freigabe_modus,
    orgSchwelleEur: org?.freigabe_schwelle_eur,
    orgNotfallDirekt: org?.notfall_direkt,
    objektSchwelleEur: objekt?.freigabe_schwelle_eur,
    objektNotfallDirekt: objekt?.notfall_direkt,
  })
  const hinweis = buildAnfrageSchwellenHinweis({
    lead,
    freigabeModus: regeln.freigabeModus,
    portalModus: regeln.portalModus,
    schwelleEur: regeln.schwelleEur,
    notfallDirekt: regeln.notfallDirekt,
  })

  const sichtbar =
    hinweis.istMieterMeldung ||
    Boolean(lead.auftraggeber_kunde_id) ||
    hinweis.freigabeAktiv ||
    hinweis.istAkut ||
    lead.anlass === 'meldung'
  if (!sichtbar) return null

  function toggleAkut() {
    startTransition(async () => {
      const r = await setLeadAlsAkut(lead.id, !istAkut)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(istAkut ? 'Akut-Markierung entfernt' : 'Als akut markiert')
      router.refresh()
    })
  }

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5',
        hinweis.istAkut
          ? 'border-red-200 bg-red-50/80'
          : hinweis.unterSchwelle
            ? 'border-amber-200 bg-amber-50/70'
            : 'border-border bg-muted/25'
      )}
      role="status"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {hinweis.istAkut ? (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[length:var(--fs-meta)] font-semibold text-red-800">
                Akut
              </span>
            ) : null}
            {hinweis.freigabeStatus && hinweis.freigabeStatus !== 'nicht_noetig' ? (
              <span className="inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-[length:var(--fs-meta)] text-bw-text-muted ring-1 ring-bw-border">
                HV-Freigabe: {hinweis.freigabeStatus.replace('_', ' ')}
              </span>
            ) : null}
            <p className="text-[length:var(--fs-text)] font-medium text-bw-text">{hinweis.headline}</p>
          </div>
          <p className="text-[length:var(--fs-meta)] text-bw-text-muted">{hinweis.detail}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant={istAkut ? 'secondary' : 'primary'}
            size="sm"
            loading={pending}
            onClick={toggleAkut}
          >
            {istAkut ? 'Akut aufheben' : 'Als akut markieren'}
          </Button>
          {onDirektBeauftragen && hinweis.notfallDirektErlaubt ? (
            <Button
              type="button"
              variant={istAkut ? 'primary' : 'secondary'}
              size="sm"
              disabled={pending}
              onClick={onDirektBeauftragen}
            >
              Direkt beauftragen
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

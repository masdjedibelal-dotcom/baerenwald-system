'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { useMemo } from 'react'
import { Accordion } from '@/components/ui/Accordion'
import { AuftragPartnerCompliancePanel } from '@/components/auftraege/AuftragPartnerCompliancePanel'
import { sammleAuftragCompliancePartner } from '@/lib/auftraege/auftrag-compliance-partners'
import { gewerkSlugsAusPositionen } from '@/lib/handwerker/compliance-partner-profile'
import {
  dokumenteFuerProjekt,
  projektChecklisteFortschritt } from '@/lib/handwerker/compliance-katalog'
import { partnerDokumentIstFreigegeben } from '@/lib/handwerker/partner-dokument-status'
import type { AuftragDetail, ComplianceDokumentTyp, Gewerk, PartnerDokument } from '@/lib/types'
import { cn } from '@/lib/utils'

function partnerFortschrittBadge(
  fortschritt: { erfuellt: number; pflicht: number; gesamt: number },
  offenPruefung: number
): { label: string; className: string } {
  if (offenPruefung > 0) {
    return {
      label: `${offenPruefung} in Prüfung`,
      className: 'border-status-contact-bg bg-status-contact-bg text-status-contact-text' }
  }
  if (fortschritt.pflicht > 0 && fortschritt.erfuellt < fortschritt.pflicht) {
    return {
      label: `${fortschritt.erfuellt}/${fortschritt.pflicht} Pflicht`,
      className: 'border-status-cancel-bg bg-status-cancel-bg text-status-cancel-text' }
  }
  return {
    label: fortschritt.pflicht > 0 ? 'Vollständig' : `${fortschritt.gesamt} Nachweise`,
    className: 'border-status-order-bg bg-status-order-bg text-status-order-text' }
}
export function zaehleAuftragComplianceOffen(
  detail: AuftragDetail,
  complianceTypen: ComplianceDokumentTyp[],
  partnerDokumente: PartnerDokument[],
  gewerke: Gewerk[]
): number {
  if (!complianceTypen.length) return 0
  const partners = sammleAuftragCompliancePartner(detail)
  const projektGewerkSlugs = gewerkSlugsAusPositionen(detail.auftrag_positionen ?? [])
  let count = 0

  for (const partner of partners) {
    const docs = dokumenteFuerProjekt(partnerDokumente, partner.handwerkerId, detail.id)
    count += docs.filter((d) => d.status && !partnerDokumentIstFreigegeben(d.status)).length

    const ft = projektChecklisteFortschritt(
      complianceTypen,
      partnerDokumente,
      partner.handwerkerId,
      detail.id,
      projektGewerkSlugs,
      partner.gewerkSlugs,
      gewerke,
      detail.ist_bauprojekt ?? null
    )
    if (ft.pflicht > ft.erfuellt) count += ft.pflicht - ft.erfuellt
  }

  return count
}
export function AuftragComplianceTab({
  detail,
  complianceTypen = [],
  partnerDokumente = [],
  gewerke = [],
  onChanged }: {
  detail: AuftragDetail
  complianceTypen?: ComplianceDokumentTyp[]
  partnerDokumente?: PartnerDokument[]
  gewerke?: Gewerk[]
  onChanged: () => void
}) {
  const partners = useMemo(() => sammleAuftragCompliancePartner(detail), [detail])
  const projektGewerkSlugs = useMemo(
    () => gewerkSlugsAusPositionen(detail.auftrag_positionen ?? []),
    [detail.auftrag_positionen]
  )

  if (!complianceTypen.length) {
    return (
      <MockEmpty
        icon="shield-check"
        title="Compliance nicht konfiguriert"
        hint="Lege unter Einstellungen → Compliance Dokumenttypen an."
      />
    )
  }

  if (partners.length === 0) {
    return (
      <MockEmpty
        icon="tool"
        title="Keine Partner zugewiesen"
        hint="Weise unter Positionen Partner zu — dann erscheinen hier die Compliance-Nachweise je Partner."
      />
    )
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-start gap-3">
        <MockIcon n="shield-check" ctx="default" className="mt-0.5 h-5 w-5 shrink-0 text-bw-primary" aria-hidden />
        <div>
          <h2 className="text-[length:var(--fs-title)] font-semibold text-bw-text">Compliance-Nachweise</h2>
          <p className="text-[length:var(--fs-text)] text-bw-text-muted">
            Pro Partner: Leistungen, erforderliche Unterlagen hochladen, eingereichte Dokumente prüfen
            und mit OK bestätigen. Der Partner sieht den Status im Portal aktualisiert.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {partners.map((partner, index) => {
          const docs = dokumenteFuerProjekt(partnerDokumente, partner.handwerkerId, detail.id)
          const offenPruefung = docs.filter(
            (d) => d.status && !partnerDokumentIstFreigegeben(d.status)
          ).length
          const fortschritt = projektChecklisteFortschritt(
            complianceTypen,
            partnerDokumente,
            partner.handwerkerId,
            detail.id,
            projektGewerkSlugs,
            partner.gewerkSlugs,
            gewerke,
            detail.ist_bauprojekt ?? null
          )
          const badge = partnerFortschrittBadge(fortschritt, offenPruefung)
          const title = partner.firma
            ? `${partner.name} · ${partner.firma}`
            : partner.name

          return (
            <Accordion
              key={partner.handwerkerId}
              title={title}
              defaultOpen={index === 0}
              className="rounded-sheet border border-bw-border bg-surface"
              action={
                <span
                  className={cn(
                    'rounded-pill border px-2 py-0.5 text-[length:var(--fs-meta)] font-medium',
                    badge.className
                  )}
                >
                  {badge.label}
                </span>
              }
            >
              <AuftragPartnerCompliancePanel
                partner={partner}
                auftragId={detail.id}
                dokumente={partnerDokumente}
                complianceTypen={complianceTypen}
                projektGewerkSlugs={projektGewerkSlugs}
                gewerke={gewerke}
                istBauprojekt={detail.ist_bauprojekt ?? null}
                onChanged={onChanged}
              />
            </Accordion>
          )
        })}
      </div>
    </div>
  )
}

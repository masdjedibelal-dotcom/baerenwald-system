'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DetailHead, type DetailHeadProps } from '@/components/layout/DetailHead'
import { MockDetailBackLink } from '@/components/mock-ui/MockDetailBackLink'
import { NextStepBar, type NextStepMetric } from '@/components/crm/NaechsterSchrittBanner'
import {
  VorgangResolverBanner,
  vorgangResolverBannerVisible,
} from '@/components/vorgang/VorgangResolverBanner'
import { PhaseStrip } from '@/components/vorgang/PhaseStrip'
import { AkteRueckwegChip } from '@/components/vorgang/AkteRueckwegChip'
import { WiedervorlageChip } from '@/components/vorgang/WiedervorlageChip'
import { DetailQuickBar, type QuickBarAction } from '@/components/vorgang/DetailQuickBar'
import type { WiedervorlageEntity } from '@/app/(dashboard)/vorgaenge/wiedervorlage-actions'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import type { NaechsterSchrittHint } from '@/lib/crm/naechster-schritt'
import type { ResolvedVorgang } from '@/lib/vorgang/types'
import type { VorgangPhase } from '@/lib/vorgang/types'
import { getDetailRouteMeta } from '@/lib/detail-route-meta'
import type { AkteFromRef } from '@/lib/vorgang/akte-from'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

export type EntityDetailLayoutProps = {
  resolvedVorgang?: ResolvedVorgang | null
  /** @deprecated Display-Phase — Prop bleibt für Aufrufer */
  phase?: VorgangPhase | null
  /** Phasen-Strip AN→AG→AU→RE */
  projektKontext?: ProjektKontext | null
  head: DetailHeadProps
  /** Status→Aktion-Hinweis unter dem Kopf */
  nextStep?: NaechsterSchrittHint | null
  nextStepMetrics?: NextStepMetric[]
  wiedervorlageDatum?: string | null
  wiedervorlageNotiz?: string | null
  /** Phase 10: Chip editierbar machen */
  wiedervorlageEntity?: WiedervorlageEntity
  wiedervorlageEntityId?: string | null
  onWiedervorlageSaved?: () => void
  quickBar?: QuickBarAction[]
  /** @deprecated nur noch für Fallback-Titel; Crumb-Pfad entfernt */
  breadcrumbTitle?: string
  crumbBackHref?: string
  crumbBackLabel?: string
  /** @deprecated ignoriert — kein Section-Crumb mehr */
  crumbSectionLabel?: string
  children: ReactNode
  className?: string
}

function fromRefFromKontext(kontext: ProjektKontext): AkteFromRef | null {
  const kind = kontext.activeKind
  if (kind === 'anfrage' || kind === 'angebot' || kind === 'auftrag' || kind === 'rechnung') {
    return { kind, id: kontext.activeId }
  }
  return null
}

/** Vorgangs-Detail: Zurück · Phasen-Strip · Kopf · NextStep · QuickBar · Inhalt. */
export function EntityDetailLayout({
  resolvedVorgang,
  projektKontext,
  head,
  nextStep,
  nextStepMetrics,
  wiedervorlageDatum,
  wiedervorlageNotiz,
  wiedervorlageEntity,
  wiedervorlageEntityId,
  onWiedervorlageSaved,
  quickBar,
  crumbBackHref,
  crumbBackLabel,
  children,
  className,
}: EntityDetailLayoutProps) {
  const pathname = usePathname() ?? '/'
  const routeMeta = getDetailRouteMeta(pathname)
  const isMobile = useIsMobile()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!isMobile) {
      setScrolled(false)
      return
    }
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isMobile])

  const backHref = crumbBackHref ?? routeMeta.backHref ?? '/vorgaenge'
  const backLabel = crumbBackLabel ?? 'Zurück zu Vorgängen'
  const showResolver =
    resolvedVorgang != null && vorgangResolverBannerVisible(resolvedVorgang)

  const badges = (
    <>
      <WiedervorlageChip
        datum={wiedervorlageDatum}
        notiz={wiedervorlageNotiz}
        entity={wiedervorlageEntity}
        entityId={wiedervorlageEntityId}
        onSaved={onWiedervorlageSaved}
      />
      {head.badges}
    </>
  )

  return (
    <div
      className={cn(
        'detail-entity-page',
        'detail-entity-page--chrome',
        scrolled && 'detail-entity-page--scrolled',
        className ?? 'pb-6'
      )}
    >
      <div className={cn('detail-entity-sticky', scrolled && 'detail-entity-sticky--compact')}>
        <MockDetailBackLink href={backHref} label={backLabel} />
        <AkteRueckwegChip />
        {projektKontext ? (
          <PhaseStrip
            kontext={projektKontext}
            fromRef={fromRefFromKontext(projektKontext)}
            className="mb-3"
          />
        ) : null}
        {showResolver ? <VorgangResolverBanner resolved={resolvedVorgang!} /> : null}
        <DetailHead
          {...head}
          badges={badges}
          className={cn(head.className, scrolled && 'shrunk')}
        />
        {!showResolver ? (
          <NextStepBar step={nextStep ?? null} metrics={nextStepMetrics} />
        ) : null}
        {isMobile && quickBar?.length ? <DetailQuickBar actions={quickBar} /> : null}
      </div>
      <div className="detail-entity-body">{children}</div>
    </div>
  )
}

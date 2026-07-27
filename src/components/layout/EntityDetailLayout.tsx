'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DetailHead, type DetailHeadProps } from '@/components/layout/DetailHead'
import { MockDetailBackLink } from '@/components/mock-ui/MockDetailBackLink'
import { NaechsterSchrittBanner } from '@/components/crm/NaechsterSchrittBanner'
import {
  VorgangResolverBanner,
  vorgangResolverBannerVisible,
} from '@/components/vorgang/VorgangResolverBanner'
import { PhaseStrip } from '@/components/vorgang/PhaseStrip'
import { AkteRueckwegChip } from '@/components/vorgang/AkteRueckwegChip'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import type { NaechsterSchrittHint } from '@/lib/crm/naechster-schritt'
import type { ResolvedVorgang } from '@/lib/vorgang/types'
import type { VorgangPhase } from '@/lib/vorgang/types'
import { getDetailRouteMeta } from '@/lib/detail-route-meta'
import type { AkteFromRef } from '@/lib/vorgang/akte-from'
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

/** Vorgangs-Detail: Zurück · Phasen-Strip · Kopf · Nächster Schritt · Inhalt. */
export function EntityDetailLayout({
  resolvedVorgang,
  projektKontext,
  head,
  nextStep,
  crumbBackHref,
  crumbBackLabel,
  children,
  className,
}: EntityDetailLayoutProps) {
  const pathname = usePathname() ?? '/'
  const routeMeta = getDetailRouteMeta(pathname)

  const backHref = crumbBackHref ?? routeMeta.backHref ?? '/vorgaenge'
  const backLabel = crumbBackLabel ?? 'Zurück zu Vorgängen'
  const showResolver =
    resolvedVorgang != null && vorgangResolverBannerVisible(resolvedVorgang)

  return (
    <div className={cn('detail-entity-page', className ?? 'pb-6')}>
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
      <DetailHead {...head} />
      {!showResolver ? <NaechsterSchrittBanner step={nextStep ?? null} /> : null}
      {children}
    </div>
  )
}

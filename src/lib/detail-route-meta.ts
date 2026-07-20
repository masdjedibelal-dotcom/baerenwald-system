import { SECTION_LABELS } from '@/lib/nav-config'
import type { VorgangPhase } from '@/lib/vorgang/types'
import { vorgangBackNav } from '@/lib/vorgang/vorgang-back-nav'

const VORGANG_SECTIONS = new Set(['anfragen', 'angebote', 'auftraege', 'rechnungen'])

const SECTION_TO_PHASE: Record<string, VorgangPhase> = {
  anfragen: 'anfrage',
  angebote: 'angebot',
  auftraege: 'auftrag',
  rechnungen: 'rechnung',
}

export type DetailRouteMeta = {
  isDetail: boolean
  section?: string
  sectionLabel?: string
  backHref?: string
  backLabel?: string
}

export function getDetailRouteMeta(pathname: string): DetailRouteMeta {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length < 2) return { isDetail: false }

  const tail = segments[segments.length - 1] ?? ''
  if (tail === 'neu' || tail === 'bearbeiten') return { isDetail: false }

  const section = segments[0] ?? ''
  const sectionLabel = SECTION_LABELS[section] ?? section

  if (VORGANG_SECTIONS.has(section)) {
    const phase = SECTION_TO_PHASE[section]
    const nav = vorgangBackNav(phase)
    return {
      isDetail: true,
      section,
      sectionLabel,
      backHref: nav.backHref,
      backLabel: nav.backLabel,
    }
  }

  return {
    isDetail: true,
    section,
    sectionLabel,
    backHref: `/${section}`,
    backLabel: `Zurück zu ${sectionLabel}`,
  }
}

import type { LeadWithAngebote } from '@/lib/types'

/** Bekannte Namen aus alter demo-reset.ts / demo-data.ts */
const LEGACY_DEMO_NAME_FRAGMENTS = [
  'anna schmidt',
  'maria muster',
  'max mustermann',
  'peter muster',
  'test kunde',
  'demo kunde',
  'muster kunde',
] as const

const LEGACY_DEMO_EMAIL_RE =
  /@(example\.(com|de|org)|test\.local|demo\.|muster\.|sample\.)/i

type LeadLike = Pick<
  LeadWithAngebote,
  'kontakt_email' | 'kontakt_name' | 'kontakt_telefon' | 'notizen' | 'funnel_daten'
> & {
  kunden?: { email?: string | null; name?: string | null } | null
}

function emailsOf(lead: LeadLike): string[] {
  const out: string[] = []
  if (lead.kontakt_email?.trim()) out.push(lead.kontakt_email.trim().toLowerCase())
  const k = lead.kunden
  if (k && typeof k === 'object' && 'email' in k && k.email?.trim()) {
    out.push(k.email.trim().toLowerCase())
  }
  return out
}

function namesOf(lead: LeadLike): string[] {
  const out: string[] = []
  if (lead.kontakt_name?.trim()) out.push(lead.kontakt_name.trim().toLowerCase())
  const k = lead.kunden
  if (k && typeof k === 'object' && 'name' in k && k.name?.trim()) {
    out.push(k.name.trim().toLowerCase())
  }
  return out
}

function funnelMarksDemo(funnel: unknown): boolean {
  if (!funnel || typeof funnel !== 'object') return false
  const o = funnel as Record<string, unknown>
  if (o.demo === true || o.is_demo === true) return true
  const src = String(o.source ?? o.quelle ?? '').toLowerCase()
  return src === 'demo' || src === 'mock' || src === 'seed'
}

/** Alte eingebaute Demo-/Test-Leads (nicht echte Website-Anfragen). */
export function isLegacyDemoLead(lead: LeadLike): boolean {
  if (funnelMarksDemo(lead.funnel_daten)) return true

  for (const mail of emailsOf(lead)) {
    if (LEGACY_DEMO_EMAIL_RE.test(mail)) return true
    if (mail.includes('example.com') || mail.includes('example.de')) return true
  }

  for (const name of namesOf(lead)) {
    if (LEGACY_DEMO_NAME_FRAGMENTS.some((frag) => name.includes(frag))) return true
  }

  const tel = lead.kontakt_telefon?.replace(/\s/g, '') ?? ''
  if (tel === '+491701234567' || tel === '01701234567') return true

  const notiz = lead.notizen?.toLowerCase() ?? ''
  if (notiz.includes('demo-anfrage') || notiz.includes('test-anfrage')) return true

  return false
}

export function countLegacyDemoLeads(leads: LeadLike[]): number {
  return leads.filter(isLegacyDemoLead).length
}

export function filterOutLegacyDemoLeads<T extends LeadLike>(leads: T[]): T[] {
  return leads.filter((l) => !isLegacyDemoLead(l))
}

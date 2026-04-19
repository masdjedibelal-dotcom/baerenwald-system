import type { LeadWithAngebote } from '@/lib/types'

export function leadNameSort(l: LeadWithAngebote) {
  const k = l.kunden
  if (k && 'name' in k && k.name) return k.name
  return l.kontakt_name ?? ''
}

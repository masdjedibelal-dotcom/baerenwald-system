import type { FormularFeld } from '@/lib/types'

export type OeffentlichesFormularInitial = {
  token: string
  tabName: string
  felder: FormularFeld[]
  felder_werte: Record<string, unknown>
  foto_urls: string[]
  status: string
  abgeschlossen: boolean
}

export function initialDatenAusFeldern(felder: FormularFeld[]): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  for (const f of felder) {
    if (f.typ === 'checkbox') o[f.id] = false
    else if (f.typ === 'foto') o[f.id] = []
    else o[f.id] = ''
  }
  return o
}

export function mergeStoredValues(
  felder: FormularFeld[],
  stored: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const base = initialDatenAusFeldern(felder)
  if (!stored || typeof stored !== 'object') return base
  for (const k of Object.keys(stored)) {
    base[k] = stored[k] as unknown
  }
  return base
}

export function flattenFotoUrlsAusWerten(
  felder: FormularFeld[],
  werte: Record<string, unknown>
): string[] {
  const urls: string[] = []
  for (const f of felder) {
    if (f.typ !== 'foto') continue
    const v = werte[f.id]
    if (Array.isArray(v)) {
      for (const u of v) {
        if (typeof u === 'string' && u) urls.push(u)
      }
    }
  }
  return urls
}

import { splitDeutscherVollname } from '@/lib/kunde-namen'

export type HandwerkerStammPick = {
  name?: string | null
  firma?: string | null
  vorname?: string | null
  nachname?: string | null
}

/** Listen- und Detailtitel: Firmenname vor Person. */
export function handwerkerDisplayName(h: HandwerkerStammPick): string {
  const firma = h.firma?.trim()
  if (firma) return firma
  const person = handwerkerGfName(h)
  if (person) return person
  return h.name?.trim() || '—'
}

/** Vollständiger Name des Geschäftsführers / Ansprechpartners. */
export function handwerkerGfName(h: HandwerkerStammPick): string {
  const person = [h.vorname?.trim(), h.nachname?.trim()].filter(Boolean).join(' ')
  if (person) return person
  const firma = h.firma?.trim()
  const legacy = h.name?.trim()
  if (legacy && firma && legacy !== firma) return legacy
  return legacy || ''
}

export function computeHandwerkerNameField(input: HandwerkerStammPick): string {
  const firma = input.firma?.trim() ?? ''
  const person = [input.vorname?.trim(), input.nachname?.trim()].filter(Boolean).join(' ')
  if (firma) return firma
  return person
}

export type SaveHandwerkerStammInput = {
  firma?: string | null
  vorname?: string | null
  nachname?: string | null
}

export function validateHandwerkerStammPflicht(input: SaveHandwerkerStammInput): string | null {
  const firma = input.firma?.trim()
  const vorname = input.vorname?.trim()
  const nachname = input.nachname?.trim()
  if (!firma && !vorname && !nachname) {
    return 'Firmenname oder Vor-/Nachname des Geschäftsführers ist Pflicht.'
  }
  return null
}

export function buildHandwerkerStammDbPayload(input: SaveHandwerkerStammInput): {
  firma: string | null
  vorname: string | null
  nachname: string | null
  name: string
} {
  const firma = input.firma?.trim() || null
  const vorname = input.vorname?.trim() || null
  const nachname = input.nachname?.trim() || null
  const name = computeHandwerkerNameField({ firma, vorname, nachname })
  return { firma, vorname, nachname, name }
}

/** Formular-Initialisierung inkl. Legacy-Daten (name + firma). */
export function normalizeHandwerkerNamen(input: HandwerkerStammPick): {
  firma: string
  vorname: string
  nachname: string
} {
  const firma = input.firma?.trim() ?? ''
  const v = input.vorname?.trim() ?? ''
  const n = input.nachname?.trim() ?? ''
  if (v || n) {
    return { firma, vorname: v, nachname: n }
  }

  const legacyName = input.name?.trim() ?? ''
  if (firma && legacyName && legacyName !== firma) {
    const split = splitDeutscherVollname(legacyName)
    return {
      firma,
      vorname: split.vorname ?? '',
      nachname: split.nachname ?? '',
    }
  }

  if (!firma && legacyName) {
    const split = splitDeutscherVollname(legacyName)
    return { firma: '', vorname: split.vorname ?? '', nachname: split.nachname ?? '' }
  }

  return { firma: firma || legacyName, vorname: '', nachname: '' }
}

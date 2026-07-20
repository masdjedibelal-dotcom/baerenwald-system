import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from 'date-fns'

export type ZeitraumPreset =
  | 'alle'
  | 'heute'
  | 'diese_woche'
  | 'dieser_monat'
  | 'letzter_monat'
  | 'dieses_jahr'
  | 'benutzerdefiniert'

export const ZEITRAUM_OPTIONS: { value: ZeitraumPreset; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'heute', label: 'Heute' },
  { value: 'diese_woche', label: 'Diese Woche' },
  { value: 'dieser_monat', label: 'Dieser Monat' },
  { value: 'letzter_monat', label: 'Letzter Monat' },
  { value: 'dieses_jahr', label: 'Dieses Jahr' },
  { value: 'benutzerdefiniert', label: 'Benutzerdefiniert' },
]

export function zeitraumLabel(preset: ZeitraumPreset): string {
  return ZEITRAUM_OPTIONS.find((z) => z.value === preset)?.label ?? preset
}

/** Liefert [from, to] in lokaler Zeit oder null bei „Alle“ / ungültigem Benutzerdefiniert. */
export function getZeitraumRange(
  preset: ZeitraumPreset,
  customFrom: string,
  customTo: string,
  now = new Date()
): { from: Date; to: Date } | null {
  if (preset === 'alle') return null
  if (preset === 'heute') {
    return { from: startOfDay(now), to: endOfDay(now) }
  }
  if (preset === 'diese_woche') {
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfWeek(now, { weekStartsOn: 1 }),
    }
  }
  if (preset === 'dieser_monat') {
    return { from: startOfMonth(now), to: endOfMonth(now) }
  }
  if (preset === 'letzter_monat') {
    const prev = subMonths(now, 1)
    return { from: startOfMonth(prev), to: endOfMonth(prev) }
  }
  if (preset === 'dieses_jahr') {
    return { from: startOfYear(now), to: endOfYear(now) }
  }
  if (preset === 'benutzerdefiniert') {
    if (!customFrom?.trim() || !customTo?.trim()) return null
    const from = startOfDay(parseISO(customFrom))
    const to = endOfDay(parseISO(customTo))
    if (from.getTime() > to.getTime()) return null
    return { from, to }
  }
  return null
}

function parseListDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  try {
    return parseISO(iso.includes('T') ? iso : `${iso}T12:00:00`)
  } catch {
    return null
  }
}

export function datumInZeitraum(
  iso: string | null | undefined,
  range: { from: Date; to: Date } | null
): boolean {
  if (!range) return true
  const d = parseListDate(iso)
  if (!d) return false
  return d.getTime() >= range.from.getTime() && d.getTime() <= range.to.getTime()
}

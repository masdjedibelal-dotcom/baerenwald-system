import { computeKundeNameField, istKundeFirmaPflichtTyp } from '@/lib/kunde-stammdaten'

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t || null
}

function funnelRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const fd = raw as Record<string, unknown>
  const nested =
    fd.funnel_daten && typeof fd.funnel_daten === 'object' && !Array.isArray(fd.funnel_daten)
      ? (fd.funnel_daten as Record<string, unknown>)
      : {}
  return { ...fd, ...nested }
}

/** Vorname/Nachname wie auf der Website (getrennte Felder im Funnel). */
export function namenAusFunnelDaten(funnelDaten: unknown): {
  vorname: string | null
  nachname: string | null
} {
  const fd = funnelRecord(funnelDaten)
  return {
    vorname: str(fd.vorname) ?? str(fd.Vorname) ?? str(fd.firstName),
    nachname: str(fd.nachname) ?? str(fd.Nachname) ?? str(fd.lastName),
  }
}

/**
 * „Vorname Nachname“ — erster Token Vorname, Rest Nachname.
 * Ein einzelnes Wort (z. B. Website-Feld „Vorname“) wird als Vorname gespeichert, nicht als Nachname.
 */
export function splitDeutscherVollname(vollname: string): {
  vorname: string | null
  nachname: string | null
} {
  const full = vollname.trim()
  if (!full) return { vorname: null, nachname: null }
  const parts = full.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return { vorname: parts[0], nachname: null }
  return {
    vorname: parts[0],
    nachname: parts.slice(1).join(' '),
  }
}

export function normalizeKundeNamen(input: {
  typ?: string | null
  name?: string | null
  vorname?: string | null
  nachname?: string | null
  funnelDaten?: unknown
  kontaktName?: string | null
}): {
  vorname: string | null
  nachname: string | null
  name: string
} {
  const typ = input.typ ?? 'privat'
  const funnel = namenAusFunnelDaten(input.funnelDaten)

  if (funnel.vorname || funnel.nachname) {
    const vorname = funnel.vorname
    const nachname = funnel.nachname
    const name = computeKundeNameField({ typ, name: input.name, vorname, nachname })
    return { vorname, nachname, name }
  }

  const kVor = str(input.vorname)
  const kNach = str(input.nachname)
  if (kVor || kNach) {
    const name = computeKundeNameField({ typ, name: input.name, vorname: kVor, nachname: kNach })
    return { vorname: kVor, nachname: kNach, name }
  }

  const full = str(input.name) ?? str(input.kontaktName) ?? ''

  if (istKundeFirmaPflichtTyp(typ)) {
    const vorname = kVor ?? funnel.vorname
    const nachname = kNach ?? funnel.nachname
    const name = computeKundeNameField({
      typ,
      name: full,
      vorname,
      nachname,
    })
    return { vorname, nachname, name }
  }

  const split = splitDeutscherVollname(full)
  const name = computeKundeNameField({
    typ,
    name: full,
    vorname: split.vorname,
    nachname: split.nachname,
  })
  return { vorname: split.vorname, nachname: split.nachname, name }
}

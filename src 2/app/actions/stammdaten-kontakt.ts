'use server'

import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { handwerkerDisplayName } from '@/lib/handwerker-stammdaten'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import {
  emailKontaktMatch,
  normalizeKontaktEmail,
  normalizeKontaktTelefon,
  telefonKontaktMatch,
  type StammdatenKontaktTreffer,
  type StammdatenTyp,
} from '@/lib/stammdaten-kontakt'

type KontaktInput = {
  email?: string | null
  telefon?: string | null
  excludeTyp?: StammdatenTyp
  excludeId?: string
}

function kontaktRelevant(input: KontaktInput): boolean {
  return Boolean(normalizeKontaktEmail(input.email) || normalizeKontaktTelefon(input.telefon))
}

function mergeTreffer(
  rows: StammdatenKontaktTreffer[],
  excludeTyp?: StammdatenTyp,
  excludeId?: string
): StammdatenKontaktTreffer[] {
  const byKey = new Map<string, StammdatenKontaktTreffer>()
  for (const row of rows) {
    if (excludeTyp === row.typ && excludeId && row.id === excludeId) continue
    byKey.set(`${row.typ}:${row.id}`, row)
  }
  return Array.from(byKey.values())
}

async function kundenKontaktKandidaten(email: string | null, telefon: string | null) {
  const em = normalizeKontaktEmail(email)
  const tel = normalizeKontaktTelefon(telefon)
  const rows: StammdatenKontaktTreffer[] = []

  if (em) {
    const { data } = await withCrmReadFallback(async (db) =>
      db
        .from('kunden')
        .select('id, name, vorname, nachname, typ, email, telefon')
        .ilike('email', em)
        .limit(12)
    )
    for (const r of data ?? []) {
      if (!emailKontaktMatch(r.email as string, em)) continue
      rows.push({
        typ: 'kunde',
        id: r.id as string,
        name: kundeDisplayName(r as { name?: string; vorname?: string; nachname?: string; typ?: string }),
        email: (r.email as string) ?? null,
        telefon: (r.telefon as string) ?? null,
      })
    }
  }

  if (tel) {
    const { data } = await withCrmReadFallback(async (db) =>
      db
        .from('kunden')
        .select('id, name, vorname, nachname, typ, email, telefon')
        .ilike('telefon', `%${tel.slice(-8)}%`)
        .limit(12)
    )
    for (const r of data ?? []) {
      if (!telefonKontaktMatch(r.telefon as string, tel)) continue
      rows.push({
        typ: 'kunde',
        id: r.id as string,
        name: kundeDisplayName(r as { name?: string; vorname?: string; nachname?: string; typ?: string }),
        email: (r.email as string) ?? null,
        telefon: (r.telefon as string) ?? null,
      })
    }
  }

  return rows
}

async function handwerkerKontaktKandidaten(email: string | null, telefon: string | null) {
  const em = normalizeKontaktEmail(email)
  const tel = normalizeKontaktTelefon(telefon)
  const rows: StammdatenKontaktTreffer[] = []

  if (em) {
    const { data } = await withCrmReadFallback(async (db) =>
      db
        .from('handwerker')
        .select('id, name, firma, vorname, nachname, email, telefon')
        .ilike('email', em)
        .limit(12)
    )
    for (const r of data ?? []) {
      if (!emailKontaktMatch(r.email as string, em)) continue
      rows.push({
        typ: 'handwerker',
        id: r.id as string,
        name: handwerkerDisplayName(r as { name?: string; firma?: string; vorname?: string; nachname?: string }),
        email: (r.email as string) ?? null,
        telefon: (r.telefon as string) ?? null,
      })
    }
  }

  if (tel) {
    const { data } = await withCrmReadFallback(async (db) =>
      db
        .from('handwerker')
        .select('id, name, firma, vorname, nachname, email, telefon')
        .ilike('telefon', `%${tel.slice(-8)}%`)
        .limit(12)
    )
    for (const r of data ?? []) {
      if (!telefonKontaktMatch(r.telefon as string, tel)) continue
      rows.push({
        typ: 'handwerker',
        id: r.id as string,
        name: handwerkerDisplayName(r as { name?: string; firma?: string; vorname?: string; nachname?: string }),
        email: (r.email as string) ?? null,
        telefon: (r.telefon as string) ?? null,
      })
    }
  }

  return rows
}

async function partnerKontaktKandidaten(email: string | null, telefon: string | null) {
  const em = normalizeKontaktEmail(email)
  const tel = normalizeKontaktTelefon(telefon)
  const rows: StammdatenKontaktTreffer[] = []

  if (em) {
    const { data } = await withCrmReadFallback(async (db) =>
      db.from('partner').select('id, name, email, telefon').ilike('email', em).limit(12)
    )
    for (const r of data ?? []) {
      if (!emailKontaktMatch(r.email as string, em)) continue
      rows.push({
        typ: 'partner',
        id: r.id as string,
        name: String(r.name ?? 'Partner'),
        email: (r.email as string) ?? null,
        telefon: (r.telefon as string) ?? null,
      })
    }
  }

  if (tel) {
    const { data } = await withCrmReadFallback(async (db) =>
      db.from('partner').select('id, name, email, telefon').ilike('telefon', `%${tel.slice(-8)}%`).limit(12)
    )
    for (const r of data ?? []) {
      if (!telefonKontaktMatch(r.telefon as string, tel)) continue
      rows.push({
        typ: 'partner',
        id: r.id as string,
        name: String(r.name ?? 'Partner'),
        email: (r.email as string) ?? null,
        telefon: (r.telefon as string) ?? null,
      })
    }
  }

  return rows
}

/** Nur echte Duplikate innerhalb eines Typs (gleicher Kunde / gleicher Handwerker). */
export async function findStammdatenDuplikate(
  typ: StammdatenTyp,
  input: KontaktInput
): Promise<StammdatenKontaktTreffer[]> {
  if (!kontaktRelevant(input)) return []

  let rows: StammdatenKontaktTreffer[] = []
  const email = input.email ?? null
  const telefon = input.telefon ?? null
  if (typ === 'kunde') {
    rows = await kundenKontaktKandidaten(email, telefon)
  } else if (typ === 'handwerker') {
    rows = await handwerkerKontaktKandidaten(email, telefon)
  } else {
    rows = await partnerKontaktKandidaten(email, telefon)
  }

  return mergeTreffer(rows, typ, input.excludeId)
}

/**
 * Gleiche E-Mail/Telefon in anderen Stammdaten-Bereichen (Kunde ↔ Handwerker ↔ Partner).
 * Nur für Detail-Ansicht — kein Duplikat-Hinweis beim Anlegen.
 */
export async function findVerwandteStammdatenKontakte(
  input: KontaktInput
): Promise<StammdatenKontaktTreffer[]> {
  if (!kontaktRelevant(input)) return []

  const email = input.email ?? null
  const telefon = input.telefon ?? null

  const [kunden, handwerker, partner] = await Promise.all([
    input.excludeTyp === 'kunde' ? Promise.resolve([]) : kundenKontaktKandidaten(email, telefon),
    input.excludeTyp === 'handwerker' ? Promise.resolve([]) : handwerkerKontaktKandidaten(email, telefon),
    input.excludeTyp === 'partner' ? Promise.resolve([]) : partnerKontaktKandidaten(email, telefon),
  ])

  return mergeTreffer([...kunden, ...handwerker, ...partner], input.excludeTyp, input.excludeId)
}

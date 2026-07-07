'use server'

import { revalidatePath } from 'next/cache'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import { isValidMeldeSlug, normalizeOrgSlug } from '@/lib/org/slug'
import type { FreigabeModus, PortalModus } from '@/lib/types'

export type SaveKundeOrganisationInput = {
  portal_modus: PortalModus
  org_kennung?: string | null
  org_anzeigename?: string | null
  org_logo_url?: string | null
  freigabe_modus: FreigabeModus
  freigabe_schwelle_eur?: number | null
  notfall_direkt: boolean
}

function parseSchwelle(raw: number | null | undefined): number | null {
  if (raw == null || Number.isNaN(raw)) return null
  if (raw <= 0) return null
  return Math.round(raw * 100) / 100
}

export async function checkOrgKennungUnique(
  orgKennung: string,
  excludeKundeId?: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const slug = normalizeOrgSlug(orgKennung)
  if (!isValidMeldeSlug(slug)) {
    return { ok: false, message: 'Org-Kennung: 2–48 Zeichen, nur Kleinbuchstaben, Zahlen und Bindestriche.' }
  }

  const { data, error } = await withCrmReadFallback(async (db) =>
    db.from('kunden').select('id').ilike('org_kennung', slug).limit(1)
  )
  if (error) return { ok: false, message: error.message }

  const hit = (data ?? [])[0] as { id: string } | undefined
  if (hit && hit.id !== excludeKundeId) {
    return { ok: false, message: `Org-Kennung „${slug}“ ist bereits vergeben.` }
  }
  return { ok: true }
}

export async function saveKundeOrganisation(
  kundeId: string,
  input: SaveKundeOrganisationInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = kundeId?.trim()
  if (!id) return { ok: false, message: 'Kunde fehlt.' }

  const { data: kundeRow, error: kundeErr } = await withCrmReadFallback(async (db) =>
    db.from('kunden').select('typ').eq('id', id).maybeSingle()
  )
  if (kundeErr) return { ok: false, message: kundeErr.message }
  const istHausverwaltung = (kundeRow as { typ?: string } | null)?.typ === 'hausverwaltung'

  if (istHausverwaltung) {
    const hvPayload: Record<string, unknown> = {
      portal_modus: 'organisation',
      freigabe_modus: 'freigabe',
      freigabe_schwelle_eur: null,
      notfall_direkt: false,
      org_anzeigename: input.org_anzeigename?.trim() || null,
      org_logo_url: input.org_logo_url?.trim() || null,
    }
    const slug = normalizeOrgSlug(input.org_kennung ?? '')
    if (!isValidMeldeSlug(slug)) {
      return {
        ok: false,
        message: 'Für Hausverwaltung ist eine gültige Org-Kennung Pflicht (2–48 Zeichen, a-z, 0-9, -).',
      }
    }
    const unique = await checkOrgKennungUnique(slug, id)
    if (!unique.ok) return unique
    hvPayload.org_kennung = slug
    const { error } = await withCrmReadFallback(async (db) => db.from('kunden').update(hvPayload).eq('id', id))
    if (error) return { ok: false, message: error.message }
    revalidatePath('/kunden')
    revalidatePath(`/kunden/${id}`)
    return { ok: true }
  }

  const portalModus = input.portal_modus
  const payload: Record<string, unknown> = {
    portal_modus: portalModus,
    freigabe_modus: input.freigabe_modus,
    freigabe_schwelle_eur: parseSchwelle(input.freigabe_schwelle_eur),
    notfall_direkt: input.notfall_direkt,
    org_anzeigename: input.org_anzeigename?.trim() || null,
    org_logo_url: input.org_logo_url?.trim() || null,
  }

  if (portalModus === 'organisation') {
    const slug = normalizeOrgSlug(input.org_kennung ?? '')
    if (!isValidMeldeSlug(slug)) {
      return {
        ok: false,
        message: 'Bei Auftraggeber-Modus ist eine gültige Org-Kennung Pflicht (2–48 Zeichen, a-z, 0-9, -).',
      }
    }
    const unique = await checkOrgKennungUnique(slug, id)
    if (!unique.ok) return unique
    payload.org_kennung = slug
  } else {
    payload.org_kennung = null
  }

  const { error } = await withCrmReadFallback(async (db) => db.from('kunden').update(payload).eq('id', id))
  if (error) return { ok: false, message: error.message }

  revalidatePath('/kunden')
  revalidatePath(`/kunden/${id}`)
  return { ok: true }
}

/** Prüft ob Org-Kennung gesetzt ist (Pflicht vor erstem Objekt im Auftraggeber-Modus). */
export async function kundeHatOrgKennung(kundeId: string): Promise<boolean> {
  const { data } = await withCrmReadFallback(async (db) =>
    db.from('kunden').select('portal_modus, org_kennung').eq('id', kundeId).maybeSingle()
  )
  const row = data as { portal_modus?: string; org_kennung?: string | null } | null
  if (!row || row.portal_modus !== 'organisation') return true
  return Boolean(row.org_kennung?.trim())
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import {
  assignHausmeisterToObjekt,
  buildHausmeisterEinladungMailto,
  createHausmeisterEinladung,
  listOrgHausmeister,
  loadHausmeisterForObjekt,
  unassignHausmeisterFromObjekt,
  upsertOrgHausmeister,
  type HausmeisterAmObjekt,
  type OrgHausmeister,
} from '@/lib/org/org-hausmeister'
import {
  ensureHausmeisterPortalActivation,
  hausmeisterEmailAllowsSharedLogin,
} from '@/lib/org/ensure-hausmeister-portal'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

function revalidateObjekt(kundeId: string, objektId: string) {
  revalidatePath(`/kunden/${kundeId}`)
  revalidatePath(`/kunden/${kundeId}/objekte/${objektId}`)
}

async function assertObjektGehoertKunde(
  kundeId: string,
  objektId: string
): Promise<{ ok: true; titel: string } | { ok: false; message: string }> {
  const db = getSupabaseAdmin()
  const { data } = await db
    .from('kunden_objekte')
    .select('id, titel')
    .eq('id', objektId)
    .eq('kunde_id', kundeId)
    .maybeSingle()
  if (!data?.id) return { ok: false, message: 'Objekt nicht gefunden.' }
  return { ok: true, titel: String(data.titel ?? 'Objekt') }
}

async function currentUserId(): Promise<string | null> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

export async function getObjektHausmeisterData(
  kundeId: string,
  objektId: string
): Promise<{
  liste: OrgHausmeister[]
  amObjekt: HausmeisterAmObjekt | null
}> {
  const [liste, amObjekt] = await Promise.all([
    listOrgHausmeister(kundeId),
    loadHausmeisterForObjekt(objektId),
  ])
  return { liste, amObjekt }
}

/**
 * HM anlegen/aktualisieren und dem Objekt zuweisen.
 * Optional: Portal-Einladung (mailto) erzeugen.
 */
export async function saveObjektHausmeister(
  kundeId: string,
  objektId: string,
  input: {
    hausmeisterId?: string | null
    name?: string
    email?: string | null
    portalZugang?: boolean
    invite?: boolean
  }
): Promise<
  | { ok: true; hausmeisterId: string; inviteUrl?: string | null; inviteMailto?: string | null }
  | { ok: false; message: string }
> {
  const kid = kundeId.trim()
  const oid = objektId.trim()
  if (!kid || !oid) return { ok: false, message: 'Kunde/Objekt fehlt.' }

  const obj = await assertObjektGehoertKunde(kid, oid)
  if (!obj.ok) return obj

  let hmId = input.hausmeisterId?.trim() || ''
  const wantsUpsert =
    Boolean(input.name?.trim()) ||
    input.email !== undefined ||
    input.portalZugang !== undefined

  if (wantsUpsert || !hmId) {
    if (!input.name?.trim() && !hmId) {
      return { ok: false, message: 'Hausmeister Name oder Auswahl erforderlich.' }
    }
    const existing = hmId
      ? (await listOrgHausmeister(kid)).find((h) => h.id === hmId)
      : null
    const up = await upsertOrgHausmeister({
      orgKundeId: kid,
      id: hmId || null,
      name: input.name?.trim() || existing?.name || '',
      email: input.email !== undefined ? input.email : existing?.email ?? null,
      portalZugang:
        input.portalZugang !== undefined
          ? Boolean(input.portalZugang)
          : existing?.portal_zugang ?? false,
    })
    if (!up.ok) return { ok: false, message: up.error }
    hmId = up.hm.id
  }

  if (!hmId) return { ok: false, message: 'Hausmeister fehlt.' }

  const asg = await assignHausmeisterToObjekt({
    orgKundeId: kid,
    objektId: oid,
    orgHausmeisterId: hmId,
  })
  if (!asg.ok) return { ok: false, message: asg.error }

  const hmAfter = (await listOrgHausmeister(kid)).find((h) => h.id === hmId)
  const sharedLogin = hausmeisterEmailAllowsSharedLogin(hmAfter?.email)
  if (hmAfter?.portal_zugang && (sharedLogin || input.invite)) {
    const act = await ensureHausmeisterPortalActivation({
      orgHausmeisterId: hmId,
      orgKundeId: kid,
    })
    if (!act.ok) {
      console.warn('[saveObjektHausmeister] ensure portal:', act.error)
    }
  }

  let inviteUrl: string | null = null
  let inviteMailto: string | null = null
  // Primary-Staff: kein Mailto — Konto ist bereits CRM/Partner.
  if (input.invite && !sharedLogin) {
    const inv = await createHausmeisterEinladung({
      orgKundeId: kid,
      orgHausmeisterId: hmId,
      objektId: oid,
      createdBy: await currentUserId(),
    })
    if (inv.ok) {
      inviteUrl = inv.url
      const hm = (await listOrgHausmeister(kid)).find((h) => h.id === hmId)
      const { data: kunde } = await getSupabaseAdmin()
        .from('kunden')
        .select('name, org_anzeigename')
        .eq('id', kid)
        .maybeSingle()
      const hvName =
        String(kunde?.org_anzeigename ?? '').trim() ||
        String(kunde?.name ?? '').trim() ||
        'Hausverwaltung'
      if (hm?.email) {
        inviteMailto = buildHausmeisterEinladungMailto({
          toEmail: hm.email,
          link: inv.url,
          hvName,
          objektLabel: obj.titel,
          hmName: hm.name,
        })
      }
    } else {
      // Zuordnung ok — Einladung optional fehlgeschlagen
      console.warn('[saveObjektHausmeister] invite:', inv.error)
    }
  }

  revalidateObjekt(kid, oid)
  return { ok: true, hausmeisterId: hmId, inviteUrl, inviteMailto }
}

/** Portal für Org-HM aktivieren (Primary-Staff ohne Einladung; sonst Stub + Hinweis). */
export async function activateObjektHausmeisterPortal(
  kundeId: string,
  objektId: string,
  hausmeisterId?: string | null
): Promise<
  | { ok: true; portalKundeId: string; hasAuthAccount: boolean; primaryStaff: boolean }
  | { ok: false; message: string }
> {
  const kid = kundeId.trim()
  const oid = objektId.trim()
  if (!kid || !oid) return { ok: false, message: 'Kunde/Objekt fehlt.' }

  const obj = await assertObjektGehoertKunde(kid, oid)
  if (!obj.ok) return obj

  let hmId = hausmeisterId?.trim() || ''
  if (!hmId) {
    const am = await loadHausmeisterForObjekt(oid)
    if (!am || am.isLegacy) {
      return { ok: false, message: 'Kein Portal-Hausmeister am Objekt.' }
    }
    hmId = am.id
  }

  const hm = (await listOrgHausmeister(kid)).find((h) => h.id === hmId)
  if (!hm) return { ok: false, message: 'Hausmeister nicht gefunden.' }
  if (!hm.portal_zugang) {
    const up = await upsertOrgHausmeister({
      orgKundeId: kid,
      id: hmId,
      name: hm.name,
      email: hm.email,
      portalZugang: true,
    })
    if (!up.ok) return { ok: false, message: up.error }
  }

  const act = await ensureHausmeisterPortalActivation({
    orgHausmeisterId: hmId,
    orgKundeId: kid,
  })
  if (!act.ok) return { ok: false, message: act.error }

  revalidateObjekt(kid, oid)
  return {
    ok: true,
    portalKundeId: act.portalKundeId,
    hasAuthAccount: act.hasAuthAccount,
    primaryStaff: act.primaryStaff,
  }
}

/** Bestehenden Org-HM dem Objekt zuweisen (ohne Stammdaten zu ändern). */
export async function assignExistingHausmeisterToObjekt(
  kundeId: string,
  objektId: string,
  hausmeisterId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const kid = kundeId.trim()
  const oid = objektId.trim()
  const hid = hausmeisterId.trim()
  if (!kid || !oid || !hid) return { ok: false, message: 'Angaben unvollständig.' }

  const obj = await assertObjektGehoertKunde(kid, oid)
  if (!obj.ok) return obj

  const asg = await assignHausmeisterToObjekt({
    orgKundeId: kid,
    objektId: oid,
    orgHausmeisterId: hid,
  })
  if (!asg.ok) return { ok: false, message: asg.error }

  revalidateObjekt(kid, oid)
  return { ok: true }
}

export async function removeObjektHausmeister(
  kundeId: string,
  objektId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const kid = kundeId.trim()
  const oid = objektId.trim()
  if (!kid || !oid) return { ok: false, message: 'Kunde/Objekt fehlt.' }

  const obj = await assertObjektGehoertKunde(kid, oid)
  if (!obj.ok) return obj

  const r = await unassignHausmeisterFromObjekt(oid)
  if (!r.ok) return { ok: false, message: r.error }

  revalidateObjekt(kid, oid)
  return { ok: true }
}

/** Portal-Einladung für bereits zugeordneten HM mit Portal-Zugang. */
export async function inviteObjektHausmeister(
  kundeId: string,
  objektId: string,
  hausmeisterId?: string | null
): Promise<
  | { ok: true; inviteUrl: string; inviteMailto: string | null }
  | { ok: false; message: string }
> {
  const kid = kundeId.trim()
  const oid = objektId.trim()
  if (!kid || !oid) return { ok: false, message: 'Kunde/Objekt fehlt.' }

  const obj = await assertObjektGehoertKunde(kid, oid)
  if (!obj.ok) return obj

  let hmId = hausmeisterId?.trim() || ''
  if (!hmId) {
    const am = await loadHausmeisterForObjekt(oid)
    if (!am || am.isLegacy) {
      return { ok: false, message: 'Kein Portal-Hausmeister am Objekt.' }
    }
    hmId = am.id
  }

  const inv = await createHausmeisterEinladung({
    orgKundeId: kid,
    orgHausmeisterId: hmId,
    objektId: oid,
    createdBy: await currentUserId(),
  })
  if (!inv.ok) return { ok: false, message: inv.error }

  const hm = (await listOrgHausmeister(kid)).find((h) => h.id === hmId)

  if (hausmeisterEmailAllowsSharedLogin(hm?.email)) {
    const act = await ensureHausmeisterPortalActivation({
      orgHausmeisterId: hmId,
      orgKundeId: kid,
    })
    if (!act.ok) return { ok: false, message: act.error }
    revalidateObjekt(kid, oid)
    return { ok: true, inviteUrl: inv.url, inviteMailto: null }
  }

  const { data: kunde } = await getSupabaseAdmin()
    .from('kunden')
    .select('name, org_anzeigename')
    .eq('id', kid)
    .maybeSingle()
  const hvName =
    String(kunde?.org_anzeigename ?? '').trim() ||
    String(kunde?.name ?? '').trim() ||
    'Hausverwaltung'

  const inviteMailto =
    hm?.email != null
      ? buildHausmeisterEinladungMailto({
          toEmail: hm.email,
          link: inv.url,
          hvName,
          objektLabel: obj.titel,
          hmName: hm.name,
        })
      : null

  revalidateObjekt(kid, oid)
  return { ok: true, inviteUrl: inv.url, inviteMailto }
}

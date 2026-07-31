'use server'

import { createClient } from '@/lib/supabase-server'

export type CrmNotificationTyp =
  | 'neue_anfrage'
  | 'handwerker_update'
  | 'auftrag_abgeschlossen'

export type CrmNotificationItem = {
  sourceKey: string
  typ: CrmNotificationTyp
  title: string
  subtitle: string | null
  href: string
  createdAt: string
  gelesen: boolean
}

export type CrmNotificationFilter = 'ungelesen' | 'gelesen'

const DAYS = 7

function sinceIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - DAYS)
  return d.toISOString()
}

function typLabel(typ: CrmNotificationTyp): string {
  if (typ === 'neue_anfrage') return 'Neue Anfrage'
  if (typ === 'handwerker_update') return 'Neues Update Handwerker'
  return 'Auftrag abgeschlossen'
}

function typIcon(typ: CrmNotificationTyp): string {
  if (typ === 'neue_anfrage') return 'inbox'
  if (typ === 'handwerker_update') return 'tool'
  return 'check'
}

function ctaLabel(typ: CrmNotificationTyp): string {
  if (typ === 'neue_anfrage') return 'Anfrage öffnen'
  if (typ === 'handwerker_update') return 'Bautagebuch öffnen'
  return 'Auftrag öffnen'
}

export { typIcon, typLabel, ctaLabel }

function pushLead(
  items: CrmNotificationItem[],
  row: { id: string; kontakt_name?: string | null; situation?: string | null; plz?: string | null; created_at: string }
) {
  const name = row.kontakt_name?.trim() || 'Anfrage'
  const meta = [row.situation?.trim(), row.plz?.trim()].filter(Boolean).join(' · ')
  items.push({
    sourceKey: `neue_anfrage:${row.id}`,
    typ: 'neue_anfrage',
    title: typLabel('neue_anfrage'),
    subtitle: meta ? `${name} · ${meta}` : name,
    href: `/anfragen/${row.id}`,
    createdAt: row.created_at,
    gelesen: false,
  })
}

async function currentUserId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Inbox der letzten 7 Tage: externe Kommunikation (Anfrage, HW-Update, Abschluss). */
export async function listCrmNotifications(
  filter: CrmNotificationFilter = 'ungelesen'
): Promise<{ ok: true; items: CrmNotificationItem[]; unreadCount: number } | { ok: false; message: string }> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, message: 'Nicht angemeldet' }

  const supabase = createClient()
  const since = sinceIso()
  const items: CrmNotificationItem[] = []

  const { data: leads, error: leadErr } = await supabase
    .from('leads')
    .select('id, kontakt_name, situation, plz, created_at')
    .is('geloescht_am', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(40)

  if (leadErr && !/geloescht_am/i.test(leadErr.message)) {
    /* soft-delete Spalte ggf. fehlend — ohne Filter retry */
    const retry = await supabase
      .from('leads')
      .select('id, kontakt_name, situation, plz, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(40)
    for (const row of retry.data ?? []) {
      pushLead(items, row)
    }
  } else if (leadErr) {
    /* ignore */
  } else {
    for (const row of leads ?? []) {
      pushLead(items, row)
    }
  }

  const { data: eintraege, error: peErr } = await supabase
    .from('position_eintraege')
    .select(
      'id, typ, beschreibung, created_at, auftrag_id, position_id, erfasst_von, auftrag_positionen(auftrag_id, leistung_name)'
    )
    .in('erfasst_von', ['partner_app', 'eigenbetrieb_app'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(40)

  if (!peErr) {
    for (const row of eintraege ?? []) {
      const pos = row.auftrag_positionen as
        | { auftrag_id?: string | null; leistung_name?: string | null }
        | { auftrag_id?: string | null; leistung_name?: string | null }[]
        | null
      const posRow = Array.isArray(pos) ? pos[0] : pos
      const auftragId =
        (row.auftrag_id as string | null)?.trim() ||
        posRow?.auftrag_id?.trim() ||
        null
      if (!auftragId) continue
      const leistung = posRow?.leistung_name?.trim()
      const desc = (row.beschreibung as string)?.trim()
      items.push({
        sourceKey: `handwerker_update:${row.id}`,
        typ: 'handwerker_update',
        title: typLabel('handwerker_update'),
        subtitle: [leistung, desc].filter(Boolean).join(' · ') || null,
        href: `/auftraege/${auftragId}?tab=bautagebuch${
          row.position_id ? `&position=${encodeURIComponent(String(row.position_id))}` : ''
        }`,
        createdAt: row.created_at as string,
        gelesen: false,
      })
    }
  }

  const { data: auftraege } = await supabase
    .from('auftraege')
    .select('id, titel, status, updated_at, abnahme_datum, kunden:kunde_id(name)')
    .eq('status', 'abgeschlossen')
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })
    .limit(40)

  for (const row of auftraege ?? []) {
    const k = row.kunden as { name?: string | null } | { name?: string | null }[] | null
    const kunde = Array.isArray(k) ? k[0] : k
    const titel = (row.titel as string)?.trim()
    const kundeName = kunde?.name?.trim()
    items.push({
      sourceKey: `auftrag_abgeschlossen:${row.id}`,
      typ: 'auftrag_abgeschlossen',
      title: typLabel('auftrag_abgeschlossen'),
      subtitle: [titel, kundeName].filter(Boolean).join(' · ') || null,
      href: `/auftraege/${row.id}`,
      createdAt: (row.updated_at as string) || since,
      gelesen: false,
    })
  }

  const { data: reads } = await supabase
    .from('crm_notification_reads')
    .select('source_key')
    .eq('user_id', userId)
    .in(
      'source_key',
      items.map((i) => i.sourceKey)
    )

  const readSet = new Set((reads ?? []).map((r) => r.source_key as string))
  for (const item of items) {
    item.gelesen = readSet.has(item.sourceKey)
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const unreadCount = items.filter((i) => !i.gelesen).length
  const filtered =
    filter === 'gelesen' ? items.filter((i) => i.gelesen) : items.filter((i) => !i.gelesen)

  return { ok: true, items: filtered, unreadCount }
}

export async function getCrmNotificationUnreadCount(): Promise<number> {
  const res = await listCrmNotifications('ungelesen')
  if (!res.ok) return 0
  return res.unreadCount
}

export async function markCrmNotificationRead(
  sourceKey: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, message: 'Nicht angemeldet' }
  const key = sourceKey.trim()
  if (!key) return { ok: false, message: 'Ungültig' }

  const supabase = createClient()
  const { error } = await supabase.from('crm_notification_reads').upsert(
    { user_id: userId, source_key: key, read_at: new Date().toISOString() },
    { onConflict: 'user_id,source_key' }
  )
  if (error) {
    if (/crm_notification_reads|does not exist/i.test(error.message)) {
      return { ok: false, message: 'Migration crm_notification_reads fehlt noch.' }
    }
    return { ok: false, message: error.message }
  }
  return { ok: true }
}

export async function markAllCrmNotificationsRead(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const res = await listCrmNotifications('ungelesen')
  if (!res.ok) return res
  const userId = await currentUserId()
  if (!userId) return { ok: false, message: 'Nicht angemeldet' }
  if (!res.items.length) return { ok: true }

  const supabase = createClient()
  const now = new Date().toISOString()
  const { error } = await supabase.from('crm_notification_reads').upsert(
    res.items.map((i) => ({
      user_id: userId,
      source_key: i.sourceKey,
      read_at: now,
    })),
    { onConflict: 'user_id,source_key' }
  )
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

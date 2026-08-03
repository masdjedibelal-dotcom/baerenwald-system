'use server'

import { createClient } from '@/lib/supabase-server'
import {
  isHwZuweisungAkzeptiertLenient,
  normalizeHwZuweisungStatus,
} from '@/lib/angebote/handwerker-annahme'

export type CrmNotificationTyp =
  | 'neue_anfrage'
  | 'handwerker_update'
  | 'handwerker_angenommen'
  | 'handwerker_abgelehnt'
  | 'handwerker_einreichung'
  | 'vorgang_angenommen'
  | 'vorgang_abgelehnt'
  | 'projektvertrag_bestaetigt'
  | 'abnahme_bestaetigt'
  | 'abnahme_freigabe_ausstehend'
  | 'auftrag_abgeschlossen'
  | 'partner_positions_meldung'
  | 'partner_weitere_arbeit'

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
  switch (typ) {
    case 'neue_anfrage':
      return 'Neue Anfrage'
    case 'handwerker_update':
      return 'Neues Update Handwerker'
    case 'handwerker_angenommen':
      return 'Handwerker hat zugesagt'
    case 'handwerker_abgelehnt':
      return 'Handwerker hat abgelehnt'
    case 'handwerker_einreichung':
      return 'Handwerker-Angebot eingereicht'
    case 'vorgang_angenommen':
      return 'Vorgang angenommen'
    case 'vorgang_abgelehnt':
      return 'Vorgang abgelehnt'
    case 'projektvertrag_bestaetigt':
      return 'Projektvertrag bestätigt'
    case 'abnahme_bestaetigt':
      return 'Abnahme bestätigt'
    case 'abnahme_freigabe_ausstehend':
      return 'Abnahme zur Freigabe'
    case 'auftrag_abgeschlossen':
      return 'Auftrag abgeschlossen'
    case 'partner_positions_meldung':
      return 'Nachtrag / neue Position gemeldet'
    case 'partner_weitere_arbeit':
      return 'Weitere Arbeit zur Prüfung'
  }
}

function typIcon(typ: CrmNotificationTyp): string {
  switch (typ) {
    case 'neue_anfrage':
      return 'inbox'
    case 'handwerker_update':
    case 'partner_positions_meldung':
    case 'partner_weitere_arbeit':
      return 'tool'
    case 'handwerker_angenommen':
    case 'vorgang_angenommen':
    case 'projektvertrag_bestaetigt':
    case 'abnahme_bestaetigt':
    case 'auftrag_abgeschlossen':
      return 'check'
    case 'abnahme_freigabe_ausstehend':
      return 'clipboard-check'
    case 'handwerker_abgelehnt':
    case 'vorgang_abgelehnt':
      return 'x'
    case 'handwerker_einreichung':
      return 'upload'
  }
}

function ctaLabel(typ: CrmNotificationTyp): string {
  switch (typ) {
    case 'neue_anfrage':
      return 'Anfrage öffnen'
    case 'handwerker_update':
      return 'Bautagebuch öffnen'
    case 'handwerker_angenommen':
    case 'handwerker_abgelehnt':
    case 'handwerker_einreichung':
      return 'Angebot öffnen'
    case 'vorgang_angenommen':
    case 'vorgang_abgelehnt':
    case 'projektvertrag_bestaetigt':
    case 'abnahme_bestaetigt':
    case 'abnahme_freigabe_ausstehend':
    case 'auftrag_abgeschlossen':
    case 'partner_positions_meldung':
    case 'partner_weitere_arbeit':
      return 'Auftrag öffnen'
  }
}

function typHint(typ: CrmNotificationTyp): string {
  switch (typ) {
    case 'neue_anfrage':
      return 'Neue Anfrage aus dem Meldeformular oder Portal. Öffne die Anfrage, um Kontakt und Details zu prüfen.'
    case 'handwerker_update':
      return 'Eintrag vom Partner im Bautagebuch. Im Auftrag siehst du den vollständigen Eintrag.'
    case 'handwerker_angenommen':
      return 'Der Partner hat die Angebots-Anfrage im Portal angenommen.'
    case 'handwerker_abgelehnt':
      return 'Der Partner hat die Angebots-Anfrage im Portal abgelehnt.'
    case 'handwerker_einreichung':
      return 'Der Partner hat ein Angebot / Konditionen im Portal eingereicht — bitte prüfen.'
    case 'vorgang_angenommen':
      return 'Der Partner hat die Leistungsanfrage im Portal angenommen.'
    case 'vorgang_abgelehnt':
      return 'Der Partner hat die Leistungsanfrage im Portal abgelehnt.'
    case 'projektvertrag_bestaetigt':
      return 'Der Partner hat den Projektvertrag im Portal bestätigt.'
    case 'abnahme_bestaetigt':
      return 'Der Partner hat das Abnahmeprotokoll im Portal bestätigt.'
    case 'abnahme_freigabe_ausstehend':
      return 'Partner-Teilabnahme wartet auf CRM-Freigabe. Freigeben oder mit Mängeln ablehnen — Versand danach optional.'
    case 'auftrag_abgeschlossen':
      return 'Der Auftrag wurde als abgeschlossen markiert.'
    case 'partner_positions_meldung':
      return 'Partner meldet Mehrbedarf. Unter Leistungen: intern zuweisen, Kunden-Nachtrag oder ablehnen.'
    case 'partner_weitere_arbeit':
      return 'Partner hat weitere Regie-Arbeit gemeldet. Unter Leistungen anerkennen oder ablehnen.'
  }
}

export { typIcon, typLabel, ctaLabel, typHint }

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null
  return Array.isArray(x) ? (x[0] as T) ?? null : x
}

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

/** Bevorzugt Auftrag (aktuelle Phase), sonst Angebot / Anfrage. */
function hrefVorgang(opts: {
  auftragId?: string | null
  angebotId?: string | null
  leadId?: string | null
  tab?: string | null
}): string {
  const tab = opts.tab?.trim()
  const q = tab ? `?tab=${encodeURIComponent(tab)}` : ''
  if (opts.auftragId?.trim()) return `/auftraege/${opts.auftragId.trim()}${q}`
  if (opts.angebotId?.trim()) return `/angebote/${opts.angebotId.trim()}${q}`
  if (opts.leadId?.trim()) return `/anfragen/${opts.leadId.trim()}`
  return '/vorgaenge'
}

async function currentUserId(): Promise<string | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

async function collectCrmNotificationItems(): Promise<CrmNotificationItem[]> {
  const supabase = createClient()
  const since = sinceIso()
  const items: CrmNotificationItem[] = []

  // ── Neue Anfrage ─────────────────────────────────────────────
  const { data: leads, error: leadErr } = await supabase
    .from('leads')
    .select('id, kontakt_name, situation, plz, created_at')
    .is('geloescht_am', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(40)

  if (leadErr && /geloescht_am/i.test(leadErr.message)) {
    const retry = await supabase
      .from('leads')
      .select('id, kontakt_name, situation, plz, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(40)
    for (const row of retry.data ?? []) pushLead(items, row)
  } else if (!leadErr) {
    for (const row of leads ?? []) pushLead(items, row)
  }

  // ── Bautagebuch (Partner-App) ────────────────────────────────
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
      const pos = one(
        row.auftrag_positionen as
          | { auftrag_id?: string | null; leistung_name?: string | null }
          | { auftrag_id?: string | null; leistung_name?: string | null }[]
          | null
      )
      const auftragId =
        (row.auftrag_id as string | null)?.trim() || pos?.auftrag_id?.trim() || null
      if (!auftragId) continue
      const leistung = pos?.leistung_name?.trim()
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

  // ── Angebot: Handwerker Zusage / Ablehnung / Einreichung ─────
  const hwSelect = `id, status, antwort_at, hw_eingereicht_at, angebot_id,
       handwerker:handwerker_id(name),
       gewerke:gewerk_id(name),
       angebote:angebot_id(id, lead_id, angebotsnr)`
  const [hwAntwortRes, hwEinreichungRes] = await Promise.all([
    supabase
      .from('angebot_handwerker')
      .select(hwSelect)
      .gte('antwort_at', since)
      .order('antwort_at', { ascending: false })
      .limit(40),
    supabase
      .from('angebot_handwerker')
      .select(hwSelect)
      .gte('hw_eingereicht_at', since)
      .order('hw_eingereicht_at', { ascending: false })
      .limit(40),
  ])

  type HwZuweisungRow = {
    id: string
    status?: string | null
    antwort_at?: string | null
    hw_eingereicht_at?: string | null
    angebot_id?: string | null
    handwerker?: { name?: string | null } | { name?: string | null }[] | null
    gewerke?: { name?: string | null } | { name?: string | null }[] | null
    angebote?:
      | { id?: string; lead_id?: string | null; angebotsnr?: string | null }
      | { id?: string; lead_id?: string | null; angebotsnr?: string | null }[]
      | null
  }
  const hwById = new Map<string, HwZuweisungRow>()
  for (const row of [...(hwAntwortRes.data ?? []), ...(hwEinreichungRes.data ?? [])] as HwZuweisungRow[]) {
    hwById.set(String(row.id), row)
  }
  const hwZuweisungen = Array.from(hwById.values())
  const hwErr = hwAntwortRes.error || hwEinreichungRes.error

  const angebotIds = new Set<string>()
  if (!hwErr) {
    for (const row of hwZuweisungen) {
      const aid = (row.angebot_id as string | null)?.trim()
      if (aid) angebotIds.add(aid)
    }
  }

  const auftragByAngebot = new Map<string, string>()
  if (angebotIds.size) {
    const { data: aufRows } = await supabase
      .from('auftraege')
      .select('id, angebot_id')
      .in('angebot_id', Array.from(angebotIds))
    for (const a of aufRows ?? []) {
      const aid = (a.angebot_id as string | null)?.trim()
      const id = (a.id as string | null)?.trim()
      if (aid && id && !auftragByAngebot.has(aid)) auftragByAngebot.set(aid, id)
    }
  }

  if (!hwErr) {
    for (const row of hwZuweisungen) {
      const angebot = one(
        row.angebote as
          | { id?: string; lead_id?: string | null; angebotsnr?: string | null }
          | { id?: string; lead_id?: string | null; angebotsnr?: string | null }[]
          | null
      )
      const hw = one(row.handwerker as { name?: string | null } | { name?: string | null }[] | null)
      const gewerk = one(row.gewerke as { name?: string | null } | { name?: string | null }[] | null)
      const angebotId = (row.angebot_id as string | null)?.trim() || angebot?.id?.trim() || null
      const leadId = angebot?.lead_id?.trim() || null
      const auftragId = angebotId ? auftragByAngebot.get(angebotId) ?? null : null
      const href = hrefVorgang({
        auftragId,
        angebotId,
        leadId,
        tab: auftragId ? 'leistungen' : null,
      })
      const sub = [hw?.name?.trim(), gewerk?.name?.trim(), angebot?.angebotsnr?.trim()]
        .filter(Boolean)
        .join(' · ')

      const antwortAt = (row.antwort_at as string | null)?.trim()
      const st = normalizeHwZuweisungStatus(row.status as string)
      if (antwortAt && antwortAt >= since) {
        if (isHwZuweisungAkzeptiertLenient(st)) {
          items.push({
            sourceKey: `handwerker_angenommen:${row.id}`,
            typ: 'handwerker_angenommen',
            title: typLabel('handwerker_angenommen'),
            subtitle: sub || null,
            href,
            createdAt: antwortAt,
            gelesen: false,
          })
        } else if (st === 'abgelehnt') {
          items.push({
            sourceKey: `handwerker_abgelehnt:${row.id}`,
            typ: 'handwerker_abgelehnt',
            title: typLabel('handwerker_abgelehnt'),
            subtitle: sub || null,
            href,
            createdAt: antwortAt,
            gelesen: false,
          })
        }
      }

      const eingereichtAt = (row.hw_eingereicht_at as string | null)?.trim()
      if (eingereichtAt && eingereichtAt >= since) {
        items.push({
          sourceKey: `handwerker_einreichung:${row.id}`,
          typ: 'handwerker_einreichung',
          title: typLabel('handwerker_einreichung'),
          subtitle: sub || null,
          href: hrefVorgang({ angebotId, leadId, auftragId: null }),
          createdAt: eingereichtAt,
          gelesen: false,
        })
      }
    }
  }

  // ── Auftrag: Partner nimmt Leistung an / lehnt ab ────────────
  // Zeitstempel: handwerker_angefragt_at (Portal-Antwort setzt Status, kein updated_at)
  const { data: posHw, error: posErr } = await supabase
    .from('auftrag_positionen')
    .select(
      'id, auftrag_id, leistung_name, handwerker_status, handwerker_angefragt_at, handwerker:handwerker_id(name)'
    )
    .in('handwerker_status', ['akzeptiert', 'abgelehnt', 'angenommen'])
    .gte('handwerker_angefragt_at', since)
    .order('handwerker_angefragt_at', { ascending: false })
    .limit(40)

  if (!posErr) {
    for (const row of posHw ?? []) {
      const auftragId = (row.auftrag_id as string | null)?.trim()
      if (!auftragId) continue
      const st = normalizeHwZuweisungStatus(row.handwerker_status as string)
      const typ: CrmNotificationTyp =
        st === 'abgelehnt' ? 'vorgang_abgelehnt' : 'vorgang_angenommen'
      const hw = one(row.handwerker as { name?: string | null } | { name?: string | null }[] | null)
      const leistung = (row.leistung_name as string)?.trim()
      const at =
        (row.handwerker_angefragt_at as string | null)?.trim() || since
      items.push({
        sourceKey: `${typ}:${row.id}`,
        typ,
        title: typLabel(typ),
        subtitle: [hw?.name?.trim(), leistung].filter(Boolean).join(' · ') || null,
        href: `/auftraege/${auftragId}?tab=leistungen`,
        createdAt: at,
        gelesen: false,
      })
    }
  }

  // ── Projektvertrag im Portal bestätigt ───────────────────────
  const { data: pvRows } = await supabase
    .from('auftrag_handwerker')
    .select(
      'id, auftrag_id, projektvertrag_bestaetigt_am, handwerker:handwerker_id(name), gewerke:gewerk_id(name)'
    )
    .gte('projektvertrag_bestaetigt_am', since)
    .order('projektvertrag_bestaetigt_am', { ascending: false })
    .limit(40)

  for (const row of pvRows ?? []) {
    const auftragId = (row.auftrag_id as string | null)?.trim()
    const at = (row.projektvertrag_bestaetigt_am as string | null)?.trim()
    if (!auftragId || !at) continue
    const hw = one(row.handwerker as { name?: string | null } | { name?: string | null }[] | null)
    const gewerk = one(row.gewerke as { name?: string | null } | { name?: string | null }[] | null)
    items.push({
      sourceKey: `projektvertrag_bestaetigt:${row.id}`,
      typ: 'projektvertrag_bestaetigt',
      title: typLabel('projektvertrag_bestaetigt'),
      subtitle: [hw?.name?.trim(), gewerk?.name?.trim()].filter(Boolean).join(' · ') || null,
      href: `/auftraege/${auftragId}?tab=leistungen`,
      createdAt: at,
      gelesen: false,
    })
  }

  // ── Abnahmeprotokoll im Portal bestätigt ─────────────────────
  const { data: abnahmeTl } = await supabase
    .from('auftrag_timeline')
    .select('id, auftrag_id, titel, beschreibung, created_at')
    .ilike('titel', '%Abnahmeprotokoll bestätigt%')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(40)

  for (const row of abnahmeTl ?? []) {
    const auftragId = (row.auftrag_id as string | null)?.trim()
    if (!auftragId) continue
    items.push({
      sourceKey: `abnahme_bestaetigt:${row.id}`,
      typ: 'abnahme_bestaetigt',
      title: typLabel('abnahme_bestaetigt'),
      subtitle: (row.beschreibung as string)?.trim() || null,
      href: `/auftraege/${auftragId}?tab=abnahme`,
      createdAt: row.created_at as string,
      gelesen: false,
    })
  }

  // ── Teilabnahme zur Freigabe (pro HW-Protokoll) ───────────────
  const { data: freigabeRows } = await supabase
    .from('auftrag_abnahmeprotokolle')
    .select(
      'id, auftrag_id, updated_at, created_at, handwerker:handwerker_id(name), auftraege:auftrag_id(titel)'
    )
    .eq('freigabe_status', 'zur_freigabe')
    .eq('ebene', 'handwerker')
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })
    .limit(40)

  for (const row of freigabeRows ?? []) {
    const auftragId = (row.auftrag_id as string | null)?.trim()
    if (!auftragId) continue
    const hw = one(row.handwerker as { name?: string | null } | { name?: string | null }[] | null)
    const auf = one(row.auftraege as { titel?: string | null } | { titel?: string | null }[] | null)
    items.push({
      sourceKey: `abnahme_freigabe_ausstehend:${row.id}`,
      typ: 'abnahme_freigabe_ausstehend',
      title: typLabel('abnahme_freigabe_ausstehend'),
      subtitle:
        [hw?.name?.trim(), auf?.titel?.trim()].filter(Boolean).join(' · ') || 'Teilabnahme prüfen',
      href: `/auftraege/${auftragId}?tab=abnahme`,
      createdAt: (row.updated_at as string) || (row.created_at as string) || since,
      gelesen: false,
    })
  }

  // ── Auftrag abgeschlossen ────────────────────────────────────
  const { data: auftraege } = await supabase
    .from('auftraege')
    .select('id, titel, status, updated_at, abnahme_datum, kunden:kunde_id(name)')
    .eq('status', 'abgeschlossen')
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })
    .limit(40)

  for (const row of auftraege ?? []) {
    const kunde = one(row.kunden as { name?: string | null } | { name?: string | null }[] | null)
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

  // ── Partner: Nachtrag / neue Position gemeldet ───────────────
  const { data: posMeldungen, error: posMelErr } = await supabase
    .from('partner_positions_anfragen')
    .select(
      'id, auftrag_id, titel, created_at, handwerker:handwerker_id(name), auftraege:auftrag_id(titel, projekt_name)'
    )
    .eq('status', 'offen')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(40)

  if (!posMelErr) {
    for (const row of posMeldungen ?? []) {
      const auftragId = (row.auftrag_id as string | null)?.trim()
      if (!auftragId) continue
      const hw = one(row.handwerker as { name?: string | null } | { name?: string | null }[] | null)
      const auf = one(
        row.auftraege as
          | { titel?: string | null; projekt_name?: string | null }
          | { titel?: string | null; projekt_name?: string | null }[]
          | null
      )
      const projekt = auf?.titel?.trim() || auf?.projekt_name?.trim() || null
      items.push({
        sourceKey: `partner_positions_meldung:${row.id}`,
        typ: 'partner_positions_meldung',
        title: typLabel('partner_positions_meldung'),
        subtitle:
          [hw?.name?.trim(), (row.titel as string)?.trim(), projekt]
            .filter(Boolean)
            .join(' · ') || null,
        href: `/auftraege/${auftragId}?tab=leistungen`,
        createdAt: row.created_at as string,
        gelesen: false,
      })
    }
  }

  // ── Partner: Weitere Arbeit (Regie) in Prüfung ───────────────
  const { data: weitereArbeit, error: waErr } = await supabase
    .from('auftrag_positionen')
    .select(
      'id, auftrag_id, leistung_name, created_at, handwerker:handwerker_id(name)'
    )
    .eq('anerkennung_status', 'in_pruefung')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(40)

  if (!waErr) {
    for (const row of weitereArbeit ?? []) {
      const auftragId = (row.auftrag_id as string | null)?.trim()
      if (!auftragId) continue
      const hw = one(row.handwerker as { name?: string | null } | { name?: string | null }[] | null)
      items.push({
        sourceKey: `partner_weitere_arbeit:${row.id}`,
        typ: 'partner_weitere_arbeit',
        title: typLabel('partner_weitere_arbeit'),
        subtitle:
          [hw?.name?.trim(), (row.leistung_name as string)?.trim()]
            .filter(Boolean)
            .join(' · ') || null,
        href: `/auftraege/${auftragId}?tab=leistungen`,
        createdAt: (row.created_at as string) || since,
        gelesen: false,
      })
    }
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return items
}

/** Inbox der letzten 7 Tage: Anfragen + Portal-Aktionen + Abschluss. */
export async function listCrmNotifications(
  filter: CrmNotificationFilter = 'ungelesen'
): Promise<{ ok: true; items: CrmNotificationItem[]; unreadCount: number } | { ok: false; message: string }> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, message: 'Nicht angemeldet' }

  const items = await collectCrmNotificationItems()
  const supabase = createClient()

  const keys = items.map((i) => i.sourceKey)
  const { data: reads } =
    keys.length > 0
      ? await supabase
          .from('crm_notification_reads')
          .select('source_key')
          .eq('user_id', userId)
          .in('source_key', keys)
      : { data: [] as { source_key: string }[] }

  const readSet = new Set((reads ?? []).map((r) => r.source_key as string))
  for (const item of items) {
    item.gelesen = readSet.has(item.sourceKey)
  }

  const unreadCount = items.filter((i) => !i.gelesen).length
  const filtered =
    filter === 'gelesen' ? items.filter((i) => i.gelesen) : items.filter((i) => !i.gelesen)

  return { ok: true, items: filtered, unreadCount }
}

export async function getCrmNotificationUnreadCount(): Promise<number> {
  const userId = await currentUserId()
  if (!userId) return 0

  const items = await collectCrmNotificationItems()
  if (!items.length) return 0

  const supabase = createClient()
  const keys = items.map((i) => i.sourceKey)
  const { data: reads } = await supabase
    .from('crm_notification_reads')
    .select('source_key')
    .eq('user_id', userId)
    .in('source_key', keys)

  const readSet = new Set((reads ?? []).map((r) => String(r.source_key)))
  return keys.filter((k) => !readSet.has(k)).length
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

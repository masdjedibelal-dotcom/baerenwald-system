import 'server-only'

import { getEntity } from '@/lib/copilot/crm-actions'
import { readCrmDocument } from '@/lib/copilot/read-document'
import { listTodosCopilot } from '@/lib/copilot/todo-copilot'
import { supabaseAdmin } from '@/lib/supabase-admin'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type RouteEntity = {
  typ: 'lead' | 'kunde' | 'angebot' | 'auftrag' | 'rechnung' | 'handwerker'
  id: string
}

function parseRouteEntity(pathname: string): RouteEntity | null {
  const path = (pathname || '/').split('?')[0] || '/'
  const parts = path.split('/').filter(Boolean)
  const section = parts[0] ?? ''
  const id = parts[1] && UUID_RE.test(parts[1]) ? parts[1] : null
  if (!id) return null
  const map: Record<string, RouteEntity['typ']> = {
    anfragen: 'lead',
    kunden: 'kunde',
    angebote: 'angebot',
    auftraege: 'auftrag',
    rechnungen: 'rechnung',
    handwerker: 'handwerker',
  }
  const typ = map[section]
  if (!typ) return null
  return { typ, id }
}

function truncateJson(value: unknown, max = 6000): string {
  const s = JSON.stringify(value, null, 0)
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}

/** Reicher Snapshot der Entity auf der aktuellen Seite (für Assistent-Kontext). */
export async function buildEntityPageSnapshot(pathname: string): Promise<string | null> {
  const ent = parseRouteEntity(pathname)
  if (!ent) return null

  try {
    if (ent.typ === 'auftrag') {
      const { data, error } = await supabaseAdmin
        .from('auftraege')
        .select(
          `
          id, titel, status, fortschritt, created_at, start_datum, end_datum,
          kunde_id, lead_id, angebot_id, abnahme_protokoll_url,
          kunden(name, email, telefon),
          auftrag_positionen(id, leistung_name, beschreibung, menge, einheit, preis_kunde, gewerk_name, gewerk_slug, handwerker_id, leistung_status, sort_order),
          auftrag_handwerker(id, status, gewerk_id, handwerker_id, handwerker(name, firma), gewerke(name))
        `
        )
        .eq('id', ent.id)
        .maybeSingle()
      if (error || !data) return null
      const todos = await listTodosCopilot({ auftrag_id: ent.id, limit: 10 })
      return [
        `ENTITY-SNAPSHOT · Auftrag ${ent.id}`,
        truncateJson({
          auftrag: data,
          todos: 'todos' in todos ? todos.todos : todos,
        }),
      ].join('\n')
    }

    if (ent.typ === 'angebot') {
      const doc = await readCrmDocument({ typ: 'angebot', id: ent.id, include_pdf_text: false })
      return [`ENTITY-SNAPSHOT · Angebot ${ent.id}`, truncateJson(doc)].join('\n')
    }

    if (ent.typ === 'rechnung') {
      const doc = await readCrmDocument({ typ: 'rechnung', id: ent.id, include_pdf_text: false })
      return [`ENTITY-SNAPSHOT · Rechnung ${ent.id}`, truncateJson(doc)].join('\n')
    }

    if (ent.typ === 'lead') {
      const entity = await getEntity('lead', ent.id)
      const todos = await listTodosCopilot({ lead_id: ent.id, limit: 8 })
      return [
        `ENTITY-SNAPSHOT · Anfrage ${ent.id}`,
        truncateJson({ lead: entity, todos: 'todos' in todos ? todos.todos : todos }),
      ].join('\n')
    }

    if (ent.typ === 'kunde') {
      const entity = await getEntity('kunde', ent.id)
      const todos = await listTodosCopilot({ kunde_id: ent.id, limit: 8 })
      return [
        `ENTITY-SNAPSHOT · Kunde ${ent.id}`,
        truncateJson({ kunde: entity, todos: 'todos' in todos ? todos.todos : todos }),
      ].join('\n')
    }

    if (ent.typ === 'handwerker') {
      const { data } = await supabaseAdmin
        .from('handwerker')
        .select('id, name, firma, email, telefon, status, gewerke')
        .eq('id', ent.id)
        .maybeSingle()
      if (!data) return null
      return [`ENTITY-SNAPSHOT · Handwerker ${ent.id}`, truncateJson(data)].join('\n')
    }
  } catch (e) {
    console.error('buildEntityPageSnapshot', e)
    return null
  }

  return null
}

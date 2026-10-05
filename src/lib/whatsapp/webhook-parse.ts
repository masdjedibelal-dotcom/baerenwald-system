/**
 * Webhook von 360dialog (Format der WhatsApp Cloud API) → einheitliche Ereignisse.
 * Ohne Datenbank, damit es sich einzeln testen lässt.
 */

export type WaEingangMedium = { mediaId: string; mime: string | null; name: string | null }

export type WaEingang = {
  typ: 'nachricht'
  waId: string
  von: string
  profilName: string | null
  zeit: string
  art: 'text' | 'bild' | 'dokument' | 'audio' | 'video' | 'antwort' | 'standort'
  text: string | null
  medium: WaEingangMedium | null
  /** Gedrückter Knopf (interaktiv oder Vorlage) */
  knopfId: string | null
  /** WhatsApp-ID der Nachricht, auf die geantwortet wurde */
  antwortAufWaId: string | null
}

export type WaStatus = {
  typ: 'status'
  waId: string
  status: 'gesendet' | 'zugestellt' | 'gelesen' | 'fehler'
  fehler: string | null
}

type Roh = Record<string, unknown>

const STATUS: Record<string, WaStatus['status']> = {
  sent: 'gesendet',
  delivered: 'zugestellt',
  read: 'gelesen',
  failed: 'fehler',
}

function str(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : ''
  return s || null
}

function zeitAus(ts: unknown): string {
  const n = Number(ts)
  return Number.isFinite(n) && n > 0 ? new Date(n * 1000).toISOString() : new Date().toISOString()
}

function nachricht(m: Roh, namen: Map<string, string>): WaEingang | null {
  const waId = str(m.id)
  const von = str(m.from)
  if (!waId || !von) return null
  const basis = {
    typ: 'nachricht' as const,
    waId,
    von,
    profilName: namen.get(von) ?? null,
    zeit: zeitAus(m.timestamp),
    antwortAufWaId: str((m.context as Roh | undefined)?.id),
    knopfId: null as string | null,
    medium: null as WaEingangMedium | null,
    text: null as string | null,
  }
  const medium = (o: unknown): WaEingangMedium | null => {
    const r = (o ?? {}) as Roh
    const id = str(r.id)
    return id ? { mediaId: id, mime: str(r.mime_type), name: str(r.filename) } : null
  }
  switch (m.type) {
    case 'text':
      return { ...basis, art: 'text', text: str((m.text as Roh | undefined)?.body) }
    case 'image':
      return { ...basis, art: 'bild', text: str((m.image as Roh | undefined)?.caption), medium: medium(m.image) }
    case 'document':
      return {
        ...basis,
        art: 'dokument',
        text: str((m.document as Roh | undefined)?.caption),
        medium: medium(m.document),
      }
    case 'audio':
      return { ...basis, art: 'audio', medium: medium(m.audio) }
    case 'video':
      return { ...basis, art: 'video', text: str((m.video as Roh | undefined)?.caption), medium: medium(m.video) }
    case 'location': {
      const l = (m.location ?? {}) as Roh
      const text = [str(l.name), str(l.address), `${l.latitude ?? ''}, ${l.longitude ?? ''}`]
        .filter(Boolean)
        .join(' · ')
      return { ...basis, art: 'standort', text }
    }
    case 'button': {
      // Schnellantwort aus einer Vorlage
      const b = (m.button ?? {}) as Roh
      return { ...basis, art: 'antwort', text: str(b.text), knopfId: str(b.payload) }
    }
    case 'interactive': {
      const i = (m.interactive ?? {}) as Roh
      const r = ((i.button_reply ?? i.list_reply) ?? {}) as Roh
      return { ...basis, art: 'antwort', text: str(r.title), knopfId: str(r.id) }
    }
    default:
      return { ...basis, art: 'text', text: `[Nicht unterstützter Nachrichtentyp: ${String(m.type ?? '?')}]` }
  }
}

export function parseWhatsAppWebhook(payload: unknown): (WaEingang | WaStatus)[] {
  const out: (WaEingang | WaStatus)[] = []
  const entries = Array.isArray((payload as Roh | null)?.entry) ? ((payload as Roh).entry as Roh[]) : []
  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? (entry.changes as Roh[]) : []
    for (const change of changes) {
      const value = (change.value ?? {}) as Roh
      const namen = new Map<string, string>()
      for (const c of (Array.isArray(value.contacts) ? value.contacts : []) as Roh[]) {
        const id = str(c.wa_id)
        const name = str((c.profile as Roh | undefined)?.name)
        if (id && name) namen.set(id, name)
      }
      for (const m of (Array.isArray(value.messages) ? value.messages : []) as Roh[]) {
        const n = nachricht(m, namen)
        if (n) out.push(n)
      }
      for (const s of (Array.isArray(value.statuses) ? value.statuses : []) as Roh[]) {
        const waId = str(s.id)
        const status = STATUS[String(s.status)]
        if (!waId || !status) continue
        const err = (Array.isArray(s.errors) ? s.errors[0] : null) as Roh | null
        out.push({ typ: 'status', waId, status, fehler: err ? str(err.message) ?? str(err.title) : null })
      }
    }
  }
  return out
}

/** Testmodus: eingehende Nachricht im selben Format bauen, wie 360dialog sie schickt. */
export function mockWebhookPayload(input: {
  von: string
  name?: string | null
  text?: string | null
  knopf?: { id: string; titel: string } | null
  /** Foto/Dokument (Testmodus: Datei liegt unter /mock/whatsapp) */
  medium?: { art: 'bild' | 'dokument' | 'audio' | 'video'; name: string; mime: string } | null
  antwortAufWaId?: string | null
}): Record<string, unknown> {
  const id = `mock-in-${crypto.randomUUID()}`
  const message: Roh = {
    from: input.von,
    id,
    timestamp: String(Math.floor(Date.now() / 1000)),
    ...(input.antwortAufWaId ? { context: { from: 'bw', id: input.antwortAufWaId } } : {}),
    ...(input.knopf
      ? { type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: input.knopf.id, title: input.knopf.titel } } }
      : input.medium?.art === 'bild'
        ? { type: 'image', image: { id: `mock-media-${id}`, mime_type: input.medium.mime, caption: input.text ?? undefined } }
        : input.medium?.art === 'audio'
          ? { type: 'audio', audio: { id: `mock-media-${id}`, mime_type: input.medium.mime, voice: true } }
          : input.medium?.art === 'video'
            ? { type: 'video', video: { id: `mock-media-${id}`, mime_type: input.medium.mime, caption: input.text ?? undefined } }
            : input.medium
          ? {
              type: 'document',
              document: { id: `mock-media-${id}`, mime_type: input.medium.mime, filename: input.medium.name, caption: input.text ?? undefined },
            }
          : { type: 'text', text: { body: input.text ?? '' } }),
  }
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'mock',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              contacts: [{ wa_id: input.von, profile: { name: input.name ?? '' } }],
              messages: [message],
            },
          },
        ],
      },
    ],
  }
}

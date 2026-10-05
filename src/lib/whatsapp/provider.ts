import 'server-only'

import { whatsappKonfig } from '@/lib/whatsapp/konfig'
import { VORLAGEN, vorlageText, type VorlagenName } from '@/lib/whatsapp/vorlagen'

/**
 * Eine Schnittstelle, zwei Umsetzungen:
 * - „mock“: Testmodus — nichts verlässt das CRM, jede Nachricht gilt sofort als zugestellt.
 * - „360dialog“: WhatsApp Cloud API über 360dialog (https://docs.360dialog.com).
 * Alles im CRM spricht nur diese Schnittstelle an; Umschalten = Umgebungsvariablen setzen.
 */

export type WaSendErgebnis = { ok: true; waId: string } | { ok: false; fehler: string }
export type WaKnopf = { id: string; titel: string }
export type WaMedienArt = 'bild' | 'dokument' | 'audio' | 'video'
/** url muss für WhatsApp öffentlich abrufbar sein (befristeter Storage-Link reicht). */
export type WaMediumSenden = { url: string; art: WaMedienArt; name?: string | null; caption?: string | null }

export interface WhatsAppProvider {
  modus: 'mock' | '360dialog'
  sendeText(an: string, text: string, opts?: { antwortAufWaId?: string | null }): Promise<WaSendErgebnis>
  /** Bis zu 3 Antwort-Knöpfe — nur innerhalb des 24-Stunden-Fensters erlaubt. */
  sendeKnoepfe(an: string, text: string, knoepfe: WaKnopf[]): Promise<WaSendErgebnis>
  /** Freigegebene Vorlage; knopfIds = Antwort-IDs der Schnellantwort-Knöpfe in Reihenfolge. */
  sendeVorlage(an: string, name: VorlagenName, werte: string[], knopfIds?: string[]): Promise<WaSendErgebnis>
  sendeMedium(an: string, medium: WaMediumSenden): Promise<WaSendErgebnis>
  /** Eingehendes Medium laden (Media-ID aus dem Webhook). */
  ladeMedium(mediaId: string): Promise<{ ok: true; buffer: Buffer; mime: string } | { ok: false; fehler: string }>
  /** Blaue Haken beim Absender. */
  alsGelesen(waId: string): Promise<void>
}

/* ── Testmodus ─────────────────────────────────────────────────────────────── */

const mockProvider: WhatsAppProvider = {
  modus: 'mock',
  async sendeText() {
    return { ok: true, waId: `mock-${crypto.randomUUID()}` }
  },
  async sendeKnoepfe() {
    return { ok: true, waId: `mock-${crypto.randomUUID()}` }
  },
  async sendeVorlage() {
    return { ok: true, waId: `mock-${crypto.randomUUID()}` }
  },
  async sendeMedium() {
    return { ok: true, waId: `mock-${crypto.randomUUID()}` }
  },
  async ladeMedium() {
    return { ok: false, fehler: 'Im Testmodus gibt es keine Medien von WhatsApp.' }
  },
  async alsGelesen() {},
}

/* ── 360dialog (WhatsApp Cloud API) ────────────────────────────────────────── */

const D360_BASIS = 'https://waba-v2.360dialog.io'

function dialog360(apiKey: string): WhatsAppProvider {
  async function post(body: Record<string, unknown>): Promise<WaSendErgebnis> {
    try {
      const res = await fetch(`${D360_BASIS}/messages`, {
        method: 'POST',
        headers: { 'D360-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', ...body }),
        cache: 'no-store',
      })
      const json = (await res.json().catch(() => ({}))) as {
        messages?: { id?: string }[]
        error?: { message?: string; code?: number }
      }
      const waId = json.messages?.[0]?.id
      if (!res.ok || !waId) {
        return { ok: false, fehler: json.error?.message || `WhatsApp-Versand fehlgeschlagen (${res.status})` }
      }
      return { ok: true, waId }
    } catch (e) {
      return { ok: false, fehler: e instanceof Error ? e.message : 'WhatsApp nicht erreichbar' }
    }
  }

  return {
    modus: '360dialog',
    sendeText(an, text, opts) {
      return post({
        to: an,
        type: 'text',
        text: { body: text, preview_url: true },
        ...(opts?.antwortAufWaId ? { context: { message_id: opts.antwortAufWaId } } : {}),
      })
    },
    sendeKnoepfe(an, text, knoepfe) {
      return post({
        to: an,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: text.slice(0, 1024) },
          action: {
            buttons: knoepfe.slice(0, 3).map((k) => ({ type: 'reply', reply: { id: k.id, title: k.titel.slice(0, 20) } })),
          },
        },
      })
    },
    sendeVorlage(an, name, werte, knopfIds) {
      const components: Record<string, unknown>[] = [
        { type: 'body', parameters: werte.map((w) => ({ type: 'text', text: w || '—' })) },
      ]
      ;(knopfIds ?? []).forEach((payload, index) => {
        components.push({
          type: 'button',
          sub_type: 'quick_reply',
          index: String(index),
          parameters: [{ type: 'payload', payload }],
        })
      })
      return post({ to: an, type: 'template', template: { name, language: { code: 'de' }, components } })
    },
    sendeMedium(an, m) {
      const caption = m.caption ?? undefined
      if (m.art === 'bild') return post({ to: an, type: 'image', image: { link: m.url, caption } })
      if (m.art === 'video') return post({ to: an, type: 'video', video: { link: m.url, caption } })
      // Sprachnachricht/Audio: WhatsApp erlaubt keine Bildunterschrift
      if (m.art === 'audio') return post({ to: an, type: 'audio', audio: { link: m.url } })
      return post({ to: an, type: 'document', document: { link: m.url, filename: m.name ?? 'Dokument.pdf', caption } })
    },
    async ladeMedium(mediaId) {
      try {
        const meta = await fetch(`${D360_BASIS}/${encodeURIComponent(mediaId)}`, {
          headers: { 'D360-API-KEY': apiKey },
          cache: 'no-store',
        })
        const info = (await meta.json().catch(() => ({}))) as { url?: string; mime_type?: string }
        if (!meta.ok || !info.url) return { ok: false, fehler: 'Medium nicht gefunden.' }
        // 360dialog: Meta-Download-URL über den eigenen Host abrufen
        const url = info.url.replace('https://lookaside.fbsbx.com', D360_BASIS)
        const res = await fetch(url, { headers: { 'D360-API-KEY': apiKey }, cache: 'no-store' })
        if (!res.ok) return { ok: false, fehler: 'Medium konnte nicht geladen werden.' }
        return {
          ok: true,
          buffer: Buffer.from(await res.arrayBuffer()),
          mime: info.mime_type || res.headers.get('content-type') || 'application/octet-stream',
        }
      } catch (e) {
        return { ok: false, fehler: e instanceof Error ? e.message : 'Medium konnte nicht geladen werden.' }
      }
    },
    async alsGelesen(waId) {
      await fetch(`${D360_BASIS}/messages`, {
        method: 'POST',
        headers: { 'D360-API-KEY': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: waId }),
        cache: 'no-store',
      }).catch(() => undefined)
    },
  }
}

export function whatsappProvider(): WhatsAppProvider {
  const k = whatsappKonfig()
  return k.modus === '360dialog' && k.apiKey ? dialog360(k.apiKey) : mockProvider
}

/** Text, den der Empfänger bei einer Vorlage sieht (fürs Speichern im Verlauf). */
export function vorlageAnzeige(name: VorlagenName, werte: string[]): { text: string; knoepfe: string[] } {
  return { text: vorlageText(name, werte), knoepfe: VORLAGEN[name].knoepfe ?? [] }
}

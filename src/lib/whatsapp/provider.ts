import 'server-only';

import { whatsappKonfig } from '@/lib/whatsapp/konfig';
import { VORLAGEN,vorlageText,type VorlagenName } from '@/lib/whatsapp/vorlagen';

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
export type WaMediumSenden = { url: string; art: WaMedienArt; name?: string | null; caption?: string | null; mime?: string | null }

export interface WhatsAppProvider {
  modus: 'mock' | '360dialog'
  /** Freie Antwort-Knöpfe ohne Vorlage (nur im 24-Stunden-Fenster) */
  freieKnoepfe: boolean
  sendeText(an: string, text: string): Promise<WaSendErgebnis>
  /** Antwort-Knöpfe — nur wo freieKnoepfe gilt. */
  sendeKnoepfe(an: string, text: string, knoepfe: WaKnopf[]): Promise<WaSendErgebnis>
  /** Freigegebene Vorlage mit Werten {{1}}, {{2}} …; knopfIds = Antwort-IDs der Schnellantwort-Knöpfe */
  sendeVorlage(an: string, name: VorlagenName, werte: string[], knopfIds?: string[]): Promise<WaSendErgebnis>
  sendeMedium(an: string, medium: WaMediumSenden): Promise<WaSendErgebnis>
  /** Eingehendes Medium laden (Media-ID aus dem Webhook). */
  ladeMedium(mediaId: string): Promise<{ ok: true; buffer: Buffer; mime: string } | { ok: false; fehler: string }>
}

/* ── Testmodus ─────────────────────────────────────────────────────────────── */

const mockId = () => ({ ok: true as const, waId: `mock-${crypto.randomUUID()}` })

const mockProvider: WhatsAppProvider = {
  modus: 'mock',
  freieKnoepfe: true,
  async sendeText() {
    return mockId()
  },
  async sendeKnoepfe() {
    return mockId()
  },
  async sendeVorlage() {
    return mockId()
  },
  async sendeMedium() {
    return mockId()
  },
  async ladeMedium() {
    return { ok: false, fehler: 'Im Testmodus gibt es keine Medien von WhatsApp.' }
  },
}

/* ── 360dialog (WhatsApp Cloud API) ────────────────────────────────────────── */

const D360_BASIS = 'https://waba-v2.360dialog.io'

/** WhatsApp/Meta: Vorlagen-Werte ohne Zeilenumbrüche, Tabs und lange Leerzeichen-Folgen. */
function vorlagenWert(w: string): string {
  return (w || '—').replace(/\s+/g, ' ').trim().slice(0, 900) || '—'
}

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
        error?: { message?: string; code?: number; error_data?: { details?: string } }
      }
      const waId = json.messages?.[0]?.id
      if (!res.ok || !waId) {
        const e = json.error
        const text = e?.error_data?.details || e?.message
        return { ok: false, fehler: text ? `${text}${e?.code ? ` (${e.code})` : ''}` : `WhatsApp-Versand fehlgeschlagen (${res.status})` }
      }
      return { ok: true, waId }
    } catch (e) {
      return { ok: false, fehler: e instanceof Error ? e.message : 'WhatsApp nicht erreichbar' }
    }
  }

  async function medienHochladen(m: WaMediumSenden): Promise<{ ok: true; id: string } | { ok: false; fehler: string }> {
    try {
      const datei = await fetch(m.url, { cache: 'no-store' })
      if (!datei.ok) return { ok: false, fehler: `Datei nicht abrufbar (${datei.status}).` }
      const mime = (m.mime || datei.headers.get('content-type') || 'application/octet-stream').split(';')[0]!.trim()
      const form = new FormData()
      form.append('messaging_product', 'whatsapp')
      form.append('file', new Blob([await datei.arrayBuffer()], { type: mime }), m.name || 'datei')
      const res = await fetch(`${D360_BASIS}/media`, {
        method: 'POST',
        headers: { 'D360-API-KEY': apiKey },
        body: form,
        cache: 'no-store',
      })
      const json = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string; code?: number } }
      if (!res.ok || !json.id) {
        return { ok: false, fehler: json.error?.message ? `${json.error.message}${json.error.code ? ` (${json.error.code})` : ''}` : `Hochladen fehlgeschlagen (${res.status})` }
      }
      return { ok: true, id: json.id }
    } catch (e) {
      return { ok: false, fehler: e instanceof Error ? e.message : 'Datei konnte nicht hochgeladen werden.' }
    }
  }

  return {
    modus: '360dialog',
    freieKnoepfe: true,
    sendeText(an, text) {
      return post({ to: an, type: 'text', text: { body: text.slice(0, 4096), preview_url: true } })
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
        { type: 'body', parameters: werte.map((w) => ({ type: 'text', text: vorlagenWert(w) })) },
      ]
      ;(knopfIds ?? []).forEach((payload, index) => {
        components.push({ type: 'button', sub_type: 'quick_reply', index: String(index), parameters: [{ type: 'payload', payload }] })
      })
      return post({ to: an, type: 'template', template: { name, language: { code: 'de' }, components } })
    },
    async sendeMedium(an, m) {
      // Erst selbst bei 360dialog hochladen, dann per ID senden — Meta muss keinen Link abrufen
      // (Link-Abruf scheitert oft mit „Media upload error“).
      const hoch = await medienHochladen(m)
      if (!hoch.ok) return hoch
      const ref = { id: hoch.id }
      const caption = m.caption || undefined
      if (m.art === 'bild') return post({ to: an, type: 'image', image: { ...ref, caption } })
      if (m.art === 'video') return post({ to: an, type: 'video', video: { ...ref, caption } })
      // Sprachnachricht/Audio: WhatsApp erlaubt keine Bildunterschrift
      if (m.art === 'audio') return post({ to: an, type: 'audio', audio: ref })
      return post({ to: an, type: 'document', document: { ...ref, filename: m.name ?? 'Dokument.pdf', caption } })
    },
    async ladeMedium(mediaId) {
      try {
        const meta = await fetch(`${D360_BASIS}/${encodeURIComponent(mediaId)}`, {
          headers: { 'D360-API-KEY': apiKey },
          cache: 'no-store',
        })
        const info = (await meta.json().catch(() => ({}))) as { url?: string; mime_type?: string }
        if (!meta.ok || !info.url) return { ok: false, fehler: `Medium nicht gefunden (${meta.status}).` }
        // 360dialog: Meta-Download-URL über den eigenen Host abrufen
        const url = info.url.replace('https://lookaside.fbsbx.com', D360_BASIS)
        const res = await fetch(url, { headers: { 'D360-API-KEY': apiKey }, cache: 'no-store' })
        if (!res.ok) return { ok: false, fehler: `Medium konnte nicht geladen werden (${res.status}).` }
        return {
          ok: true,
          buffer: Buffer.from(await res.arrayBuffer()),
          mime: info.mime_type?.split(';')[0] || res.headers.get('content-type')?.split(';')[0] || 'application/octet-stream',
        }
      } catch (e) {
        return { ok: false, fehler: e instanceof Error ? e.message : 'Medium konnte nicht geladen werden.' }
      }
    },
  }
}

/** Webhook bei 360dialog eintragen (einmalig nach der Einrichtung, aus Einstellungen → WhatsApp). */
export async function webhookBei360dialogEintragen(apiKey: string, url: string): Promise<{ ok: true } | { ok: false; fehler: string }> {
  try {
    const res = await fetch(`${D360_BASIS}/v1/configs/webhook`, {
      method: 'POST',
      headers: { 'D360-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      cache: 'no-store',
    })
    if (res.ok) return { ok: true }
    const json = (await res.json().catch(() => ({}))) as { meta?: { developer_message?: string }; error?: { message?: string } }
    return { ok: false, fehler: json.meta?.developer_message || json.error?.message || `360dialog-Fehler ${res.status}` }
  } catch (e) {
    return { ok: false, fehler: e instanceof Error ? e.message : '360dialog nicht erreichbar' }
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

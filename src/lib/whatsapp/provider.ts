import 'server-only';

import { whatsappKonfig,whatsappWebhookUrl } from '@/lib/whatsapp/konfig';
import { VORLAGEN,vorlageText,type VorlagenName } from '@/lib/whatsapp/vorlagen';

/**
 * Eine Schnittstelle, zwei Umsetzungen:
 * - „mock“: Testmodus — nichts verlässt das CRM, jede Nachricht gilt sofort als zugestellt.
 * - „twilio“: WhatsApp über Twilio (Messages-API, Vorlagen aus dem Content Template Builder).
 * Alles im CRM spricht nur diese Schnittstelle an; Umschalten = Umgebungsvariablen setzen.
 */

export type WaSendErgebnis = { ok: true; waId: string } | { ok: false; fehler: string }
export type WaKnopf = { id: string; titel: string }
export type WaMedienArt = 'bild' | 'dokument' | 'audio' | 'video'
/** url muss für WhatsApp öffentlich abrufbar sein (befristeter Storage-Link reicht). */
export type WaMediumSenden = { url: string; art: WaMedienArt; name?: string | null; caption?: string | null }

export interface WhatsAppProvider {
  modus: 'mock' | 'twilio'
  /** Freie Antwort-Knöpfe ohne Vorlage? (Twilio: nein — Knöpfe nur über die Vorlage) */
  freieKnoepfe: boolean
  sendeText(an: string, text: string): Promise<WaSendErgebnis>
  /** Antwort-Knöpfe — nur wo freieKnoepfe gilt. */
  sendeKnoepfe(an: string, text: string, knoepfe: WaKnopf[]): Promise<WaSendErgebnis>
  /** Freigegebene Vorlage mit Werten {{1}}, {{2}} … */
  sendeVorlage(an: string, name: VorlagenName, werte: string[]): Promise<WaSendErgebnis>
  sendeMedium(an: string, medium: WaMediumSenden): Promise<WaSendErgebnis>
  /** Eingehendes Medium laden (bei Twilio: Media-URL aus dem Webhook). */
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

/* ── Twilio ────────────────────────────────────────────────────────────────── */

/** WhatsApp/Meta: Vorlagen-Werte ohne Zeilenumbrüche, Tabs und lange Leerzeichen-Folgen. */
function vorlagenWert(w: string): string {
  return (w || '—').replace(/\s+/g, ' ').trim().slice(0, 900) || '—'
}

function twilio(cfg: { sid: string; token: string; von: string }, vorlagen: Record<VorlagenName, string | null>): WhatsAppProvider {
  const auth = `Basic ${Buffer.from(`${cfg.sid}:${cfg.token}`).toString('base64')}`
  const von = `whatsapp:+${cfg.von.replace(/\D/g, '')}`

  async function post(an: string, felder: Record<string, string>): Promise<WaSendErgebnis> {
    const body = new URLSearchParams({ From: von, To: `whatsapp:+${an}`, StatusCallback: whatsappWebhookUrl(), ...felder })
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        cache: 'no-store',
      })
      const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number }
      if (!res.ok || !json.sid) {
        return { ok: false, fehler: json.message ? `${json.message}${json.code ? ` (${json.code})` : ''}` : `Twilio-Fehler ${res.status}` }
      }
      return { ok: true, waId: json.sid }
    } catch (e) {
      return { ok: false, fehler: e instanceof Error ? e.message : 'Twilio nicht erreichbar' }
    }
  }

  return {
    modus: 'twilio',
    freieKnoepfe: false,
    sendeText(an, text) {
      return post(an, { Body: text })
    },
    sendeKnoepfe(an, text, knoepfe) {
      // Ohne Vorlage keine echten Knöpfe — Antwort als Text erbitten
      return post(an, { Body: `${text}\n\nBitte antworten Sie mit: ${knoepfe.map((k) => `„${k.titel}“`).join(' oder ')}` })
    },
    sendeVorlage(an, name, werte) {
      const contentSid = vorlagen[name]
      if (!contentSid) return Promise.resolve({ ok: false, fehler: `Vorlage „${name}“ ist in Twilio noch nicht hinterlegt.` })
      const variablen = Object.fromEntries(werte.map((w, i) => [String(i + 1), vorlagenWert(w)]))
      return post(an, { ContentSid: contentSid, ContentVariables: JSON.stringify(variablen) })
    },
    sendeMedium(an, m) {
      // Sprachnachrichten haben bei WhatsApp keine Bildunterschrift
      const caption = m.art === 'audio' ? '' : m.caption ?? ''
      return post(an, { MediaUrl: m.url, ...(caption ? { Body: caption } : {}) })
    },
    async ladeMedium(mediaUrl) {
      try {
        // Twilio-Medien brauchen dieselbe Anmeldung wie die API und leiten weiter
        const res = await fetch(mediaUrl, { headers: { Authorization: auth }, redirect: 'follow', cache: 'no-store' })
        if (!res.ok) return { ok: false, fehler: `Medium konnte nicht geladen werden (${res.status}).` }
        return {
          ok: true,
          buffer: Buffer.from(await res.arrayBuffer()),
          mime: res.headers.get('content-type')?.split(';')[0] || 'application/octet-stream',
        }
      } catch (e) {
        return { ok: false, fehler: e instanceof Error ? e.message : 'Medium konnte nicht geladen werden.' }
      }
    },
  }
}

export function whatsappProvider(): WhatsAppProvider {
  const k = whatsappKonfig()
  return k.modus === 'twilio' && k.twilio ? twilio(k.twilio, k.vorlagen) : mockProvider
}

/** Text, den der Empfänger bei einer Vorlage sieht (fürs Speichern im Verlauf). */
export function vorlageAnzeige(name: VorlagenName, werte: string[]): { text: string; knoepfe: string[] } {
  return { text: vorlageText(name, werte), knoepfe: VORLAGEN[name].knoepfe ?? [] }
}

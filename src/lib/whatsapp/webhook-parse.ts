import { createHmac,timingSafeEqual } from 'crypto';

/**
 * Twilio-Webhook (Formularfelder) → einheitliche Ereignisse. Ohne Datenbank, damit es sich
 * einzeln testen lässt. Eingehende Nachrichten haben immer „NumMedia“, Status-Meldungen nicht.
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
  /** Gedrückter Knopf (Payload aus der Vorlage bzw. Testmodus) */
  knopfId: string | null
  /** Twilio-SID der Nachricht, auf die geantwortet wurde */
  antwortAufWaId: string | null
}

export type WaStatus = {
  typ: 'status'
  waId: string
  status: 'gesendet' | 'zugestellt' | 'gelesen' | 'fehler'
  fehler: string | null
}

export type TwilioFelder = Record<string, string>

const STATUS: Record<string, WaStatus['status']> = {
  sent: 'gesendet',
  delivered: 'zugestellt',
  read: 'gelesen',
  failed: 'fehler',
  undelivered: 'fehler',
}

function feld(f: TwilioFelder, name: string): string | null {
  const v = f[name]?.trim()
  return v ? v : null
}

function artAus(f: TwilioFelder, mime: string | null): WaEingang['art'] {
  const typ = feld(f, 'MessageType')
  if (typ === 'button' || typ === 'interactive' || feld(f, 'ButtonPayload') || feld(f, 'ButtonText')) return 'antwort'
  if (typ === 'location' || feld(f, 'Latitude')) return 'standort'
  if (!mime) return 'text'
  if (mime.startsWith('image/')) return 'bild'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  return 'dokument'
}

function endung(mime: string | null): string {
  const m = (mime ?? '').split(';')[0] ?? ''
  if (m === 'application/pdf') return 'pdf'
  if (m === 'audio/mpeg') return 'mp3'
  return m.split('/')[1]?.split('+')[0] || 'bin'
}

const MEDIEN_NAME: Record<string, string> = { bild: 'Foto', dokument: 'Dokument', audio: 'Sprachnachricht', video: 'Video' }

export function parseTwilioWebhook(f: TwilioFelder): (WaEingang | WaStatus)[] {
  const sid = feld(f, 'MessageSid') ?? feld(f, 'SmsSid')
  if (!sid) return []
  if (!('NumMedia' in f)) {
    // Status-Meldung zu einer ausgehenden Nachricht
    const status = STATUS[feld(f, 'MessageStatus') ?? '']
    if (!status) return []
    const code = feld(f, 'ErrorCode')
    return [
      {
        typ: 'status',
        waId: sid,
        status,
        fehler: status === 'fehler' ? feld(f, 'ErrorMessage') ?? (code ? `Fehler ${code}` : null) : null,
      },
    ]
  }
  const von = (feld(f, 'WaId') ?? feld(f, 'From') ?? '').replace(/^whatsapp:/, '').replace(/\D/g, '')
  if (!von) return []
  const mime = Number(f.NumMedia) > 0 ? feld(f, 'MediaContentType0') : null
  const art = artAus(f, mime)
  const standort =
    art === 'standort'
      ? [feld(f, 'Label'), feld(f, 'Address'), `${f.Latitude ?? ''}, ${f.Longitude ?? ''}`].filter(Boolean).join(' · ')
      : null
  const mediaUrl = feld(f, 'MediaUrl0')
  return [
    {
      typ: 'nachricht',
      waId: sid,
      von,
      profilName: feld(f, 'ProfileName'),
      zeit: new Date().toISOString(),
      art,
      text: art === 'antwort' ? feld(f, 'ButtonText') ?? feld(f, 'Body') : standort ?? feld(f, 'Body'),
      medium: mime && mediaUrl ? { mediaId: mediaUrl, mime, name: `WhatsApp-${MEDIEN_NAME[art] ?? 'Datei'}.${endung(mime)}` } : null,
      knopfId: art === 'antwort' ? feld(f, 'ButtonPayload') ?? feld(f, 'ButtonText') : null,
      antwortAufWaId: feld(f, 'OriginalRepliedMessageSid'),
    },
  ]
}

/**
 * Twilio-Signatur prüfen: Base64(HMAC-SHA1(AuthToken, URL + alle Felder alphabetisch als Name+Wert)).
 * Die URL muss genau die bei Twilio eingetragene sein.
 */
export function twilioSignaturOk(authToken: string, url: string, felder: TwilioFelder, signatur: string | null): boolean {
  if (!signatur) return false
  const daten = Object.keys(felder)
    .sort()
    .reduce((acc, k) => acc + k + felder[k], url)
  const soll = Buffer.from(createHmac('sha1', authToken).update(daten, 'utf8').digest('base64'))
  const ist = Buffer.from(signatur)
  return soll.length === ist.length && timingSafeEqual(soll, ist)
}

/** Testmodus: eingehende Nachricht im selben Format bauen, wie Twilio sie schickt. */
export function mockWebhookPayload(input: {
  von: string
  name?: string | null
  text?: string | null
  knopf?: { id: string; titel: string } | null
  /** Foto/Dokument/Sprachnachricht/Video (Testmodus: Datei liegt unter /mock/whatsapp) */
  medium?: { name: string; mime: string; url: string } | null
}): TwilioFelder {
  return {
    MessageSid: `mock-in-${crypto.randomUUID()}`,
    From: `whatsapp:+${input.von}`,
    WaId: input.von,
    ProfileName: input.name ?? '',
    Body: input.knopf ? input.knopf.titel : input.text ?? '',
    NumMedia: input.medium ? '1' : '0',
    ...(input.medium ? { MediaUrl0: input.medium.url, MediaContentType0: input.medium.mime } : {}),
    ...(input.knopf
      ? { MessageType: 'button', ButtonText: input.knopf.titel, ButtonPayload: input.knopf.id }
      : { MessageType: input.medium ? 'media' : 'text' }),
  }
}

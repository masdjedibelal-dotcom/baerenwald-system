import { formatDatum } from '@/lib/utils'
import { buildPartnerSubject } from '@/lib/mail/build-subject'

export type HandwerkerNachrichtInput = {
  handwerkerName: string
  kundeName: string
  adresse?: string | null
  plz?: string | null
  ort?: string | null
  gewerkName: string
  leistungen: string[]
  startDatum?: string | null
  endDatum?: string | null
  notizen?: string | null
  /** Direktlink Partner-Portal (nach Zuweisung) */
  portalLink?: string | null
}

function vorname(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ''
}

function ortZeile(plz?: string | null, ort?: string | null, adresse?: string | null): string {
  const parts = [adresse?.trim(), [plz?.trim(), ort?.trim()].filter(Boolean).join(' ')].filter(Boolean)
  return parts.join(', ') || '—'
}

function zeitraumZeile(start?: string | null, end?: string | null): string {
  if (start && end) return `${formatDatum(start)} – ${formatDatum(end)}`
  if (start) return `ab ${formatDatum(start)}`
  if (end) return `bis ${formatDatum(end)}`
  return 'nach Absprache'
}

/** Kurze WhatsApp-/Mail-Nachricht an bekannte Partner */
export function buildHandwerkerAuftragNachricht(input: HandwerkerNachrichtInput): string {
  const vn = vorname(input.handwerkerName)
  const gruss = vn ? `Hallo ${vn},` : 'Hallo,'
  const leistungen =
    input.leistungen.length > 0
      ? input.leistungen.map((l, i) =>
          input.leistungen.length > 1 ? `${i + 1}. ${l}` : `• ${l}`
        ).join('\n')
      : '• gemäß Auftrag'

  const lines = [
    gruss,
    '',
    'wir haben eine neue Anfrage.',
    '',
    'Details zur Anfrage:',
    `Ort: ${ortZeile(input.plz, input.ort, input.adresse)}`,
    `Zeitraum: ${zeitraumZeile(input.startDatum, input.endDatum)}`,
    `Gewerk: ${input.gewerkName}`,
    leistungen,
  ]

  if (input.notizen?.trim()) {
    lines.push(`Hinweis: ${input.notizen.trim()}`)
  }

  if (input.portalLink?.trim()) {
    lines.push('', 'Partner-Portal:', input.portalLink.trim())
  }

  lines.push('', 'Gib uns Bescheid, wenn du kannst oder Fragen hast.', '', 'Viele Grüße', 'Bärenwald München')

  return lines.join('\n')
}

/** Betreff für Zuweisungs-Mail / WhatsApp nach Leistungs-Zuweisung */
export function handwerkerZuweisungMailSubject(
  leistungName: string,
  count = 1,
  ort?: string | null
): string {
  const gewerk =
    count > 1 ? `${count} Positionen` : leistungName.trim() || null
  return buildPartnerSubject({
    gewerk,
    ort,
    ereignis: 'Leistungsanfrage',
  })
}

/** Betreffzeile für E-Mail an Partner */
export function handwerkerAnfrageMailSubject(
  gewerkName: string,
  ort?: string | null
): string {
  return buildPartnerSubject({
    gewerk: gewerkName.trim() || null,
    ort,
    ereignis: 'Neue Anfrage',
  })
}

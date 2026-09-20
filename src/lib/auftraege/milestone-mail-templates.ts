import type { Kunde } from '@/lib/types'
import { buildSubject } from '@/lib/mail/build-subject'

export type MeilensteinVorlageId =
  | 'beginn'
  | 'zwischenstand'
  | 'meilenstein'
  | 'verzoegerung'
  | 'individuell'

function vorname(name: string): string {
  const t = name.trim()
  if (!t) return ''
  return t.split(/\s+/)[0] ?? t
}

export function meilensteinVorlagenFuerKunde(
  kunde: Kunde,
  projektTitel?: string | null
): Record<MeilensteinVorlageId, { betreff: string; text: string }> {
  const vn = vorname(kunde.name)
  const objekt = projektTitel
  return {
    beginn: {
      betreff: buildSubject({ objekt, ereignis: 'Arbeiten begonnen' }),
      text: `Guten Tag ${vn},

wir möchten Sie informieren, dass die Arbeiten an Ihrem Projekt heute begonnen haben.

Unser Team ist vor Ort und alles verläuft planmäßig.

Mit freundlichen Grüßen
Bärenwald München`,
    },
    zwischenstand: {
      betreff: buildSubject({ objekt, ereignis: 'Zwischenstand' }),
      text: `Guten Tag ${vn},

kurzes Update zu Ihrem Projekt: [Bitte ergänzen]

Mit freundlichen Grüßen
Bärenwald München`,
    },
    meilenstein: {
      betreff: buildSubject({ objekt, ereignis: 'Meilenstein erreicht' }),
      text: `Guten Tag ${vn},

wir möchten Sie informieren, dass ein wichtiger Meilenstein in Ihrem Projekt erreicht wurde.

[Bitte Details ergänzen]

Mit freundlichen Grüßen
Bärenwald München`,
    },
    verzoegerung: {
      betreff: buildSubject({ objekt, ereignis: 'Verzögerung' }),
      text: `Guten Tag ${vn},

wir möchten Sie informieren, dass es zu einer kleinen Verzögerung kommt.

[Grund bitte ergänzen]

Neuer geplanter Abschluss: [Datum eintragen]

Wir entschuldigen uns für etwaige Unannehmlichkeiten.

Mit freundlichen Grüßen
Bärenwald München`,
    },
    individuell: {
      betreff: buildSubject({ objekt, ereignis: 'Projekt-Update' }),
      text: `Guten Tag ${vn},

[Bitte Nachricht formulieren]

Mit freundlichen Grüßen
Bärenwald München`,
    },
  }
}

export function buildAbnahmeAbschlussMail(input: {
  name: string
  gewerke: string[]
  datum: string
}): string {
  const gw = input.gewerke.length ? input.gewerke.join(', ') : 'Ihr Projekt'
  return `
  <p>Guten Tag ${input.name},</p>
  <p>Ihre Arbeiten sind abgeschlossen.</p>
  <p>Anbei finden Sie das Abnahmeprotokoll mit allen durchgeführten Leistungen.</p>
  <p><strong>Gewerke:</strong> ${gw}<br/>
  <strong>Abschlussdatum:</strong> ${input.datum}</p>
  <p>Wir danken Ihnen für Ihr Vertrauen und stehen für Rückfragen jederzeit zur Verfügung.</p>
  <p>Mit freundlichen Grüßen<br/>Bärenwald München</p>
  `
}

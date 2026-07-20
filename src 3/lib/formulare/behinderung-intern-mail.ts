import { sendEmailHtml } from '@/lib/auftraege/emails'
import { getPublicAppUrl } from '@/lib/utils'

export function buildBehinderungInternHtml(input: {
  kundeName: string
  auftragIdShort: string
  handwerkerName: string
  grund: string
  verzugTage: string
  beschreibung: string
  auftragUrl: string
}) {
  return `
  <p><strong>Behinderungsanzeige eingegangen</strong></p>
  <p>Auftrag: <strong>${input.auftragIdShort}</strong> · Kundin: <strong>${input.kundeName}</strong></p>
  <p>Handwerker: <strong>${input.handwerkerName}</strong></p>
  <p>Grund: <strong>${input.grund}</strong></p>
  <p>Geschätzter Verzug: <strong>${input.verzugTage}</strong> Arbeitstage</p>
  <p>Beschreibung:<br/>${input.beschreibung.replace(/\n/g, '<br/>')}</p>
  <p><a href="${input.auftragUrl}">Auftrag im CRM öffnen</a></p>
  `
}

export async function sendBehinderungInternMail(input: {
  kundeName: string
  auftragId: string
  handwerkerName: string
  grund: string
  verzugTage: string
  beschreibung: string
}) {
  const intern = process.env.INTERN_EMAIL
  if (!intern?.trim()) return { ok: true as const, skipped: true as const }

  const auftragUrl = `${getPublicAppUrl()}/auftraege/${input.auftragId}#dokumentation`
  const short = input.auftragId.slice(0, 8).toUpperCase()
  const html = buildBehinderungInternHtml({
    kundeName: input.kundeName,
    handwerkerName: input.handwerkerName,
    grund: input.grund,
    verzugTage: input.verzugTage,
    beschreibung: input.beschreibung,
    auftragIdShort: short,
    auftragUrl,
  })
  const subject = `Behinderungsanzeige: ${short} — ${input.handwerkerName}`
  return sendEmailHtml({ to: intern.trim(), subject, html })
}

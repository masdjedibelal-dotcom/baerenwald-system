/**
 * Antworten von Kunden landen im Vorgang: Jede Kunden-Mail bekommt als „Antwort an“
 * `antwort+<email_log-id>@<Eingangsdomain>`. Resend leitet die Antwort an den Webhook,
 * der sie über die ID dem Vorgang zuordnet.
 *
 * Eingangsdomain = Domain von AUFTRAG_EINGANG_EMAIL (bei Resend als Empfangsdomain eingerichtet).
 * Ohne diese Env (z. B. Bärenwald) bleibt alles wie bisher.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function eingangsDomain(): string | null {
  const raw = process.env.AUFTRAG_EINGANG_EMAIL?.trim().toLowerCase()
  const m = raw?.match(/^[a-z0-9._-]+@([a-z0-9.-]+\.[a-z]{2,})$/)
  return m ? m[1]! : null
}

export function antwortAdresseFuer(emailLogId: string): string | null {
  const domain = eingangsDomain()
  if (!domain || !UUID.test(emailLogId)) return null
  return `antwort+${emailLogId.toLowerCase()}@${domain}`
}

/** email_log-ID aus „antwort+<id>@…“ unter den Empfängern (sonst null). */
export function logIdAusAntwortAdresse(empfaenger: string[]): string | null {
  const domain = eingangsDomain()
  if (!domain) return null
  for (const roh of empfaenger) {
    const a = (roh.match(/<([^>]+)>/)?.[1] ?? roh).trim().toLowerCase()
    const [lokal, dom] = a.split('@')
    if (dom !== domain || !lokal?.startsWith('antwort+')) continue
    const id = lokal.slice('antwort+'.length)
    if (UUID.test(id)) return id
  }
  return null
}

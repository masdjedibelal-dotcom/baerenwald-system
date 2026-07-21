/**
 * CRM → Website: Partner-Mail „Angebot übernommen“ nach CRM-Bestätigung.
 * @see handwerks-plattform/docs/PARTNER_CRM_NOTIFY_API.md
 */

function partnerSiteBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    process.env.NEXT_PUBLIC_WEBSEITE_URL?.trim() ||
    'https://baerenwaldmuenchen.de'
  ).replace(/\/$/, '')
}

export async function notifyPartnerHandwerkerAngebotBestaetigt(
  anfrageId: string,
  options?: { bitteBestaetigen?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = anfrageId.trim()
  if (!id) return { ok: false, error: 'anfrageId fehlt' }

  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!secret) {
    return {
      ok: false,
      error:
        'PARTNER_INTERNAL_API_SECRET fehlt — Bestätigungs-Mail kann nicht gesendet werden.',
    }
  }

  const url = `${partnerSiteBaseUrl()}/api/internal/partner-notify-angebot-bestaetigt`
  const payload: { anfrageId: string; bitteBestaetigen?: boolean } = { anfrageId: id }
  if (options?.bitteBestaetigen) payload.bitteBestaetigen = true

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Netzwerkfehler'
    return { ok: false, error: `Partner-Bestätigungs-Mail: ${msg}` }
  }

  let body: { ok?: boolean; error?: string } = {}
  try {
    body = (await res.json()) as { ok?: boolean; error?: string }
  } catch {
    body = {}
  }

  if (!res.ok || !body.ok) {
    const detail = body.error?.trim() || `HTTP ${res.status}`
    return { ok: false, error: `Partner-Bestätigungs-Mail fehlgeschlagen: ${detail}` }
  }

  return { ok: true }
}

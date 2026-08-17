/**
 * Netlify Scheduled Function → Next.js Cron-Route mit CRON_SECRET.
 */
export async function invokeCrmCron(path) {
  const base = String(process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/$/, '')
  const secret = process.env.CRON_SECRET
  if (!base) {
    return new Response(JSON.stringify({ ok: false, error: 'URL fehlt' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
  if (!secret) {
    return new Response(JSON.stringify({ ok: false, error: 'CRON_SECRET fehlt' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  })
}

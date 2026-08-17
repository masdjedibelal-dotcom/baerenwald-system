/**
 * Netlify Scheduled Function → Next.js Cron-Route mit CRON_SECRET.
 * Liegt außerhalb von netlify/functions/, damit kein eigener Lambda-Deploy entsteht.
 */
export async function invokeCrmCron(path) {
  const base = String(process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/$/, '')
  const secret = process.env.CRON_SECRET
  if (!base) {
    return { ok: false, path, status: 500, body: 'URL fehlt' }
  }
  if (!secret) {
    return { ok: false, path, status: 500, body: 'CRON_SECRET fehlt' }
  }
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${secret}` },
    })
    const body = await res.text()
    return { ok: res.ok, path, status: res.status, body: body.slice(0, 500) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, path, status: 500, body: msg }
  }
}

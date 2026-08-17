import { invokeCrmCron } from '../../lib/netlify/invoke-crm-cron.mjs'

/** UTC-Zeitpläne — früher je eigene netlify/functions/cron-*.mjs */
const JOBS = [
  /** 00:00 UTC ≈ 02:00 Europe/Berlin (Sommer); 01:00 im Winter (MEZ) */
  { id: 'rechnungen', path: '/api/cron/rechnungen', hour: 0, minute: 0, dom: null, dow: null },
  { id: 'ki-hub-metrics', path: '/api/cron/ki-hub-metrics', hour: 6, minute: 30, dom: null, dow: null },
  {
    id: 'ki-hub-analyze',
    path: '/api/cron/ki-hub-analyze',
    hour: 7,
    minute: 0,
    dom: null,
    dow: [1, 2, 3, 4, 5, 6],
  },
  {
    id: 'copilot-briefing',
    path: '/api/cron/copilot-briefing',
    hour: 7,
    minute: 30,
    dom: null,
    dow: [1, 2, 3, 4, 5, 6],
  },
  { id: 'einbehalte', path: '/api/cron/einbehalte', hour: 7, minute: 30, dom: null, dow: null },
  { id: 'angebot-nachfass', path: '/api/cron/angebot-nachfass', hour: 9, minute: 0, dom: null, dow: null },
  { id: 'datenschutz', path: '/api/cron/datenschutz', hour: 8, minute: 0, dom: 1, dow: null },
]

function jobDue(job, d) {
  if (d.getUTCHours() !== job.hour) return false
  if (d.getUTCMinutes() !== job.minute) return false
  if (job.dom != null && d.getUTCDate() !== job.dom) return false
  if (job.dow != null && !job.dow.includes(d.getUTCDay())) return false
  return true
}

export default async function handler() {
  const now = new Date()
  const due = JOBS.filter((j) => jobDue(j, now))
  const results = []
  for (const job of due) {
    results.push({ id: job.id, ...(await invokeCrmCron(job.path)) })
  }
  return new Response(
    JSON.stringify({
      ok: true,
      utc: now.toISOString(),
      triggered: due.map((j) => j.id),
      results,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
}

/** Alle :00 und :30 UTC — deckt alle CRM-Cron-Zeitpunkte ab (Rechnungen 00:00) */
export const config = { schedule: '0,30 * * * *' }

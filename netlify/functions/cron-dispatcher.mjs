import { invokeCrmCron } from '../../lib/netlify/invoke-crm-cron.mjs'

/** UTC-Zeitpläne — früher je eigene netlify/functions/cron-*.mjs */
const JOBS = [
  /** 00:00 UTC ≈ 02:00 Europe/Berlin (Sommer); 01:00 im Winter (MEZ) */
  { id: 'rechnungen', path: '/api/cron/rechnungen', hour: 0, minute: 0, dom: null, dow: null, mailRisk: true },
  { id: 'ki-hub-metrics', path: '/api/cron/ki-hub-metrics', hour: 6, minute: 30, dom: null, dow: null, mailRisk: false },
  {
    id: 'ki-hub-analyze',
    path: '/api/cron/ki-hub-analyze',
    hour: 7,
    minute: 0,
    dom: null,
    dow: [1, 2, 3, 4, 5, 6],
    mailRisk: false,
  },
  {
    id: 'copilot-briefing',
    path: '/api/cron/copilot-briefing',
    hour: 7,
    minute: 30,
    dom: null,
    dow: [1, 2, 3, 4, 5, 6],
    mailRisk: true,
  },
  { id: 'einbehalte', path: '/api/cron/einbehalte', hour: 7, minute: 30, dom: null, dow: null, mailRisk: true },
  { id: 'angebot-nachfass', path: '/api/cron/angebot-nachfass', hour: 9, minute: 0, dom: null, dow: null, mailRisk: true },
  { id: 'datenschutz', path: '/api/cron/datenschutz', hour: 8, minute: 0, dom: 1, dow: null, mailRisk: true },
]

function isStagingCronHost() {
  const blob = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.SITE_NAME,
    process.env.CONTEXT,
    process.env.BRANCH,
    process.env.HEAD,
  ]
    .filter(Boolean)
    .join(' ')
  return blob.includes('staging--baerenwald') || process.env.BRANCH === 'staging'
}

function jobDue(job, d) {
  if (d.getUTCHours() !== job.hour) return false
  if (d.getUTCMinutes() !== job.minute) return false
  if (job.dom != null && d.getUTCDate() !== job.dom) return false
  if (job.dow != null && !job.dow.includes(d.getUTCDay())) return false
  return true
}

export default async function handler() {
  const now = new Date()
  const staging = isStagingCronHost()
  const due = JOBS.filter((j) => jobDue(j, now))
  const results = []
  for (const job of due) {
    if (staging && job.mailRisk) {
      console.info(`[cron-dispatcher] Staging — Skip Mail-/Notify-Job ${job.id}`)
      results.push({ id: job.id, ok: true, skipped: 'staging-mail-guard' })
      continue
    }
    results.push({ id: job.id, ...(await invokeCrmCron(job.path)) })
  }
  return new Response(
    JSON.stringify({
      ok: true,
      utc: now.toISOString(),
      staging,
      triggered: due.map((j) => j.id),
      results,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  )
}

/** Alle :00 und :30 UTC — deckt alle CRM-Cron-Zeitpunkte ab (Rechnungen 00:00) */
export const config = { schedule: '0,30 * * * *' }

import { invokeCrmCron } from './invoke-crm-cron.mjs'

export default async function handler() {
  return invokeCrmCron('/api/cron/copilot-briefing')
}

export const config = { schedule: '30 7 * * 1-6' }

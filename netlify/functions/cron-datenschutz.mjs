import { invokeCrmCron } from './invoke-crm-cron.mjs'

export default async function handler() {
  return invokeCrmCron('/api/cron/datenschutz')
}

export const config = { schedule: '0 8 1 * *' }

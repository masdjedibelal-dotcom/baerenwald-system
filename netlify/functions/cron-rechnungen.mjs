import { invokeCrmCron } from './invoke-crm-cron.mjs'

export default async function handler() {
  return invokeCrmCron('/api/cron/rechnungen')
}

export const config = { schedule: '0 23 * * *' }

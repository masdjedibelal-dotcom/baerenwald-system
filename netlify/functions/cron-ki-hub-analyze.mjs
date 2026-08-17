import { invokeCrmCron } from './invoke-crm-cron.mjs'

export default async function handler() {
  return invokeCrmCron('/api/cron/ki-hub-analyze')
}

export const config = { schedule: '0 7 * * 1-6' }

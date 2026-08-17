import { invokeCrmCron } from './invoke-crm-cron.mjs'

export default async function handler() {
  return invokeCrmCron('/api/cron/angebot-nachfass')
}

export const config = { schedule: '0 9 * * *' }

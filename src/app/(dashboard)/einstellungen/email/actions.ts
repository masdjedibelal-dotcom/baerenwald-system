'use server'

import { logDbError } from '@/lib/errors/log-db-error'
import { createClient } from '@/lib/supabase-server'

export type EmailTemplateRow = {
  id: string
  slug: string
  name: string
  beschreibung: string | null
  betreff: string
  body_html: string
  updated_at: string
}

export async function loadEmailTemplates(): Promise<EmailTemplateRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('email_templates').select('*').order('name')
  if (error) logDbError('app/einstellungen/email/actions:email_templates', error)
  if (error) {
    console.warn('loadEmailTemplates', error.message)
    return []
  }
  return (data ?? []) as EmailTemplateRow[]
}

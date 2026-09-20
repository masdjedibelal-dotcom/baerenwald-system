'use server'

<<<<<<< Updated upstream
import { revalidateEinstellungenPath } from '@/lib/crm-revalidate'
import { logDbError } from '@/lib/errors/log-db-error'
=======
import { logDbError } from '@/lib/errors/log-db-error'
import { revalidatePath } from 'next/cache'
>>>>>>> Stashed changes
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

export async function saveEmailTemplate(
  id: string,
  patch: { betreff: string; body_html: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('email_templates')
    .update({
      betreff: patch.betreff,
      body_html: patch.body_html,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) logDbError('app/einstellungen/email/actions:email_templates', error)
  if (error) return { ok: false, message: error.message }
  revalidateEinstellungenPath('/einstellungen/email')
  return { ok: true }
}

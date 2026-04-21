'use server'

import { revalidatePath } from 'next/cache'
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
  if (error) return { ok: false, message: error.message }
  revalidatePath('/einstellungen/email')
  return { ok: true }
}

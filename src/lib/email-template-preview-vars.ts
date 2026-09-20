import { formatDatum } from '@/lib/utils'
import { logDbError } from '@/lib/errors/log-db-error'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatEuro } from '@/lib/format/geld-datum'

/** Variablen für Editor-Vorschau / Test-Mail — aus echten Datensätzen, sonst neutral leer. */
export type EmailPreviewVars = Record<string, string>

const KEYS = [
  'kundenname',
  'betrag',
  'datum',
  'link',
  'rechnungsnummer',
  'handwerkername',
  'gewerk',
  'startdatum',
  'enddatum',
] as const

function emptyVars(): EmailPreviewVars {
  return Object.fromEntries(KEYS.map((k) => [k, ''])) as EmailPreviewVars
}

/**
 * Lädt die neuesten passenden Werte aus Supabase für E-Mail-Vorschau (keine festen Mock-Namen).
 */
export async function loadEmailPreviewVars(supabase: SupabaseClient): Promise<EmailPreviewVars> {
  const vars = emptyVars()
  vars.datum = formatDatum(new Date().toISOString())
  vars.link = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? ''

  const { data: kunde, error } = await supabase
    .from('kunden')
    .select('name')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) logDbError('lib/email-template-preview-vars:kunden', error)
  if (kunde?.name) vars.kundenname = String(kunde.name)

  const { data: rechnung, error: error2 } = await supabase
    .from('rechnungen')
    .select('rechnungsnummer, brutto')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error2) logDbError('lib/email-template-preview-vars:rechnungen', error2)
  if (rechnung) {
    const r = rechnung as { rechnungsnummer?: string; brutto?: number | null }
    if (r.rechnungsnummer) vars.rechnungsnummer = r.rechnungsnummer
    if (r.brutto != null) {
      vars.betrag = formatEuro(Number(r.brutto), { style: 'currency' })
    }
  }

  const { data: hw, error: error3 } = await supabase
    .from('handwerker')
    .select('name')
    .eq('aktiv', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error3) logDbError('lib/email-template-preview-vars:handwerker', error3)
  if (hw?.name) vars.handwerkername = String(hw.name)

  const { data: auftrag, error: error4 } = await supabase
    .from('auftraege')
    .select('start_datum, end_datum, auftrag_positionen(gewerk_name)')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error4) logDbError('lib/email-template-preview-vars:auftraege', error4)
  if (auftrag) {
    const a = auftrag as {
      start_datum?: string | null
      end_datum?: string | null
      auftrag_positionen?: { gewerk_name?: string | null }[] | null
    }
    const gewerkName = a.auftrag_positionen?.find((p) => p.gewerk_name)?.gewerk_name
    if (gewerkName) vars.gewerk = gewerkName
    if (a.start_datum) {
      vars.startdatum = formatDatum(a.start_datum)
    }
    if (a.end_datum) {
      vars.enddatum = formatDatum(a.end_datum)
    }
  }

  const { data: angebot, error: error5 } = await supabase
    .from('angebote')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error5) logDbError('lib/email-template-preview-vars:angebote', error5)
  if (angebot?.id && vars.link) {
    vars.link = `${vars.link}/angebote/${angebot.id}`
  }

  return vars
}

export function applyEmailTemplateVars(text: string, vars: EmailPreviewVars): string {
  let out = text
  for (const k of KEYS) {
    const v = vars[k]
    if (v) out = out.split(`{{${k}}}`).join(v)
  }
  return out
}

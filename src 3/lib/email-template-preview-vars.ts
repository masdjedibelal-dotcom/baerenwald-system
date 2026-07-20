import type { SupabaseClient } from '@supabase/supabase-js'

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
  vars.datum = new Date().toLocaleDateString('de-DE')
  vars.link = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? ''

  const { data: kunde } = await supabase
    .from('kunden')
    .select('name')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (kunde?.name) vars.kundenname = String(kunde.name)

  const { data: rechnung } = await supabase
    .from('rechnungen')
    .select('rechnungsnummer, brutto')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (rechnung) {
    const r = rechnung as { rechnungsnummer?: string; brutto?: number | null }
    if (r.rechnungsnummer) vars.rechnungsnummer = r.rechnungsnummer
    if (r.brutto != null) {
      vars.betrag = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
        Number(r.brutto)
      )
    }
  }

  const { data: hw } = await supabase
    .from('handwerker')
    .select('name')
    .eq('aktiv', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (hw?.name) vars.handwerkername = String(hw.name)

  const { data: auftrag } = await supabase
    .from('auftraege')
    .select('start_datum, end_datum, auftrag_positionen(gewerk_name)')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (auftrag) {
    const a = auftrag as {
      start_datum?: string | null
      end_datum?: string | null
      auftrag_positionen?: { gewerk_name?: string | null }[] | null
    }
    const gewerkName = a.auftrag_positionen?.find((p) => p.gewerk_name)?.gewerk_name
    if (gewerkName) vars.gewerk = gewerkName
    if (a.start_datum) {
      vars.startdatum = new Date(a.start_datum).toLocaleDateString('de-DE')
    }
    if (a.end_datum) {
      vars.enddatum = new Date(a.end_datum).toLocaleDateString('de-DE')
    }
  }

  const { data: angebot } = await supabase
    .from('angebote')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
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

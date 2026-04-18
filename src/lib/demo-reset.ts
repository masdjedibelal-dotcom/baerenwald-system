import type { SupabaseClient } from '@supabase/supabase-js'

const SENTINEL = '00000000-0000-0000-0000-000000000001'

/** Alle Zeilen einer Tabelle mit UUID-Spalte `id` löschen. */
async function wipeTable(admin: SupabaseClient, table: string): Promise<string | null> {
  const { error } = await admin.from(table).delete().neq('id', SENTINEL)
  if (error) return `${table}: ${error.message}`
  return null
}

/**
 * Löscht CRM-Transaktionsdaten und legt frische Demo-Leads an.
 * Stammdaten (Gewerke, Handwerker, Formular-Templates, Einstellungen) bleiben erhalten.
 */
export async function runDemoCrmReset(admin: SupabaseClient): Promise<{ ok: true } | { ok: false; message: string }> {
  const order = [
    'datenschutz_aufschub',
    'datenschutz_anfragen',
    'datenschutz_loeschlog',
    'vorab_formulare',
    'leads_status_history',
    'kalender_termine',
    'email_logs',
    'angebot_handwerker',
    'rechnungen',
    'formular_eintraege',
    'auftrag_timeline',
    'nachtraege',
    'punch_list',
    'vor_baubeginn_protokolle',
    'baustopps',
    'buergschaften',
    'einbehalte',
    'eingangsrechnungen',
    'auftrag_handwerker',
    'auftraege',
    'angebote',
    'leads',
    'kunden',
  ] as const

  const errors: string[] = []
  for (const t of order) {
    const err = await wipeTable(admin, t)
    if (err) errors.push(err)
  }

  if (errors.length) {
    return { ok: false, message: errors.join('\n') }
  }

  const now = new Date().toISOString()
  const heute = now.slice(0, 10)

  const { data: k1, error: e1 } = await admin
    .from('kunden')
    .insert({
      name: 'Anna Schmidt',
      email: 'anna@example.com',
      telefon: '+49 170 0000000',
      plz: '10115',
      typ: 'privat',
      adresse: null,
      ort: 'Berlin',
      notizen: null,
    })
    .select('id')
    .single()
  if (e1 || !k1) return { ok: false, message: e1?.message ?? 'Kunde 1 fehlgeschlagen' }

  const { data: k2, error: e2 } = await admin
    .from('kunden')
    .insert({
      name: 'Ben Köhler',
      email: 'ben@example.com',
      telefon: null,
      plz: '10437',
      typ: 'privat',
      adresse: null,
      ort: 'Berlin',
      notizen: null,
    })
    .select('id')
    .single()
  if (e2 || !k2) return { ok: false, message: e2?.message ?? 'Kunde 2 fehlgeschlagen' }

  const { data: k3, error: e3 } = await admin
    .from('kunden')
    .insert({
      name: 'Cora Yilmaz GmbH',
      email: null,
      telefon: '+49 151 1111111',
      plz: '12043',
      typ: 'gewerbe',
      adresse: null,
      ort: 'Berlin',
      notizen: null,
    })
    .select('id')
    .single()
  if (e3 || !k3) return { ok: false, message: e3?.message ?? 'Kunde 3 fehlgeschlagen' }

  const kid1 = (k1 as { id: string }).id
  const kid2 = (k2 as { id: string }).id
  const kid3 = (k3 as { id: string }).id

  const { data: l1, error: lErr1 } = await admin
    .from('leads')
    .insert({
      kunde_id: kid1,
      kanal: 'website',
      status: 'neu',
      situation: 'Bad-Renovierung',
      bereiche: ['Fliesen', 'Elektro'],
      preis_min: 8000,
      preis_max: 12000,
      plz: '10115',
      zeitraum: 'Q2',
      kundentyp: 'privat',
      funnel_daten: {},
      kontakt_name: 'Anna Schmidt',
      kontakt_email: 'anna@example.com',
      kontakt_telefon: '+49 170 0000000',
      kontakt_nachricht: 'Kurzfristige Besichtigung möglich?',
      notizen: null,
      erstellt_von: null,
      updated_at: now,
    })
    .select('id')
    .single()
  if (lErr1 || !l1) return { ok: false, message: lErr1?.message ?? 'Lead 1 fehlgeschlagen' }

  const { data: l2, error: lErr2 } = await admin
    .from('leads')
    .insert({
      kunde_id: kid2,
      kanal: 'telefon',
      status: 'kontaktiert',
      situation: 'Küche',
      bereiche: ['Sanitär'],
      preis_min: 4000,
      preis_max: 7000,
      plz: '10437',
      zeitraum: 'Sommer',
      kundentyp: 'privat',
      funnel_daten: {},
      kontakt_name: 'Ben Köhler',
      kontakt_email: 'ben@example.com',
      kontakt_telefon: null,
      kontakt_nachricht: null,
      notizen: 'Rückruf Mo 10:00',
      erstellt_von: null,
      updated_at: new Date(Date.now() - 86400000).toISOString(),
    })
    .select('id')
    .single()
  if (lErr2 || !l2) return { ok: false, message: lErr2?.message ?? 'Lead 2 fehlgeschlagen' }

  const { data: l3, error: lErr3 } = await admin
    .from('leads')
    .insert({
      kunde_id: kid3,
      kanal: 'whatsapp',
      status: 'angebot',
      situation: 'Fenster',
      bereiche: null,
      preis_min: null,
      preis_max: null,
      plz: '12043',
      zeitraum: null,
      kundentyp: 'gewerbe',
      funnel_daten: {},
      kontakt_name: 'Cora Yilmaz',
      kontakt_email: null,
      kontakt_telefon: '+49 151 1111111',
      kontakt_nachricht: null,
      notizen: null,
      erstellt_von: null,
      updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    })
    .select('id')
    .single()
  if (lErr3 || !l3) return { ok: false, message: lErr3?.message ?? 'Lead 3 fehlgeschlagen' }

  const lead1 = (l1 as { id: string }).id
  const lead2 = (l2 as { id: string }).id

  await admin.from('leads_status_history').insert([
    { lead_id: lead1, status_alt: null, status_neu: 'neu', user_id: null },
    { lead_id: lead2, status_alt: null, status_neu: 'neu', user_id: null },
    { lead_id: lead2, status_alt: 'neu', status_neu: 'kontaktiert', user_id: null },
  ])

  await admin.from('kalender_termine').insert([
    {
      lead_id: lead1,
      auftrag_id: null,
      titel: 'Besichtigung Bad',
      beschreibung: null,
      typ: 'besichtigung',
      datum: heute,
      uhrzeit_von: '10:00',
      uhrzeit_bis: '11:00',
      adresse: 'Berlin-Mitte',
      erledigt: false,
    },
    {
      lead_id: null,
      auftrag_id: null,
      titel: 'Abnahme Elektro',
      beschreibung: 'Steckdosen/Wohnzimmer',
      typ: 'abnahme',
      datum: heute,
      uhrzeit_von: '15:30',
      uhrzeit_bis: null,
      adresse: 'Neukölln',
      erledigt: false,
    },
  ])

  return { ok: true }
}

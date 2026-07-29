/** Route → kurzer Kontext für den Assistenten (was der Nutzer gerade sieht). */

export function buildAssistentContextHint(pathname: string): string {
  const path = (pathname || '/').split('?')[0] || '/'
  const parts = path.split('/').filter(Boolean)
  const lines: string[] = [`Aktuelle Route: ${path}`]

  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  const section = parts[0] ?? ''
  const id = parts[1] && uuidRe.test(parts[1]) ? parts[1] : null

  const sectionHint: Record<string, string> = {
    '': 'Dashboard / Übersicht',
    anfragen: 'Anfragen (Leads)',
    angebote: 'Angebote',
    auftraege: 'Aufträge',
    rechnungen: 'Rechnungen',
    kunden: 'Kunden',
    handwerker: 'Partner (Handwerker)',
    partner: 'Netzwerk-Partner',
    kalender: 'Kalender',
    katalog: 'Preisliste / Katalog',
    neu: 'Neu anlegen (FAB-Flow)',
    einstellungen: 'Einstellungen',
  }

  if (section in sectionHint || section === '') {
    lines.push(`Bereich: ${sectionHint[section] ?? section}`)
  }
  if (id) {
    lines.push(`Offene Entity-ID in der URL: ${id} (bei Bedarf get_entity mit passendem typ)`)
  }

  lines.push(
    'Modus: AUSKUNFT (crm_hilfe, search_crm, get_entity, read_document, list_todos) · AUSFÜHREN (crm_aktion, Vorschau dann bestaetigt) · NAVIGIEREN (crm_oeffnen) · PLANEN (plane_arbeitstag). Sidepanel zeigt Links und Vorschau-Karten. Agentische Flows: Anfrage→Angebot→Annehmen→HW-Zuordnung→Rechnung.'
  )

  return lines.join('\n')
}

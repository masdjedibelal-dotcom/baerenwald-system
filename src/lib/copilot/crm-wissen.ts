/**
 * CRM-Wissen für den Assistenten — erklärt Funktionen wie im Dashboard
 * (Auskunft), unabhängig von Live-Daten (search_crm / get_entity).
 */

export type CrmWissenThema = {
  id: string
  aliases: string[]
  titel: string
  route: string
  kurz: string
  soFunktioniertEs: string[]
  typischeAktionen: string[]
  /** crm_aktion IDs oder Tool-Namen */
  tools: string[]
}

export const CRM_WISSEN: CrmWissenThema[] = [
  {
    id: 'ueberblick',
    aliases: ['crm', 'überblick', 'ueberblick', 'hilfe', 'was kannst du', 'dashboard'],
    titel: 'CRM-Überblick',
    route: '/',
    kurz: 'Bärenwald-CRM: Anfragen → Angebote → Aufträge → Rechnungen. Partner = Handwerker, Netzwerk = separate Partner-Tabelle.',
    soFunktioniertEs: [
      'Vorgänge laufen über Anfrage (Lead), Angebot, Auftrag, Rechnung.',
      'Kunden sind Stammdaten; Anfragen hängen oft an einem Kunden.',
      'FAB „Neu“: Anfrage, Angebot, Rechnung, Kunde, Partner (Handwerker).',
      'Assistent (TopBar): Auskunft zu Daten + Erklärung der Funktionen + Ausführung von Aktionen.',
      'Versand (Angebot, Rechnung, Mahnung) immer erst Vorschau, dann Bestätigung.',
    ],
    typischeAktionen: [
      '„Was braucht heute Aufmerksamkeit?“',
      '„Erklär mir den Angebots-Flow“',
      '„Angebot für Müller erstellen“',
      '„Mahnung für Rechnung X senden“',
    ],
    tools: ['search_crm', 'list_crm_aktionen', 'crm_hilfe'],
  },
  {
    id: 'kunden',
    aliases: ['kunde', 'kunden', 'kundstamm', 'stammdaten kunde'],
    titel: 'Kunden',
    route: '/kunden',
    kurz: 'Kundenstamm: Privat, Gewerbe, Hausverwaltung. Angebote/Rechnungen brauchen einen Kunden.',
    soFunktioniertEs: [
      'Liste unter /kunden — Detail mit Objekten, Vorgängen, Kontaktdaten.',
      'Neu: FAB oder Assistent create_kunde / crm_aktion save_kunde.',
      'Kunde wählen vor Angebot/Rechnung (Gate bzw. FAB-Modal).',
      'Suche per Name, E-Mail, Kundennummer (KD-…).',
    ],
    typischeAktionen: ['Kunde anlegen', 'Kunde suchen', 'Kundendetails zeigen'],
    tools: ['search_crm', 'get_entity', 'create_kunde', 'crm_aktion:save_kunde'],
  },
  {
    id: 'anfragen',
    aliases: ['anfrage', 'anfragen', 'lead', 'leads', 'funnel'],
    titel: 'Anfragen',
    route: '/anfragen',
    kurz: 'Eingehende/erfasste Jobs (Leads). Status neu → in Arbeit → Angebot usw.',
    soFunktioniertEs: [
      'Staff-Funnel unter /anfragen/neu oder Website-Lead.',
      'Detail: Situation, Bereiche, Notizen, Termine, nächster Schritt.',
      'Daraus Angebot starten (Wizard).',
      'Verloren markieren, Kontakt updaten, Notizen — per UI oder Assistent.',
    ],
    typischeAktionen: [
      'Neue Anfrage anlegen',
      'Neue Anfragen listen',
      'Notiz hinzufügen',
      'Angebot aus Anfrage',
    ],
    tools: [
      'get_neue_anfragen',
      'create_lead',
      'update_lead_status',
      'prepare_angebot_wizard',
      'crm_aktion:add_lead_notiz',
    ],
  },
  {
    id: 'angebote',
    aliases: ['angebot', 'angebote', 'kalkulation', 'offerte', 'wizard angebot'],
    titel: 'Angebote',
    route: '/angebote',
    kurz: 'Angebots-Wizard: Typ, Positionen (Preisliste/KI), Finalisieren, Vorschau, Versand. Optional Handwerker.',
    soFunktioniertEs: [
      'Neu: Kunde wählen → Wizard (einfach oder komplex mit Projektbeschreibung/Fotos).',
      'Positionen: PosBoard — Preisliste, Freitext, Nachlass; KI nur am Positions-Board.',
      'Titel & Beschreibung sind im KI-Assistenten eigene „Positionen“.',
      'Versand: erst an Handwerker (optional), dann an Kunden.',
      'Nach Kunden-Ja: Auftrag aus Angebot.',
    ],
    typischeAktionen: [
      'Angebot vorbereiten/speichern',
      'Angebot senden',
      'Gültigkeit verlängern',
      'Ablehnen / Angebot annehmen',
    ],
    tools: [
      'prepare_angebot_wizard',
      'save_angebot_wizard',
      'sende_angebot',
      'crm_aktion:send_angebot_kunde',
      'crm_aktion:accept_angebot_and_create_auftrag',
    ],
  },
  {
    id: 'auftraege',
    aliases: ['auftrag', 'auftraege', 'baustelle', 'ausführung', 'ausfuehrung'],
    titel: 'Aufträge',
    route: '/auftraege',
    kurz: 'Nach angenommenem Angebot: Ausführung, Vor Ort & Abschluss, Abnahme, Rechnungen.',
    soFunktioniertEs: [
      'Entsteht aus akzeptiertem Angebot (nicht direkt „Neuer Auftrag“).',
      'Status: geplant → in Arbeit → zur Abnahme → abgeschlossen.',
      'Tab Leistungen: Positionen + Dokumentation; Abnahme über Canvas; Bautagebuch im Portal.',
      'Zahlplan/Abschläge führen zu Rechnungen.',
    ],
    typischeAktionen: [
      'Auftrag starten',
      'Zur Abnahme setzen',
      'Abnahme abschließen',
      'Rechnung zum Auftrag',
    ],
    tools: [
      'get_auftrag_status',
      'crm_aktion:start_auftrag_arbeit',
      'crm_aktion:set_auftrag_zur_abnahme',
      'crm_aktion:complete_auftrag_abnahme',
      'crm_aktion:create_rechnung_entwurf',
    ],
  },
  {
    id: 'rechnungen',
    aliases: ['rechnung', 'rechnungen', 'abrechnung', 'abschlag', 'schlussrechnung'],
    titel: 'Rechnungen',
    route: '/rechnungen',
    kurz: 'Rechnungs-Wizard: Positionen, Zahlfrist/Zahlplan, Versand. Direktrechnung oder zum Auftrag.',
    soFunktioniertEs: [
      'Neu über FAB (Kunde + optional Vorgang) → Wizard.',
      'Abschlag/Schluss bei Aufträgen mit Zahlplan.',
      'Senden per Mail; Status gesendet → bezahlt / Mahnung.',
      'Assistent: create_rechnung_entwurf, send_rechnung.',
    ],
    typischeAktionen: ['Rechnung erstellen', 'Rechnung senden', 'Offene Rechnungen zeigen'],
    tools: [
      'get_offene_rechnungen',
      'crm_aktion:create_rechnung_entwurf',
      'crm_aktion:send_rechnung',
    ],
  },
  {
    id: 'mahnung',
    aliases: ['mahnung', 'mahnen', 'zahlungserinnerung', 'erinnerung zahlung', 'überfällig'],
    titel: 'Mahnung / Zahlungserinnerung',
    route: '/rechnungen',
    kurz: 'Zahlungserinnerung (Stufe 1/2) an Kunden bei offenen Rechnungen.',
    soFunktioniertEs: [
      'Nur sinnvoll bei Rechnung Status gesendet und fällig/überfällig.',
      'Im CRM am Rechnungsdetail oder per Assistent.',
      'Aktion: send_zahlungserinnerung (crm_aktion) — erst Vorschau, dann bestaetigt.',
      '„Mahnung“ = Zahlungserinnerung in diesem CRM.',
    ],
    typischeAktionen: [
      'Überfällige Rechnungen zeigen',
      'Mahnung / Zahlungserinnerung senden',
    ],
    tools: ['get_offene_rechnungen', 'crm_aktion:send_zahlungserinnerung'],
  },
  {
    id: 'partner',
    aliases: ['partner', 'handwerker', 'fachbetrieb', 'netzwerk'],
    titel: 'Partner (Handwerker)',
    route: '/handwerker',
    kurz: 'Partner = Handwerker-Stammdaten. Netzwerk-Tabelle ist getrennt. Anfragen an Partner aus dem Angebot.',
    soFunktioniertEs: [
      'Partner anlegen über FAB „Partner“ (/neu?art=handwerker).',
      'Im Angebot Gewerke zuweisen und an Partner senden.',
      'Portal: Partner sieht Anfragen/Angebote und reicht Preise ein.',
      'Nicht mit „Netzwerk“ (andere Entity) verwechseln.',
    ],
    typischeAktionen: [
      'Handwerker für Gewerk listen',
      'Angebot an Handwerker senden',
      'Einreichungen prüfen',
    ],
    tools: [
      'list_handwerker_gewerk',
      'get_handwerker_offen',
      'crm_aktion:send_angebot_handwerker',
    ],
  },
  {
    id: 'kalender',
    aliases: ['kalender', 'termin', 'termine', 'besichtigung'],
    titel: 'Kalender',
    route: '/kalender',
    kurz: 'Termine: Besichtigung, Beginn, Abnahme, intern.',
    soFunktioniertEs: [
      'Termine an Lead/Auftrag hängen möglich.',
      'Assistent: create_termin / save_kalender_termin.',
    ],
    typischeAktionen: ['Heutige Termine', 'Termin anlegen', 'Termin erledigt'],
    tools: ['get_heutige_termine', 'get_termine', 'create_termin', 'crm_aktion:save_kalender_termin'],
  },
]

export function listCrmWissenThemen(): Array<{ id: string; titel: string; kurz: string }> {
  return CRM_WISSEN.map((t) => ({ id: t.id, titel: t.titel, kurz: t.kurz }))
}

export function lookupCrmWissen(query: string): CrmWissenThema[] {
  const q = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  if (!q) return [CRM_WISSEN[0]!]

  const scored = CRM_WISSEN.map((t) => {
    let score = 0
    const hay = [t.id, t.titel, t.kurz, ...t.aliases].join(' ').toLowerCase()
    if (t.id === q || t.aliases.some((a) => a === q)) score += 100
    for (const a of t.aliases) {
      if (q.includes(a) || a.includes(q)) score += 40
    }
    if (hay.includes(q)) score += 20
    for (const part of q.split(/\s+/)) {
      if (part.length > 2 && hay.includes(part)) score += 8
    }
    return { t, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  if (!scored.length) return [CRM_WISSEN[0]!]
  return scored.slice(0, 3).map((x) => x.t)
}

export function formatCrmWissenForTool(themen: CrmWissenThema[]): string {
  return themen
    .map((t) =>
      [
        `## ${t.titel} (${t.route})`,
        t.kurz,
        '',
        'So funktioniert es:',
        ...t.soFunktioniertEs.map((s) => `• ${s}`),
        '',
        'Typische Nutzerwünsche:',
        ...t.typischeAktionen.map((s) => `• ${s}`),
        '',
        `Tools/Aktionen: ${t.tools.join(', ')}`,
      ].join('\n')
    )
    .join('\n\n')
}

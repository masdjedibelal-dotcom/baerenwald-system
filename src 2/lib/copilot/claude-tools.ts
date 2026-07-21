import type Anthropic from '@anthropic-ai/sdk'

const emptySchema = {
  type: 'object' as const,
  properties: {},
  additionalProperties: false,
}

export const COPILOT_CLAUDE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_neue_anfragen',
    description: 'Neue Anfragen aus dem CRM laden',
    input_schema: emptySchema,
  },
  {
    name: 'get_heutige_termine',
    description: 'Heutige Termine laden (Kurzform für heute)',
    input_schema: emptySchema,
  },
  {
    name: 'get_termine',
    description: 'Kalender-Termine in einem Datumsbereich laden (von/bis als yyyy-mm-dd)',
    input_schema: {
      type: 'object',
      properties: {
        von: { type: 'string', description: 'Startdatum yyyy-mm-dd' },
        bis: { type: 'string', description: 'Enddatum yyyy-mm-dd' },
      },
      required: ['von', 'bis'],
      additionalProperties: false,
    },
  },
  {
    name: 'search_crm',
    description: 'CRM durchsuchen (Name, E-Mail, Angebotsnr., etc.)',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        types: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: lead, kunde, angebot, termin, rechnung',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_entity',
    description:
      'Einzelnen Datensatz laden (lead, kunde, angebot, termin, rechnung). Bei Kunden: UUID, Kundennummer (KD-…) oder Name — kein erfundener Slug.',
    input_schema: {
      type: 'object',
      properties: {
        typ: { type: 'string' },
        id: {
          type: 'string',
          description: 'UUID aus search_crm. Bei Kunden alternativ Kundennummer oder voller Name.',
        },
      },
      required: ['typ', 'id'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_offene_angebote',
    description: 'Offene Angebote laden',
    input_schema: emptySchema,
  },
  {
    name: 'get_offene_rechnungen',
    description: 'Offene Rechnungen (Status gesendet) laden',
    input_schema: emptySchema,
  },
  {
    name: 'get_auftrag_status',
    description: 'Aktive Aufträge laden',
    input_schema: emptySchema,
  },
  {
    name: 'get_handwerker_offen',
    description: 'Handwerker-Einreichungen in Prüfung laden',
    input_schema: emptySchema,
  },
  {
    name: 'create_termin',
    description: 'Neuen Kalender-Termin erstellen',
    input_schema: {
      type: 'object',
      properties: {
        titel: { type: 'string' },
        start_zeit: { type: 'string', description: 'ISO 8601, z. B. 2026-06-10T10:00:00' },
        end_zeit: { type: 'string' },
        ort: { type: 'string', description: 'Adresse / Ort' },
        notizen: { type: 'string' },
        lead_id: { type: 'string' },
        typ: { type: 'string' },
      },
      required: ['titel', 'start_zeit'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_notiz',
    description: 'Notiz zu einer Anfrage (Lead)',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['lead_id', 'text'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_kunde',
    description: 'Neuen Kundenstamm anlegen',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        telefon: { type: 'string' },
        typ: { type: 'string', description: 'privat oder gewerbe' },
        plz: { type: 'string' },
        ort: { type: 'string' },
      },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_crm_aktionen',
    description:
      'Alle verfügbaren CRM-Schreibaktionen listen (Angebote, Leads, Aufträge, Rechnungen, Kalender, …)',
    input_schema: {
      type: 'object',
      properties: {
        kategorie: {
          type: 'string',
          description: 'Optional: angebote, leads, kunden, auftraege, rechnungen, kalender, kommunikation',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'crm_aktion',
    description:
      'Beliebige CRM-Aktion ausführen (siehe list_crm_aktionen). Bei bestaetigung:true Aktionen erst Vorschau, dann mit bestaetigt:true.',
    input_schema: {
      type: 'object',
      properties: {
        aktion: { type: 'string' },
        params: { type: 'object' },
        bestaetigt: { type: 'boolean' },
      },
      required: ['aktion'],
      additionalProperties: false,
    },
  },
  {
    name: 'prepare_angebot_wizard',
    description:
      'Angebots-Wizard vorbereiten: Lead laden, Positionen vorschlagen, fehlende_felder zurückgeben — fehlende Infos bei Belal erfragen',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string' },
        angebot_id: { type: 'string', description: 'Optional: bestehenden Entwurf bearbeiten' },
      },
      required: ['lead_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'save_angebot_wizard',
    description:
      'Vollständigen Wizard-Entwurf speichern (wie im CRM-Wizard: Positionen, Meta, Projekt, Handwerker). Gibt fehlende_felder zurück wenn unvollständig.',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string' },
        angebot_id: { type: 'string' },
        kunde_id: { type: 'string' },
        dokument_typ: { type: 'string' },
        titel: { type: 'string' },
        leistungsumfang: { type: 'string' },
        projektbeschreibung: { type: 'string' },
        zahlungsbedingungen: { type: 'string' },
        gueltig_bis: { type: 'string' },
        einleitung: { type: 'string' },
        schluss: { type: 'string' },
        hinweise: { type: 'string' },
        wichtige_hinweise: { type: 'string' },
        positionen: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              gewerk_slug: { type: 'string' },
              beschreibung: { type: 'string' },
              leistung: { type: 'string' },
              menge: { type: 'number' },
              einheit: { type: 'string' },
              preis_netto: { type: 'number' },
            },
          },
        },
        handwerker_zuweisungen: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              gewerk_slug: { type: 'string' },
              handwerker_id: { type: 'string' },
              aufgabe_notiz: { type: 'string' },
            },
          },
        },
      },
      required: ['lead_id', 'positionen'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_handwerker_gewerk',
    description: 'Handwerker für ein Gewerk auflisten (Wizard Schritt 3)',
    input_schema: {
      type: 'object',
      properties: {
        gewerk_slug: { type: 'string' },
        gewerk_id: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_angebot_entwurf',
    description: 'Schnell-Entwurf mit einer Position (für voller Wizard: prepare_angebot_wizard + save_angebot_wizard)',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string' },
        kunde_id: { type: 'string' },
        leistungsumfang: { type: 'string' },
        position_beschreibung: { type: 'string' },
        preis_netto: { type: 'number' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'create_lead',
    description: 'Neue Anfrage anlegen',
    input_schema: {
      type: 'object',
      properties: {
        kontakt_name: { type: 'string' },
        kontakt_telefon: { type: 'string' },
        kontakt_email: { type: 'string' },
        kontakt_nachricht: { type: 'string' },
        bereiche: { type: 'array', items: { type: 'string' } },
        situation: { type: 'string' },
        plz: { type: 'string' },
        kanal: { type: 'string' },
      },
      required: ['kontakt_name'],
      additionalProperties: false,
    },
  },
  {
    name: 'update_lead_status',
    description: 'Lead-Status ändern',
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string' },
        status: { type: 'string' },
      },
      required: ['lead_id', 'status'],
      additionalProperties: false,
    },
  },
  {
    name: 'send_mail_kunde',
    description:
      'Freitext-Mail an Kunden senden. Ohne bestaetigt: true nur Vorschau — erst nach Bestätigung durch Belal versenden.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        name: { type: 'string' },
        betreff: { type: 'string' },
        text: { type: 'string' },
        bestaetigt: {
          type: 'boolean',
          description: 'true = wirklich senden; false/fehlt = nur Vorschau',
        },
      },
      required: ['to', 'name', 'betreff', 'text'],
      additionalProperties: false,
    },
  },
  {
    name: 'sende_angebot',
    description:
      'Angebot per Mail senden. Suche per angebot_id, Angebotsnr. oder Kundenname (suche). Ohne bestaetigt: true nur Vorschau.',
    input_schema: {
      type: 'object',
      properties: {
        angebot_id: { type: 'string' },
        suche: { type: 'string', description: 'Angebotsnr. oder Kundenname' },
        bestaetigt: {
          type: 'boolean',
          description: 'true = wirklich senden; false/fehlt = nur Vorschau',
        },
      },
      additionalProperties: false,
    },
  },
]

export { COPILOT_MODEL_PRIMARY, getClaudeModel } from './claude-api-key'

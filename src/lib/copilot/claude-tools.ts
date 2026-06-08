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
    description: 'Heutige Termine laden',
    input_schema: emptySchema,
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
    description: 'Freitext-Mail an Kunden senden',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        name: { type: 'string' },
        betreff: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['to', 'name', 'betreff', 'text'],
      additionalProperties: false,
    },
  },
  {
    name: 'sende_angebot',
    description: 'Bestehendes Angebot per Mail senden',
    input_schema: {
      type: 'object',
      properties: {
        angebot_id: { type: 'string' },
      },
      required: ['angebot_id'],
      additionalProperties: false,
    },
  },
]

export { COPILOT_MODEL_PRIMARY, getClaudeModel } from './claude-api-key'

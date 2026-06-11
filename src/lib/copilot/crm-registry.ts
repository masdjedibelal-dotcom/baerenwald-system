import 'server-only'

import {
  acceptAngebotAndCreateAuftrag,
  markAngebotAbgelehntEinfach,
  sendAngebotNachfassManuellAction,
} from '@/app/(dashboard)/angebote/angebot-flow-actions'
import { extendAngebotGueltigkeit } from '@/app/(dashboard)/angebote/extend-gueltigkeit-action'
import {
  bestaetigeHandwerkerEinreichung,
  createAuftragFromAngebot,
  deleteAngebot,
  listAngebotVorlagen,
  markKundeAkzeptiert,
  sendAngebotToHandwerker,
  sendAngebotToKunde,
} from '@/app/(dashboard)/angebote/actions'
import {
  updateLeadKontakt,
  updateLeadNotizen,
  addLeadNotizRow,
  saveLeadAlsVerloren,
} from '@/app/(dashboard)/anfragen/actions'
import {
  createRechnungEntwurf,
  sendRechnung,
  sendZahlungserinnerungMail,
} from '@/app/(dashboard)/rechnungen/actions'
import {
  completeAuftragAbnahme,
  setAuftragZurAbnahme,
  startAuftragArbeit,
  updateAuftragStatusFromUi,
} from '@/app/(dashboard)/auftraege/actions'
import {
  resolveAngebotId,
  resolveKundeId,
  previewSendAngebot,
  createKundeCopilot,
} from '@/lib/copilot/crm-actions'
import { sendMailKunde } from '@/lib/copilot/tools'
import {
  listHandwerkerFuerGewerkCopilot,
  prepareAngebotWizardCopilot,
  saveAngebotWizardCopilot,
} from '@/lib/copilot/wizard-copilot'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { AuftragStatus, LeadStatus } from '@/lib/types'

export type CrmActionMeta = {
  id: string
  kategorie: string
  beschreibung: string
  params: string[]
  /** Senden/Löschen/Ablehnen — erst Vorschau, dann bestaetigt: true */
  bestaetigung?: boolean
}

export type CrmActionHandler = (params: Record<string, unknown>) => Promise<unknown>

function str(p: Record<string, unknown>, key: string): string {
  return String(p[key] ?? '').trim()
}

function optionalStr(p: Record<string, unknown>, key: string): string | undefined {
  const v = str(p, key)
  return v || undefined
}

async function resolveAngebotParam(p: Record<string, unknown>): Promise<string | { error: string }> {
  const id = optionalStr(p, 'angebot_id')
  const suche = optionalStr(p, 'suche')
  const resolved = await resolveAngebotId({ angebot_id: id, suche })
  if ('error' in resolved) return resolved
  return resolved.id
}

export const CRM_ACTION_REGISTRY: Record<
  string,
  { meta: CrmActionMeta; handler: CrmActionHandler; preview?: CrmActionHandler }
> = {
  // ── Angebote / Wizard ──
  prepare_angebot_wizard: {
    meta: {
      id: 'prepare_angebot_wizard',
      kategorie: 'angebote',
      beschreibung: 'Wizard vorbereiten: Lead laden, Positionen vorschlagen, fehlende Felder listen',
      params: ['lead_id', 'angebot_id?'],
    },
    handler: (p) => prepareAngebotWizardCopilot({ lead_id: str(p, 'lead_id'), angebot_id: optionalStr(p, 'angebot_id') }),
  },
  save_angebot_wizard: {
    meta: {
      id: 'save_angebot_wizard',
      kategorie: 'angebote',
      beschreibung: 'Vollständigen Wizard-Entwurf speichern (Positionen, Meta, Handwerker, Projekt)',
      params: [
        'lead_id',
        'positionen[]',
        'angebot_id?',
        'kunde_id?',
        'dokument_typ?',
        'titel?',
        'leistungsumfang?',
        'projektbeschreibung?',
        'zahlungsbedingungen?',
        'gueltig_bis?',
        'einleitung?',
        'schluss?',
        'handwerker_zuweisungen[]?',
      ],
    },
    handler: (p) => saveAngebotWizardCopilot(p as Parameters<typeof saveAngebotWizardCopilot>[0]),
  },
  list_handwerker_gewerk: {
    meta: {
      id: 'list_handwerker_gewerk',
      kategorie: 'angebote',
      beschreibung: 'Handwerker für ein Gewerk (slug oder id)',
      params: ['gewerk_slug oder gewerk_id'],
    },
    handler: (p) =>
      listHandwerkerFuerGewerkCopilot(str(p, 'gewerk_slug') || str(p, 'gewerk_id')),
  },
  list_angebot_vorlagen: {
    meta: {
      id: 'list_angebot_vorlagen',
      kategorie: 'angebote',
      beschreibung: 'Angebots-Vorlagen laden',
      params: [],
    },
    handler: async () => listAngebotVorlagen(),
  },
  send_angebot_handwerker: {
    meta: {
      id: 'send_angebot_handwerker',
      kategorie: 'angebote',
      beschreibung: 'Angebot an zugewiesene Handwerker senden',
      params: ['angebot_id oder suche'],
      bestaetigung: true,
    },
    preview: async (p) => {
      const id = await resolveAngebotParam(p)
      if (typeof id !== 'string') return id
      const { data } = await supabaseAdmin
        .from('angebote')
        .select('angebotsnr, leistungsumfang, angebot_handwerker(handwerker(name))')
        .eq('id', id)
        .maybeSingle()
      return {
        vorschau: true,
        aktion: 'send_angebot_handwerker',
        angebot_id: id,
        angebotsnr: data?.angebotsnr,
        leistungsumfang: data?.leistungsumfang,
        hinweis: 'Mit bestaetigt: true senden',
      }
    },
    handler: async (p) => {
      const id = await resolveAngebotParam(p)
      if (typeof id !== 'string') return id
      return sendAngebotToHandwerker(id, { asSystem: true })
    },
  },
  send_angebot_kunde: {
    meta: {
      id: 'send_angebot_kunde',
      kategorie: 'angebote',
      beschreibung: 'Angebot per Mail an Kunden senden',
      params: ['angebot_id oder suche', 'betreff?'],
      bestaetigung: true,
    },
    preview: async (p) => {
      const id = await resolveAngebotParam(p)
      if (typeof id !== 'string') return id
      return previewSendAngebot(id)
    },
    handler: async (p) => {
      const id = await resolveAngebotParam(p)
      if (typeof id !== 'string') return id
      return sendAngebotToKunde(id, {
        asSystem: true,
        betreff: optionalStr(p, 'betreff'),
      })
    },
  },
  send_angebot_einfach: {
    meta: {
      id: 'send_angebot_einfach',
      kategorie: 'angebote',
      beschreibung: 'Einfach-Flow: senden + status_einfach gesendet',
      params: ['angebot_id oder suche'],
      bestaetigung: true,
    },
    preview: async (p) => {
      const id = await resolveAngebotParam(p)
      if (typeof id !== 'string') return id
      return previewSendAngebot(id)
    },
    handler: async (p) => {
      const id = await resolveAngebotParam(p)
      if (typeof id !== 'string') return id
      const sent = await sendAngebotToKunde(id, { asSystem: true })
      if (!sent.ok) return sent
      const now = new Date().toISOString()
      const gueltig = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
      await supabaseAdmin
        .from('angebote')
        .update({
          status_einfach: 'gesendet',
          status: 'gesendet_kunde',
          gesendet_am: now,
          gesendet_kunde_at: now,
          gueltig_bis: gueltig,
          updated_at: now,
        })
        .eq('id', id)
      return { ok: true, angebot_id: id }
    },
  },
  accept_angebot_kunde: {
    meta: {
      id: 'accept_angebot_kunde',
      kategorie: 'angebote',
      beschreibung: 'Kunde hat angenommen — Status setzen',
      params: ['angebot_id oder suche'],
      bestaetigung: true,
    },
    handler: async (p) => {
      const id = await resolveAngebotParam(p)
      if (typeof id !== 'string') return id
      const st = await markKundeAkzeptiert(id, { asSystem: true })
      return st
    },
  },
  reject_angebot: {
    meta: {
      id: 'reject_angebot',
      kategorie: 'angebote',
      beschreibung: 'Angebot abgelehnt markieren',
      params: ['angebot_id oder suche', 'grund', 'notiz?'],
      bestaetigung: true,
    },
    handler: async (p) => {
      const id = await resolveAngebotParam(p)
      if (typeof id !== 'string') return id
      return markAngebotAbgelehntEinfach({
        angebotId: id,
        grund: str(p, 'grund'),
        notiz: optionalStr(p, 'notiz'),
      })
    },
  },
  create_auftrag_from_angebot: {
    meta: {
      id: 'create_auftrag_from_angebot',
      kategorie: 'angebote',
      beschreibung: 'Auftrag aus angenommenem Angebot erstellen',
      params: ['angebot_id oder suche', 'start_datum?', 'end_datum?', 'send_kunden_email?'],
      bestaetigung: true,
    },
    handler: async (p) => {
      const id = await resolveAngebotParam(p)
      if (typeof id !== 'string') return id
      return createAuftragFromAngebot(id, {
        start_datum: optionalStr(p, 'start_datum') ?? null,
        end_datum: optionalStr(p, 'end_datum') ?? null,
        send_kunden_email: p.send_kunden_email !== false,
        send_handwerker_email: p.send_handwerker_email !== false,
      })
    },
  },
  accept_angebot_and_create_auftrag: {
    meta: {
      id: 'accept_angebot_and_create_auftrag',
      kategorie: 'angebote',
      beschreibung: 'Angebot annehmen + Auftrag in einem Schritt',
      params: ['angebot_id oder suche', 'start_datum?', 'end_datum?'],
      bestaetigung: true,
    },
    handler: async (p) => {
      const id = await resolveAngebotParam(p)
      if (typeof id !== 'string') return id
      return acceptAngebotAndCreateAuftrag(id, {
        start_datum: optionalStr(p, 'start_datum'),
        end_datum: optionalStr(p, 'end_datum'),
        send_kunden_email: p.send_kunden_email !== false,
        asSystem: true,
      })
    },
  },
  send_angebot_nachfass: {
    meta: {
      id: 'send_angebot_nachfass',
      kategorie: 'angebote',
      beschreibung: 'Nachfass-Mail für offenes Angebot',
      params: ['angebot_id oder suche'],
      bestaetigung: true,
    },
    handler: async (p) => {
      const id = await resolveAngebotParam(p)
      if (typeof id !== 'string') return id
      return sendAngebotNachfassManuellAction(id)
    },
  },
  extend_angebot_gueltigkeit: {
    meta: {
      id: 'extend_angebot_gueltigkeit',
      kategorie: 'angebote',
      beschreibung: 'Gültigkeit eines gesendeten Angebots verlängern',
      params: ['angebot_id oder suche', 'gueltig_bis (yyyy-mm-dd)'],
    },
    handler: async (p) => {
      const id = await resolveAngebotParam(p)
      if (typeof id !== 'string') return id
      return extendAngebotGueltigkeit({ angebotId: id, gueltigBis: str(p, 'gueltig_bis') })
    },
  },
  bestaetige_handwerker_einreichung: {
    meta: {
      id: 'bestaetige_handwerker_einreichung',
      kategorie: 'angebote',
      beschreibung: 'Handwerker-Einreichung übernehmen und bestätigen',
      params: ['angebot_id', 'zuweisung_id'],
      bestaetigung: true,
    },
    handler: (p) =>
      bestaetigeHandwerkerEinreichung({
        angebotId: str(p, 'angebot_id'),
        zuweisungId: str(p, 'zuweisung_id'),
      }),
  },
  delete_angebot: {
    meta: {
      id: 'delete_angebot',
      kategorie: 'angebote',
      beschreibung: 'Angebot löschen (nur ohne Auftrag)',
      params: ['angebot_id oder suche'],
      bestaetigung: true,
    },
    handler: async (p) => {
      const id = await resolveAngebotParam(p)
      if (typeof id !== 'string') return id
      return deleteAngebot(id)
    },
  },

  // ── Leads ──
  update_lead_kontakt: {
    meta: {
      id: 'update_lead_kontakt',
      kategorie: 'leads',
      beschreibung: 'Kontaktdaten einer Anfrage aktualisieren',
      params: ['lead_id', 'kontakt_name?', 'kontakt_email?', 'kontakt_telefon?', 'plz?'],
    },
    handler: (p) =>
      updateLeadKontakt(str(p, 'lead_id'), {
        kontakt_name: str(p, 'kontakt_name') || 'Unbekannt',
        kontakt_email: optionalStr(p, 'kontakt_email') ?? null,
        kontakt_telefon: optionalStr(p, 'kontakt_telefon') ?? null,
        plz: optionalStr(p, 'plz') ?? null,
      }),
  },
  update_lead_notizen: {
    meta: {
      id: 'update_lead_notizen',
      kategorie: 'leads',
      beschreibung: 'Interne Lead-Notizen aktualisieren',
      params: ['lead_id', 'notizen'],
    },
    handler: (p) => updateLeadNotizen(str(p, 'lead_id'), str(p, 'notizen')),
  },
  add_lead_notiz: {
    meta: {
      id: 'add_lead_notiz',
      kategorie: 'leads',
      beschreibung: 'Notiz-Zeile zu Lead hinzufügen',
      params: ['lead_id', 'inhalt'],
    },
    handler: (p) => addLeadNotizRow(str(p, 'lead_id'), str(p, 'inhalt')),
  },
  mark_lead_verloren: {
    meta: {
      id: 'mark_lead_verloren',
      kategorie: 'leads',
      beschreibung: 'Lead als verloren markieren',
      params: ['lead_id', 'grund?', 'notiz?'],
      bestaetigung: true,
    },
    handler: (p) =>
      saveLeadAlsVerloren({
        leadId: str(p, 'lead_id'),
        grund: str(p, 'grund') || 'sonstiges',
        notiz: optionalStr(p, 'notiz') ?? null,
      }),
  },
  update_lead_status: {
    meta: {
      id: 'update_lead_status',
      kategorie: 'leads',
      beschreibung: 'Lead-Status ändern',
      params: ['lead_id', 'status'],
    },
    handler: async (p) => {
      const leadId = str(p, 'lead_id')
      const status = str(p, 'status') as LeadStatus
      const { data: lead } = await supabaseAdmin
        .from('leads')
        .select('status')
        .eq('id', leadId)
        .maybeSingle()
      if (!lead) return { error: 'Lead nicht gefunden' }
      const { error } = await supabaseAdmin
        .from('leads')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', leadId)
      if (error) return { error: error.message }
      await supabaseAdmin.from('leads_status_history').insert({
        lead_id: leadId,
        status_alt: lead.status,
        status_neu: status,
        user_id: null,
      })
      return { ok: true }
    },
  },

  // ── Kunden ──
  save_kunde: {
    meta: {
      id: 'save_kunde',
      kategorie: 'kunden',
      beschreibung: 'Kunde anlegen oder aktualisieren',
      params: ['name', 'id?', 'email?', 'telefon?', 'typ?', 'plz?', 'ort?', 'adresse?'],
    },
    handler: async (p) => {
      const id = optionalStr(p, 'id')
      const patch = {
        name: str(p, 'name'),
        email: optionalStr(p, 'email'),
        telefon: optionalStr(p, 'telefon'),
        typ: optionalStr(p, 'typ') ?? 'privat',
        plz: optionalStr(p, 'plz'),
        ort: optionalStr(p, 'ort'),
      }
      if (id) {
        let kundeId = id
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
          const resolved = await resolveKundeId({ kunde_id: id })
          if ('error' in resolved) return resolved
          kundeId = resolved.id
        }
        const { error } = await supabaseAdmin
          .from('kunden')
          .update({
            name: patch.name,
            email: patch.email ?? null,
            telefon: patch.telefon ?? null,
            typ: patch.typ,
            plz: patch.plz ?? null,
            ort: patch.ort ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', kundeId)
        if (error) return { error: error.message }
        return { ok: true, id: kundeId }
      }
      return createKundeCopilot(patch)
    },
  },

  // ── Aufträge ──
  update_auftrag_status: {
    meta: {
      id: 'update_auftrag_status',
      kategorie: 'auftraege',
      beschreibung: 'Auftragsstatus ändern',
      params: ['auftrag_id', 'status'],
    },
    handler: (p) =>
      updateAuftragStatusFromUi(str(p, 'auftrag_id'), str(p, 'status') as AuftragStatus),
  },
  start_auftrag_arbeit: {
    meta: {
      id: 'start_auftrag_arbeit',
      kategorie: 'auftraege',
      beschreibung: 'Auftrag starten (Arbeit beginnt)',
      params: ['auftrag_id'],
      bestaetigung: true,
    },
    handler: (p) => startAuftragArbeit(str(p, 'auftrag_id')),
  },
  set_auftrag_zur_abnahme: {
    meta: {
      id: 'set_auftrag_zur_abnahme',
      kategorie: 'auftraege',
      beschreibung: 'Auftrag zur Abnahme freigeben',
      params: ['auftrag_id'],
      bestaetigung: true,
    },
    handler: (p) => setAuftragZurAbnahme(str(p, 'auftrag_id')),
  },
  complete_auftrag_abnahme: {
    meta: {
      id: 'complete_auftrag_abnahme',
      kategorie: 'auftraege',
      beschreibung: 'Abnahme abschließen',
      params: ['auftrag_id'],
      bestaetigung: true,
    },
    handler: (p) => completeAuftragAbnahme(str(p, 'auftrag_id')),
  },

  // ── Rechnungen ──
  create_rechnung_entwurf: {
    meta: {
      id: 'create_rechnung_entwurf',
      kategorie: 'rechnungen',
      beschreibung: 'Rechnungs-Entwurf aus Auftrag anlegen',
      params: ['auftrag_id'],
    },
    handler: async (p) => {
      const auftragId = str(p, 'auftrag_id')
      const { data: auftrag } = await supabaseAdmin
        .from('auftraege')
        .select('id, kunde_id, angebot_id')
        .eq('id', auftragId)
        .maybeSingle()
      if (!auftrag?.kunde_id) return { error: 'Auftrag/Kunde nicht gefunden' }
      if (!Array.isArray(p.positionen) || p.positionen.length === 0) {
        return {
          error: 'positionen fehlen',
          fehlende_felder: ['positionen', 'leistungszeitraum_von', 'leistungszeitraum_bis', 'faellig_am'],
          hinweis: 'Positionen und Zeiträume erfragen, dann erneut aufrufen',
        }
      }
      const heute = new Date().toISOString().slice(0, 10)
      return createRechnungEntwurf({
        auftrag_id: auftragId,
        angebot_id: (auftrag.angebot_id as string | null) ?? null,
        kunde_id: auftrag.kunde_id as string,
        positionen: p.positionen as import('@/lib/types').AngebotPosition[],
        leistungszeitraum_von: optionalStr(p, 'leistungszeitraum_von') ?? heute,
        leistungszeitraum_bis: optionalStr(p, 'leistungszeitraum_bis') ?? heute,
        faellig_am: optionalStr(p, 'faellig_am') ?? heute,
        hinweise: optionalStr(p, 'notizen') ?? null,
      })
    },
  },
  send_rechnung: {
    meta: {
      id: 'send_rechnung',
      kategorie: 'rechnungen',
      beschreibung: 'Rechnung an Kunden senden',
      params: ['rechnung_id'],
      bestaetigung: true,
    },
    handler: (p) => sendRechnung(str(p, 'rechnung_id')),
  },
  send_zahlungserinnerung: {
    meta: {
      id: 'send_zahlungserinnerung',
      kategorie: 'rechnungen',
      beschreibung: 'Zahlungserinnerung senden',
      params: ['rechnung_id'],
      bestaetigung: true,
    },
    handler: async (p) => {
      const rechnungId = str(p, 'rechnung_id')
      const { data: rec } = await supabaseAdmin
        .from('rechnungen')
        .select('kunden(email)')
        .eq('id', rechnungId)
        .maybeSingle()
      const kunde = Array.isArray(rec?.kunden) ? rec?.kunden[0] : rec?.kunden
      const email = (kunde as { email?: string } | null)?.email?.trim()
      if (!email) return { error: 'Keine Kunden-E-Mail' }
      return sendZahlungserinnerungMail(rechnungId, {
        stufe: (Number(optionalStr(p, 'stufe') ?? '1') === 2 ? 2 : 1) as 1 | 2,
        to: [email],
      })
    },
  },

  // ── Kalender ──
  save_kalender_termin: {
    meta: {
      id: 'save_kalender_termin',
      kategorie: 'kalender',
      beschreibung: 'Termin anlegen oder bearbeiten',
      params: [
        'titel',
        'datum (yyyy-mm-dd)',
        'typ?',
        'uhrzeit_von?',
        'uhrzeit_bis?',
        'adresse?',
        'beschreibung?',
        'lead_id?',
        'auftrag_id?',
        'id?',
      ],
    },
    handler: async (p) => {
      const payload = {
        titel: str(p, 'titel'),
        typ: (optionalStr(p, 'typ') ?? 'sonstiges') as 'sonstiges',
        datum: str(p, 'datum'),
        uhrzeit_von: optionalStr(p, 'uhrzeit_von') ?? null,
        uhrzeit_bis: optionalStr(p, 'uhrzeit_bis') ?? null,
        adresse: optionalStr(p, 'adresse') ?? null,
        beschreibung: optionalStr(p, 'beschreibung') ?? null,
        lead_id: optionalStr(p, 'lead_id') ?? null,
        auftrag_id: optionalStr(p, 'auftrag_id') ?? null,
        erledigt: false,
      }
      const existingId = optionalStr(p, 'id')
      if (existingId) {
        const { error } = await supabaseAdmin.from('kalender_termine').update(payload).eq('id', existingId)
        if (error) return { error: error.message }
        return { ok: true, id: existingId }
      }
      const { data, error } = await supabaseAdmin
        .from('kalender_termine')
        .insert(payload)
        .select('id')
        .single()
      if (error) return { error: error.message }
      return { ok: true, id: data.id }
    },
  },
  delete_kalender_termin: {
    meta: {
      id: 'delete_kalender_termin',
      kategorie: 'kalender',
      beschreibung: 'Termin löschen',
      params: ['id'],
      bestaetigung: true,
    },
    handler: async (p) => {
      const id = str(p, 'id')
      const { error } = await supabaseAdmin.from('kalender_termine').delete().eq('id', id)
      if (error) return { error: error.message }
      return { ok: true }
    },
  },
  termin_erledigt: {
    meta: {
      id: 'termin_erledigt',
      kategorie: 'kalender',
      beschreibung: 'Termin als erledigt/offen markieren',
      params: ['id', 'erledigt (boolean)'],
    },
    handler: async (p) => {
      const id = str(p, 'id')
      const erledigt = p.erledigt === true || p.erledigt === 'true'
      const { error } = await supabaseAdmin.from('kalender_termine').update({ erledigt }).eq('id', id)
      if (error) return { error: error.message }
      return { ok: true }
    },
  },

  // ── Kommunikation ──
  send_freitext_kunde: {
    meta: {
      id: 'send_freitext_kunde',
      kategorie: 'kommunikation',
      beschreibung: 'Freitext-Mail (CRM-Vorlage)',
      params: ['an', 'name', 'betreff', 'text', 'kunde_id?', 'lead_id?'],
      bestaetigung: true,
    },
    preview: async (p) => ({
      vorschau: true,
      an: str(p, 'an'),
      betreff: str(p, 'betreff'),
      text_vorschau: str(p, 'text').slice(0, 400),
    }),
    handler: (p) =>
      sendMailKunde({
        to: str(p, 'an'),
        name: str(p, 'name'),
        betreff: str(p, 'betreff'),
        text: str(p, 'text'),
        bestaetigt: true,
      }),
  },
}

export function listCrmAktionen(kategorie?: string): CrmActionMeta[] {
  return Object.values(CRM_ACTION_REGISTRY)
    .map((e) => e.meta)
    .filter((m) => !kategorie || m.kategorie === kategorie)
}

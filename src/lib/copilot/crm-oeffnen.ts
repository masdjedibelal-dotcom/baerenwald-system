import {
  createAngebotHref,
  createAnfrageHref,
  createKundeHref,
  createRechnungHref,
  createPartnerHref,
} from '@/lib/crm/create-entry'

export type CrmOeffnenZiel =
  | 'anfrage'
  | 'angebot'
  | 'angebot_wizard'
  | 'angebot_positionen'
  | 'rechnung'
  | 'rechnung_neu'
  | 'auftrag'
  | 'kunde'
  | 'kunde_neu'
  | 'partner_neu'
  | 'kalender'
  | 'vorgaenge'
  | 'lead_auskunft'

/**
 * Baut Deep-Links ins CRM — inkl. Tab/Wizard-Schritt für „ins richtige Feld springen“.
 */
export function buildCrmOeffnenLink(input: {
  ziel: string
  id?: string | null
  kunde_id?: string | null
  lead_id?: string | null
  tab?: string | null
  wizard_step?: number | null
  focus?: string | null
}): { ok: true; href: string; label: string; hint?: string } | { ok: false; error: string } {
  const ziel = input.ziel.trim().toLowerCase() as CrmOeffnenZiel | string
  const id = input.id?.trim() || ''
  const kundeId = input.kunde_id?.trim() || ''
  const leadId = input.lead_id?.trim() || id
  const tab = input.tab?.trim() || ''
  const step = input.wizard_step && input.wizard_step >= 1 ? Math.min(5, input.wizard_step) : null
  const focus = input.focus?.trim() || ''

  const q = (base: string, params: Record<string, string | null | undefined>) => {
    const u = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v) u.set(k, v)
    }
    const s = u.toString()
    return s ? `${base}?${s}` : base
  }

  switch (ziel) {
    case 'anfrage':
    case 'lead_auskunft': {
      if (!leadId) return { ok: false, error: 'id (Anfrage) fehlt' }
      const t = ziel === 'lead_auskunft' ? tab || 'details' : tab
      return {
        ok: true,
        href: q(`/anfragen/${leadId}`, { tab: t || null }),
        label: ziel === 'lead_auskunft' ? 'Lead-Auskunft öffnen' : 'Anfrage öffnen',
        hint: t ? `Tab: ${t}` : undefined,
      }
    }
    case 'angebot_wizard':
    case 'angebot_positionen': {
      if (!leadId && !id) return { ok: false, error: 'lead_id oder angebot id fehlt' }
      if (id && !leadId) {
        // Bestehendes Angebot → Detail, Bearbeiten manuell
        return {
          ok: true,
          href: `/angebote/${id}`,
          label: 'Angebot öffnen',
          hint: ziel === 'angebot_positionen' ? 'Dort Bearbeiten → Positionen' : undefined,
        }
      }
      const wizardStep =
        ziel === 'angebot_positionen' ? String(step ?? 2) : step ? String(step) : null
      return {
        ok: true,
        href: q(`/anfragen/${leadId}`, {
          angebot_wizard: '1',
          wizard_step: wizardStep,
          focus: focus || (ziel === 'angebot_positionen' ? 'positionen' : null),
        }),
        label:
          ziel === 'angebot_positionen'
            ? 'Angebot · Positionen'
            : step
              ? `Angebots-Wizard · Schritt ${step}`
              : 'Angebots-Wizard öffnen',
        hint:
          focus === 'titel'
            ? 'Fokus: Projekttitel'
            : focus === 'beschreibung'
              ? 'Fokus: Beschreibung'
              : focus === 'positionen' || ziel === 'angebot_positionen'
                ? 'Fokus: Leistungen / Preise'
                : 'Wizard öffnet sich automatisch',
      }
    }
    case 'angebot': {
      if (id) {
        return {
          ok: true,
          href: q(`/angebote/${id}`, { tab: tab || null }),
          label: 'Angebot öffnen',
        }
      }
      return {
        ok: true,
        href: createAngebotHref(kundeId || null),
        label: 'Neues Angebot',
        hint: kundeId ? 'Kunde vorausgewählt' : 'Zuerst Kunde wählen',
      }
    }
    case 'rechnung': {
      if (!id) return { ok: false, error: 'rechnung id fehlt' }
      return {
        ok: true,
        href: q(`/rechnungen/${id}`, { tab: tab || null }),
        label: 'Rechnung öffnen',
      }
    }
    case 'rechnung_neu':
      return {
        ok: true,
        href: createRechnungHref(kundeId || null),
        label: 'Neue Rechnung',
        hint: 'Wizard · Positionen mit KI möglich',
      }
    case 'auftrag': {
      if (!id) return { ok: false, error: 'auftrag id fehlt' }
      return {
        ok: true,
        href: q(`/auftraege/${id}`, { tab: tab || null }),
        label: 'Auftrag öffnen',
      }
    }
    case 'kunde': {
      if (!id) return { ok: false, error: 'kunde id fehlt' }
      return { ok: true, href: `/kunden/${id}`, label: 'Kunde öffnen' }
    }
    case 'kunde_neu':
      return { ok: true, href: createKundeHref(), label: 'Neuer Kunde' }
    case 'partner_neu':
      return { ok: true, href: createPartnerHref(), label: 'Neuer Handwerker' }
    case 'anfrage_neu':
      return {
        ok: true,
        href: createAnfrageHref(kundeId || null),
        label: 'Neue Anfrage',
      }
    case 'kalender':
      return { ok: true, href: '/kalender', label: 'Kalender' }
    case 'vorgaenge':
      return {
        ok: true,
        href: q('/vorgaenge', { tab: tab || 'anfrage' }),
        label: 'Vorgänge',
      }
    default:
      return {
        ok: false,
        error: `Unbekanntes Ziel „${ziel}". Erlaubt: anfrage, angebot_wizard, angebot_positionen, angebot, rechnung, rechnung_neu, auftrag, kunde, kalender, vorgaenge, lead_auskunft`,
      }
  }
}

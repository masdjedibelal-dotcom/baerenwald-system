/** UI-Payloads für den CRM-Assistenten (Sidepanel). Client + Server. */

import {
  angebotChipLabel,
  nestedName,
  rechnungChipLabel,
} from '@/lib/copilot/sanitize-chat-text'

export type AssistentNavLink = {
  type: 'navigate'
  href: string
  label: string
  hint?: string
}

export type AssistentPreview = {
  type: 'preview'
  /** Tool/Aktion zum Bestätigen, z. B. sende_angebot / crm_aktion */
  confirmPrompt: string
  title: string
  rows: Array<{ label: string; value: string }>
  warning?: string
}

export type AssistentUiPayload = {
  links: AssistentNavLink[]
  previews: AssistentPreview[]
}

export function emptyAssistentUi(): AssistentUiPayload {
  return { links: [], previews: [] }
}

export function mergeAssistentUi(
  a: AssistentUiPayload,
  b: AssistentUiPayload
): AssistentUiPayload {
  const linkKeys = new Set(a.links.map((l) => l.href))
  const links = [...a.links]
  for (const l of b.links) {
    if (!linkKeys.has(l.href)) {
      linkKeys.add(l.href)
      links.push(l)
    }
  }
  return {
    links: links.slice(0, 8),
    previews: [...a.previews, ...b.previews].slice(0, 5),
  }
}

function str(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return String(v).trim()
}

function row(label: string, value: unknown): { label: string; value: string } | null {
  const v = str(value)
  if (!v) return null
  return { label, value: v }
}

/** Tool-Ergebnis → klickbare Links / Vorschau-Karten. */
export function collectAssistentUiFromToolResult(
  toolName: string,
  result: unknown,
  toolInput?: Record<string, unknown>
): AssistentUiPayload {
  const ui = emptyAssistentUi()
  if (!result || typeof result !== 'object') return ui
  const r = result as Record<string, unknown>

  if (toolName === 'crm_oeffnen' && typeof r.href === 'string' && r.href.startsWith('/')) {
    ui.links.push({
      type: 'navigate',
      href: r.href,
      label: str(r.label) || 'Im CRM öffnen',
      hint: str(r.hint) || undefined,
    })
    return ui
  }

  // Deep-Links aus anderen Tools (z. B. nach Speichern)
  if (typeof r.crm_href === 'string' && r.crm_href.startsWith('/')) {
    ui.links.push({
      type: 'navigate',
      href: r.crm_href,
      label: str(r.crm_label) || 'Im CRM öffnen',
    })
  } else {
    if (typeof r.angebot_id === 'string' && r.angebot_id && !r.vorschau) {
      ui.links.push({
        type: 'navigate',
        href: `/angebote/${r.angebot_id}`,
        label: 'Angebot öffnen',
      })
    }
    if (typeof r.rechnung_id === 'string' && r.rechnung_id && !r.vorschau) {
      ui.links.push({
        type: 'navigate',
        href: `/rechnungen/${r.rechnung_id}`,
        label: 'Rechnung öffnen',
      })
    }
    if (typeof r.lead_id === 'string' && r.lead_id && toolName.includes('angebot')) {
      ui.links.push({
        type: 'navigate',
        href: `/anfragen/${r.lead_id}?angebot_wizard=1&wizard_step=2`,
        label: 'Wizard · Positionen',
        hint: 'Leistungen prüfen / KI',
      })
    }
  }

  if (r.vorschau === true) {
    const aktion =
      str(r.aktion) ||
      (toolName === 'sende_angebot'
        ? 'sende_angebot'
        : toolName === 'send_mail_kunde'
          ? 'send_mail_kunde'
          : toolName === 'crm_aktion'
            ? str(toolInput?.aktion) || 'crm_aktion'
            : toolName)

    const params =
      toolName === 'crm_aktion'
        ? ((toolInput?.params as Record<string, unknown>) ?? {})
        : { ...(toolInput ?? {}) }

    // IDs aus Vorschau ergänzen
    if (r.angebot_id && !params.angebot_id) params.angebot_id = r.angebot_id
    if (r.rechnung_id && !params.rechnung_id) params.rechnung_id = r.rechnung_id

    const rows = [
      row('An', r.email ?? r.an ?? r.kunde),
      row('Kunde', r.kunde ?? r.name),
      row('Betreff', r.betreff),
      row('Angebot', r.angebotsnr ?? r.leistungsumfang),
      row('Brutto', r.brutto != null ? `${r.brutto} €` : null),
      row('Status', r.status),
      row('Aktion', aktion),
    ].filter(Boolean) as Array<{ label: string; value: string }>

    if (typeof r.text_vorschau === 'string' && r.text_vorschau.trim()) {
      rows.push({
        label: 'Text',
        value:
          r.text_vorschau.length > 280
            ? `${r.text_vorschau.slice(0, 280)}…`
            : r.text_vorschau,
      })
    }

    let confirmPrompt: string
    if (toolName === 'crm_aktion' || aktion.startsWith('send_') || aktion.includes('_')) {
      confirmPrompt = `Führe crm_aktion „${aktion}“ jetzt mit bestaetigt:true aus. Params: ${JSON.stringify(params)}`
      if (toolName === 'sende_angebot') {
        confirmPrompt = `Sende das Angebot jetzt mit sende_angebot und bestaetigt:true. angebot_id=${str(r.angebot_id) || str(params.angebot_id)} suche=${str(params.suche)}`
      }
      if (toolName === 'send_mail_kunde') {
        confirmPrompt = `Sende die Mail jetzt mit send_mail_kunde und bestaetigt:true an ${str(params.to)}, Betreff „${str(params.betreff)}“, gleicher Text.`
      }
    } else {
      confirmPrompt = `Bitte Aktion „${aktion}“ jetzt mit Bestätigung ausführen.`
    }

    ui.previews.push({
      type: 'preview',
      confirmPrompt,
      title: str(r.hinweis)?.includes('Versand')
        ? 'Versand-Vorschau'
        : `Vorschau · ${aktion}`,
      rows: rows.slice(0, 8),
      warning: str(r.bereits_gesendet) === 'true' || r.bereits_gesendet === true
        ? 'Bereits gesendet — trotzdem erneut?'
        : str(r.hinweis) || undefined,
    })
  }

  // Tagesplan-Links
  if (toolName === 'plane_arbeitstag' && Array.isArray(r.links)) {
    for (const item of r.links) {
      if (!item || typeof item !== 'object') continue
      const o = item as Record<string, unknown>
      if (typeof o.href === 'string' && o.href.startsWith('/')) {
        ui.links.push({
          type: 'navigate',
          href: o.href,
          label: str(o.label) || 'Öffnen',
          hint: str(o.hint) || undefined,
        })
      }
    }
  }

  // Listen → Chips mit Namen/Betrag (keine Nummern/UUIDs im Label)
  if (toolName === 'get_offene_rechnungen' && Array.isArray(result)) {
    for (const row of result.slice(0, 8)) {
      if (!row || typeof row !== 'object') continue
      const o = row as Record<string, unknown>
      if (typeof o.id !== 'string' || !o.id) continue
      ui.links.push({
        type: 'navigate',
        href: `/rechnungen/${o.id}`,
        label: rechnungChipLabel(o),
        hint: o.faellig_am ? `Fällig ${str(o.faellig_am)}` : undefined,
      })
    }
  }

  if (toolName === 'get_offene_angebote' && Array.isArray(result)) {
    for (const row of result.slice(0, 8)) {
      if (!row || typeof row !== 'object') continue
      const o = row as Record<string, unknown>
      if (typeof o.id !== 'string' || !o.id) continue
      ui.links.push({
        type: 'navigate',
        href: `/angebote/${o.id}`,
        label: angebotChipLabel(o),
      })
    }
  }

  if (toolName === 'get_auftrag_status' && Array.isArray(result)) {
    for (const row of result.slice(0, 8)) {
      if (!row || typeof row !== 'object') continue
      const o = row as Record<string, unknown>
      if (typeof o.id !== 'string' || !o.id) continue
      const titel = str(o.titel) || nestedName(o.kunden, 'Auftrag')
      ui.links.push({
        type: 'navigate',
        href: `/auftraege/${o.id}`,
        label: titel,
      })
    }
  }

  return ui
}

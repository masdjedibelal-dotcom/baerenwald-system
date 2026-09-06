import type { CrmNotificationTyp } from '@/app/(dashboard)/notifications/actions'

/** Pref-Keys ↔ Einstellungen-Switches (alle verdrahtet). */
export type CrmPushPrefKey =
  | 'neue_anfragen'
  | 'handwerker_updates'
  | 'angebot_entscheidungen'
  | 'anstehende_abnahmen'
  | 'auftrag_partner'
  | 'ueberfaellige_rechnungen'
  | 'system_updates'

export type CrmPushPrefs = {
  push_enabled: boolean
} & Record<CrmPushPrefKey, boolean>

export const CRM_PUSH_PREF_DEFAULTS: CrmPushPrefs = {
  push_enabled: false,
  neue_anfragen: true,
  handwerker_updates: true,
  angebot_entscheidungen: true,
  anstehende_abnahmen: true,
  auftrag_partner: true,
  ueberfaellige_rechnungen: true,
  system_updates: false,
}

export const CRM_PUSH_SWITCHES: {
  key: CrmPushPrefKey
  label: string
  desc: string
}[] = [
  {
    key: 'neue_anfragen',
    label: 'Neue Anfragen',
    desc: 'Website, Portal-Melder und manuelle Anfragen',
  },
  {
    key: 'handwerker_updates',
    label: 'Handwerker-Updates',
    desc: 'Annahme, Ablehnung, Einreichung, Positionsmeldungen',
  },
  {
    key: 'angebot_entscheidungen',
    label: 'Angebote & Entscheidungen',
    desc: 'Annehmen/Ablehnen im Portal, Projektvertrag',
  },
  {
    key: 'anstehende_abnahmen',
    label: 'Anstehende Abnahmen',
    desc: 'Abnahme bestätigt oder Freigabe ausstehend',
  },
  {
    key: 'auftrag_partner',
    label: 'Auftrag & Partner',
    desc: 'Abschluss, weitere Arbeiten, Partner-Meldungen',
  },
  {
    key: 'ueberfaellige_rechnungen',
    label: 'Überfällige Rechnungen',
    desc: 'Offene oder überfällige Rechnungen',
  },
  {
    key: 'system_updates',
    label: 'System-Updates',
    desc: 'Wichtige System-Hinweise',
  },
]

/** Glocken-Typ → Pref-Switch. */
export function pushPrefKeyForNotificationTyp(
  typ: CrmNotificationTyp
): CrmPushPrefKey | null {
  switch (typ) {
    case 'neue_anfrage':
    case 'hm_befund_freigabe':
      return 'neue_anfragen'
    case 'handwerker_update':
    case 'handwerker_angenommen':
    case 'handwerker_abgelehnt':
    case 'handwerker_einreichung':
    case 'hw_rechnung_eingegangen':
    case 'hw_auftrag_erledigt':
    case 'partner_positions_meldung':
    case 'partner_weitere_arbeit':
    case 'partner_compliance_pruefung':
    case 'partner_unterlage':
    case 'partner_fachdoku':
      return 'handwerker_updates'
    case 'vorgang_angenommen':
    case 'vorgang_abgelehnt':
    case 'angebot_entscheidung':
    case 'projektvertrag_bestaetigt':
      return 'angebot_entscheidungen'
    case 'abnahme_bestaetigt':
    case 'abnahme_freigabe_ausstehend':
      return 'anstehende_abnahmen'
    case 'auftrag_abgeschlossen':
      return 'auftrag_partner'
    default:
      return 'system_updates'
  }
}

export function isPushPrefEnabledForTyp(
  prefs: CrmPushPrefs,
  typ: CrmNotificationTyp
): boolean {
  if (!prefs.push_enabled) return false
  const key = pushPrefKeyForNotificationTyp(typ)
  if (!key) return false
  return Boolean(prefs[key])
}

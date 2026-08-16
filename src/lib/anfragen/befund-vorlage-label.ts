/** Deutsche Labels für HM-Befund-Vorlagen-Keys (CRM-Anzeige). */
const BEFUND_VORLAGE_LABEL: Record<string, string> = {
  wasser_leckage: 'Wasser / Leckage',
  abfluss: 'Abfluss',
  heizung: 'Heizung',
  elektro: 'Elektro',
  schimmel: 'Schimmel',
  tuer_schloss: 'Tür / Schloss',
  fenster_rolladen: 'Fenster / Rollladen',
  gemeinschaft: 'Gemeinschaftsfläche',
  sonstiges: 'Sonstiges',
}

export function befundVorlageLabelDe(key: string | null | undefined): string | null {
  const k = (key ?? '').trim()
  if (!k) return null
  return BEFUND_VORLAGE_LABEL[k] ?? null
}

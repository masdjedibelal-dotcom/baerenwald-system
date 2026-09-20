/**
 * E5 — Rollenlabel in der UI immer „Partner“.
 * Ausnahme: fachfirmaBeauftragen (explizit freigegebener Wortlaut).
 * §35a „Handwerkerleistungen“ und „Handwerkskarte“ nicht über partnerizeDisplay anfassen.
 */
export const COPY_ROLE = {
  /** Kanonische Rolle (E5) */
  partner: 'Partner',
  /** Plural / Akkusativ */
  partnerPl: 'Partner',
  /** Genitiv Singular */
  partners: 'Partners',
  /** Dativ Plural */
  partnern: 'Partnern',
  partnerin: 'Partnerin',
  partnerVorOrt: 'Partner vor Ort',
  partnerZuweisen: 'Partner zuweisen',
  partnerBearbeiten: 'Partner bearbeiten',
  partnerWaehlen: 'Partner wählen…',
  partnerAnlegen: 'Partner anlegen',
  partnerAngelegt: 'Partner angelegt',
  partnerLoeschen: 'Partner löschen',
  partnerGeloescht: 'Partner gelöscht',
  partnerKopiert: 'Partner kopiert',
  partnerFehlt: 'Partner fehlt.',
  partnerNichtGefunden: 'Partner nicht gefunden.',
  partnerBewerten: 'Partner bewerten',
  partnerBewertung: 'Partner-Bewertung',
  neuerPartner: 'Neuer Partner',
  keinPartner: 'Kein Partner',
  partnerAnfrage: 'Partner-Anfrage',
  partnerPortal: 'Partner-Portal',
  /** Ausnahme-String — darf so stehen bleiben */
  fachfirmaBeauftragen: 'Fachfirma beauftragen',
} as const

export type CopyRoleKey = keyof typeof COPY_ROLE

/**
 * Sichtbare UI-Strings: Handwerker → Partner (Deklination).
 * Nur auf fertige Anzeigetexte anwenden — keine Technik-Identifier.
 */
export function partnerizeDisplay(text: string): string {
  const slots: string[] = []
  const park = (value: string) => {
    const i = slots.length
    slots.push(value)
    return `\u0000P${i}\u0000`
  }
  let s = text
  s = s.replace(/Fachfirma beauftragen/g, () => park(COPY_ROLE.fachfirmaBeauftragen))
  s = s.replace(/Handwerkerleistungen/g, () => park('Handwerkerleistungen'))
  s = s.replace(/Handwerkerskarte/g, () => park('Handwerkerskarte'))
  s = s.replace(/Handwerkskarte/g, () => park('Handwerkskarte'))
  s = s
    .replace(/Handwerkerinnen/g, 'Partnerinnen')
    .replace(/Handwerkerin/g, COPY_ROLE.partnerin)
    .replace(/Handwerkern/g, COPY_ROLE.partnern)
    .replace(/Handwerkers/g, COPY_ROLE.partners)
    .replace(/Handwerker-/g, 'Partner-')
    .replace(/Handwerker/g, COPY_ROLE.partner)
  s = s.replace(/\u0000P(\d+)\u0000/g, (_, n) => slots[Number(n)] ?? '')
  return s
}

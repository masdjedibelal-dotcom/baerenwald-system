/** Meta-Felder für Abnahmeprotokoll-Wizard / PDF (Muster-Layout). */

export type AbnahmeErgebnis = 'abgenommen' | 'mit_vorbehalt' | 'verweigert'

export type AbnahmeProtokollMeta = {
  uebergabe_uhrzeit: string
  uebergabe_ort: string
  vertreter_an: string
  ansprechpartner_kunde: string
  anwesend_uebergabe: string
  projektbezeichnung: string
  projektadresse: string
  leistungsumfang_kurz: string
  abnahme_ergebnis: AbnahmeErgebnis
  hinweis_sonstiges: string
  uebergabe_foto_urls: string[]
  rechtshinweise: string
}

export const ABNAHME_ERGEBNIS_LABEL: Record<AbnahmeErgebnis, string> = {
  abgenommen: 'Die Leistungen werden abgenommen',
  mit_vorbehalt: 'Die Leistungen werden unter Vorbehalt abgenommen',
  verweigert: 'Die Abnahme wird verweigert',
}

export const DEFAULT_ABNAHME_RECHTSHINWEISE = [
  'Die Übergabe erfolgte gemeinsam vor Ort.',
  'Die Leistungen wurden besichtigt; Beanstandungen sind unter „Festgestellte Hinweise“ vermerkt.',
  'Mit der Abnahme geht die Gefahr gemäß § 640 BGB auf den Auftraggeber über.',
  'Es gelten die gesetzlichen Gewährleistungsfristen ab Abnahme.',
  'Für Leistungen Dritter oder ausdrücklich ausgeschlossene Bereiche wird keine Gewähr übernommen.',
].join('\n')

export function emptyAbnahmeProtokollMeta(
  partial?: Partial<AbnahmeProtokollMeta>
): AbnahmeProtokollMeta {
  return {
    uebergabe_uhrzeit: '',
    uebergabe_ort: '',
    vertreter_an: '',
    ansprechpartner_kunde: '',
    anwesend_uebergabe: '',
    projektbezeichnung: '',
    projektadresse: '',
    leistungsumfang_kurz: '',
    abnahme_ergebnis: 'abgenommen',
    hinweis_sonstiges: '',
    uebergabe_foto_urls: [],
    rechtshinweise: DEFAULT_ABNAHME_RECHTSHINWEISE,
    ...partial,
  }
}

export function normalizeAbnahmeProtokollMeta(raw: unknown): AbnahmeProtokollMeta {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const ergebnis = String(o.abnahme_ergebnis ?? 'abgenommen').trim()
  const abnahme_ergebnis: AbnahmeErgebnis =
    ergebnis === 'mit_vorbehalt' || ergebnis === 'verweigert' ? ergebnis : 'abgenommen'
  const fotos = Array.isArray(o.uebergabe_foto_urls)
    ? o.uebergabe_foto_urls.map((u) => String(u ?? '').trim()).filter(Boolean).slice(0, 4)
    : []
  return emptyAbnahmeProtokollMeta({
    uebergabe_uhrzeit: String(o.uebergabe_uhrzeit ?? '').trim(),
    uebergabe_ort: String(o.uebergabe_ort ?? '').trim(),
    vertreter_an: String(o.vertreter_an ?? '').trim(),
    ansprechpartner_kunde: String(o.ansprechpartner_kunde ?? '').trim(),
    anwesend_uebergabe: String(o.anwesend_uebergabe ?? '').trim(),
    projektbezeichnung: String(o.projektbezeichnung ?? '').trim(),
    projektadresse: String(o.projektadresse ?? '').trim(),
    leistungsumfang_kurz: String(o.leistungsumfang_kurz ?? '').trim(),
    abnahme_ergebnis,
    hinweis_sonstiges: String(o.hinweis_sonstiges ?? '').trim(),
    uebergabe_foto_urls: fotos,
    rechtshinweise:
      String(o.rechtshinweise ?? '').trim() || DEFAULT_ABNAHME_RECHTSHINWEISE,
  })
}

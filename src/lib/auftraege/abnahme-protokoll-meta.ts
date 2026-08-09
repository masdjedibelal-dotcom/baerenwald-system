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
  /** Beschriftung je Foto (gleicher Index wie uebergabe_foto_urls) */
  uebergabe_foto_captions: string[]
  rechtshinweise: string
  /** Globale Frist-Zeile unter Mängeln, z. B. „spätestens am …“ */
  maengel_beseitigung_spaetestens: string
  /** Unterschriftsblöcke: „Ort, Datum“-Zeile */
  unterschrift_ort_datum_an: string
  unterschrift_ort_datum_ag: string
  unterschrift_ort_datum_anwesend: string
  /** Portal: Partner hat Protokoll bestätigt (ohne Mail). */
  handwerker_bestaetigt_at?: string | null
  handwerker_bestaetigt_von?: string | null
  /** Optional Signatur-Data-URLs oder Storage-Pfade */
  signature_kunde_url?: string | null
  signature_hw_url?: string | null
  kunde_unterschrift_name?: string | null
  hw_unterschrift_name?: string | null
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
    uebergabe_foto_captions: [],
    rechtshinweise: DEFAULT_ABNAHME_RECHTSHINWEISE,
    maengel_beseitigung_spaetestens: '',
    unterschrift_ort_datum_an: '',
    unterschrift_ort_datum_ag: '',
    unterschrift_ort_datum_anwesend: '',
    handwerker_bestaetigt_at: null,
    handwerker_bestaetigt_von: null,
    signature_kunde_url: null,
    signature_hw_url: null,
    kunde_unterschrift_name: null,
    hw_unterschrift_name: null,
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
  const captionsRaw = Array.isArray(o.uebergabe_foto_captions)
    ? o.uebergabe_foto_captions.map((c) => String(c ?? '').trim())
    : []
  const captions = fotos.map((_, i) => captionsRaw[i] ?? '')
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
    uebergabe_foto_captions: captions,
    rechtshinweise:
      String(o.rechtshinweise ?? '').trim() || DEFAULT_ABNAHME_RECHTSHINWEISE,
    maengel_beseitigung_spaetestens: String(o.maengel_beseitigung_spaetestens ?? '').trim(),
    unterschrift_ort_datum_an: String(o.unterschrift_ort_datum_an ?? '').trim(),
    unterschrift_ort_datum_ag: String(o.unterschrift_ort_datum_ag ?? '').trim(),
    unterschrift_ort_datum_anwesend: String(o.unterschrift_ort_datum_anwesend ?? '').trim(),
    handwerker_bestaetigt_at: o.handwerker_bestaetigt_at
      ? String(o.handwerker_bestaetigt_at).trim() || null
      : null,
    handwerker_bestaetigt_von: o.handwerker_bestaetigt_von
      ? String(o.handwerker_bestaetigt_von).trim() || null
      : null,
    signature_kunde_url: o.signature_kunde_url
      ? String(o.signature_kunde_url).trim() || null
      : null,
    signature_hw_url: o.signature_hw_url
      ? String(o.signature_hw_url).trim() || null
      : null,
    kunde_unterschrift_name: o.kunde_unterschrift_name
      ? String(o.kunde_unterschrift_name).trim() || null
      : null,
    hw_unterschrift_name: o.hw_unterschrift_name
      ? String(o.hw_unterschrift_name).trim() || null
      : null,
  })
}

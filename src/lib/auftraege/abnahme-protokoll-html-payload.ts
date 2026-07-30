import { firmenSteuerFooterZeilen } from '@/lib/angebote/angebot-rechtshinweise'
import { resolveAngebotPdfLogoSrc } from '@/lib/angebote/angebot-pdf-logo'
import { resolveRechnungProjektTitel } from '@/lib/angebote/resolve-angebot-leistungsumfang'
import { generateAbnahmeFreitexte } from '@/lib/auftraege/abnahme-protokoll-ki-texte'
import { auftragTitel, formatAuftragsNr } from '@/lib/auftraege/auftrag-liste-helpers'
import {
  filterAbnahmePunkteFuerDokument,
  gruppiereAbnahmePunkte,
  type AbnahmeMangel,
  type AbnahmePunkt,
} from '@/lib/auftraege/abnahme-protokoll-types'
import {
  emptyAbnahmeProtokollMeta,
  normalizeAbnahmeProtokollMeta,
  type AbnahmeProtokollMeta,
} from '@/lib/auftraege/abnahme-protokoll-meta'
import type { AbnahmeProtokollHtmlInput } from '@/lib/templates/abnahme-protokoll-template'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { AuftragDetail, Kunde } from '@/lib/types'

/** Alte CRM-Platzhalter — gelten als „leer“ und weichen Stammdaten/KI. */
const META_PLATZHALTER = new Set(
  ['abnahme', 'baustelle', 'auftragnehmer', 'auftraggeber'].map((s) => s.toLowerCase())
)

function isMetaPlatzhalter(value: string | null | undefined): boolean {
  const t = (value ?? '').trim()
  if (!t) return true
  return META_PLATZHALTER.has(t.toLowerCase())
}

function pickMetaField(preferred: string, fallback: string): string {
  if (!isMetaPlatzhalter(preferred)) return preferred.trim()
  return fallback.trim()
}

function firmZeileAdresse(f: FirmenEinstellungen): string {
  return [[f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')].join('\n')
}

function firmKontaktZeile(f: FirmenEinstellungen): string {
  return [f.telefon ? `Tel. ${f.telefon}` : '', f.email ?? '', f.website ?? ''].filter(Boolean).join(' · ')
}

function kundeAdresseZeilen(k: Kunde): string {
  const lines = [k.adresse?.trim(), [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean) as string[]
  return lines.join('\n') || '—'
}

function formatDe(iso: string): string {
  try {
    return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('de-DE')
  } catch {
    return iso
  }
}

export function buildDefaultAbnahmeMetaFromAuftrag(
  detail: AuftragDetail,
  firm: FirmenEinstellungen
): AbnahmeProtokollMeta {
  const kunde = detail.kunden
  const projektTitel = resolveRechnungProjektTitel({
    angebot: detail.angebote ?? null,
    auftragTitel: detail.titel,
    fallback: auftragTitel(detail),
  })
  const ang = Array.isArray(detail.angebote) ? detail.angebote[0] : detail.angebote
  const leistungsumfang =
    (ang as { leistungsumfang?: string | null } | null)?.leistungsumfang?.trim() ||
    detail.titel?.trim() ||
    ''
  const projektadresse = kunde
    ? [kunde.adresse?.trim(), [kunde.plz, kunde.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    : ''
  return emptyAbnahmeProtokollMeta({
    uebergabe_ort: projektadresse,
    projektbezeichnung: projektTitel,
    projektadresse,
    leistungsumfang_kurz: leistungsumfang,
    ansprechpartner_kunde: kunde?.name?.trim() || '',
    vertreter_an: firm.geschaeftsfuehrer?.trim() || '',
  })
}

/**
 * Stammdaten-Defaults + eingehende Meta; leere Freitexte (Leistungsumfang, Hinweis)
 * werden per KI aus Auftrag / Leistungen / Mängeln gefüllt. Bei KI-Ausfall: Defaults.
 * Bereits gespeicherte Freitexte (`previousMeta`) bleiben erhalten, solange der Caller
 * keine eigenen setzt.
 */
export async function resolveAbnahmeProtokollMetaForSave(
  detail: AuftragDetail,
  firm: FirmenEinstellungen,
  input: {
    meta?: AbnahmeProtokollMeta | null
    previousMeta?: AbnahmeProtokollMeta | null
    punkte: AbnahmePunkt[]
    maengel: AbnahmeMangel[]
    notizen?: string | null
    abnahmeDatum?: string | null
  }
): Promise<AbnahmeProtokollMeta> {
  const defaults = buildDefaultAbnahmeMetaFromAuftrag(detail, firm)
  const incoming = input.meta ? normalizeAbnahmeProtokollMeta(input.meta) : null
  const previous = input.previousMeta
    ? normalizeAbnahmeProtokollMeta(input.previousMeta)
    : null

  function freitextPrefer(
    incomingVal: string | undefined,
    previousVal: string | undefined
  ): string {
    if (incomingVal != null && !isMetaPlatzhalter(incomingVal)) return incomingVal.trim()
    if (previousVal != null && !isMetaPlatzhalter(previousVal)) return previousVal.trim()
    return ''
  }

  let meta = emptyAbnahmeProtokollMeta({
    ...defaults,
    ...(incoming
      ? {
          uebergabe_uhrzeit: pickMetaField(incoming.uebergabe_uhrzeit, defaults.uebergabe_uhrzeit),
          uebergabe_ort: pickMetaField(incoming.uebergabe_ort, defaults.uebergabe_ort),
          vertreter_an: pickMetaField(incoming.vertreter_an, defaults.vertreter_an),
          ansprechpartner_kunde: pickMetaField(
            incoming.ansprechpartner_kunde,
            defaults.ansprechpartner_kunde
          ),
          anwesend_uebergabe: pickMetaField(
            incoming.anwesend_uebergabe,
            defaults.anwesend_uebergabe
          ),
          projektbezeichnung: pickMetaField(
            incoming.projektbezeichnung,
            defaults.projektbezeichnung
          ),
          projektadresse: pickMetaField(incoming.projektadresse, defaults.projektadresse),
          leistungsumfang_kurz: freitextPrefer(
            incoming.leistungsumfang_kurz,
            previous?.leistungsumfang_kurz
          ),
          abnahme_ergebnis: incoming.abnahme_ergebnis || defaults.abnahme_ergebnis,
          hinweis_sonstiges: freitextPrefer(
            incoming.hinweis_sonstiges,
            previous?.hinweis_sonstiges
          ),
          uebergabe_foto_urls: incoming.uebergabe_foto_urls,
          uebergabe_foto_captions: incoming.uebergabe_foto_captions,
          rechtshinweise: incoming.rechtshinweise || defaults.rechtshinweise,
          maengel_beseitigung_spaetestens: pickMetaField(
            incoming.maengel_beseitigung_spaetestens,
            defaults.maengel_beseitigung_spaetestens
          ),
          unterschrift_ort_datum_an: pickMetaField(
            incoming.unterschrift_ort_datum_an,
            defaults.unterschrift_ort_datum_an
          ),
          unterschrift_ort_datum_ag: pickMetaField(
            incoming.unterschrift_ort_datum_ag,
            defaults.unterschrift_ort_datum_ag
          ),
          unterschrift_ort_datum_anwesend: pickMetaField(
            incoming.unterschrift_ort_datum_anwesend,
            defaults.unterschrift_ort_datum_anwesend
          ),
          handwerker_bestaetigt_at: incoming.handwerker_bestaetigt_at,
          handwerker_bestaetigt_von: incoming.handwerker_bestaetigt_von,
          signature_kunde_url: incoming.signature_kunde_url,
          signature_hw_url: incoming.signature_hw_url,
          kunde_unterschrift_name: incoming.kunde_unterschrift_name,
          hw_unterschrift_name: incoming.hw_unterschrift_name,
        }
      : previous
        ? {
            leistungsumfang_kurz: freitextPrefer(undefined, previous.leistungsumfang_kurz),
            hinweis_sonstiges: freitextPrefer(undefined, previous.hinweis_sonstiges),
            abnahme_ergebnis: previous.abnahme_ergebnis || defaults.abnahme_ergebnis,
            uebergabe_foto_urls: previous.uebergabe_foto_urls,
            uebergabe_foto_captions: previous.uebergabe_foto_captions,
            rechtshinweise: previous.rechtshinweise || defaults.rechtshinweise,
            unterschrift_ort_datum_an: pickMetaField(
              previous.unterschrift_ort_datum_an,
              defaults.unterschrift_ort_datum_an
            ),
            unterschrift_ort_datum_ag: pickMetaField(
              previous.unterschrift_ort_datum_ag,
              defaults.unterschrift_ort_datum_ag
            ),
            handwerker_bestaetigt_at: previous.handwerker_bestaetigt_at,
            handwerker_bestaetigt_von: previous.handwerker_bestaetigt_von,
            signature_kunde_url: previous.signature_kunde_url,
            signature_hw_url: previous.signature_hw_url,
            kunde_unterschrift_name: previous.kunde_unterschrift_name,
            hw_unterschrift_name: previous.hw_unterschrift_name,
          }
        : {
            // Erstes Speichern ohne Meta: Freitexte leer lassen → KI
            leistungsumfang_kurz: '',
            hinweis_sonstiges: '',
          }),
  })

  const needLeistungsumfang = !meta.leistungsumfang_kurz.trim()
  const needHinweis = !meta.hinweis_sonstiges.trim()

  if (needLeistungsumfang || needHinweis) {
    const ang = Array.isArray(detail.angebote) ? detail.angebote[0] : detail.angebote
    const angebotLu =
      (ang as { leistungsumfang?: string | null } | null)?.leistungsumfang?.trim() ||
      defaults.leistungsumfang_kurz ||
      null

    const ki = await generateAbnahmeFreitexte({
      auftragTitel: auftragTitel(detail),
      projektbezeichnung: meta.projektbezeichnung,
      angebotLeistungsumfang: angebotLu,
      kundeName: detail.kunden?.name ?? null,
      punkte: input.punkte,
      maengel: input.maengel,
      notizen: input.notizen ?? null,
    })

    if (needLeistungsumfang) {
      meta = {
        ...meta,
        leistungsumfang_kurz:
          ki.leistungsumfang_kurz.trim() || defaults.leistungsumfang_kurz.trim() || '',
      }
    }
    if (needHinweis && ki.hinweis_sonstiges.trim()) {
      meta = { ...meta, hinweis_sonstiges: ki.hinweis_sonstiges.trim() }
    }
  }

  const ort = meta.uebergabe_ort.trim() || meta.projektadresse.trim() || 'Baustelle'
  const datum =
    input.abnahmeDatum?.trim().slice(0, 10) ||
    new Date().toISOString().slice(0, 10)
  const ortDatum = `${ort}, ${datum}`
  if (!meta.unterschrift_ort_datum_an.trim()) {
    meta = { ...meta, unterschrift_ort_datum_an: ortDatum }
  }
  if (!meta.unterschrift_ort_datum_ag.trim()) {
    meta = { ...meta, unterschrift_ort_datum_ag: ortDatum }
  }

  return meta
}

export function buildAbnahmeProtokollHtmlInput(
  detail: AuftragDetail,
  firm: FirmenEinstellungen,
  input: {
    abnahmeDatum: string
    punkte: AbnahmePunkt[]
    maengel: AbnahmeMangel[]
    notizen: string | null
    meta?: AbnahmeProtokollMeta | null
  }
): AbnahmeProtokollHtmlInput {
  const kunde = detail.kunden!
  const steuer = firmenSteuerFooterZeilen(firm)
  const defaults = buildDefaultAbnahmeMetaFromAuftrag(detail, firm)
  const meta = normalizeAbnahmeProtokollMeta({
    ...defaults,
    ...(input.meta ?? {}),
  })

  return {
    firmen_logo_url: resolveAngebotPdfLogoSrc(firm.logo_url),
    firmenname: firm.firmenname,
    firmen_rechtsform: firm.rechtsform?.trim() || null,
    firmen_adresse: firmZeileAdresse(firm),
    firmen_kontakt: firmKontaktZeile(firm),
    firmen_telefon: firm.telefon?.trim() || null,
    firmen_email: firm.email?.trim() || null,
    firmen_website: firm.website?.trim() || null,
    firmen_steuer_footer: steuer.length ? steuer.join('\n') : null,
    auftragsNr: formatAuftragsNr(detail),
    projektTitel: resolveRechnungProjektTitel({
      angebot: detail.angebote ?? null,
      auftragTitel: detail.titel,
      fallback: auftragTitel(detail),
    }),
    abnahmeDatum: formatDe(input.abnahmeDatum),
    kunde_name: kunde.name?.trim() || '—',
    kunde_adresse: kundeAdresseZeilen(kunde),
    gewerke: gruppiereAbnahmePunkte(filterAbnahmePunkteFuerDokument(input.punkte)),
    maengel: input.maengel,
    notizen: input.notizen?.trim() || null,
    meta,
  }
}

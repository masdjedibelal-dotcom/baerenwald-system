import { firmenSteuerFooterZeilen } from '@/lib/angebote/angebot-rechtshinweise'
import { resolveAngebotPdfLogoSrc } from '@/lib/angebote/angebot-pdf-logo'
import { resolveRechnungProjektTitel } from '@/lib/angebote/resolve-angebot-leistungsumfang'
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

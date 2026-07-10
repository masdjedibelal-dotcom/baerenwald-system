/** Adresse aus Anfrage-Payload / funnel_daten (CRM + Website-API). */

export type AnfrageAdresseFelder = {
  strasse: string | null
  hausnummer: string | null
  plz: string | null
  ort: string | null
}

function strField(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function firstStr(...vals: unknown[]): string | null {
  for (const v of vals) {
    const s = strField(v)
    if (s) return s
  }
  return null
}

export function anfrageAdresseAusPayload(input: {
  plz?: string
  strasse?: string | null
  hausnummer?: string | null
  ort?: string | null
  funnel_daten?: Record<string, unknown> | null
}): AnfrageAdresseFelder {
  const fd =
    input.funnel_daten && typeof input.funnel_daten === 'object' && !Array.isArray(input.funnel_daten)
      ? input.funnel_daten
      : {}
  const plzTop = input.plz?.trim() || null
  return {
    strasse: firstStr(input.strasse, fd.strasse, fd.straße, fd.street),
    hausnummer: firstStr(input.hausnummer, fd.hausnummer, fd.houseNumber),
    plz: firstStr(plzTop, fd.plz, input.plz),
    ort: firstStr(input.ort, fd.ort, fd.city, fd.stadt),
  }
}

export function kundeAdresseDbFelder(addr: AnfrageAdresseFelder): {
  strasse: string | null
  hausnummer: string | null
  plz: string | null
  ort: string | null
  adresse: string | null
} {
  const strasse = addr.strasse
  const hausnummer = addr.hausnummer
  const plz = addr.plz
  const ort = addr.ort
  const adresse = [strasse, hausnummer].filter(Boolean).join(' ') || null
  return { strasse, hausnummer, plz, ort, adresse }
}

export function hatAnfrageAdresse(addr: AnfrageAdresseFelder): boolean {
  return !!(addr.strasse || addr.hausnummer || addr.plz || addr.ort)
}

/** Kurztexte für fehlende Angaben in der Termin-Bestätigungsmail (du / Sie). */
export type VorOrtRueckfrage = { du: string; sie: string }

const ADRESS_RUECKFRAGE_LABELS = new Set([
  'Straße / Anschrift des Objekts',
  'Hausnummer (bzw. Gebäudeteil / Hinterhaus)',
  'Postleitzahl',
  'Ort',
])

/** Nur fehlende Adress-Felder — für die grüne Hinweis-Box in der Termin-Mail. */
export function filterAdressRueckfragen(items: VorOrtRueckfrage[]): VorOrtRueckfrage[] {
  return items.filter((item) => ADRESS_RUECKFRAGE_LABELS.has(item.du))
}

function istNurPlz(text: string): boolean {
  return /^\d{5}$/.test(text.trim())
}

/** Straße + Hausnummer wirken in einer Freitext-Zeile enthalten. */
export function adresseZeileWirktVollstaendig(zeile: string): boolean {
  const z = zeile.trim()
  if (!z || istNurPlz(z)) return false
  const hatBuchstaben = /[a-zA-ZäöüÄÖÜß]/.test(z)
  const hatZahl = /\d/.test(z)
  return hatBuchstaben && (hatZahl || z.includes(','))
}

function kundeAdresseWirktVollstaendig(adresse: string | null | undefined): boolean {
  const a = adresse?.trim()
  if (!a || istNurPlz(a)) return false
  return /[a-zA-ZäöüÄÖÜß]/.test(a) && /\d/.test(a)
}

function funnelFeld(fd: Record<string, unknown> | null, keys: string[]): string | null {
  if (!fd) return null
  for (const k of keys) {
    const s = strField(fd[k])
    if (s) return s
  }
  return null
}

/**
 * Fehlende Infos für den Vor-Ort-Termin → Bulletpoints in der Terminbestätigungs-Mail.
 */
export function vorOrtRueckfragen(opts: {
  addr: AnfrageAdresseFelder
  adresseZeile?: string
  kunde?: {
    adresse?: string | null
    strasse?: string | null
    hausnummer?: string | null
    plz?: string | null
    ort?: string | null
  } | null
  funnel_daten?: Record<string, unknown> | null
}): VorOrtRueckfrage[] {
  const fd =
    opts.funnel_daten && typeof opts.funnel_daten === 'object' && !Array.isArray(opts.funnel_daten)
      ? opts.funnel_daten
      : null
  const zeile =
    (opts.adresseZeile ?? '').trim() || formatAnfrageAdresseZeile(opts.addr, opts.kunde)
  const zeileVoll = adresseZeileWirktVollstaendig(zeile)
  const kundeVoll = kundeAdresseWirktVollstaendig(opts.kunde?.adresse)

  const hatStrasse = Boolean(
    opts.addr.strasse?.trim() ||
      opts.kunde?.strasse?.trim() ||
      kundeVoll ||
      zeileVoll
  )
  const hatHausnummer = Boolean(
    opts.addr.hausnummer?.trim() ||
      opts.kunde?.hausnummer?.trim() ||
      kundeVoll ||
      zeileVoll ||
      (opts.addr.strasse?.trim() && /\s+\d+[a-zA-Z]?/.test(opts.addr.strasse))
  )
  const hatPlz = Boolean(opts.addr.plz?.trim() || opts.kunde?.plz?.trim() || istNurPlz(zeile))
  const hatOrt = Boolean(opts.addr.ort?.trim() || opts.kunde?.ort?.trim())
  const adresseKernVollstaendig = hatStrasse && hatHausnummer && hatPlz && hatOrt

  const klingel = funnelFeld(fd, [
    'klingelschild',
    'klingel',
    'name_klingel',
    'klingelname',
    'name_am_klingel',
    'klingel_name',
  ])
  const zugang = funnelFeld(fd, [
    'zugangshinweis',
    'zugangshinweise',
    'zugangsdetails',
    'zugang',
    'etage',
    'hinweis_zugang',
    'hinweise',
    'bauzugang',
    'zugang_hinweis',
    'zugang_hinweise',
  ])

  const out: VorOrtRueckfrage[] = []
  const push = (item: VorOrtRueckfrage) => {
    if (!out.some((x) => x.du === item.du)) out.push(item)
  }

  if (!hatStrasse) {
    push({
      du: 'Straße / Anschrift des Objekts',
      sie: 'Straße / Anschrift des Objekts',
    })
  }
  if (!hatHausnummer) {
    push({
      du: 'Hausnummer (bzw. Gebäudeteil / Hinterhaus)',
      sie: 'Hausnummer (bzw. Gebäudeteil / Hinterhaus)',
    })
  }
  if (!hatPlz) {
    push({ du: 'Postleitzahl', sie: 'Postleitzahl' })
  }
  if (!hatOrt) {
    push({ du: 'Ort', sie: 'Ort' })
  }
  if (!klingel && adresseKernVollstaendig) {
    push({
      du: 'Name am Klingelschild (falls abweichend von deinem Namen)',
      sie: 'Name am Klingelschild (falls abweichend von Ihrem Namen)',
    })
  }
  if (!zugang && adresseKernVollstaendig) {
    push({
      du: 'Zugangshinweise (Etage, Aufzug, Parkplatz, Schlüsselübergabe, Besonderheiten)',
      sie: 'Zugangshinweise (Etage, Aufzug, Parkplatz, Schlüsselübergabe, Besonderheiten)',
    })
  }

  return out
}

/** Eine Zeile für Termin-Mail / Kalender (Straße Hausnr., PLZ Ort). */
export function formatAnfrageAdresseZeile(
  addr: AnfrageAdresseFelder,
  kunde?: { adresse?: string | null; plz?: string | null; ort?: string | null } | null
): string {
  const strHaus = [addr.strasse, addr.hausnummer].filter(Boolean).join(' ')
  const plzOrt = [addr.plz, addr.ort].filter(Boolean).join(' ')
  const zeile = [strHaus, plzOrt].filter(Boolean).join(', ')
  if (zeile) return zeile
  const kStr = kunde?.adresse?.trim()
  const kPlzOrt = [kunde?.plz, kunde?.ort].filter(Boolean).join(' ')
  return [kStr, kPlzOrt].filter(Boolean).join(', ')
}

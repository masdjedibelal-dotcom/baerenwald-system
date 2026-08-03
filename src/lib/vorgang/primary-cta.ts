/**
 * Spec §5 — genau eine Primary-CTA-Matrix für alle Vorgangs-Detail-Screens.
 * Mapping-Layer: DB-Status → Spec-UI-Status (keine Enum-Migration).
 */

export type VorgangCtaPhase = 'anfrage' | 'angebot' | 'auftrag' | 'rechnung'

export type PrimaryCtaId =
  | 'angebot_erstellen'
  | 'angebot_versenden'
  | 'angebot_annehmen'
  | 'abnahme_starten'
  | 'auftrag_abschliessen'
  | 'rechnung_erstellen'
  | 'rechnung_versenden'
  | 'als_bezahlt'
  | 'mahnung_senden'
  | 'bewertung_einholen'

export type PrimaryCtaResult = {
  id: PrimaryCtaId
  label: string
  icon: string
}

export type PrimaryCtaContext = {
  /** Auftrag: Abnahme fällig → „Abnahme starten“ statt „Auftrag abschließen“ */
  abnahmeFaellig?: boolean
  /** Auftrag fertig + RE bezahlt → Bewertung */
  rechnungBezahlt?: boolean
  /** Rechnung überfällig */
  ueberfaellig?: boolean
  /** Abschlagsplan aktiv → „Nächsten Abschlag senden“ statt „Rechnung erstellen“ */
  naechsterAbschlagSenden?: boolean
}

function norm(status: string | null | undefined): string {
  return String(status ?? '')
    .trim()
    .toLowerCase()
}

/** Map DB-/Resolver-Status auf Spec-Matrix-Schlüssel. */
export function mapStatusToSpecUi(phase: VorgangCtaPhase, status: string): string {
  const s = norm(status)
  if (phase === 'anfrage') {
    if (s === 'abgebrochen' || s === 'verloren') return 'verloren'
    if (s === 'angebot' || s === 'qualifiziert') return 'qualifiziert'
    if (['neu', 'kontaktiert', 'termin'].includes(s)) return s
    if (s === 'auftrag' || s === 'abgeschlossen') return 'geschlossen'
    return s
  }
  if (phase === 'angebot') {
    if (s === 'entwurf') return 'entwurf'
    if (['gesendet', 'gesendet_kunde', 'gesendet_handwerker', 'handwerker_akzeptiert', 'abgelaufen'].includes(s)) {
      return 'gesendet_kunde'
    }
    if (['angenommen', 'kunde_akzeptiert'].includes(s)) return 'angenommen'
    if (s === 'abgelehnt' || s === 'ersetzt') return 'abgelehnt'
    return s
  }
  if (phase === 'auftrag') {
    if (['offen', 'geplant'].includes(s)) return 'geplant'
    if (['in_arbeit', 'aktiv', 'abnahme'].includes(s)) return 'aktiv'
    if (['abgeschlossen', 'fertig'].includes(s)) return 'fertig'
    if (s === 'storniert') return 'storniert'
    return s
  }
  // rechnung
  if (s === 'entwurf') return 'entwurf'
  if (s === 'gesendet' || s === 'versendet') return 'versendet'
  if (s === 'bezahlt') return 'bezahlt'
  if (s === 'storniert') return 'storniert'
  if (s === 'ueberfaellig' || s === 'überfällig') return 'ueberfaellig'
  return s
}

/**
 * Einzige Primary-CTA-Ableitung im Repo (Spec §5).
 * Liefert null, wenn kein grüner Prozess-CTA vorgesehen ist.
 */
export function primaryCta(
  phase: VorgangCtaPhase,
  status: string,
  ctx: PrimaryCtaContext = {}
): PrimaryCtaResult | null {
  const ui = mapStatusToSpecUi(phase, status)

  if (phase === 'anfrage') {
    if (ui === 'verloren' || ui === 'geschlossen') return null
    if (['neu', 'kontaktiert', 'termin', 'qualifiziert'].includes(ui)) {
      return { id: 'angebot_erstellen', label: 'Angebot erstellen', icon: 'file-invoice' }
    }
    return null
  }

  if (phase === 'angebot') {
    if (ui === 'entwurf') {
      return { id: 'angebot_versenden', label: 'Angebot versenden', icon: 'send' }
    }
    if (ui === 'gesendet_kunde') {
      return { id: 'angebot_annehmen', label: 'Angebot annehmen', icon: 'check' }
    }
    return null
  }

  if (phase === 'auftrag') {
    if (ui === 'geplant' || ui === 'aktiv') {
      return { id: 'auftrag_abschliessen', label: 'Auftrag abschließen', icon: 'check' }
    }
    if (ui === 'fertig') {
      if (ctx.rechnungBezahlt) {
        return { id: 'bewertung_einholen', label: 'Bewertung einholen', icon: 'star' }
      }
      if (ctx.naechsterAbschlagSenden) {
        return {
          id: 'rechnung_erstellen',
          label: 'Nächsten Abschlag senden',
          icon: 'send',
        }
      }
      return { id: 'rechnung_erstellen', label: 'Rechnung erstellen', icon: 'file-invoice' }
    }
    return null
  }

  // rechnung
  if (ui === 'ausstehend') {
    if (ctx.naechsterAbschlagSenden) {
      return {
        id: 'rechnung_erstellen',
        label: 'Nächsten Abschlag senden',
        icon: 'send',
      }
    }
    return { id: 'rechnung_erstellen', label: 'Rechnung erstellen', icon: 'file-invoice' }
  }
  if (ui === 'entwurf') {
    if (ctx.naechsterAbschlagSenden) {
      return { id: 'rechnung_versenden', label: 'Abschlag senden', icon: 'send' }
    }
    return { id: 'rechnung_versenden', label: 'Rechnung versenden', icon: 'send' }
  }
  if (ui === 'versendet' || ui === 'ueberfaellig') {
    return { id: 'als_bezahlt', label: 'Als bezahlt markieren', icon: 'check' }
  }
  if (ui === 'bezahlt') {
    return { id: 'bewertung_einholen', label: 'Bewertung einholen', icon: 'star' }
  }
  return null
}

/**
 * Spec §5 — genau eine Primary-CTA-Matrix für alle Vorgangs-Detail-Screens.
 * Mapping-Layer: DB-Status → Spec-UI-Status (keine Enum-Migration).
 */

export type VorgangCtaPhase = 'anfrage' | 'angebot' | 'auftrag' | 'rechnung'

export type PrimaryCtaId =
  | 'angebot_erstellen'
  | 'angebot_versenden'
  | 'angebot_annehmen'
  /** Unter HV-Schwelle / Freigabe-Modus direkt: Angebot → Auftrag ohne Kunden-Mail */
  | 'direkt_auftrag'
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
  /**
   * Auftrag fertig: nächste RE-Aktion (Abschlag oder Einzel).
   * Hat Vorrang vor naechsterAbschlagSenden / pauschal „Rechnung erstellen“.
   */
  /** `null` = Zahlung abgeschlossen → Bewertung */
  naechsteRechnungAktion?: 'versenden' | 'bezahlt' | 'erstellen' | null
  /**
   * Angebot (Entwurf oder gesendet): Betrag unter HV-Schwelle (oder Freigabe-Modus „direkt“)
   * → Primary „Direkt Auftrag“ statt „Angebot annehmen“.
   */
  unterSchwelleDirektAuftrag?: boolean
  /** Partner-Eingangsrechnung: CTA „Als überwiesen markieren“ statt „Als bezahlt“ */
  eingehend?: boolean
  /** Korrektur-Entwurf (korrektur_von) → „Korrektur versenden“ */
  korrektur?: boolean
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
    if (ui === 'entwurf' || ui === 'gesendet_kunde') {
      // Entwurf: Annehmen (Auftrag) ist Primary — E-Mail-Versand nur über Bearbeiten/Senden.
      // Portal zeigt Angebote mit PDF sowieso; „Versenden“ = nur Mail.
      if (ctx.unterSchwelleDirektAuftrag) {
        return { id: 'direkt_auftrag', label: 'Direkt Auftrag', icon: 'briefcase' }
      }
      return { id: 'angebot_annehmen', label: 'Angebot annehmen', icon: 'check' }
    }
    return null
  }

  if (phase === 'auftrag') {
    if (ui === 'geplant' || ui === 'aktiv') {
      if (ctx.abnahmeFaellig) {
        return { id: 'abnahme_starten', label: 'Abnahme starten', icon: 'clipboard-list' }
      }
      return { id: 'auftrag_abschliessen', label: 'Auftrag abschließen', icon: 'check' }
    }
    if (ui === 'fertig') {
      if (ctx.naechsteRechnungAktion === 'bezahlt') {
        return { id: 'als_bezahlt', label: 'Als bezahlt markieren', icon: 'check' }
      }
      // Unversendete Schluss-/Abschlags-RE: Primary = versenden (P3-15 / E1)
      if (ctx.naechsteRechnungAktion === 'versenden') {
        return {
          id: 'rechnung_versenden',
          label: ctx.naechsterAbschlagSenden
            ? 'Abschlag versenden'
            : 'Rechnung versenden',
          icon: 'send',
        }
      }
      if (ctx.naechsteRechnungAktion === 'erstellen') {
        return {
          id: 'rechnung_erstellen',
          label: ctx.naechsterAbschlagSenden ? 'Nächsten Abschlag erstellen' : 'Rechnung erstellen',
          icon: 'file-invoice',
        }
      }
      // null = alle Raten/RE bezahlt → nichts mehr zu tun (Bewertungen entfallen, Block C)
      if (ctx.rechnungBezahlt || ctx.naechsteRechnungAktion === null) return null
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
    if (ctx.korrektur) {
      return { id: 'rechnung_versenden', label: 'Korrektur versenden', icon: 'send' }
    }
    if (ctx.naechsterAbschlagSenden) {
      return { id: 'rechnung_versenden', label: 'Abschlag senden', icon: 'send' }
    }
    return { id: 'rechnung_versenden', label: 'Rechnung versenden', icon: 'send' }
  }
  if (ui === 'versendet' || ui === 'ueberfaellig') {
    if (ctx.eingehend) {
      return { id: 'als_bezahlt', label: 'Als überwiesen markieren', icon: 'check' }
    }
    return { id: 'als_bezahlt', label: 'Als bezahlt markieren', icon: 'check' }
  }
  if (ui === 'bezahlt') return null
  return null
}

/**
 * P21: ein Satz „Was als Nächstes zu tun ist“ zur Primary-CTA.
 * Leer, wenn es keinen nächsten Schritt gibt.
 */
export function naechsterSchrittText(
  phase: VorgangCtaPhase,
  status: string,
  cta: PrimaryCtaResult | null,
  ctx: PrimaryCtaContext = {}
): string | null {
  if (!cta) return null
  const ui = mapStatusToSpecUi(phase, status)
  switch (cta.id) {
    case 'angebot_erstellen':
      return 'Erstellen Sie das Angebot für diese Anfrage.'
    case 'angebot_versenden':
      return 'Senden Sie das Angebot an den Kunden.'
    case 'angebot_annehmen':
      return ui === 'entwurf'
        ? 'Das Angebot ist noch ein Entwurf. Senden Sie es an den Kunden oder nehmen Sie es direkt an.'
        : 'Das Angebot liegt beim Kunden. Sagt er zu, nehmen Sie es hier an.'
    case 'direkt_auftrag':
      return 'Der Betrag liegt unter der Freigabe-Schwelle. Sie können direkt einen Auftrag anlegen.'
    case 'abnahme_starten':
      return 'Die Arbeiten sind fertig. Machen Sie jetzt die Abnahme mit dem Kunden.'
    case 'auftrag_abschliessen':
      return 'Der Auftrag läuft. Wenn alles erledigt ist, schließen Sie ihn ab.'
    case 'rechnung_erstellen':
      return ctx.naechsterAbschlagSenden
        ? 'Der nächste Abschlag ist fällig. Erstellen Sie die Abschlagsrechnung.'
        : 'Die Arbeit ist erledigt. Erstellen Sie die Rechnung.'
    case 'rechnung_versenden':
      return ctx.korrektur
        ? 'Die Korrektur ist fertig. Senden Sie sie an den Kunden.'
        : 'Die Rechnung ist fertig. Senden Sie sie an den Kunden.'
    case 'als_bezahlt':
      if (ctx.eingehend) return 'Überweisen Sie die Partner-Rechnung und markieren Sie sie danach.'
      return ui === 'ueberfaellig' || ctx.ueberfaellig
        ? 'Die Rechnung ist überfällig. Erinnern Sie den Kunden oder markieren Sie den Eingang.'
        : 'Die Rechnung ist offen. Sobald das Geld da ist, markieren Sie sie als bezahlt.'
    case 'mahnung_senden':
      return 'Die Rechnung ist überfällig. Erinnern Sie den Kunden.'
    case 'bewertung_einholen':
      return null
    default:
      return null
  }
}

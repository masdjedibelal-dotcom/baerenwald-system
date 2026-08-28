/**
 * Anfrage: Akut-Erkennung + Schwellen-/Freigabe-Hinweise (client-sicher).
 */
import { leadIstHavarie } from '@/lib/org/hv-lead-helpers'
import type { Lead, OrgFreigabeStatus } from '@/lib/types'

export function leadIstAkut(
  lead: Pick<Lead, 'situation' | 'funnel_daten' | 'freigabe_bypass_grund'>
): boolean {
  return leadIstHavarie(lead)
}

export function leadIstMieterMeldung(lead: {
  erfassung_von?: string | null
  anlass?: string | null
}): boolean {
  if ((lead.erfassung_von ?? '').trim() !== 'melder') return false
  const anlass = (lead.anlass ?? '').trim()
  return !anlass || anlass === 'meldung'
}

/**
 * Mieter-Meldung wartet noch auf HV-Start-Freigabe („Vorgang freigeben“).
 * Akut-Direktauftrag: kein Gate — BW kann sofort disponieren.
 */
export function leadWartetAufHvStartFreigabe(
  lead: Pick<Lead, 'situation' | 'funnel_daten' | 'freigabe_bypass_grund'> & {
    erfassung_von?: string | null
    anlass?: string | null
    hv_meldung_status?: string | null
  }
): boolean {
  if (!leadIstMieterMeldung(lead)) return false
  if (leadIstAkut(lead)) return false
  const st = (lead.hv_meldung_status ?? 'neu').trim().toLowerCase()
  // Auch während Hausmeister-Prüfung: BW darf nicht disponieren
  return st === 'neu' || st === '' || st === 'hm_pruefung'
}

/** Effektive Schwelle / Notfall-Direkt: Objekt überschreibt Org (NULL = erben). */
export function resolveAnfrageFreigabeRegeln(input: {
  portalModus?: string | null
  freigabeModus?: string | null
  orgSchwelleEur?: number | null
  orgNotfallDirekt?: boolean | null
  objektSchwelleEur?: number | null
  objektNotfallDirekt?: boolean | null
}): {
  portalModus: string | null
  freigabeModus: string | null
  schwelleEur: number | null
  notfallDirekt: boolean
} {
  const schwelleRaw =
    input.objektSchwelleEur != null ? Number(input.objektSchwelleEur) : input.orgSchwelleEur
  const schwelle =
    schwelleRaw != null && Number.isFinite(Number(schwelleRaw)) && Number(schwelleRaw) > 0
      ? Number(schwelleRaw)
      : null
  const notfallDirekt =
    input.objektNotfallDirekt != null
      ? Boolean(input.objektNotfallDirekt)
      : input.orgNotfallDirekt !== false
  return {
    portalModus: (input.portalModus ?? '').trim() || null,
    freigabeModus: (input.freigabeModus ?? '').trim() || null,
    schwelleEur: schwelle,
    notfallDirekt,
  }
}

/** Preisindikation für Schwellen-Vergleich (oberer Wert bevorzugt). */
export function leadPreisindikationEur(lead: {
  preis_min?: number | null
  preis_max?: number | null
}): number | null {
  const max = lead.preis_max != null && Number.isFinite(Number(lead.preis_max)) ? Number(lead.preis_max) : null
  const min = lead.preis_min != null && Number.isFinite(Number(lead.preis_min)) ? Number(lead.preis_min) : null
  if (max != null && max > 0) return max
  if (min != null && min > 0) return min
  return null
}

export type AnfrageSchwellenHinweis = {
  freigabeAktiv: boolean
  schwelleEur: number | null
  preisEur: number | null
  unterSchwelle: boolean
  freigabeStatus: OrgFreigabeStatus | null | undefined
  notfallDirektErlaubt: boolean
  istAkut: boolean
  istMieterMeldung: boolean
  headline: string
  detail: string
}

export function buildAnfrageSchwellenHinweis(input: {
  lead: Pick<
    Lead,
    | 'situation'
    | 'funnel_daten'
    | 'freigabe_bypass_grund'
    | 'org_freigabe_status'
    | 'erfassung_von'
    | 'anlass'
    | 'preis_min'
    | 'preis_max'
    | 'auftraggeber_kunde_id'
  >
  freigabeModus?: string | null
  portalModus?: string | null
  schwelleEur?: number | null
  notfallDirekt?: boolean | null
  /** Angebot existiert — Schwelle darf verglichen werden (nicht nur Preisindikation). */
  hatAngebot?: boolean
  /** Angebotsbetrag; hat Vorrang vor Preisindikation. */
  angebotBetragEur?: number | null
}): AnfrageSchwellenHinweis {
  const istAkut = leadIstAkut(input.lead)
  const istMieterMeldung = leadIstMieterMeldung(input.lead)
  const freigabeAktiv =
    (input.portalModus ?? '').trim() === 'organisation' &&
    (input.freigabeModus ?? '').trim() === 'freigabe' &&
    Boolean(input.lead.auftraggeber_kunde_id?.trim())
  const schwelle =
    input.schwelleEur != null && Number.isFinite(Number(input.schwelleEur)) && Number(input.schwelleEur) > 0
      ? Number(input.schwelleEur)
      : null
  const bypass = (input.lead.freigabe_bypass_grund ?? '').trim().toLowerCase()
  const schwelleHinweisErlaubt =
    input.hatAngebot === true ||
    bypass === 'schwelle' ||
    bypass === 'akut'
  const preisIndikation = leadPreisindikationEur(input.lead)
  const angebotBetrag =
    input.angebotBetragEur != null &&
    Number.isFinite(Number(input.angebotBetragEur)) &&
    Number(input.angebotBetragEur) > 0
      ? Number(input.angebotBetragEur)
      : null
  const preis = schwelleHinweisErlaubt ? (angebotBetrag ?? preisIndikation) : null
  const unterSchwelle =
    schwelleHinweisErlaubt && schwelle != null && preis != null && preis <= schwelle
  const notfallDirektErlaubt = input.notfallDirekt !== false
  const freigabeStatus = input.lead.org_freigabe_status

  if (istAkut) {
    return {
      freigabeAktiv,
      schwelleEur: schwelle,
      preisEur: preis,
      unterSchwelle,
      freigabeStatus,
      notfallDirektErlaubt,
      istAkut,
      istMieterMeldung,
      headline: notfallDirektErlaubt
        ? 'Direktauftrag — Sofortmaßnahme ohne Angebot'
        : 'Sofortmaßnahme — Org erlaubt Direktbeauftragung nicht (Einstellung)',
      detail: notfallDirektErlaubt
        ? 'Sofortmaßnahme: Partner direkt beauftragen. HV nur Info; Folgearbeiten über Schwelle laufen über Angebot.'
        : 'Unter Organisation → „Direktbeauftragung bei Sofortmaßnahmen“ aktivieren, oder Angebotsweg nutzen.',
    }
  }

  if (freigabeAktiv && unterSchwelle) {
    const status = (freigabeStatus ?? '').trim()
    if (status === 'ausstehend' || status === 'beschluss_ausstehend') {
      return {
        freigabeAktiv,
        schwelleEur: schwelle,
        preisEur: preis,
        unterSchwelle,
        freigabeStatus,
        notfallDirektErlaubt,
        istAkut,
        istMieterMeldung,
        headline:
          status === 'beschluss_ausstehend'
            ? `Unter Schwelle (${formatEur(preis)} ≤ ${formatEur(schwelle)}) — wartet auf Eigentümerbeschluss`
            : `Unter Schwelle (${formatEur(preis)} ≤ ${formatEur(schwelle)}) — HV-Freigabe ausstehend`,
        detail:
          status === 'beschluss_ausstehend'
            ? 'Parkzustand Beschluss — Freigabe im HV-Portal nach Beschluss abschließen.'
            : 'Preisindikation liegt unter der Freigabe-Schwelle. Warte auf HV-Freigabe oder markiere als Akut, wenn sofort disponiert werden muss.',
      }
    }
    if (status === 'freigegeben' || status === 'nicht_noetig' || !status) {
      return {
        freigabeAktiv,
        schwelleEur: schwelle,
        preisEur: preis,
        unterSchwelle,
        freigabeStatus,
        notfallDirektErlaubt,
        istAkut,
        istMieterMeldung,
        headline: `Unter Schwelle (${formatEur(preis)} ≤ ${formatEur(schwelle)}) — Freigabe nicht blockierend`,
        detail:
          status === 'freigegeben'
            ? 'HV hat freigegeben. Angebot erstellen; Auto-Auftrag-Pfad möglich.'
            : 'Unter Schwelle gilt Bypass „schwelle“. Angebot erstellen oder bei Dringlichkeit als Akut markieren und direkt beauftragen.',
      }
    }
    if (status === 'abgelehnt') {
      return {
        freigabeAktiv,
        schwelleEur: schwelle,
        preisEur: preis,
        unterSchwelle,
        freigabeStatus,
        notfallDirektErlaubt,
        istAkut,
        istMieterMeldung,
        headline: 'HV hat abgelehnt',
        detail: 'Klärung mit HV nötig — oder als Akut markieren nur bei echter Notmaßnahme.',
      }
    }
  }

  if (freigabeAktiv && schwelle != null && preis != null && preis > schwelle) {
    return {
      freigabeAktiv,
      schwelleEur: schwelle,
      preisEur: preis,
      unterSchwelle: false,
      freigabeStatus,
      notfallDirektErlaubt,
      istAkut,
      istMieterMeldung,
      headline: `Über Schwelle (${formatEur(preis)} > ${formatEur(schwelle)}) — HV-Freigabe nötig`,
      detail:
        freigabeStatus === 'ausstehend' || freigabeStatus === 'beschluss_ausstehend'
          ? freigabeStatus === 'beschluss_ausstehend'
            ? 'Wartet auf Eigentümerbeschluss — danach Freigabe/Ablehnung im HV-Portal.'
            : 'Angebot an HV zur Freigabe. Bei echter Havarie: als Akut markieren und direkt beauftragen.'
          : 'Normalweg: Angebot → HV-Freigabe. Akut nur bei Notfall.',
    }
  }

  if (freigabeAktiv && schwelle != null && preis == null && !schwelleHinweisErlaubt) {
    return {
      freigabeAktiv,
      schwelleEur: schwelle,
      preisEur: null,
      unterSchwelle: false,
      freigabeStatus,
      notfallDirektErlaubt,
      istAkut,
      istMieterMeldung,
      headline: `Freigabe-Schwelle ${formatEur(schwelle)} — Schwelle gilt erst nach Angebot`,
      detail:
        'Angebot erstellen, dann wird der Betrag mit der Schwelle abgeglichen. Bei Akut trotzdem direkt beauftragen möglich.',
    }
  }

  if (freigabeAktiv && schwelle != null && preis == null) {
    return {
      freigabeAktiv,
      schwelleEur: schwelle,
      preisEur: null,
      unterSchwelle: false,
      freigabeStatus,
      notfallDirektErlaubt,
      istAkut,
      istMieterMeldung,
      headline: `Freigabe-Schwelle ${formatEur(schwelle)} — noch keine Preisindikation`,
      detail:
        'Preisindikation setzen, um Schwellen-Abgleich zu sehen. Bei Akut trotzdem direkt beauftragen möglich.',
    }
  }

  return {
    freigabeAktiv,
    schwelleEur: schwelle,
    preisEur: preis,
    unterSchwelle,
    freigabeStatus,
    notfallDirektErlaubt,
    istAkut,
    istMieterMeldung,
    headline: istMieterMeldung ? 'Mieter-Meldung' : 'Anfrage',
    detail: istMieterMeldung
      ? 'Bei Dringlichkeit „Als akut markieren“ und direkt beauftragen — sonst Angebot erstellen.'
      : 'Optional als Akut markieren für Direktbeauftragung ohne Angebot.',
  }
}

function formatEur(n: number | null): string {
  if (n == null) return '—'
  return `${n.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`
}

/**
 * Angebot-Detail: Primary „Direkt Auftrag“ statt „Angebot annehmen“.
 * Org-Freigabe-System aktiv + (Modus direkt ODER Betrag ≤ Schwelle).
 */
export function angebotDarfDirektAuftragOhneHvFreigabe(input: {
  portalModus?: string | null
  freigabeModus?: string | null
  schwelleEur?: number | null
  betragEur: number
  hatAuftraggeber: boolean
}): boolean {
  if (!input.hatAuftraggeber) return false
  if ((input.portalModus ?? '').trim() !== 'organisation') return false
  const modus = (input.freigabeModus ?? '').trim()
  const betrag = Number(input.betragEur)
  if (!Number.isFinite(betrag) || betrag <= 0) return false
  if (modus === 'direkt') return true
  if (modus !== 'freigabe') return false
  const schwelle = Number(input.schwelleEur)
  return Number.isFinite(schwelle) && schwelle > 0 && betrag <= schwelle
}

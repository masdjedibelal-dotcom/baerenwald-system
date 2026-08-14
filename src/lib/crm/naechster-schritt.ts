/**
 * Status → nächster Schritt (Staff-Guidance).
 * Kurz, handlungsorientiert, Du-Form.
 */

export type NaechsterSchrittHint = {
  label: string
  hint?: string
}

export function naechsterSchrittAnfrage(input: {
  status: string
  hasAngebote: boolean
  canAcceptAngebot: boolean
  hasAuftrag: boolean
}): NaechsterSchrittHint | null {
  if (input.hasAuftrag || input.status === 'auftrag' || input.status === 'abgeschlossen') {
    return {
      label: 'Als Nächstes',
      hint: 'Auftrag ist angelegt — weiter im Auftrag (Partner, Rechnung).',
    }
  }
  if (input.status === 'abgebrochen') return null
  if (input.canAcceptAngebot) {
    return {
      label: 'Als Nächstes',
      hint: 'Angebot liegt vor — annehmen, um den Auftrag zu starten.',
    }
  }
  if (input.hasAngebote) {
    return {
      label: 'Als Nächstes',
      hint: 'Angebot fertigstellen oder an den Kunden / Partner senden.',
    }
  }
  return {
    label: 'Als Nächstes',
    hint: 'Bedarf prüfen, dann Angebot erstellen.',
  }
}

export function naechsterSchrittAngebot(input: {
  statusEinfach: string
  hasAuftrag: boolean
  needsPartnerFirst: boolean
  /** Für Hint „gültig bis …“ (Mock Statusband) */
  gueltigBisLabel?: string | null
}): NaechsterSchrittHint | null {
  const gueltigHint = input.gueltigBisLabel?.trim()
    ? `gültig bis ${input.gueltigBisLabel.trim()}`
    : null

  if (input.hasAuftrag || input.statusEinfach === 'angenommen') {
    const label = input.hasAuftrag ? '→ Auftrag läuft' : '→ Auftrag anlegen'
    return {
      label: gueltigHint ? `${label} · ${gueltigHint}` : label,
    }
  }
  if (input.statusEinfach === 'abgelehnt' || input.statusEinfach === 'ersetzt') return null
  if (input.statusEinfach === 'entwurf' && input.needsPartnerFirst) {
    return {
      label: gueltigHint ? `→ Partner anfragen · ${gueltigHint}` : '→ Partner anfragen',
      hint: 'Einreichung prüfen, dann an den Kunden senden.',
    }
  }
  if (input.statusEinfach === 'entwurf') {
    return {
      label: gueltigHint ? `→ Angebot versenden · ${gueltigHint}` : '→ Angebot versenden',
      hint: 'Positionen prüfen — dann versenden oder direkt annehmen.',
    }
  }
  if (input.statusEinfach === 'gesendet' || input.statusEinfach === 'abgelaufen') {
    return {
      label: gueltigHint ? `→ Auf Antwort warten · ${gueltigHint}` : '→ Auf Antwort warten',
      hint: 'Oder Angebot manuell annehmen.',
    }
  }
  return null
}

export function naechsterSchrittAuftrag(input: {
  status: string
  istStorniert: boolean
  istAbgeschlossen: boolean
  maengelOffen?: number
}): NaechsterSchrittHint | null {
  if (input.istStorniert || input.status === 'storniert') return null
  const maengelHint =
    input.maengelOffen != null && input.maengelOffen > 0
      ? `${input.maengelOffen} Mängel offen`
      : null
  if (input.istAbgeschlossen || input.status === 'abgeschlossen') {
    return {
      label: '→ Rechnung prüfen',
      hint: 'Auftrag erledigt — bei Bedarf Rechnung oder Dokumente nachziehen.',
    }
  }
  if (input.status === 'abnahme') {
    return {
      label: '→ Abnahme abschließen',
      hint: maengelHint ?? 'Abnahme prüfen — dann Abschlussbericht und Rechnung.',
    }
  }
  if (input.status === 'in_arbeit' || input.status === 'offen') {
    return {
      label: '→ Leistungen dokumentieren',
      hint: maengelHint ?? undefined,
    }
  }
  return {
    label: '→ Leistungen dokumentieren',
    hint: maengelHint ?? 'Leistungen prüfen — danach Abschluss und Rechnung.',
  }
}

export function naechsterSchrittRechnung(input: {
  status: string
  ueberfaellig?: boolean
  belegTyp?: string | null
  /** z. B. „fällig 03.06.2026“ — Mock Statusband */
  faelligLabel?: string | null
}): NaechsterSchrittHint | null {
  const faelligHint = input.faelligLabel?.trim() || null
  if (input.belegTyp === 'gutschrift') {
    return {
      label: 'Als Nächstes',
      hint: 'Gutschrift prüfen und ggf. an den Kunden senden.',
    }
  }
  if (input.status === 'storniert') return null
  if (input.status === 'bezahlt') {
    return {
      label: faelligHint ? `→ Abgeschlossen · ${faelligHint}` : '→ Abgeschlossen',
    }
  }
  if (input.ueberfaellig || input.status === 'ueberfaellig') {
    return {
      label: faelligHint ? `→ Mahnung senden · ${faelligHint}` : '→ Mahnung senden',
      hint: 'Überfällig — Mahnung senden oder Zahlung erfassen.',
    }
  }
  if (input.status === 'gesendet' || input.status === 'versendet') {
    return {
      label: faelligHint ? `→ Auf Zahlung warten · ${faelligHint}` : '→ Auf Zahlung warten',
      hint: 'Oder als bezahlt markieren.',
    }
  }
  if (input.status === 'entwurf') {
    return {
      label: '→ Rechnung versenden',
      hint: 'Positionen prüfen — dann Rechnung versenden.',
    }
  }
  return {
    label: 'Als Nächstes',
    hint: 'Rechnungsstatus prüfen und nächsten Schritt setzen.',
  }
}

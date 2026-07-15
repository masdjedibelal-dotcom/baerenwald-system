import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import {
  defaultRechnungWizardMeta,
  defaultZahlungszielTage,
  type RechnungWizardBootstrap,
} from '@/lib/rechnungen/rechnung-wizard-types'

/** Direktrechnung ohne Auftrag — leerer Bootstrap (Kunde in Schritt 1 wählen). */
export function buildStandaloneRechnungWizardBootstrap(
  firm: FirmenEinstellungen
): RechnungWizardBootstrap {
  const zt = Math.max(1, parseInt(firm.zahlungsziel_tage, 10) || defaultZahlungszielTage())
  return {
    rechnungId: null,
    rechnungsnummer: null,
    auftragId: null,
    angebotId: null,
    kundeId: '',
    kunde: null,
    positionen: [],
    meta: defaultRechnungWizardMeta(zt, { firm }),
    auftragsReferenz: '',
    projektTitel: null,
    modus: 'voll',
    standalone: true,
    zahlungsplan: null,
    gesamtNetto: 0,
  }
}

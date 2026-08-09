/**
 * Shared Resolver-Fixtures (Q12) — CRM und Portal gegen dieselben Fälle.
 * Copy-Sync: in beiden Repos spiegeln, CI vergleicht.
 */
export type SharedResolverFixture = {
  id: string;
  angebotStatus?: string | null;
  auftragStatus?: string | null;
  rechnungStatus?: string | null;
  orgFreigabeStatus?: string | null;
  freigabeBypassGrund?: "schwelle" | "akut" | null;
  expectPhase: "anfrage" | "angebot" | "auftrag" | "rechnung";
};

export const SHARED_RESOLVER_FIXTURES: SharedResolverFixture[] = [
  {
    id: "meldung-offen",
    expectPhase: "anfrage",
  },
  {
    id: "freigabe-ausstehend",
    angebotStatus: "gesendet_kunde",
    orgFreigabeStatus: "ausstehend",
    expectPhase: "angebot",
  },
  {
    id: "bypass-schwelle",
    angebotStatus: "gesendet_kunde",
    orgFreigabeStatus: "nicht_noetig",
    freigabeBypassGrund: "schwelle",
    expectPhase: "angebot",
  },
  {
    id: "hw-akzeptiert",
    angebotStatus: "handwerker_akzeptiert",
    expectPhase: "angebot",
  },
  {
    id: "auftrag-aktiv",
    angebotStatus: "kunde_akzeptiert",
    auftragStatus: "in_arbeit",
    expectPhase: "auftrag",
  },
  {
    id: "rechnung",
    auftragStatus: "abgeschlossen",
    rechnungStatus: "gesendet",
    expectPhase: "rechnung",
  },
];

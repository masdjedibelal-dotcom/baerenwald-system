# Historische Umsatz- & Leistungsdaten

`Baerenwald_CRM_Umsatz_Leistungsdaten.xlsx` — abgeschlossene Rechnungen und Angebote für **KI Analytics** (nicht operatives CRM).

## Aktualisieren

1. Excel hier ersetzen oder bearbeiten (gleicher Dateiname).
2. Import + KI-Refresh:

```bash
npm run import:historik:ki
```

Nur Import:

```bash
npm run import:historik
```

Daten landen in Supabase: `ki_historische_vorgaenge`, `ki_historische_positionen`, `ki_produkt_katalog`.

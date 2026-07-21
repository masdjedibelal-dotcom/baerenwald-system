# Mock-Only Sweep Inventur (2026-07-16)

## anfragen
- Entfernt: KI-Badge in Liste, KI-Vertriebs-Analyse-Card, ProjektKette im Detail.
- Behalten (mock-konform): ListFilterSection/ListFilterBar, MockSortHead, DetailShell Tabs, Statusbadges.
- Offene Luecken: KI-Indikator aktuell ohne Ersatz; Projektkontext nur indirekt per Navigation.
- Datei-Belege: `src/components/anfragen/AnfragenListeClient.tsx`, `src/components/anfragen/AnfrageDetailClient.tsx`.

## angebote
- Entfernt: Verkauf-/Auftrag-Banner, Org-Freigabe-Banner, ProjektKette im Detail.
- Behalten (mock-konform): DetailHead, DetailShell Gruppen, Versandsektionen, Positionen-Tab.
- Offene Luecken: Freigabe- und Abschluss-Hinweise derzeit ohne separaten Mock-Ersatz.
- Datei-Belege: `src/components/angebote/AngebotDetailPageClient.tsx`, `src/components/angebote/AngeboteListeClient.tsx`.

## auftraege
- Entfernt: TopCards im Stammdaten-Tab, ProjektKette, Notizen-Kommunikationspanel.
- Behalten (mock-konform): DetailShell, Status-/Typ-Badges, Hauptaktionen, Leistungs-/Finanztabs.
- Offene Luecken: Kommunikationshistorie des Auftrags derzeit ohne UI-Zugang.
- Datei-Belege: `src/components/auftraege/AuftraegeListeClient.tsx`, `src/components/auftraege/AuftragDetailClient.tsx`.

## rechnungen
- Entfernt: ProjektKette, ProjektUebersichtCard, Aktivitaets-Kommunikation.
- Behalten (mock-konform): Rechungsdetails, Positionen/Summen, Dokumente, Mahnverlauf.
- Offene Luecken: Aktivitaets-Tab ist aktuell leer; Kommunikationszugang fehlt.
- Datei-Belege: `src/components/rechnungen/RechnungenListeClient.tsx`, `src/components/rechnungen/RechnungDetailClient.tsx`.

## kunden
- Entfernt: KPI-Row, Kommunikationskarte im Overview, Einbehalte/Offene-Posten Sektionen, Portal-Statuschip im Kopf.
- Behalten (mock-konform): Stammdaten, Verknuepfungen, Objektkarte, Vorgangs-Tabellen.
- Offene Luecken: KPI und Inkasso-Zusatzinfos aktuell nirgends.
- Datei-Belege: `src/components/kunden/KundenListeClient.tsx`, `src/components/kunden/KundeDetailClient.tsx`.

## handwerker
- Entfernt: Bewertungs-Card, Projekt-Compliance-Bloecke in Auftragskarten, Portal-Statuschip im Kopf.
- Behalten (mock-konform): Kontaktkarte, Gewerke/Dokumente/Bank-Steuer, Auftragsliste, eigener Compliance-Tab.
- Offene Luecken: Kompakte Bewertungsansicht und projektbezogene Compliance-Zusatzblenden entfallen.
- Datei-Belege: `src/components/handwerker/HandwerkerListeClient.tsx`, `src/components/handwerker/HandwerkerDetailClient.tsx`.

## partner
- Entfernt: keine neuen Entfernungen im Sweep.
- Behalten (mock-konform): Partnerliste mit Filterchips, Detailkarten fuer Partnerdetails/Notizen.
- Offene Luecken: keine zusaetzlichen.
- Datei-Belege: `src/components/partner/PartnerNetzwerkClient.tsx`, `src/components/partner/PartnerDetailClient.tsx`.

## vorgaenge
- Entfernt: keine neuen Entfernungen im Sweep.
- Behalten (mock-konform): bestehende Mock-UI Liste, Filter-Modal, Sortierung, Row-Menue.
- Offene Luecken: keine zusaetzlichen.
- Datei-Belege: `src/components/vorgaenge/VorgaengeListeClient.tsx`.

## objektakte
- Entfernt: keine neuen Entfernungen im Sweep.
- Behalten (mock-konform): DetailHead + drei Sektionen (Kontakte, Bewohner, ReadOnly).
- Offene Luecken: keine zusaetzlichen.
- Datei-Belege: `src/components/objektakte/ObjektAkteDetailClient.tsx`.

## app layouts/pages
- Entfernt: keine (nur geprueft).
- Behalten (mock-konform): Listen-Pages delegieren weiterhin korrekt an Layout-Master-Detail.
- Offene Luecken: keine.
- Datei-Belege: `src/app/(dashboard)/anfragen/page.tsx`, `src/app/(dashboard)/angebote/page.tsx`, `src/app/(dashboard)/auftraege/page.tsx`, `src/app/(dashboard)/rechnungen/page.tsx`, `src/app/(dashboard)/layout.tsx`.

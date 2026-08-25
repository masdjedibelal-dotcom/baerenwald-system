# Pattern-Leitfaden — So bauen wir UI bei Bärenwald

**Status:** verbindlich (eingefroren)  
**Stand:** 2026-08-25  
**Zweck:** Beilage für jeden Feature-Auftrag. Eine kanonische Variante pro Muster.  
**Basis:** [INVENTAR.md](./INVENTAR.md) · [AUDIT.md](./AUDIT.md) · `docs/DESIGN-CSS.md` · `docs/claude-project/07-DESIGN.md`  
**Spiegel:** Regeln sind 1:1 in `docs/claude-project/07-DESIGN.md` übernommen.

**Kanonisch** = ab jetzt so bauen · **Legacy** = existiert, nicht erweitern · **Soll** = Produktregel, Fix ggf. separat · **Backlog** = geplant, nicht blockierend für andere Features

---

## 0. Prinzipien (kurz)

1. **Eine CSS-Quelle** für CRM-Komponenten: `mock-design-system.css` (Tokens nur `globals.css`).
2. **Ein Primary-CTA** pro Screen (Verb, max. ~2 Wörter).
3. **Ein Status-Badge** pro Listen-Zeile.
4. **Gleiche Tab-IDs** Desktop/Mobile; nur Dichte wechselt.
5. **Anrede:** Nur Marketing **duzt**. Alles mit Login **siezt** (MeinBärenwald, Partner, CRM-Auth für Endkunden-Token-Seiten, Melde/Formal). Bestehende Partner-Du-Copy: Migration bei Berührung; **neue Copy ab jetzt Sie**.
6. **Whitelabel:** kein Bärenwald-CTA-Wortlaut / kein erzwungenes Brand-Grün auf Org-Melde-UI (außer „technischer Betrieb“-Zeile).
7. **Status-Labels:** eine kanonische Map — keine zweite Wortlaut-Quelle (auch nicht Dashboard).

---

## 1. Button

| | |
|--|--|
| **Kanonisch** | `MockBtn` aus `src/components/mock-ui/` mit `kind`: `primary` · `ghost` · `danger` (+ `sm`) |
| **Klassen** | `.btn.primary` / `.btn.ghost` / `.btn.danger` / `.btn.sm` |
| **Legacy** | `ui/Button` (darf als Thin-Wrapper auf dieselben Klassen bleiben) · raw `className="btn primary"` · Tailwind `bg-emerald-*` |
| **Regel** | Pro Viewport max. **ein** Primary. Weitere Actions: ghost / ⋯ ActionSheet. |
| **Copy** | Persistieren in Sheets: **Speichern** (✓). Wizard-Schritt: **Weiter**. Mail: **Senden**. Destructive Confirm: Verb + Objekt („Verwerfen“). Vermeiden: Übernehmen/Fertig für denselben Persist-Job — Ausnahme Abnahme-Ende: **Fertig** (Surface-Checkliste). |

---

## 2. Chip / Filter

| | |
|--|--|
| **Kanonisch** | `MockChip` · `.chip` / `.chip.active` |
| **Legacy** | `chip.selected`, eigene Pill-Klassen |
| **Verwendung** | Phasen-Filter Vorgänge, Segment-Controls |

---

## 3. Badge / Status

| | |
|--|--|
| **Kanonisch** | `StatusBadge` → `MockBadge` + `STATUS_TONE` (`src/components/ui/StatusBadge.tsx`) |
| **Labels** | **Eine** Map: `status-display` und `vorgang-labels` zusammenführen (Label + optional Kurzlabel in derselben Quelle). `dashboard-mock-mapping` **darf keine eigenen Wortlaute** mehr führen — nur noch Kind/Tone, Labels aus der kanonischen Map. |
| **Kanonischer Wortlaut** | Auftrag `offen` → **Offen** · `in_arbeit` → **In Arbeit** · `abgeschlossen` → **Abgeschlossen** · RE gesendet → **Gesendet** · HW-gesendet → **An Partner gesendet** · HW akzeptiert → **Partner akzeptiert** |
| **Legacy** | `AngebotStatusBadge` / `AuftragStatusBadge` (Durchleitung ok) · `emerald-*` Status-Pills · Dual-Badges · abweichende Dashboard-Kurzformen („Fertig“, „Versendet“, „Gesendet HW“) |
| **Regel** | **Kein** zweites Badge in derselben Zeile. Korrektur-Zustand: ein Badge mit zusammengesetztem Label („Gesendet · Korrektur“) oder Meta-Text, nicht zwei Pills. |

---

## 4. Card

| | |
|--|--|
| **Kanonisch** | `MockCard` (`.card` / `.card-h` / `.card-b`) |
| **Legacy** | `detail-section-card`, `DetailCollapsibleCard` (Build-Guard) |
| **Regel** | Cards nur wenn Container für Interaktion/Gruppierung nötig — nicht dekorativ stapeln. |

---

## 5. Liste

| | |
|--|--|
| **Kanonisch Pipeline** | `/vorgaenge` + `VorgaengeListeClient` |
| **Kanonisch Stammdaten** | Kunden-/Handwerker-Master-Detail |
| **Regel** | Keine Aktion-nötig-Spalte. Zeilen-Menü: `MockEntityRowMenu` / ActionSheet. Empty: `MockEmpty`. |
| **Legacy** | Entity-Listen-Routen als Redirect-Aliase beibehalten ok |

---

## 6. Detail

| | |
|--|--|
| **Kanonisch** | `DetailShell` — Tabs **Übersicht · Leistungen · Zahlung · Akte** für Pipeline-Entitäten |
| **Referenz** | Anfrage-/Angebot-/Auftrag-/Rechnung-DetailClients |
| **Abweichungen erlaubt** | Handwerker: Compliance statt Zahlung · Kunde: Objekte statt Zahlung — bewusst, dokumentiert |
| **Primary** | Ein Text-Button im Header + globales ⋯ (`primary-cta.ts`) |
| **Legacy** | Extra Sub-Routen für Abnahme/Abschluss → Redirect auf Tab/Sheet |

---

## 7. Sheet (Anlegen / Bearbeiten)

| | |
|--|--|
| **Kanonisch** | `EditorSheet` — Mobile Bottom Sheet · Desktop Slide-over (Detail) oder Center über Canvas |
| **Referenz** | `src/components/surfaces/EditorSheet.tsx` |
| **Verhalten** | Dirty → „Änderungen verwerfen?“ · Speichern ohne Confirm · Back schließt Sheet |
| **Legacy** | `MobileEditSheet`, `FormSheet`, `SidePanel` — nicht für neue Features |
| **Confirm löschen** | `Modal` / `MockModal` ok |

---

## 8. DocumentCanvas (Dokument- / Mehrschritt-Flows)

| | |
|--|--|
| **Kanonisch** | `DocumentCanvas` + DocBar (Vorschau · Senden · … · Verwerfen) — Fullscreen |
| **Referenz** | `AngebotWizard.tsx`, `RechnungWizard.tsx` · `src/components/surfaces/DocumentCanvas.tsx` |
| **Nested Auswahl** | EditorSheet / Center-Modal über Canvas (Kunde, Position) — Spec Surface |
| **Hinweis** | Früherer Docs-Name „WizardShell“ ist **obsolet** — überall DocumentCanvas. |
| **Legacy** | Mehrstufige Mini-Overlays · Staff-Funnel nur für Staff-Sonderfälle |

---

## 9. Modal / ActionSheet / Picker

| Muster | Kanonisch | Wann |
|--------|-----------|------|
| Dialog / Confirm | `ui/Modal` | Zerstören, kurze Entscheidung |
| ⋯ Menü | `ActionSheet` | Secondary Actions |
| Auswahl Liste | `PickerSheet` / EditorSheet-Picker | Kunde, HW, Katalog |
| Legacy | lose `*Modal.tsx` ohne Surface | Inhalt in Modal/Sheet migrieren |

---

## 10. Empty State

| Surface | Kanonisch | Referenz |
|---------|-----------|----------|
| CRM | `MockEmpty` | mock-ui |
| Portal / Partner | `PortalStateView` kinds: `leer`, `e404`, `zugriff`, `server`, `offline` | portal-states |
| Melde Fehler | `MeldeFehlerClient` + `MIETER_WL_FEHLER` | |
| **Legacy** | `PortalInboxEmpty` parallel — neue Screens nur `PortalStateView` |
| **Regel** | Keine nackte Leere; Token-404 (gelöschter Vorgang) braucht erklärende Seite (**Soll**, noch nicht Ist) |

---

## 11. Fehlerseite

| Surface | Kanonisch |
|---------|-----------|
| Marketing | `not-found.tsx` / `error.tsx` (Jakarta/Lora, Brand-Grün) |
| Portal/Partner | `PortalNotFoundState` / `PortalServerErrorState` |
| Melde | `/melden/fehler` |
| Vermeiden | Roh-Next-404 ohne Copy auf Token-Flows |

---

## 12. Toast

| | |
|--|--|
| **Kanonisch** | `src/components/ui/app-toast.tsx` |
| **Copy** | Kurz: **Gespeichert** / **Gesendet** — keine Essays |
| **Legacy** | `sonner` (ungenutzt) — nicht neu verdrahten |

---

## 13. Farbe / Tokens

| | |
|--|--|
| **Primary** | `#2e7d52` / Token `--green` |
| **Dark** | `#1a3d2b` / `--green-dark` |
| **CRM Canvas** | `#F7F6F3` |
| **Verboten in neuem UI** | `emerald-*`, Tailwind-`green-*` für Status, Teal-Akt-Cards ohne Token, Inline-Hex außer in Token-Datei |
| **Whitelabel** | Org-Primary aus DB; Fallback nur dokumentiert, nicht still BW-Grün erzwingen wo Org fehlt → eher Neutral |

---

## 14. Typografie

| Surface | Kanonisch |
|---------|-----------|
| Marketing / Landing / Funnel | Plus Jakarta Sans + Lora |
| CRM | Mock-Typo-Hierarchie (Detail-Titel ~20px, Sheet ~17px, Body 14–15) |
| Portal / Partner | **Systemfonts** (System / SF Pro / Roboto) — **dokumentierte, bewusste Ausnahme**. Kein Bug, **nicht** auf Jakarta/Lora „reparieren“. |
| Fehler | dieselben Fonts wie Parent-Surface |

---

## 15. Whitelabel (Melde + Org-Portal)

| | |
|--|--|
| **Logo / Primary / Name** | Org |
| **Erlaubt BW** | Fußzeile „Technischer Betrieb/Service“ · Legal-Technik |
| **Verboten** | „Zu Bärenwald registrieren“-Wording · BW-Grün als erzwungene CTA-Farbe · BW-Logo im Melde-Header |
| **org_kennung** | **Soll:** Warnhinweis beim Ändern („Gedruckte Aushänge/QR mit alter URL werden ungültig“). **Backlog:** Redirect-Alias-Tabelle für alte Kennungen. |

---

## 16. Anrede & Copy

| Surface | Anrede |
|---------|--------|
| Marketing (Landing, Ratgeber, öffentlicher Funnel ohne Login) | **Du** |
| Melde, MeinBärenwald, Partner-Portal, Token-Status, Formales | **Sie** |
| Partner-Portal Ist | teils noch Du — **Legacy**; bei Berührung migrieren, neue Strings nur Sie |
| CRM intern (Staff) | Du/neutral ok |
| Buttons | Verb, ≤2 Wörter (Sheet-Primary ≤3) |

**Regel:** Nur Marketing duzt. Alles mit Login siezt.

---

## 17. Datum & Geld

| | |
|--|--|
| **Datum** | `formatDatum` / `formatDatumZeit` aus `src/lib/utils.ts` → TT.MM.JJJJ |
| **Geld** | **Soll:** eine Hilfsfunktion z. B. `formatEuro(n)` → `1.234,56 €` (2 NK); Ranges ohne Währungs-API-Mix |
| **Legacy** | lokale `toLocaleString` — bei Touch vereinheitlichen |

---

## 18. Einstiege / Redundanz

| Erlaubt (bewusst) | Vermeiden |
|-------------------|-----------|
| FAB + Detail-Primary + Nächste Schritte für dieselbe Pipeline-Aktion | Zweiter Fullpage-Wizard parallel zum Canvas |
| Alias-Routen → `/vorgaenge` | Zweite Listen-Implementierung |
| Deep-Link `/neu?art=` | Clone-Seiten (`/portal-tools/rechner`) ohne Redirect |

---

## 19. Produkt-Soll & Backlog (entschieden)

### 19.1 HW nach Status `ersetzt` — **Soll** (Fix separat)

Nach Partner-Tausch („neu disponieren“):

- **Sofortsperre:** alter Partner verliert Portal-Sicht und Schreibrechte auf den Auftrag.
- **Erstellte Doku** (Bautagebuch, Fotos, eigene Einträge) bleibt erhalten und mit **Urheber-Kennzeichnung** sichtbar (für CRM / neuen Partner / Audit — nicht als voller Auftragszugriff des Alten).

*(Implementierung = eigener Auftrag, nicht Teil dieses Doku-Commits.)*

### 19.2 `org_kennung` — **Soll** + **Backlog**

- **Soll:** Warnhinweis im CRM beim Speichern einer geänderten Kennung.
- **Backlog:** Redirect-Alias-Tabelle (alte URL → neue Org).

### 19.3 Kunden-Nachtrag Ablehnen — **Backlog** (geplantes Soll)

- Ablehnen-Button auf `/nachtrag/[token]` (heute nur Zustimmen).
- Staff-Folgeschritt **„Klären“:** überarbeiten · verwerfen + Baustopp aufheben · stornieren.
- Bis Umsetzung: Auftrag bleibt bis Annahme unverändert; Ablehnung faktisch nur außerhalb des Token-UI.

---

## 20. Checkliste vor Merge (neu Feature)

- [ ] MockBtn/Chip/Badge/Card — keine emerald-Status-Pills  
- [ ] ≤1 Primary auf dem Screen  
- [ ] ≤1 Status-Badge pro Zeile  
- [ ] Anlegen/Edit über EditorSheet (oder DocumentCanvas)  
- [ ] Status-Label aus kanonischer Map (kein neuer Wortlaut in `dashboard-mock-mapping`)  
- [ ] Anrede: Login → Sie · Marketing → Du  
- [ ] Whitelabel: kein BW-CTA-Leak  
- [ ] Empty/Fehler gestaltet  
- [ ] Geld/Datum über Hilfsfunktionen  
- [ ] Kein neuer Docs-/Code-Name „WizardShell“ — nur DocumentCanvas  

---

## 21. Entschiedene Produktregeln (Archiv — Abschnitt 20 aufgelöst)

| Thema | Entscheidung |
|-------|----------------|
| Partner-Anrede | **Sie**; Migration bei Berührung |
| Portal-Fonts | Systemfonts bleiben (bewusste Ausnahme) |
| Status-Labels | Eine Map; Dashboard ohne Eigenwortlaute |
| HW `ersetzt` | Sofortsperre + Doku mit Urheber — Soll, Fix separat |
| `org_kennung` | Warnung Soll · Alias-Redirect Backlog |
| Nachtrag Ablehnen | Backlog: Token-Ablehnen + Staff „Klären“ |

---

*Eingefroren 2026-08-25. Änderungen nur mit expliziter Produktentscheidung und Sync nach `07-DESIGN.md`.*

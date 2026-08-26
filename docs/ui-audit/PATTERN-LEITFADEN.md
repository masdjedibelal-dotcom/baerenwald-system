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
   - **Flag-Ausnahme:** `badges.notfall` darf als roter Punkt/Icon **vor** dem Status-Badge stehen (kein zweites Status-Wort).
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
| **Legacy** | `ui/Button` (Thin-Wrapper) · `secondary` nur noch für Modal-Abbrechen/Dismiss (Footer) — neue Features: **ghost** |
| **Regel** | Pro Viewport max. **ein** Primary. Weitere Actions: ghost / ⋯ ActionSheet. |
| **Copy** | Persistieren in Sheets: **Speichern** (✓). Wizard-Schritt: **Weiter**. Mail: **Senden**. Destructive Confirm: Verb + Objekt („Verwerfen“). Vermeiden: Übernehmen/Fertig für denselben Persist-Job — Ausnahme Abnahme-Ende: **Fertig** (Surface-Checkliste). |

### Aktions-Art → eine Variante (AUFTRAG C4)

| Aktions-Art | Variante | Beispiel |
|---|---|---|
| Login / Haupt-Submit | **primary** | CRM-Login „Anmelden“ |
| Hinzufügen / Anlegen | **primary** (Header) | Card-Header „+ Hinzufügen“ — Empty ohne zweiten Button |
| Download / Öffnen PDF | **ghost** | Dokument-Zeile Download |
| Kopieren (Link/Text) | **ghost** | „Link kopieren“ |
| Abbrechen / Dismiss | **ghost** oder legacy `secondary` im Modal-Footer | Sheet schließen |
| Destruktiv | **danger** | Löschen im Confirm |

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
| **Regel** | **Kein** zweites Status-Badge in derselben Zeile. Korrektur-Zustand: ein Badge mit zusammengesetztem Label („Gesendet · Korrektur“) oder Meta-Text, nicht zwei Pills. **Ausnahme:** Notfall-Flag als roter Punkt vor dem Status-Badge (`badges.notfall`). |

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
| **Ausnahme E3** | **Listen-Ranges** (Min–Max, z. B. `300 – 700 €`) **ohne** Nachkommastellen — bewusst ok (Dichte). Detail/Belege weiter 2 NK. |

---

## 18. Einstiege / Redundanz

| Erlaubt (bewusst) | Vermeiden |
|-------------------|-----------|
| FAB + Detail-Primary + Nächste Schritte für dieselbe Pipeline-Aktion | Zweiter Fullpage-Wizard parallel zum Canvas |
| Alias-Routen → `/vorgaenge` | Zweite Listen-Implementierung |
| Deep-Link `/neu?art=` | Clone-Seiten (`/portal-tools/rechner`) ohne Redirect |

---

## 19. Produkt-Soll & Backlog (entschieden)

### 19.0 Zyklus-Entscheidungen (E1 / E2 / E3 / E6) — final

| ID | Entscheidung | Ist |
|----|--------------|-----|
| **E1** | Nach Auftragsabschluss: Primary = **„Schlussrechnung versenden“**, solange unversendete Schluss-RE; erst danach „Bewertung einholen“ | `primary-cta.ts` |
| **E2** | Button-Copy: Verb ≤2 Wörter; Persist = **Speichern**; **Übernehmen** nur Apply (KI/Katalog); **Fertig** nur Abnahme-Ende | Leitfaden §1 / §16 |
| **E3** | Geld-**Ranges in Listen** ohne 2 Nachkommastellen erlaubt | §17 Ausnahme |
| **E6** | Kanal HV-Meldung: Termin-Bestätigungsmail **default AUS** | `StatusModal` / `TerminModal` |
| **Notfall-Flag** | `badges.notfall` = roter Punkt **vor** Status-Badge (Ausnahme zur Ein-Badge-Regel) | §3 + Vorgänge-Liste |
| **Kunden-Versand bei Freigabe ausstehend** | **Ist:** Kunden-/HV-Angebotsversand erlaubt trotz `org_freigabe_status=ausstehend`; Partner-Versand blockiert | `docs/claude-project/06-PROZESSE.md` § Org-Freigabe |

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

### 19.4 Auftrag-7 UI-Hygiene (final)

| Thema | Regel |
|-------|--------|
| **Empty-CTA vs. Header** | Kein zweiter Primary im `MockEmpty`, wenn die Card/Liste bereits einen Header-„+“/Hinzufügen-Primary hat. Empty nur Hint („Über + oben…“). Listen-Empty ohne Header-CTA darf den Primary behalten. |
| **Affordance** | Aktionen = `button` / `MockBtn` / `ListRowCheck` — keine nackten `div`/`span`-`onClick` ohne Rolle. |
| **Zugehörigkeit** | Gleiche Entität = gleiches Aktions-Muster (⋯ / Confirm / disabled-mit-Grund) — siehe `docs/test/AKTIONS-MATRIX.md`. |
| **Loading-States** | Übergänge >1 s: Spinner im Trigger und/oder Overlay/`CrmPageLoading`; Auth-Callback mit Splash-Text. |

---

## 20. Checkliste vor Merge (neu Feature)

- [ ] MockBtn/Chip/Badge/Card — keine emerald-Status-Pills  
- [ ] ≤1 Primary auf dem Screen  
- [ ] ≤1 Status-Badge pro Zeile (Notfall-Punkt-Ausnahme ok)  
- [ ] Empty ohne Doppel-Add, wenn Header-„+“ existiert  
- [ ] Aktionen als Button/MockBtn (keine Text-Links als Primary-Aktion)  
- [ ] Loading bei langen Mutationen / Route-Wechsel sichtbar  
- [ ] Anlegen/Edit über EditorSheet (oder DocumentCanvas)  
- [ ] Status-Label aus kanonischer Map (kein neuer Wortlaut in `dashboard-mock-mapping`)  
- [ ] Anrede: Login → Sie · Marketing → Du  
- [ ] Whitelabel: kein BW-CTA-Leak  
- [ ] Empty/Fehler gestaltet  
- [ ] Geld/Datum über Hilfsfunktionen (Listen-Ranges: E3 ok)  
- [ ] Kein neuer Docs-/Code-Name „WizardShell“ — nur DocumentCanvas  
- [ ] Neue Hinweise nur `MockInfoTip` / `InfoTip`  

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
| E1 Primary Abschluss | Schlussrechnung versenden vor Bewertung |
| E2 Button-Copy | Speichern / Weiter / Senden; Übernehmen nur Apply; Fertig nur Abnahme |
| E3 Listen-Ranges | ohne 2 NK erlaubt |
| E6 HV Termin-Mail | default AUS |
| Notfall-Flag | Punkt vor Status-Badge |
| Kunden-Versand + Freigabe ausstehend | erlaubt (Ist) — siehe 06-PROZESSE |
| Empty-CTA / Affordance / Zugehörigkeit / Loading | Auftrag-7 — §19.4 |

### Auftrag-7 — Empty, Affordance, Zugehörigkeit, Loading (ausführlich)

1. **Empty-CTA-Header:** Card/Section mit Header-Primary „Hinzufügen“ → Empty ohne Button, nur Hinweistext. Ausnahme: Listen-Empty ohne Header-CTA.
2. **Affordance:** Klickbare UI ist Button oder Menü-Item; Checkbox-Auswahl über `ListRowCheck`.
3. **Zugehörigkeit:** Eine Entität hat ein Aktionsmuster (Detail-⋯, Listen-⋯, Bulk) — nicht Inline-Trash hier und ⋯ dort für denselben Delete-Job.
4. **Loading:** Login-Submit Spinner + Busy-Overlay; Dashboard `loading.tsx` Skeleton; `/auth/callback` Splash; lange Server-Actions über `actionBusy`.

---

### Info-Hinweise (F-148)

| | |
|--|--|
| **Kanonisch** | `MockInfoTip` (`src/components/mock-ui/MockInfoTip.tsx`) — i-Icon, 1–2 Sätze |
| **Website/Melde** | `InfoTip` (`baerenwald/src/components/ui/InfoTip.tsx`) |
| **Regel** | Neue Hinweise nur darüber; `title=` / nacktes info-Icon bei Berührung migrieren |
| **Fachbegriffe** | `FachbegriffHint` → bei Touch auf `MockInfoTip` umstellen |

---

*Eingefroren 2026-08-25 · Zyklus E1/E2/E3/E6 + Auftrag-7 nachgezogen 2026-08-26. Änderungen nur mit expliziter Produktentscheidung und Sync nach `07-DESIGN.md`.*

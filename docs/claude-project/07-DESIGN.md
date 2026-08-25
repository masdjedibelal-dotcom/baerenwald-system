# 07 — Design (Website + CRM)

Damit Claude Layout, Ton und UI-Muster richtig einschätzt.

**Pattern-Leitfaden (verbindlich):** [`docs/ui-audit/PATTERN-LEITFADEN.md`](../ui-audit/PATTERN-LEITFADEN.md) — Stand 2026-08-25, eingefroren. Bei Konflikt gilt der Leitfaden; dieses Dokument spiegelt ihn.

---

## Gemeinsame Markenfarben

| Token-Idee | Hex (Richtwert) | Verwendung |
|------------|-----------------|------------|
| Akzent / Primary | `#2E7D52` / `#2e7d52` | Buttons, Links, aktive Chips |
| Dunkelgrün | `#1A3D2B` / `#1a3d2b` | Sidebar, Header, starke Flächen |
| Soft / Light | `#eaf3de` | sanfte Highlights |
| CRM-Hintergrund | `#F7F6F3` | App-Canvas |
| Website-Hintergrund | `#e6e8e6` | Landing-Fläche |
| Text | `#1e1c1a` | Body |
| Sekundärtext | `#524e4a` | Meta |

Whitelabel-Organisationen überschreiben Primary/Logo auf Melde- und manchen Portal-Seiten.

**Verboten in neuem UI:** Tailwind `emerald-*` / `green-*` für Status, Inline-Hex außer in Token-Dateien.

---

## Website-Design

### Typografie

- **Sans:** Plus Jakarta Sans — UI und Fließtext
- **Display:** Lora — Überschriften / Akzente

### Formensprache

- Abgerundete Karten (Radius ca. 18px)
- Pill-Buttons
- Landing mit Fade-up-Animationen
- Karten weiß auf warmem Grau-Grün
- Vertrauenssignale: Meisterbetriebe, Festpreisangebot, München-Fokus, schnelle Rückmeldung

### Portal-Oberflächen

- Eigene Shell-Navigation (MeinBärenwald / Partner)
- Glyphen/Icons in der Nav
- Whitelabel-Farben für Mieter/Eigentümer/Hausmeister wo vorgesehen
- **Fonts:** Systemstack (System / SF Pro / Roboto) — **bewusste Ausnahme**, kein Bug, nicht auf Jakarta/Lora „reparieren“. Marketing bleibt Plus Jakarta Sans / Lora.

### Ton / Anrede

- **Nur Marketing duzt** (Landing, Ratgeber, öffentlicher Funnel ohne Login).
- **Alles mit Login siezt** (MeinBärenwald, Partner-Portal, Token-Status, Melde/Formal).
- Partner-Portal: neue Copy = Sie; bestehende Du-Strings bei Berührung migrieren.
- Kein „Startup-Lila“, kein dunkles Neon — handwerklich, ruhig, grün.

### Whitelabel

- Logo / Primary / Name = Org.
- Erlaubt BW: Fußzeile „Technischer Betrieb/Service“.
- Verboten: „Zu Bärenwald registrieren“, erzwungenes BW-Grün als CTA, BW-Logo im Melde-Header.
- `org_kennung` ändern: **Soll** Warnhinweis (Aushänge/QR ungültig); Redirect-Alias-Tabelle = **Backlog**.

---

## CRM-Design

### Quellen

- Tokens in `globals.css`
- **Alle Komponenten-Styles** in `mock-design-system.css` (eine CSS-Quelle)
- React-Primitives: MockBtn, MockChip, MockBadge, MockCard
- Surfaces: `src/components/surfaces/` (`DocumentCanvas`, `EditorSheet`, …)
- Verbindliche Muster: `docs/ui-audit/PATTERN-LEITFADEN.md`

### Primitive (Namen)

- Buttons: `.btn.primary` · `.btn.ghost` · `.btn.danger` · `.btn.sm` → bevorzugt `MockBtn`
- Chips: `.chip` / `.chip.active`
- Cards: `.card` / Header/Body-Varianten
- Badges: `.badge` + Status-Punkte → Vorgangs-Status nur über `StatusBadge`

### Surface-Familien

| Surface | Wann | Desktop | Mobile |
|---------|------|---------|--------|
| **DocumentCanvas** | Angebot, Rechnung, Abnahme, Vertrag, Dokument-Flows | Vollbild-Center | Vollbild + DocBar |
| **EditorSheet** | Anlegen/Bearbeiten | Slide-over | Bottom Sheet |
| **PickerSheet** | Auswählen (Kunde, HW, Katalog) | Popover/Modal | Bottom Sheet |
| **DetailShell** | Entity-Detail | Linke Tabs + Inhalt | Drill-down |
| **ActionSheet** | ⋯-Menü | Popover | Bottom Sheet |

*(Früherer Docs-Name „WizardShell“ = obsolet. Kanonisch nur **DocumentCanvas**.)*

### Typo-Hierarchie (CRM)

- Detail-Titel ca. 20px
- Sheet-Titel ca. 17px
- Section-Labels klein, uppercase
- Body 14–15px

### Status-Sprache

- **Eine** kanonische Label-Map (`status-display` / `vorgang-labels` zusammenführen; Label + optional Kurzlabel).
- `dashboard-mock-mapping` führt **keine eigenen Wortlaute** — nur Kind/Tone.
- Kanonisch u. a.: **Offen** · **In Arbeit** · **Abgeschlossen** · **Gesendet** · **An Partner gesendet** · **Partner akzeptiert** (nicht: Fertig / Versendet / Gesendet HW).
- **Ein** Status-Badge pro Listen-Zeile (keine Dual-Pills).

### Regeln, die das Produkt prägen

1. **Max. ein Primary-CTA** pro Screen
2. **Ein Status-Badge** pro Zeile (keine Badge-Cluster)
3. Gleiche Tab-IDs Desktop/Mobile — nur Dichte/Layout wechselt
4. Listen ohne „Aktion nötig“-Spalte (bewusst entfernt)
5. Fullscreen-Dokument-Flows über **DocumentCanvas** (kein kleines Mock-Overlay)
6. Eingeklappte Stammdaten, Fokus auf nächsten Schritt
7. Projekt-Kette immer sichtbar halten
8. Anlegen/Edit → **EditorSheet**; Dokument-Job → **DocumentCanvas**

### Mobile CRM

- Bottom-Nav; auf Detail-Screens oft ausgeblendet
- FAB für Neu
- Sheets statt Split-View
- Breakpoint grob: ≤767 Mobile, ≥768 Desktop; Master-Detail Kunden ab ~900px

---

## Produkt-Soll (entschieden, Fix ggf. separat)

| Thema | Regel |
|-------|--------|
| HW nach `ersetzt` | Sofortsperre: Portal-Sicht + Schreibrechte weg; erstellte Doku bleibt mit Urheber-Kennzeichnung |
| Kunden-Nachtrag Ablehnen | **Backlog:** Button auf `/nachtrag/[token]` + Staff-Folgeschritt „Klären“ (überarbeiten / verwerfen+Baustopp aufheben / stornieren) |
| `org_kennung` | Warnhinweis Soll · Alias-Redirect Backlog |

---

## Design-Soll vs. Ist (ehrlich)

| Thema | Ist | Soll |
|-------|-----|------|
| Dashboard | KPI-Wand | „Heute — deine Schritte“ (Konzept) |
| Nav-Struktur | Arbeit / Stammdaten-ähnlich | Vier Bereiche Heute/Projekte/Kontakte/Finanzen (Konzept) |
| Status-Sprache | noch mehrere Welten im Code | eine Map (entschieden — Code nachziehen) |
| Mock-Parität | großer Teil umgesetzt | laufende Feinjustierung |
| Partner-Anrede | teils Du | Sie (neue Copy; Migration bei Berührung) |
| HW nach Tausch | Alter behält oft Zugriff | Sofortsperre (entschieden — Fix separat) |

Wenn Belal nach „wie soll es aussehen?“ fragt: Leitfaden + dieses Soll. Wenn nach „was haben wir?“: Ist beschreiben und Abweichung nennen.

---

## UI-Inhalte, die Claude oft braucht

### Neu-Popover Einträge (Ist)

Anfrage · Angebot · Rechnung · (Trenner) · Kunde · Handwerker · (Trenner) · Termin · To-do  

Auftrag entsteht aus Angebot/Annahme, nicht über den FAB.

### Vorgänge-Phasen-Chips

Alle · Anfrage · Angebot · Auftrag · Rechnung · Wartung & Pflege

### Detail-Tabs (typisch)

Übersicht · Leistungen · Zahlung · Akte  
(Auftrag: Leistungen bündeln Bautagebuch/Abnahme/Abschluss über Deep-Links.)

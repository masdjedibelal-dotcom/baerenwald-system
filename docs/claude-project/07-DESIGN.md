# 07 — Design (Website + CRM)

Damit Claude Layout, Ton und UI-Muster richtig einschätzt.

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

### Ton

- Marketing: freundlich, Du
- Portal/Formal: klar, Sie
- Kein „Startup-Lila“, kein dunkles Neon — handwerklich, ruhig, grün

---

## CRM-Design

### Quellen

- Tokens in `globals.css`
- **Alle Komponenten-Styles** in `mock-design-system.css` (eine CSS-Quelle)
- React-Primitives: MockBtn, MockChip, MockBadge, MockCard

### Primitive (Namen)

- Buttons: `.btn.primary` · `.btn.ghost` · `.btn.danger` · `.btn.sm`
- Chips: `.chip` / `.chip.active`
- Cards: `.card` / Header/Body-Varianten
- Badges: `.badge` + Status-Punkte

### Surface-Familien

| Surface | Wann | Desktop | Mobile |
|---------|------|---------|--------|
| **DocumentCanvas** | Angebot, Rechnung, Abnahme, Vertrag | Vollbild-Center | Vollbild |
| **EditorSheet** | Anlegen/Bearbeiten | Slide-over | Bottom Sheet |
| **PickerSheet** | Auswählen (Kunde, HW, Katalog) | Popover/Modal | Bottom Sheet |
| **WizardShell** | Mehrstufig | Stepper + Karten | Sticky „Weiter“ |
| **DetailShell** | Entity-Detail | Linke Tabs + Inhalt | Drill-down |
| **ActionSheet** | ⋯-Menü | Popover | Bottom Sheet |

### Typo-Hierarchie (CRM)

- Detail-Titel ca. 20px
- Sheet-Titel ca. 17px
- Section-Labels klein, uppercase
- Body 14–15px

### Regeln, die das Produkt prägen

1. **Max. ein Primary-CTA** pro Screen
2. **Ein Status-Badge** pro Zeile (keine Badge-Cluster)
3. Gleiche Tab-IDs Desktop/Mobile — nur Dichte/Layout wechselt
4. Listen ohne „Aktion nötig“-Spalte (bewusst entfernt)
5. Fullscreen-Wizards (kein kleines Mock-Overlay)
6. Eingeklappte Stammdaten, Fokus auf nächsten Schritt
7. Projekt-Kette immer sichtbar halten

### Mobile CRM

- Bottom-Nav; auf Detail-Screens oft ausgeblendet
- FAB für Neu
- Sheets statt Split-View
- Breakpoint grob: ≤767 Mobile, ≥768 Desktop; Master-Detail Kunden ab ~900px

---

## Design-Soll vs. Ist (ehrlich)

| Thema | Ist | Soll (Konzept) |
|-------|-----|----------------|
| Dashboard | KPI-Wand | „Heute — deine Schritte“ |
| Nav-Struktur | Arbeit / Stammdaten-ähnlich | Vier Bereiche Heute/Projekte/Kontakte/Finanzen |
| Status-Sprache | noch mehrere Welten | eine sichtbare Status-Sprache |
| Mock-Parität | großer Teil umgesetzt | laufende Feinjustierung |

Wenn Belal nach „wie soll es aussehen?“ fragt: Soll-Konzept bevorzugen und als Soll kennzeichnen. Wenn nach „was haben wir?“: Ist beschreiben.

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

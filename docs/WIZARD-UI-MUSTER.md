# Wizard-UI-Muster — Apple-Style (Mobile Sheet · Desktop Inline)

**Stand:** Juli 2026  
**Zweck:** Ein klares Muster für **alle** CRM-Wizards — mobil wie eine App durchklicken, desktop genauso einfach, ohne zwei Produktphilosophien.

Verwandt: **Lexware-Canvas:** [WIZARD-LEXWARE-KONZEPT.md](./WIZARD-LEXWARE-KONZEPT.md) · [DESIGN_KONZEPT §9](./DESIGN_KONZEPT_CRM_UI_UX.md)

> **Update Juli 2026:** Für Angebot/Rechnung ist das Zielbild nicht mehr nur „Stepper + Weiter“, sondern **eine Dokument-Seite + Bottom Sheets** (Lexware). Details im Lexware-Konzept.

---

## 1. Die eine Regel

| Gerät | Wie Inhalte wirken | Wie man vorwärts kommt |
|-------|--------------------|-------------------------|
| **Mobile** | Übersicht → tippen → **Bottom-Sheet** bearbeiten → Fertig | Sticky **Weiter** unten (Daumen) |
| **Desktop** | Formular **inline** in Cards (kein Sheet) | Header-Buttons Zurück / Weiter |

> Mobil = Settings-App-Feeling (Liste → Sheet).  
> Desktop = klarer Formular-Wizard mit Stepper — **nicht** Desktop-Sheets nachbauen.

---

## 2. Pflicht-Shell: `WizardShell`

**Nutzen:** Angebot, Rechnung, Anfrage, **Abnahme** (ab Juli 2026).

| Teil | Mobile | Desktop (`md+`) |
|------|--------|-----------------|
| Header | `WizardMobileToolbar` (X · Dots · optional Zurück) | Titel · Stepper · Aktionen |
| Body | Scroll, Cards, max. eine Aufgabe | Gleicher Inhalt, mehr Breite |
| Footer | `mobileFooter` = Primary **Weiter** / Speichern | Actions im Header (kein Sticky nötig) |
| Keyboard | `visualViewport` + `--keyboard-inset` | — |

**Nicht mehr neu bauen:** eigene `AppFlowScreen`-Header-Duplikate für Wizards (nur noch Sonderfälle wie Baustelle-Fullscreen ohne Steps).

---

## 3. Komponenten in Steps: `MobileEditableBlock`

Pattern aus Angebot (`AngebotWizardAngebotDetailsCard` …):

```tsx
<Card title="Ort & Zeit">
  <MobileEditableBlock
    sheetTitle="Übergabe bearbeiten"
    overview={<dl>… MobileOverviewField …</dl>}
  >
    {/* gleiches Formular — mobil im Sheet, desktop inline */}
    {form}
  </MobileEditableBlock>
</Card>
```

| | Mobile | Desktop |
|--|--------|---------|
| Sichtbar | Read-only Übersicht + **Bearbeiten** | Sofort das Formular |
| Edit | Bottom-Sheet + **Fertig** | Inline |
| Listen/Positionen | Vollfläche im Step (wie Angebot-Positionen), Zeilen ggf. eigenes Sheet | Inline Accordion / DnD |

**Wann kein Sheet:** lange Listen (Positionen, Abnahme-Leistungen), Foto-Grid, PDF-Preview — das bleibt der Step selbst.

---

## 4. Wizard-Inventar (Ist → Soll)

| Wizard | Shell | MobileEditableBlock | Urteil |
|--------|-------|---------------------|--------|
| **Angebot** | `WizardShell` ✅ | Cards Finalisieren ✅ | Referenz |
| **Rechnung** | `WizardShell` ✅ | Details/Zahlung ✅ | Referenz |
| **Anfrage** | `WizardShell` ✅ | dünn | ok |
| **Abnahme** | `WizardShell` ✅ (Juli 2026) | Meta-Steps ✅ | angeglichen |
| **Projektvertrag** | `AppFlowScreen` | nein | → auf `WizardShell` + Cards migrieren |
| **Rahmenvertrag** | `AppFlowScreen` | nein | → wie Vertrag |
| **Visualisierung** | `AppFlowScreen` | nein | Sonderfall ok |
| **Staff-Funnel** | eigene | — | Funnel, getrennt prüfen |

---

## 5. Desktop: so sollen Steps aussehen

```
┌─ WizardShell ─────────────────────────────────────────┐
│ [X]  Titel · Untertitel     ①──②──③     [Zurück][Weiter]│
├───────────────────────────────────────────────────────┤
│  Step-Titel (17px semibold)                           │
│  Kurzer Hint (13px muted)                             │
│                                                       │
│  ┌ Card ─────────────────────────────┐                │
│  │ Section-Titel                     │                │
│  │ Formularfelder inline             │                │
│  └───────────────────────────────────┘                │
│                                                       │
│  (optional zweite Card)                               │
└───────────────────────────────────────────────────────┘
```

- **Ein Job pro Step**, nicht 20 Felder ohne Karten-Gruppierung.  
- Stepper Labels ab `lg`; darunter nur Dots / „Schritt n“ in der Toolbar.  
- Primary immer **ein** Verb: Weiter, Speichern, Senden — nie zwei konkurrierende Primaries.

---

## 6. Mobile: so soll es sich anfühlen

```
┌ Toolbar: [X]  ···dots···  [‹]     ┐
│ Step-Titel + Hint                   │
│ ┌ Übersicht-Card ───────────────┐   │
│ │ Label / Wert                  │   │
│ │ [ Bearbeiten ] → Sheet        │   │
│ └───────────────────────────────┘   │
│                                     │
│ (Scroll)                            │
├─────────────────────────────────────┤
│         [     Weiter     ]          │  ← sticky, über Keyboard
└─────────────────────────────────────┘
```

Sheet: Titel · Formular · **Fertig** (schließt Sheet, nicht den Wizard).

---

## 7. Checkliste für neue / umgebaute Wizards

1. [ ] Nur `WizardShell` (kein paralleler Header-Bau)
2. [ ] `mobileFooter` = Primary; Toolbar nur Secondary (Zurück)
3. [ ] Meta-Felder in `Card` + `MobileEditableBlock`
4. [ ] Listen/DnD als Step-Inhalt (kein Sheet um die ganze Liste)
5. [ ] ≤ 5 logische Steps ideal; Meta-Steps kollabieren wenn möglich
6. [ ] Gleiche Copy Desktop/Mobile (nur Layout wechselt)
7. [ ] Focus-Trap + Escape schließen (Shell)

---

## 8. Nächste Migrationen

1. **Welle 11 (SoTA):** Create-Einstiege + Aktionen als Bottom Sheets + Meta-Steps Overview→Sheet — siehe `AUDIT-TODOS.md` W11 / Umsetzungsplan Block B2  
2. **ProjektvertragWizard** / **RahmenvertragWizard** → `WizardShell` (W10)  
3. Abnahme Steps von 7 → 3 (W9-02)  
4. Staff-Funnel an Shell angleichen wo sinnvoll (W10-03)  

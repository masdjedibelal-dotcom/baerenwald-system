# Screen-Contracts (CRM)

Minimalregeln für Detail- und Listenflächen. Kanonische Bausteine — keine parallelen Varianten ohne Belal-Freigabe.

## DetailShell

- Pipeline-Details (Anfrage / Angebot / Auftrag / Rechnung): Tabs und Gruppen über `DetailShell`.
- Ein Primary-CTA im Header; weitere Aktionen über ⋯ (`DetailActionsBar` / ActionSheet).
- Kein zweites Layout-Gerüst neben `DetailShell` / `EntityDetailLayout`.

## MockCard

- Inhaltsblöcke mit Titel/Aktionen: `MockCard` (intern `.card` / `.card-h` / `.card-b`).
- Keine neuen `className="card"`-Wrapper in Feature-Komponenten.
- Composites (`kpi-card`, `bw-card`, Doc-/Todo-Cards) bleiben eigene Klassen — nicht mit der Token-Klasse `card` mischen.

## StatusBadge

- Status in Listen und Details: `StatusBadge` → `MockBadge` + kanonische Labels.
- Kein zweites Status-Badge in derselben Zeile (Ausnahme: Notfall-Flag vor dem Status).

## EditorSheet

- Create/Edit/Compose: nur `EditorSheet` (kein Modal/MockModal).
- Footer nur feste API: `primary` / `secondary` / `danger` (kein `footer={<div…>}`).
- Bestätigungen: `ConfirmPopup` (E1), nicht `window.confirm`.
- Desktop: Slide-over von Detail, Center von DocumentCanvas — siehe `docs/SURFACE-KONSOLIDIERUNG.md`.

## Menüs (Kurz)

- Zeilen-⋯: `MockEntityRowMenu` (inkl. Neu-Erstellen-Popover).
- Listen-Chrome / Detail-⋯: `ListbarActionsMenu` / `ActionsMenu` in `DetailActionsBar` (Komponenten-Interna, dokumentiert).
- Keine parallelen Menü-Varianten (`PosTableMenu`, öffentliches `MockPopoverMenu`, eigene Neu-Popover-Datei).

## Verlauf

- Aktivitätstab: `VerlaufPanel` (EntityTimeline nur Thin-Wrapper).

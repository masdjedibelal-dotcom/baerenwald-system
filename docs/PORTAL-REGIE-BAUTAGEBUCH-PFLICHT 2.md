# Portal: Regie-Positionen — Pflicht-Bautagebuch

CRM setzt ab jetzt bei Angebotspositionen mit Schalter **„nach Aufwand“**:

- `verguetung: 'aufwand'`, Sync → `auftrag_positionen.typ = 'regie'`, `verguetung = 'aufwand'`
- `stundensatz`, `geschaetzt_std` (Schätzung im Angebot)

## Portal-Pflicht pro Regie-Position

Wenn `istRegiePosition` (`typ===regie` ∨ `verguetung===aufwand`):

Handwerker **muss** im Bautagebuch/Lebenszyklus ausfüllen:

1. **Start** mit Anfangsfoto (Pflicht)
2. **Ende/Ergebnis** mit Foto (Pflicht)
3. **Aufwand in Stunden** (`zeit_minuten` / Std+Min)
4. **Titel + Beschreibung** was gemacht wurde

Ohne diese Felder: Speichern blockieren mit klarer Fehlermeldung.
Festpreis-LV-Positionen: bestehende Regeln (Start/Ergebnis-Foto je Spec).

Rechnung: erfasste Stunden × `stundensatz` (wie CRM `auftrag-positionen-rechnung.ts`).

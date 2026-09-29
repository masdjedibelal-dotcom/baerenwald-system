# Umbau-Abnahmen

## P01 – Kundenportal vollständig · Branch `umbau/p01-kundenportal` (CRM + Portal)

### Was ist anders

1. Im Kunden- und HV-Portal zeigt ein Auftrag wieder seine **Leistungen**. Die Abfrage scheiterte seit 09.08.2026 bei jedem Aufruf.
2. **„Änderungen annehmen“** im Kundenportal funktioniert wieder. Vorher kam immer „Auftrag konnte nicht geladen werden.“
3. Der **QR-Code** für Melde-Links im HV-Portal wird wieder erzeugt. Er war seit 20.09.2026 kaputt.
4. Die **Suche** im Kunden-, HV- und Partner-Portal liefert wieder Treffer, im HV-Portal auch Dokumente.
5. Kleinere Punkte:
   - Der **Rechnungs-Export** im HV-Portal füllt die Spalten Objekt und Kostenstelle.
   - Der **Datenexport** eines Kontos läuft durch.
   - Die **Bestätigung für Mieter-Meldungen** findet den Kontakt.
   - Nimmt ein Kunde ein Angebot im Portal an, bekommt der Auftrag denselben **Titel** wie bei Annahme im CRM (Gewerke).
6. Mitgenommen aus dem 28.09.:
   - Die **Vorgangsliste** im CRM zieht einen nachträglichen Nachlass ab.
   - **Partner-Dokumente** tragen die echte Firmenadresse statt „Musterstraße 1“.

### So testen Sie (Staging)

1. **Leistungen:** Staging-CRM → Kunden → Musterverwaltung Nord → „Kundenportal öffnen“ → Vorgang „ZZTEST-R2 Elektro WE 12“ → Leistungen: 1 Position sichtbar.
2. **Änderungen annehmen:**
   - Im Staging-CRM denselben Auftrag bearbeiten, eine Position hinzufügen und senden.
   - Im Portal erscheint die Änderung. „Annehmen“ klicken → Bestätigung, kein Fehler.
3. **QR-Code:** Portal von Musterverwaltung Süd → Objekte → Objekt → QR-Code → Bild erscheint, das Handy öffnet den Melde-Link.
   - Falls das Portal meldet, dass Impressum und Datenschutz fehlen: Das ist eine gewollte Sperre, erst dort eintragen.
4. **Suche:**
   - Im HV-Portal oben einen Objektnamen suchen → Objekt erscheint.
   - Einen Dokumentnamen suchen → Dokument erscheint.
5. **Rechnungs-Export:** HV-Portal → Rechnungen → Export → CSV öffnen → Spalte Objekt ist gefüllt, wo die Rechnung einem Objekt zugeordnet ist.

### Was bewusst gleich bleibt

- Aussehen und Abläufe.
- Partner-Portal (Abnahme, Vertrag, Kalkulation) → P02.
- CRM-Spaltenfehler → P03.

### Geprüft von Claude

- **TypeScript Portal:** ohne Fehler.
- **Spalten-Prüfung Portal:** OK, Grundlinie von 23 auf 7 (alle Partner, P02). Das Maximum ist auf 7 gesenkt, behobene Fehler können nicht zurückkommen.
- **Alle 10 geänderten Abfragen:**
  - Auf Staging direkt ausgeführt: alle OK.
  - Auf Prod (nur lesend): alle OK außer den zwei, die die neue Spalte brauchen.
- **QR-Erzeugung** mit der neuen Farbe lokal nachgestellt: PNG wird erzeugt.
- **Staging-Schema** auf Prod-Stand gebracht (3 fehlende Migrationen) und um die neue Spalte ergänzt.

### Für Prod nötig

- Migration `supabase/migrations/20261212120000_auftrag_positionen_kunde_akzeptiert_at.sql`.
  - Sie legt nur eine leere Spalte an und kann nichts überschreiben.
  - Reihenfolge: erst Migration, dann Deploy.

### Rückweg

- Branch nicht mergen: Nichts ändert sich.
- Die Staging-Migration ist harmlos (leere Spalte), sie kann bleiben.

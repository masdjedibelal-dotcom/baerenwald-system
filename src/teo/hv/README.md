# TEO-Modul: HV-Ablauf

Nur aktiv mit `funktionAn('hvWorkflow')` (Servus TEO). Bärenwald nutzt diesen Ordner nicht.

Enthält, was nur der HV-Ablauf braucht:
- Freigabe/Schwelle (Angebot über Schwelle wartet auf HV-Freigabe)
- Sofortmaßnahme/Akut (Direktauftrag ohne Freigabe, Fall-Liste je HV/Objekt)
- eigener HV-Meldungsstatus (Mieter-Meldung wartet auf HV-Entscheidung)
- zugehörige Einstellungs- und Hinweis-Komponenten

Regel: Neue HV-Funktionen für TEO kommen hierher. Der gemeinsame Kern ruft sie nur an
wenigen Stellen auf und prüft dort `funktionAn('hvWorkflow')`.
Gespiegelte Kern-Dateien (z. B. `anfrage-akut-schwelle`) bleiben in `src/lib`.

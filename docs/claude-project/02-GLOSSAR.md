# 02 — Glossar

Kurze Definitionen, wie sie im Produkt gemeint sind. Bei Unklarheit gilt diese Datei.

| Begriff | Bedeutung |
|---------|-----------|
| **Vorgang** | Ein laufender Fall über alle Phasen hinweg (Anfrage bis Rechnung). In Listen oft eine Zeile pro aktueller Phase. |
| **Anfrage / Lead** | Erster Bedarf — noch kein verbindliches Kundenangebot. Kommt von Website, Telefon, Melden, HV-Portal usw. |
| **Angebot (AG)** | Preisvorschlag mit Positionen und Gültigkeit an den Kunden (manchmal vorher Partner-Einholung). |
| **Auftrag (AU)** | Beauftragte Ausführung nach Annahme/Freigabe. |
| **Rechnung (RE)** | Ausgehende Kundenrechnung oder eingehende Handwerker-Rechnung. |
| **Abschlag / Schlussrechnung** | Teilrechnung nach Zahlungsplan bzw. letzte Rechnung. |
| **Zahlungsplan / Zahlplan** | Geplante Raten statt einer einzigen Rechnung. |
| **Position / Leistung** | Einzelzeile (Gewerk, Menge, Preis, ggf. Handwerker). |
| **PosBoard** | Die Positions-Arbeitsfläche im CRM (Steuerung der Leistungen). |
| **Gewerk** | Fachbereich (Sanitär, Elektro, Maler, …). |
| **Kunde** | Privat, Gewerbe oder Hausverwaltung — Stammdatensatz im CRM. |
| **Objekt** | Gebäude/Immobilie mit Adresse; hat Melde-Link und Aushang. |
| **Einheit** | Wohnung/Teil im Objekt (Mieter-/Eigentümer-Zuordnung). |
| **Organisation / HV / Auftraggeber** | Hausverwaltung oder B2B-Auftraggeber mit Portal, Whitelabel und Freigabe-Regeln. |
| **org_kennung** | Kurzname in der Melde-URL, z. B. `/melden/meine-hv/...`. |
| **melde_slug** | Kurzname des Objekts in der Melde-URL. |
| **Meldung** | Schaden-/Anliegen-Meldung eines Mieters/Bewohners; wird intern als Anfrage geführt. |
| **Freigabe** | HV/Eigentümer muss Kosten oder Angebot freigeben, bevor es weitergeht. |
| **Whitelabel** | Logo/Farben/Name der Organisation auf Melde- und manchen Portal-Seiten. |
| **MeinBärenwald** | Login-Portal für Kunden, HV, Mieter, Eigentümer, Hausmeister. |
| **Partner** | Handwerksbetrieb im Netzwerk. Im CRM oft unter „Handwerker“ geführt. |
| **Partner-Portal** | Login-Bereich für Handwerker (`/partner`). |
| **Partner-Einholung** | Intern Preise bei HW abfragen, ohne schon das Kundenangebot zu sein. |
| **Bauprojekt** | Auftrag mit stärkerer Baustellen-Logik (Bautagebuch, Compliance, Abnahme). |
| **Standardauftrag** | Einfacherer Auftrag ohne volle Baustellen-Sonderlogik. |
| **Bautagebuch** | Fortschrittsdokumentation mit Einträgen/Fotos während der Ausführung. |
| **Abnahme / Abnahmeprotokoll** | Formale Übergabe; oft als PDF. |
| **Abschlussdokumentation** | Unterlagen-Paket für den Kunden am Ende. |
| **Nachtrag** | Zusatzleistung während des Auftrags; oft Kundenbestätigung nötig. |
| **Baustopp** | Pause, bis Nachtrag/Klärung erfolgt. |
| **Compliance** | Pflichtunterlagen des Handwerkers (Versicherung, Gewerbe, …). |
| **Projektvertrag / Nachunternehmervertrag** | Vertrag mit dem Handwerker zum Projekt. |
| **Projekt-Kette** | Sichtbare Kette Kunde → Anfrage → Angebot → Auftrag im CRM. |
| **Akte** | Dokumente, Notizen und Kommunikation an einer Entität. |
| **Token-Link** | Geheimer Link ohne Login (Status, Formular, HW-Anfrage, Nachtrag). |
| **Staff-Funnel** | Interner Anfrage-Assistent im CRM (ähnlich Website-Rechner, verkürzt). |
| **DocumentCanvas** | Vollbild-Arbeitsfläche für Angebot, Rechnung, Abnahme, Vertrag. |
| **Sheet** | Einschub/Bottom-Sheet zum Anlegen oder Auswählen. |
| **Primary-CTA** | Der eine grüne Hauptbutton auf dem Screen. |
| **BärenwaldGPT** | KI-Chat auf der Website (Beratung, Visualisierung, Preisrahmen). |
| **KI Assistent / Copilot** | KI-Chat im CRM (und optional Telegram) mit Screen-Kontext. |
| **KI Visualisierung** | Vorher/Nachher-Bilder zu Räumen/Angeboten. |
| **Wartung & Pflege** | Wiederkehrende / Bestands-Vorgänge in der Pipeline. |
| **Notfall / Akutfall** | Beschleunigter Pfad (z. B. Wasser, Strom), oft mit Sofortmaßnahmen. |
| **Aushang** | PDF/QR am Objekt, damit Mieter den Melde-Link finden. |
| **Tracking-Token** | Persönlicher Status-Link nach einer Meldung. |
| **Eingangsrechnung** | Rechnung vom Handwerker an Bärenwald. |
| **Direkt Auftrag** | Auftrag ohne klassische Kunden-Mail — z. B. unter Freigabe-Schwelle. |
| **Surface** | Art der Oberfläche (Liste, Detail, Wizard, Sheet, Canvas). |

## Status-Wörter (häufig)

### Anfrage
Neu · Kontaktiert · Termin · Angebot · Auftrag · Abgeschlossen · Verloren

### Angebot (vereinfacht sichtbar)
Entwurf · Gesendet · Angenommen · Abgelehnt · Abgelaufen · Ersetzt · An Partner gesendet · Partner akzeptiert

### Auftrag
Offen · In Arbeit · Abnahme · Abgeschlossen · Storniert

### Rechnung
Entwurf · Gesendet · Bezahlt · Storniert · (Anzeige: Überfällig)

### Mieter-Status (Melden)
Eingegangen → In Bearbeitung → Beauftragt → Handwerker vor Ort → Erledigt

#### CRM → Mieter-Timeline (Zuordnung)

| CRM-Signal | Mieter-Stufe |
|------------|--------------|
| Lead `neu` / Meldung ohne Bearbeitung | Eingegangen |
| Lead `kontaktiert` \| `termin`; Freigabe; HV prüft | In Bearbeitung |
| Auftrag erstellt; HW/Partner gesendet/angefragt | Beauftragt |
| HW bestätigt; Bautagebuch; `mieter_vor_ort_at`; Auftrag `in_arbeit` | Handwerker vor Ort |
| Abnahme **ohne** offene Mängel; Positionen erledigt | Erledigt |
| Offene Mängel in Abnahme | **nicht** Erledigt (bleibt Vor Ort / Beauftragt) |

Kanonische CRM-Labels: `src/lib/status/status-map.ts` (eine Map für Liste, Detail, Dashboard).

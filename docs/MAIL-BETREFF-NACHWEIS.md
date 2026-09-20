# Phase A F5 — Betreff-Nachweis (Transaktionsmails)

**Schema:** `[Objekt/Adresse] – [Ereignis]` · optional ` · [Nummer]`  
**Partner:** `[Gewerk, Ort] – [Ereignis]`  
**Intern:** `Intern · …`  
**Auth:** unverändert  
**F3:** HV-Mails behalten BW-Shell (keine Org-Farben im Header).

| Ereignis | Alter Betreff (Beispiel) | Neuer Betreff (Beispiel) | Empfänger |
|----------|--------------------------|--------------------------|-----------|
| Angebot bereit | Ihr Angebot — Bärenwald München · AG-2026-041 | Malerarbeiten EG – Angebot bereit · AG-2026-041 | Kunde |
| Angebot Reminder | Dein Angebot läuft am … aus — AG-… | Malerarbeiten EG – Angebot läuft aus · AG-… | Kunde |
| Angebot Nachfass | Kurze Rückfrage zu Ihrem Angebot AG-… · Firma | Malerarbeiten EG – Rückfrage Angebot · AG-… | Kunde |
| Rechnung | Ihre Rechnung RE2026-2088 · Bärenwald München | Malerarbeiten EG – Rechnung · RE2026-2088 | Kunde |
| Korrektur | Korrektur RE-alt → RE-neu · Firma | Malerarbeiten EG – Korrektur · RE-alt → RE-neu | Kunde |
| Abschlag / Schluss | Abschlag 1 (…) · RE-… · Firma | Objekt – Abschlag · RE-… | Kunde |
| Zahlungserinnerung | Zahlungserinnerung RE… | Objekt – Zahlungserinnerung · RE… | Kunde |
| 2. Zahlungserinnerung | 2. Zahlungserinnerung RE… | Objekt – 2. Zahlungserinnerung · RE… | Kunde |
| Zahlung erhalten | Zahlung erhalten — Rechnung RE… · Firma | Objekt – Zahlung erhalten · RE… | Kunde |
| Auftrag bestätigt | Ihr Auftrag ist bestätigt — Titel · Firma | Objekt – Auftrag bestätigt | Kunde |
| Projekt Update | Projekt-Update — … · Firma | Objekt – Projekt-Update | Kunde |
| Projekt abgeschlossen | Projektabschluss — … · Firma | Objekt – Projekt abgeschlossen | Kunde |
| Abschlussdoku | Abschlussdokumentation — Bärenwald München | Objekt – Abschlussdokumentation | Kunde |
| Anfrage Bestätigung | Danke für Ihre Anfrage — Firma / Anfrage — Objekt | Objekt – Anfrage eingegangen | Kunde |
| Termin | Terminbestätigung: … — Firma | Objekt – Terminbestätigung | Kunde |
| Freigabe erforderlich | Freigabe erforderlich — Objekt | Objekt – Freigabe erforderlich | HV |
| Neuer Vorgang | Neuer Vorgang — Objekt | Objekt – Neuer Vorgang | HV |
| Angebot zur Info | Angebot zur Information — Objekt | Objekt – Angebot zur Information | HV |
| Direktauftrag | Direktauftrag — Objekt | Objekt – Direktauftrag | HV |
| Freigabe Ergebnis | Freigabe freigegeben — Objekt | Intern · Objekt – Freigabe freigegeben | Intern / HV |
| Partner Neue Anfrage | Neue Anfrage: Maler — Bärenwald Partner | Maler, 80337 – Neue Anfrage | Partner |
| Partner Leistungsanfrage | Leistungsanfrage: … — Bärenwald Partner | Maler, Ort – Leistungsanfrage | Partner |
| Partner Neuer Auftrag | Neuer Auftrag wartet auf Sie | Maler – Neuer Auftrag | Partner |
| Partner Rückfrage | Rückfrage zu Ihrem Angebot: … — Bärenwald Partner | Maler – Rückfrage | Partner |
| Partner Angebot abgelehnt | Angebot nicht übernommen: … | Maler – Angebot nicht übernommen | Partner |
| Partner Portal Zugang | Dein Zugang zum Partner-Portal | Partner-Portal – Zugang bereit | Partner |
| Kunden Portal Zugang | Ihr Zugang zu MeinBärenwald | MeinBärenwald – Zugang bereit | Kunde |
| Lead Kunde | Ihre Anfrage ist bei uns eingegangen | Anfrage – Anfrage eingegangen | Lead |
| Lead Intern | Neue Anfrage: Name — Bereiche · PLZ | Intern · Name – Neue Anfrage | Intern |
| Preisindikation | Ihre Preisindikation — Bärenwald München | Rechner – Preisindikation | Lead |
| HV Neue Meldung | Neue Meldung: Titel | Objekt – Neue Meldung | HV |
| HV Wir kümmern uns | Wir kümmern uns um Ihren Vorgang — Objekt | Objekt – Wir kümmern uns | HV |
| Auth Passwort CRM | Bärenwald CRM — Passwort zurücksetzen | *(unverändert)* | CRM-User |
| Auth OTP Portal | CODE — MeinBärenwald Bestätigungscode | *(unverändert)* | Portal-User |
| Melder-Bestätigung | Meldung eingegangen — Kategorie | Kategorie – Meldung eingegangen *(Versand aus)* | Mieter |

**Technik:** `buildSubject` / `buildPartnerSubject` / `buildInternSubject` · Resend `text` automatisch via `htmlToPlainText` in `sendMail` / `sendBrandedMail`.

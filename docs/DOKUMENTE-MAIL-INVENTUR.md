# Dokumente & Mails — Inventur + Vorlagenvorschlag (Phase A)

**Status:** Phase A Freigabe Belal (F1–F5) — Umsetzung 2026-09-20.  
**Grenze:** Rechnungsnummern-Logik und steuerliche Pflichtangaben (§14 UStG, §35a, §13b) unverändert; nur Layout/Typo/Abstand.

**Repos:** `docs/vorschau/dokument-mail-vorlage-vorschlag.html` · PDF-Nachweis: `docs/vorschau/pdf/` · Mail-Betreff: `docs/MAIL-BETREFF-NACHWEIS.md`.

### Erledigt

| Punkt | Stand |
|-------|--------|
| F1 Beleg + chrome | `src/lib/pdf/chrome/` · Beleg-Fuß via `pdfFussPuppeteerTemplate` · Reports: Kopf/Titel/Shell |
| F3 HV-Mails | BW-Shell (`mailHtmlBase` / `buildStandardMailHtml`) — keine Org-Farben |
| F4 Service-Zeile | Aushang, Versammlung, Eigentümer-Bericht, Versicherungsakte, Bautagebuch-Versicherung |
| F5 Betreff + Text | `buildSubject` · auto `htmlToPlainText` in `sendMail`/`sendBrandedMail` · Nachweis-MD |
| Format/Status | Abnahme `formatDatum`; Portal-PDFs → `shared-domain/geld-datum` |
| Legacy | `rechnung-pdf.tsx` · Portal-Abnahme-PDF · `email-templates.ts` gelöscht |
| Regie Einzel | Firmeneinstellungen |
| Sync | chrome, aushang, colors, build-subject, html-to-plain-text → Portal |

### Offen

| Punkt | Blocker |
|-------|---------|
| F2 Portal pdf-lib löschen | Chromium-Stack im Portal fehlt — siehe `OFFENE-FRAGEN.md` |
| Vertrag / Regie-Einzel | weiter @react-pdf |
| CRM Versicherungsakte | weiter pdf-lib |

---

## Ziel (Phasen B–D)

1. Eine PDF-Basis-Vorlage je Dokumentfamilie (Kopf/Fuß/Typo/Tabelle/Seitenzahl).  
2. Ein Mail-Layout (Header, Inhalt, ein CTA, Fuß; Text-Fallback).  
3. Beträge/Datum = shared Format-API; Status-Wörter = status-vokabular.  
4. Betreff: `[Objekt/Vorgang] – [Ereignis]`.  
5. `/dev/dokumente` mit Testdaten-Vorschau.

---

## 1. PDF-Inventur

### 1.1 CRM — produktiv (Kurz)

Beleg-Familie + Abnahme/Abschluss/Bautages/Wochen/Regie/Bautagebuch → HTML→Puppeteer + **chrome**.  
Regie Einzel + Vertrag → @react-pdf. Aushang/Versammlung → HTML + F4. Versicherungsakte → pdf-lib + F4.

### 1.2 Portal — produktiv (Kurz)

Aushang/Versammlung/Eigentümer/Versicherung/Bautagebuch-Vers./Partner → weiter **pdf-lib** (F4 + shared Format). HTML-Sync für chrome/Aushang liegt unter `shared-domain/`.

### 1.3 Legacy

| Typ | Status |
|-----|--------|
| CRM `rechnung-pdf.tsx` | **gelöscht** |
| Portal `generate-abnahmeprotokoll-pdf.ts` | **gelöscht** |

---

## 2. Mail-Inventur

**Transport:** Resend. **HTML:** ja. **Plain-Text:** Auth (Supabase optional); Transaktionsmails i. d. R. nur HTML.  
**„Ein Service von Bärenwald“:** im aktuellen Mail-Code **nicht** durchgängig.  
**`BRAND_PRESETS`:** UI-White-Label, **nicht** Mail-Branding.

### White-Label (verbindlich, Code)

| Regel | Ort | Wirkung |
|-------|-----|---------|
| **Keine BW-Mails an Mieter** | Portal `src/lib/melde/mieter-mail-policy.ts` (`MIETER_EMAIL_ENABLED = false`) | Status → HV (+ Glocke), nicht Melder-E-Mail |
| Mieter-Templates | `buildMelder*Html` | HTML existiert, **Versand aus** |

HV-Mails nutzen heute **BW-Shell** (`mailHtmlBase` / `buildStandardMailHtml`), nicht Org-Farben aus Presets.

### Absender-Defaults

| Env | Default | Repo |
|-----|---------|------|
| `RESEND_FROM_EMAIL` | `Bärenwald München <info@…>` | CRM |
| `RESEND_FROM_ANFRAGEN` | `… <anfragen@…>` | CRM Angebot/HW |
| `RESEND_FROM_CUSTOMER` / `SYSTEM` | Customer / MeinBärenwald System | Portal |

### 2.1 CRM — Cluster (Details in Code; hier Gruppen)

| Cluster | Beispiele | Empfänger | Branding | CTA |
|---------|-----------|-----------|----------|-----|
| Kunde/HV-Transaktion | Anfrage, Termin, Angebot, Auftrag, Update, Nachtrag, Abnahme, Abschluss, Rechnung, Zahlung, Erinnerung, Freitext, Portal-Link | Kunde / HV | BW + oft MeinBärenwald-P.S. | Portal / Annehmen / Google |
| Org-Freigabe | Freigabe angefordert/Ergebnis, Angebot zur Info, Direktauftrag | HV | BW + Auftraggeber-Portal-P.S. | Portal |
| Partner | Anfrage, Zuweisung, Vertrag, Bautagebuch, Formular, Portal-Link, Einreichungs-Antwort | Partner | BW Partner | Partner-Portal |
| Intern | Notify, überfällige RE, DSGVO, Behinderung, Formular, HW-Antwort | intern | BW | CRM-Link |
| Auth CRM | Passwort-Reset | CRM-User | BW CRM (ohne mailHtmlBase) | Reset-Link |

Zentrale: `src/lib/mail-service.ts`, `src/lib/mail-templates.ts`, `src/lib/mail/*`, `src/app/actions/mails.ts`.  
DB-`email_templates` = Editier-Pfad, nicht Haupt-Transaktion. Legacy `src/lib/email-templates.ts` = **gelöscht**.

### 2.2 Portal — Cluster

| Cluster | Beispiele | Empfänger | Branding |
|---------|-----------|-----------|----------|
| Lead/Website | Kunden-Bestätigung, Intern-Notify, Preisindikation | Kunde / intern | BW |
| Auth | OTP Funnel; Supabase Confirm / Reset / Change-Email / Magic-Link (`supabase/email-templates/*`) | Portal-User | MeinBärenwald |
| HV-Notify | Neue Meldung, Status, „Wir kümmern uns“, HM-Befund, Angebot-Events | HV / HM | BW-Shell |
| Mieter | Bestätigung/Einladung/Ablehnung | — | **deaktiviert** |
| Partner | Anfrage, Zuweisung, Angebot bestätigt/Antwort, generische Notify + Intern-Spiegel | Partner / intern | System/BW Partner |

Zentrale: `send-branded-mail.ts`, `mail-shell.ts`, `lead-mail-templates.ts`, `meldung-mail-templates.ts`, `partner/partner-mail.ts`.

### 2.3 Betreff heute (Stichprobe) → Zielmuster

| Heute (Beispiel) | Ziel Phase C |
|------------------|--------------|
| `Ihr Angebot — {Firma} · {Nr}` | `{Objekt/Vorgang} – Angebot bereit` |
| `Freigabe erforderlich — {Objekt}` | `{Objekt} – Freigabe erforderlich` |
| `Neue Anfrage: {Gewerk} — Bärenwald Partner` | `{Objekt/Gewerk} – Neue Anfrage` |
| `{CODE} — MeinBärenwald Bestätigungscode` | Ausnahme Auth (kein Objekt) |

---

## 3. Vorlagenvorschlag (Freigabe)

### 3.1 PDF-Basis (eine Familie „Beleg“)

Wiederverwenden/erweitern der bestehenden Angebots-/Rechnungs-HTML-Familie:

| Zone | Inhalt |
|------|--------|
| **Kopf** | Logo links · Absenderblock rechts (Name, Adresse, Tel, Mail, USt-Id — Daten aus Firma/HV, **keine** Nummern-Logik ändern) |
| **Titelzeile** | Dokumenttyp + Nummer · Objekt/Adresse · Datum |
| **Körper** | Typo 5 Stufen (Meta/Text/Titel analog App) · Tabelle Positionen (gleiche Linien/Abstände) |
| **Summen** | rechtsbündig, shared `formatEuro` |
| **Fuß** | Firmendaten / Bank / Pflichttexte (§14 etc. **Inhalt unverändert**, nur Typo/Abstand) · Seitenzahl `n / m` |
| **Varianten** | BW-Kunde · HV-WL (Logo/Farbe Org, optional klein „Ein Service von Bärenwald“) · Partner→BW |

**Außerhalb „Beleg“-Familie (eigene Unter-Vorlage, gleiche Kopf/Fuß-Bausteine):** Abnahme, Abschluss, Bautagebuch/Regie, Vertrag, Aushang, Versicherungsakte.

### 3.2 Mail-Basis

| Zone | Inhalt |
|------|--------|
| **Header** | Logo + Markenname (BW **oder** HV laut Empfänger-Regel) |
| **Körper** | Anrede · Kurztext · **ein** Primary-CTA (`mailPrimaryButtonHtml`) |
| **Fuß** | Impressum-Zeile · Abmeldelink nur wo rechtlich nötig · optional klein „Ein Service von Bärenwald“ bei HV-WL an Nicht-Mieter |
| **Text-Part** | Pflicht für alle Transaktionsmails (Resend `text` + `html`) |
| **Mieter** | weiterhin **keine** BW-Mails |

### 3.3 Vorschau Phase D (nach Freigabe)

Route `/dev/dokumente` (nur Dev/Staging): Liste aller PDF-Typen + Mail-Ereignisse mit Fix-Fixtures; Render ohne Versand/Persistenz.

---

## 4. Offene Punkte für Freigabe (keine Agent-Entscheidung)

1. **Eine** Beleg-Vorlage für Angebot+Rechnung+Abschlag+Gutschrift bestätigen (bereits faktisch so) — ja/nein Feinschliff-Layout?  
2. Portal-`pdf-lib`-Duplikate (Aushang, Versammlung, Versicherung) → langfristig CRM-HTML-Vorlage spiegeln oder Shared-Paket?  
3. HV-Mails: weiter BW-Shell, oder echte Org-Farben aus `BRAND_PRESETS` nur im Header?  
4. Betreff-Schema exakt `[Objekt] – [Ereignis]` inkl. Partner/Auth-Ausnahmen?  
5. „Ein Service von Bärenwald“: nur HV-WL-Fuß, nie an Mieter — Textfreigabe?

---

## 5. STOPP

Phase A Freigabe erteilt und umgesetzt (Stand Inventur-Kopf). Rest: F2 Portal Chromium (`OFFENE-FRAGEN.md`), Phasen B–D Mail/Betreff/`/dev/dokumente`.

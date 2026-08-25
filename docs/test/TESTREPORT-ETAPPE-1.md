# TESTREPORT-ETAPPE-1 — Datenschutz & Zugriffe

| Feld | Wert |
|---|---|
| Etappe | 1 — Datenschutz & Zugriffe |
| Datum | 2026-08-25 |
| Umgebung | Staging Website `staging--baerenwald.netlify.app` · CRM `staging--baerenwald-backend.netlify.app` · Supabase `soqownnkxmtfgvsbrgsl` |
| Ergebnis | **5 ✅ · 7 ❌ · 9 ⚠️ · 5 🚫** von 26 Testfällen |
| Mail-STOPP | Weiter aktiv (Etappe 0). Keine Form-Submits / kein Partner-Sperren / kein HW-Tausch ausgeführt, die Mails auslösen könnten. |
| Screenshots | `docs/test/screenshots/etappe-1/` (51 Dateien) |
| Methode | Browser (Cursor + Headless/Puppeteer) · Code-Analyse · Staging-SELECT |

---

## Kurzüberblick kritische Funde

1. **Google Fonts ohne Einwilligung** (googleapis + gstatic) auf Marketing-Flächen — T-P1-07.
2. **Status-Token zeigt umfangreiche PII** inkl. Adresse, Vorname, Innenraumfoto, Freitext; **kein Impressum/Datenschutz** auf der Token-Seite — T-P1-03/10.
3. **Unbekannter/Hard-Delete-Token** → Marketing-404 mit vollem BW-Branding statt neutraler WL-Seite (Sofort-Fix 2 im Code vorhanden, Staging-Verhalten weicht ab) — T-P1-14.
4. **Token-Enumeration**: Status → 404-Marketing; HW-Anfrage → „Link nicht mehr gültig“ — T-P1-12.
5. **Impressum ohne VSBG**-Hinweis — T-P1-04.
6. **DSE unvollständig** vs. Code (Replicate, Web-Push, Telegram, Maps, OpenWeather, GSC, Google-Fonts-CSS) — T-P1-25.
7. **Echtdaten** auf Staging (`outllok.de` / Status-Token „Zafer…“) — aus Etappe 0, hier bestätigt.

---

## Ergebnisse je Testfall

### F-001 · T-P1-01 · ✅ Bestanden · — · Kosmetik n/a

| Feld | Inhalt |
|---|---|
| Rolle + URL | anonym · `/`, `/ratgeber`, `/kontakt`, `/rechner`, `/handwerker-muenchen`, `/leistungen/bad-sanieren`, SEO-Stichprobe |
| Screenshot | `T-P1-01-rechner-footer.png`, `T-P1-01-rechner-cookie-banner.png`, `T-P1-01-portal-tools-rechner.png` |
| Erwartet | Impressum + Datenschutz ≤ 2 Klicks |
| Beobachtet | Footer + Cookie-Banner-Links; Rechner/Portal-Tools sticky Footer |
| Einordnung | Neuer Fund — keiner |

### F-002 · T-P1-02 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | anonym · `/melden/staging-muster-nord` (+ Impressum/Datenschutz) |
| Screenshot | `T-P1-02-melden-org.png`, `T-P1-02-impressum.png`, `T-P1-02-datenschutz.png` |
| Erwartet | Org-Impressum/-Datenschutz; kein kommentarloses BW-Impressum |
| Beobachtet | Melde-UI Org-Branding OK. Org-Impressum: HV = Diensteanbieterin, BW = technischer Betrieb (Variante B). Org-DSE nennt Org als Verantwortlichen. **Cookie-Banner** auf Melde-Strecke verlinkt auf **BW** `/datenschutz` / `/impressum`, nicht Org-Pfade. |
| Einordnung | Neuer Fund |

### F-003 · T-P1-03 · ❌ Fehlgeschlagen · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | Token · `/melden/status/…` · CRM `/handwerker/anfrage/…` |
| Screenshot | `T-P1-03-status-legal.png`, `T-P1-03-hw-legal.png` |
| Erwartet | Impressum/Datenschutz erreichbar |
| Beobachtet | Status-Token-Seite: **keine** Legal-Links sichtbar. HW-Anfrage (bereits akzeptiert): nur Danke-Text, **keine** Legal-Links. `/projekt`, `/nachtrag`, `/formular`, `/status/[id]`: keine Staging-Tokens → siehe T-P1-11. |
| Einordnung | Neuer Fund |

### F-004 · T-P1-04 · ❌ Fehlgeschlagen · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | anonym · `/impressum` |
| Screenshot | `T-P1-04-impressum-desktop.png` |
| Erwartet | Ladungsfähige Anschrift, DDG (nicht TMG), VSBG-Hinweis |
| Beobachtet | Anschrift Bärenwaldstraße 20, 81737 München OK. § 5 DDG / §§ 7–10 DDG OK. **Kein VSBG-/Verbraucherschlichtungs-Hinweis.** |
| Einordnung | Neuer Fund |

### F-005 · T-P1-05 · ✅ Bestanden

| Feld | Inhalt |
|---|---|
| Rolle + URL | anonym · `/datenschutz` |
| Screenshot | (Inhalt Code + Live) |
| Erwartet | Kein TMG; Betroffenenrechte inkl. Beschwerde Aufsichtsbehörde |
| Beobachtet | Kein TMG. §12 Beschwerderecht BayLDA vorhanden. Betroffenenrechte Art. 15–21 genannt. |
| Einordnung | — |

### F-006 · T-P1-06 · ✅ Bestanden

| Feld | Inhalt |
|---|---|
| Rolle + URL | anonym · Startseite, frische Session, nicht einwilligen |
| Screenshot | `T-P1-06-after-reject.png`, `T-P1-07-no-consent-home.png` |
| Erwartet | Keine Tracker vor Einwilligung |
| Beobachtet | Ohne Consent / nach Ablehnen: **keine** PostHog-Requests. Nach Akzeptieren: PostHog EU (`eu-assets.i.posthog.com`). |
| Einordnung | — |

### F-007 · T-P1-07 · ❌ Fehlgeschlagen · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | anonym · Start + Marketing-CSS |
| Screenshot | `T-P1-07-no-consent-home.png` |
| Erwartet | Keine Requests an fonts.googleapis.com / gstatic ohne Einwilligung; Fonts lokal |
| Beobachtet | `baerenwald-landing.css` `@import` → **fonts.googleapis.com** + **fonts.gstatic.com** woff2 **ohne Consent**. Parallel existiert `next/font/google` in `layout.tsx`. |
| Einordnung | Neuer Fund |

### F-008 · T-P1-08 · ❌ Fehlgeschlagen · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | anonym · Cookie-Banner |
| Screenshot | `T-P1-cookie-banner-buttons.png` |
| Erwartet | Ablehnung respektiert; Ablehnen gleichwertig einfach wie Zustimmen |
| Beobachtet | Ablehnen funktional OK (`statistics:false`, kein PostHog). Visuell: **Akzeptieren** Primary grün, **Ablehnen** Outline — nicht gleichwertig. |
| Einordnung | Neuer Fund |

### F-009 · T-P1-09 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | Formulare vor Absenden (kein Submit) |
| Screenshot | `T-P1-09-portal-reg.png`, `T-P1-09-partner-reg.png`, `T-P1-09-melden-kontakt-b.png`, `T-P1-09-kontakt.png`, `T-P1-09-rechner-kontakt*.png` |
| Erwartet | DS-Hinweis/Checkbox, nicht vorangekreuzt, korrekter Link, Absenden ohne Zustimmung blockiert |
| Beobachtet | **Portal-Reg:** Checkboxen unchecked, Link `/datenschutz#meinbaerenwald` ✅. **Melde-Kontaktschritt:** Checkbox unchecked + Org-Datenschutzhinweis + Org-Legal ✅. **Kontaktseite:** kein Personenformular (nur Tel/Mail-Links) — ⚠️ N/A. **Partner-Reg:** Schritt „Bedingungen“ vorhanden; Copy „Du“ → Bekannt (Backlog Partner-Du). **Rechner-Kontakt:** Screenshots vorhanden; Absenden nicht getestet (Mail-STOPP). |
| Einordnung | Teilweise Neuer Fund / Bekannt (Partner-Du) |

### F-010 · T-P1-10 · ⚠️ Teilweise · Wichtig (Datensparsamkeit)

| Feld | Inhalt |
|---|---|
| Rolle + URL | Fremder ohne Login · `/melden/status/{token}` |
| Screenshot | `T-P1-10-status-pii.png`, `T-P1-10-status-pii-full.png` |
| Erwartet | PII-Liste; Bewertung Notwendigkeit |
| Beobachtet | Siehe Datenliste unten. Branding der Seite: **Bärenwald München** (nicht Org), obwohl Lead zu BW-HV gehört. |
| Einordnung | Neuer Fund — zur DSB-Bewertung |

**Sichtbare PII (Status-Token, ohne Login):**

| Kategorie | Inhalt |
|---|---|
| Vorname | Zafer (Anrede) |
| Vollname | im RSC/HTML-Payload: Zafer Özek |
| Objekt | Haus München |
| Adresse | Harpprechtstrasse 3, 80933 München |
| Situation/Bereich/Zeitraum/Ort | Reparatur & Notfall; Feuchte/Schimmel; Diese Woche; Bad |
| Freitext | Schimmelbeschreibung |
| Foto | Innenraum-/Schadenfoto |
| Referenz | 95799310… |
| Nicht gesehen | Melder-E-Mail, Telefon |

### F-011 · T-P1-11 · 🚫 Nicht testbar (teilweise) · —

| Feld | Inhalt |
|---|---|
| Rolle + URL | `/projekt`, `/nachtrag`, `/formular`, CRM `/status/[id]` |
| Erwartet | PII-Listen analog T-P1-10 |
| Beobachtet | Staging: **0** `auftraege`, **0** `nachtraege.token`, **0** `formular_eintraege.token`. HW-Token vorhanden: UI zeigt nach Annahme keine PII; **API** `GET /api/handwerker/anfrage/{token}` liefert Name/Tel/Mail (`staging@example.test`). |
| Einordnung | Datenlage / Seed unvollständig |

### F-012 · T-P1-12 · ❌ Fehlgeschlagen · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | manipulierte Tokens |
| Screenshot | `T-P1-12-invalid-status.png`, `T-P1-12-invalid-hw.png` |
| Erwartet | Einheitliche gestaltete Fehlerseite; keine Enumeration |
| Beobachtet | Status ungültig → **Marketing-404** „Diese Seite gibt es nicht.“ · HW ungültig → **200** „Dieser Link ist nicht mehr gültig.“ Unterschiedliche Codes/Texte. |
| Einordnung | Neuer Fund |

### F-013 · T-P1-13 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | Soft-gelöschter Vorgang · `/melden/status/[token]` |
| Erwartet | WL „Meldung nicht mehr aktiv“ + Org-Kontakt; kein nacktes 404 / kein BW-Grün-Fallback |
| Beobachtet | **Code** (`melden/status/[token]/page.tsx` + `MIETER_WL_STATUS_INAKTIV`) implementiert Sofort-Fix 2. Live: kein Soft-Delete-Datensatz; Staging-SQL-Write via MCP read-only → Verhalten nicht live verifiziert. |
| Einordnung | Code ✅ / Live 🚫 |

### F-014 · T-P1-14 · ❌ Fehlgeschlagen · Blocker (Datenschutz-/Branding)

| Feld | Inhalt |
|---|---|
| Rolle + URL | unbekannter Token · `/melden/status/zztest_nonexistent_hard_delete_token` |
| Screenshot | `T-P1-14-unknown-token-404.png` (und Subagent-404s) |
| Erwartet | Neutrale Variante ohne Org- und ohne BW-Branding |
| Beobachtet | Live: **volle Marketing-404** mit BW-Nav/Footer/WhatsApp. Code sieht `MeldeFehlerClient neutral` vor — Staging-Deploy weicht ab oder Route fällt auf `not-found`. |
| Einordnung | Neuer Fund (Deploy-Lücke Sofort-Fix 2?) |

### F-015 · T-P1-15 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | Mieter `mieter-muster@example.test` · `/portal?section=vorgaenge&id=…` |
| Screenshot | `T-P1-15-mieter-*.png`, `T-P1-15-zafer-bw.png` |
| Erwartet | Kein Zugriff; saubere „kein Zugriff“-Seite (PortalStateView) |
| Beobachtet | Fremde IDs (Süd / BW-Zafer): **keine Fremddaten** sichtbar; Fallback auf eigene Liste „Meine Vorgänge“. **Kein** expliziter „Kein Zugriff“-State. |
| Einordnung | Neuer Fund (UX/Transparenz), kein Datenleck beobachtet |

### F-016 · T-P1-16 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Rolle + URL | HV Nord · fremde Süd-IDs |
| Screenshot | `T-P1-16-hv-nord-home.png`, `T-P1-16-vorgang-sued.png`, `T-P1-16-aushang-sued.png` |
| Erwartet | Kein Zugriff |
| Beobachtet | Login HV Nord OK; AV-Modal „Mieter-Kommunikation“ blockiert teils Navigation. Fremde Vorgänge: keine Süd-Inhalte in Screenshot-Evidenz. Volltest durch Modal eingeschränkt. |
| Einordnung | Teilweise getestet |

### F-017 · T-P1-17 · ⚠️ Teilweise · —

| Feld | Inhalt |
|---|---|
| Rolle + URL | Partner Elektro · fremde IDs |
| Screenshot | `T-P1-17-partner-home.png`, `T-P1-17-fake-auftrag.png`, `T-P1-17-other-hw.png` |
| Erwartet | Kein Zugriff |
| Beobachtet | Partner-Portal leer (0 Vorgänge). Fremde/Fake-URLs zeigen keine Fremddaten. Kein expliziter Zugriffs-Denied-Screen dokumentiert. |
| Einordnung | Seed-limitiert |

### F-018 · T-P1-18 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Rolle + URL | Eigentümer/Hausmeister |
| Beobachtet | Eigentümer-Seed `kunde.maria.koch…@staging.baerenwald.test` existiert; Hausmeister-Login in Seed-Doku unklar. Vollständiger Fremd-Einheiten-Test in dieser Runde nicht abgeschlossen. |
| Einordnung | — |

### F-019 · T-P1-19 · ✅ Bestanden

| Feld | Inhalt |
|---|---|
| Rolle + URL | anonym · CRM `/vorgaenge`, `/kunden` |
| Screenshot | `T-P1-19-vorgaenge.png`, `T-P1-19-kunden.png` |
| Erwartet | Redirect Login, keine Datenreste |
| Beobachtet | Redirect `/login`; keine Kundendaten im HTML. Nebenbefund: Staging zeigt Klartext-Seed-Login im UI. |
| Einordnung | — |

### F-020 · T-P1-20 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Partner-Sperren nicht ausgeführt (Mail-STOPP / Seiteneffekte). UI Partner-Detail sichtbar (`T-P1-20-partner-sperre-ui.png`) — Sperraktion nicht ausgelöst. |
| Einordnung | Mail-STOPP |

### F-021 · T-P1-21 · 🚫 Nicht testbar (erwarteter ❌ laut Anleitung) · Blocker-Kandidat

| Feld | Inhalt |
|---|---|
| Beobachtet | Staging **0 Aufträge**. HW-Tausch würde Partner-Mails triggern → nicht ausgeführt. Code: `handwerker-actions.ts` redisponiert + `notifyPartnerUnified` / Angebot-Resend. Laut Testdrehbuch: falls Fix nicht deployed → erwarteter ❌ — hier **nicht live belegbar**. |
| Einordnung | Bekannt / Mail-STOPP / Seed |

### F-022 · T-P1-22 · 🚫 Nicht testbar · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Keine Partner-Aufträge auf Staging → Datenminimierungs-Liste nicht erstellbar. |
| Einordnung | Seed |

### F-023 · T-P1-23 · ✅ Bestanden (getestete Flächen)

| Feld | Inhalt |
|---|---|
| Rolle + URL | Rechner GPT; CRM Assistent |
| Screenshot | `T-P1-23-gpt-screen.png`, `T-P1-23-gpt-open.png` |
| Erwartet | Klarer KI-Hinweis vor Eingabe |
| Beobachtet | Rechner: „KI-Dienst Anthropic · Datenschutz“ vor Eingabe ✅. CRM: Button „Assistent“ + Nav „KI Analytics“. Partner-GPT-Fläche in dieser Runde nicht separat geöffnet. Melde-Funnel-Kontaktschritt ohne KI-Feld. |
| Einordnung | — |

### F-024 · T-P1-24 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Kennzeichnung „KI-generierte Visualisierung“ am Bild |
| Beobachtet | **Code** Website (`GptStudioChat`, `GptRaumVisualisierung`) und CRM PDF/Mail (`visualize/pdf-html.ts`, `mail-block.ts`) kennzeichnen korrekt. Live auf Staging: kein generiertes Viz-Beispiel gefunden; Status-Fotos sind Nutzerfotos ohne KI-Label (korrekt keine Kennzeichnung). |
| Einordnung | Code ✅ / Live nicht belegt |

### F-025 · T-P1-25 · ❌ Fehlgeschlagen · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Alle Drittdienste in DSE |
| Beobachtet | Siehe Tabelle „Dienste-Abgleich“ unten. Mehrere Integrationen ohne DSE-Erwähnung. |
| Einordnung | Neuer Fund |

### F-026 · T-P1-26 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Cron-Löschung dokumentieren / ggf. auslösen |
| Beobachtet | Cron `/api/cron/datenschutz` **löscht nichts** — nur Intern-Mail bei fälligen Kandidaten / offenen Anfragen. Echte Löschung/Anonymisierung manuell (`executeDatenschutzLoeschung`): Storage hard-delete, Leads/Kunden soft-anonymisieren. Fristen in `datenschutz_fristen` (12–120 Monate). Auslösen auf Staging ohne `CRON_SECRET` nicht möglich → ⚠️ Code-Befund. |
| Einordnung | Neuer Fund (Missverständnis „Lösch-Cron“) |

---

## Dienste-Abgleich (T-P1-25)

| Dienst | Zweck | Datenkategorien | Repo | In DSE? |
|---|---|---|---|---|
| Netlify | Hosting/Functions/Cron | IP, Logs | beide | ja |
| Supabase | DB/Auth/Storage | Konten, Vorgänge, Dateien | beide | ja |
| Resend | Transaktionsmail | E-Mail, Inhalte | beide | ja |
| Anthropic | KI-Chat | Chattexte, Session | beide | ja (Website); CRM-AVV Lücke |
| PostHog | Statistik (Consent) | Events, Pseudonym-IDs | Website (+CRM lesen) | ja |
| Replicate | Bild-KI | Fotos, Prompts | beide | **nein** |
| Web Push (VAPID) | Browser-Push | Endpoint, User-ID | beide | **nein** |
| Google Fonts CSS | Schriften Runtime | IP an Google | Website | **nein** |
| Telegram Bot | CRM-Alerts/Assistent | Chat-ID, Nachrichten | CRM | **nein** |
| Google Maps Distance | Copilot Fahrtzeit | Adressen | CRM | **nein** |
| OpenWeatherMap | Copilot Wetter | Standort-Query | CRM | **nein** |
| Google Search Console | KI-Hub Marketing | Suchmetriken | CRM | **nein** |

---

## Für den Datenschutzberater

Priorisierte Sammlung aller ❌/⚠️ dieser Etappe sowie Datenlisten:

| ID | Thema | Schwere | Kurz |
|---|---|---|---|
| F-007 | Google Fonts ohne Consent | Wichtig | Drittland-/Tracking-Transfer vor Einwilligung |
| F-008 | Cookie-Banner Ungleichgewicht | Wichtig | Ablehnen vs. Akzeptieren |
| F-002 | Cookie-Banner Melde → BW-Legal | Wichtig | Org-Kontext vs. BW-Links |
| F-003 | Token-Seiten ohne Legal-Links | Wichtig | Status + HW-Anfrage |
| F-004 | Impressum ohne VSBG | Wichtig | Verbraucherschlichtung fehlt |
| F-010 | Status-Token PII | Wichtig | Adresse, Name, Foto, Freitext ohne Login — Datensparsamkeit prüfen |
| F-012 | Token-Enumeration | Wichtig | Unterschiedliche Fehlerbilder |
| F-014 | Hard-Delete/Unbekannt → BW-404 | Blocker | Statt neutraler Seite |
| F-013 | Soft-Delete | Wichtig | Code ok, Live unbestätigt |
| F-015 | Portal fremde IDs | Wichtig | Kein Datenleck, aber kein „Kein Zugriff“-Screen |
| F-025 | DSE vs. Dienste | Wichtig | Replicate, Push, Telegram, Maps, Weather, GSC, Fonts |
| F-026 | „Lösch-Cron“ | Wichtig | Nur Warn-Mail, keine Auto-Löschung |
| F-009 | Formulare | Wichtig | Melde/Portal ok; Kontakt ohne Form; Partner-Du Backlog |
| Echtdaten | Staging | Wichtig | `zafer.ozek@outllok.de` + Status-Token mit Klarname/Adresse |
| F-021 | HW-Tausch | Blocker-Kandidat | Nicht live; Code sendet Partner-Notify |

**Datenliste Status-Token:** siehe F-010.  
**Dienste-Tabelle:** siehe T-P1-25.

---

## ZZTEST-Entitäten

Keine angelegt (MCP Staging read-only für INSERT; Mail-STOPP).

---

## Hinweise für nächste Schritte

1. Mail-Catch / Resend auf Staging absichern (Etappe 0 STOPP), dann T-P1-20/21/22 und Form-Submit-Pfade nachholen.
2. Soft-Delete-Lead manuell anlegen und T-P1-13 live verifizieren; Deploy von Sofort-Fix 2 für T-P1-14 prüfen.
3. Seed: Aufträge + Token für `/projekt` `/nachtrag` `/formular` erzeugen (ohne echte Mails).
4. Echtdaten `outllok.de` vor weiteren Screenshots anonymisieren.

---

## Commit-Vorlage (GitHub Desktop)

- `docs/test/TESTREPORT-ETAPPE-1.md` — Report Etappe 1 inkl. DSB-Liste und Dienste-Tabelle
- `docs/test/screenshots/etappe-1/*` — Evidenz-Screenshots (51 Dateien)

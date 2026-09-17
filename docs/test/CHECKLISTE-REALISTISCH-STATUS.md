# Realistischer Testplan — Status Staging (2026-08-26)

**Legende:** ✔ ok · ⚠ teilweise / Caveat · ✘ Bug · ☐ nicht getestet / fehlt Testdaten · ◐ Code da, Live nicht durchgespielt  

**Zählung:** ◐ zählt wie ☐ (unbewiesen), nicht wie ⚠.

**Proxy-Testdaten (statt Brandl):** Musterverwaltung Nord (`staging-muster-nord`), Leopold 10, Schwelle **500 €**, Freigabe-Modus `freigabe`. Partner: Sanitär Klar / Maler Weiß. Privat: Familie Berger.  

**Hinweis:** Brandl/Öztürk/Vogl/Kellermann/Yilmaz + `belal+…`-Aliasse sind **nicht** angelegt. Physisches QR/Handy/3-Tage-Warten = ☐.

Rohproben: `docs/test/checklist-probe.json` · Lauf `TESTREPORT-A2-A1-FINANZ-LIVE.md` · **Findings:** `FINDINGS-REGISTER.md` · **Manuell 2026-08-26:** `manual-fe37-check.json` + `screenshots/manual-fe37/`

**Automation vs. Produkt:** Runner-Fails (falscher Selector, Timing) getrennt von echten Produkt-Bugs notieren — sonst verwässert die Bilanz.

---

## Phase 0 — Testdaten

| Check | Status | Was passiert / Problem |
|---|---|---|
| HV Brandl + Logo + Schwelle 500 | ☐ | **Nicht angelegt.** Proxy: Musterverwaltung Nord, Schwelle 500, Modus freigabe — **kein Logo** (`has_logo=false`) |
| Objekt Schleißheimer + 2 Einheiten Öztürk/Brunner | ☐ | Fehlt. Proxy: Leopold 10 Staging |
| Objekt Lindwurm leer | ☐ | Fehlt |
| Privatkunde Katharina Vogl | ☐ | Fehlt. Proxy: Familie Berger |
| Partner Sanitär Kellermann | ☐ | Proxy: **Sanitär Klar** `partner-sanitaer@example.test` |
| Partner Maler Yilmaz unvollständig | ☐ | Proxy: **Maler Weiß & Sohn** — Compliance-Lücken nicht gezielt geseedet |
| Preisliste 5 krumme Preise | ☐ | Tabellen `preislisten`/`katalog_preise` existieren — Brandl-Liste nicht geprüft |
| E-Mail-Aliasse belal+… | ☐ | Staging nutzt `@example.test` + Catcher — echte Plus-Aliasse nicht verdrahtet |
| Browserprofile Staff/HV/Mieter/Partner | ☐ | Automation mit getrennten Contexts; echte Profile = manuell |
| Aushang PDF + QR Handy | ⚠ | **Aushang-PDF Leopold ✔** (~80 KB). Druck/QR-Scan = ☐ manuell |

---

## Szenario 1 — Wasserfleck

### Mieterin

| Check | Status | Ist |
|---|---|---|
| QR → `/melden/{kennung}/{objekt}` Adresse voraus | ✔ | URL-Schema ✔. **Soll:** Adresse wird im Kontakt-Schritt vorausgefüllt, nicht auf Step 1 angezeigt (frühe Anzeige = UX-Idee, kein Bug). |
| Branding nur HV | ⚠ | „Musterverwaltung Nord“ dominant ✔ — **Footer/Legal kann BW erwähnen** |
| Funnel + Tippfehler E-Mail | ✔ | Funnel Wasser/Bad durchspielbar (A2-Lauf) |
| 2 Fotos scharf+verwackelt | ◐ | Upload-Feld da; Qualitätsmix nicht extra verifiziert |
| Freitext mieterisch | ✔ | Freitext-Schritt vorhanden |
| Absenden → Ref + Status-Link | ✘ **P1 → FIX-02** | F-176: Lead + Token in DB ✔ — UI hing auf Confirm. **Fix:** async HV-Notify + harte Navigation. |
| Status Timeline „Eingegangen“ | ☐ | Blockiert durch F-176 (Mieter sieht Link nicht) |

### Staff

| Check | Status | Ist |
|---|---|---|
| Anfrage + Org/Objekt/Melder | ✔ | Lead im CRM, Kontext sichtbar (A2) |
| Fotos in Akte | ◐ | nicht in diesem Lauf geprüft |
| Angebot 687,90 → Partner blockiert | ☐ | **Mittelteil offen.** Manuell geklärt (Lead `fe37acab`): Lead **vollständig**, kein kaputter Datensatz. Primary = **„Warte auf HV / Hausmeister“** (HV-Start-Gate bei `hv_meldung_status=neu`) — **„Angebot erstellen“ erscheint erst nach HV „An Bärenwald übergeben“** (`angebot_eingefordert`). Runner-Fail: klickte Phasen-Zeile `vgp-head` („Angebot: noch nicht erstellt“, disabled by design), nicht Primary. Freigabe `nicht_noetig` korrekt ohne Angebot |
| Trotzdem beauftragen → Block | ◐ | Code-Guard `assertPartnerVersandOrgFreigabe` existiert — Live-Click nicht durchgespielt |

### HV

| Check | Status | Ist |
|---|---|---|
| Mail Freigabe | ☐ | Mail-Inhalt bewusst nicht geprüft (Catcher) |
| Ablehnen mit Kommentar → CRM | ☐ | Keine ausstehende Freigabe am Test-Lead |
| Korrigiertes Angebot → freigeben | ☐ | dito |

### Staff → Partner → Mieterin

| Check | Status | Ist |
|---|---|---|
| Partner zuweisen nach Freigabe | ☐ | hängt an Freigabe-Mittelteil |
| Kellermann annimmt | ⚠ | Partner-Login ✔ (Sanitär Klar / Maler Weiß) — Annahme-Flow ☐ |
| Terminvorschlag | ☐ | |
| Status Beauftragt live | ☐ | |
| Termin absagen → 2. bestätigen | ☐ | |
| Abnahme + PDF Handy + 3 Sterne CRM | ⚠ | Abschluss-PDF Seed ✔; Feedback-Sterne ☐ |

---

## Szenario 2 — Badsanierung Privat

| Check | Status | Ist |
|---|---|---|
| Rechner Bad PLZ 81825 | ⚠ **Automation** | `/rechner` lädt; manueller Kurztest blieb auf Vision-Landing (**„Los geht's →“** nicht geklickt). **Noch kein Produkt-Bug gebucht** |
| Preisrahmen + Anfrage | ⚠ **Automation** | A1-Lauf: kein neuer Lead — wahrscheinlich Selector/Timing. Manuell: kein Lead in DB (`zztest.manual.rechner.*`). **5-Min-Handtest offen** bevor P1 |
| Staff Angebot 8–10 Pos. krumm | ◐ | Wizard/Seed-Angebote existieren |
| Mail + PDF Summen/MwSt | ⚠ | PDF Angebot Seed ✔; Mail ☐ |
| 3 Tage Nachfass-Cron | ☐ | Code `sendAngebotNachfassMail` — Live-Warten nicht gemacht |
| Ablehnen → Status Abgelehnt | ☐ | |
| Überarbeitetes Angebot / alter Link | ☐ | kritisch, ungetestet |
| Annahme → Auftrag | ⚠ | Seed: Angebot→Auftrag vorhanden |
| Partner-Einholung EK/Marge | ☐ | |
| Bautagebuch 3+Fotos | ☐ | |
| `/projekt/[token]` Kundin | ⚠ | Ungültiger Token → saubere Fehlerseite ✔; gültiger Happy-Path ☐ |

---

## Szenario 3 — Nachtrag + Zahlplan

| Check | Status | Ist |
|---|---|---|
| Zahlplan 30/40/30 = Summe | ◐ | Zahlplan-Tab am Auftrag erreichbar ✔ — Exaktheit ☐ |
| 1. Abschlag bezahlt → Rest | ⚠ | „Als bezahlt“ klickbar ✔ — **ohne Bestätigungsdialog** (manuell). Kein sichtbarer UI-Revert bezahlt→gesendet; C-Lauf nutzte SQL-Shortcut, nicht Produkt-Flow |
| Als bezahlt ohne Confirm / Revert KPI | ⚠ **F-201 → FIX-03** | Confirm-Dialog + Revert mit `bezahlt_at=null` + Umsatz-Update |
| Nachtrag 1845,33 + Baustopp | ☐ | **nicht live** |
| Kundin `/nachtrag/[token]` | ⚠ | Ungültig → Fehlerseite ✔; Happy-Path ☐ |
| Summe/Zahlplan nach Nachtrag | ☐ | **höchste Finanz-Risiko-Zone, ungetestet** |
| Baustopp auf/zu überall | ☐ | |
| 2. Abschlag Basis neu/alt | ☐ | |
| Abnahme-Wizard | ◐ | |
| Schlussrechnung Abschläge ausweisen | ☐ | |

---

## Szenario 4 — Falsche Rechnung

| Check | Status | Ist |
|---|---|---|
| Gesendete RE nicht editierbar | ◐ | Erwartung im Code/UI — Live-Click ☐ |
| Storno mit Ersatz | ⚠ | ⋯-Menü Storno/Gutschrift ✔; voller Ersatz-Flow ☐ |
| Gutschrift negativ | ⚠ | Gutschrift-PDF Query ✔; **id-Route ✘ P1** |
| Storno ohne Ersatz | ☐ | |
| Bezahlte RE stornieren | ☐ | |
| Überfällig + Mahnung | ◐ | Status/Mahnung-Code vorhanden; Datum-Manipulation ☐ |
| Eingangsrechnung Partner | ☐ | |

---

## Szenario 5 — Chaos-Tag

| Check | Status | Ist |
|---|---|---|
| Doppelmeldung | ☐ | |
| Notfall-Pfad/Badge | ⚠ | Code/ABNAHME: Badge oft nicht live sichtbar |
| Staff-Funnel Anruf | ☐ | |
| Ungültige Links | ✔ | Status/Projekt/Nachtrag → „Link nicht verfügbar“ |
| Partner lehnt ab → Glocke | ☐ | |
| Compliance unvollständig Warnung | ☐ | Maler-Portal lädt ✔; Gate beim Zuweisen ☐ |
| Partner sperren | ☐ | |
| BärenwaldGPT Foto→Lead | ✔ | `/gpt` ist keine Produkt-Route — **FIX-08:** Redirect → `/rechner` (GPT lebt im Rechner). Funnel selbst ungetestet. |
| Spracheingabe GPT Handy | ☐ | |

---

## Phase 6 — Bearbeiten unter Feuer

| Check | Status | Ist |
|---|---|---|
| Objekt-Adresse bei offener Meldung | ☐ | |
| Logo tauschen → Status Reload | ☐ | (Nord hat derzeit kein Logo) |
| Kennung ändern → alter QR | ☐ | **kritisch für gedruckte Aushänge** |
| Schwelle 500→1000 bei wartender Freigabe | ☐ | |
| PosBoard ändern bei zugewiesenem HW | ☐ | |
| Position umziehen HW | ☐ | |
| Konditionen rückwirkend? | ☐ | |
| Preisliste → offenes Angebot unverändert? | ☐ | |
| Kunden-E-Mail ändern → nächste Mail | ☐ | |
| Mieter Einheit wechseln | ☐ | |
| AG-Korrektur + Zahlplan | ☐ | |

---

## Phase 7 — Löschen

| Check | Status | Ist |
|---|---|---|
| Kunde mit offenen Vorgängen | ◐ | UI: Preview + Namens-Confirm (`confirm-kunde-delete`) — Live-Schutz ☐ |
| Objekt mit aktiver Meldung | ☐ | |
| Einheit mit Mieter | ☐ | |
| HW mit Auftrag | ☐ | |
| Preislisten-Pos in offenem Angebot | ☐ | |
| Mehrfach löschen Liste | ☐ | |
| Akte Docs/Notizen | ☐ | |
| Team-User entfernen | ☐ | |
| Kunden zusammenführen | ◐ | Aktion „zusammenführen“ im Kunden-Detail vorhanden |
| Vorgang duplizieren | ☐ | |

---

## Querschnitt

| Check | Status | Ist |
|---|---|---|
| Glocke → Sprung | ☐ | |
| Push PWA Handy | ☐ | |
| Suche/CmdK Leopold | ✔ | Suche „Leopold“ im CRM ok |
| Dashboard-KPIs | ☐ | |
| CSV-Export Umlaute | ◐ | Export-Control früher ✔ — Inhalt ☐ |
| Impersonation + echter Login | ⚠ | Echte Logins HV/Partner/Privat ✔; Impersonation ☐ |
| S1 mobil / S2 Desktop | ⚠ | Melde mobil-Viewport ✔; S1 nicht komplett |
| Mails Plus-Aliasse | ☐ | Catcher, Inhalt nicht geprüft |

---

## Top-Probleme (anpassen zuerst)

1. **P1 F-176** Melde-Confirm hängt → Mieter ohne Ref-Nr. / Status-Link (Lead+Token in DB; B2B-Versprechen bricht am Mieter-Ende)  
2. **P1** RE/Gutschrift PDF id-Route 400 — UI-Fallback falsch  
3. **A2-Mittelteil** (nach HV-Start-Freigabe): Angebot **unter** 500 € (Direkt, ohne Org-Freigabe) **und** **über** 500 € (blockieren) als Paar → ablehnen/korrigieren/erteilen → Partner-Gate hart  
4. **Rechner→Lead** — erst nach manuellem 5-Min-Test als Bug/P1 einstufen (bisher Automation-Verdacht)  
5. **C-Finding** „Als bezahlt“ ohne Confirm; Revert/KPI-Konsistenz  
6. **`/gpt`** kein brauchbarer Funnel auf Staging  
7. **Phase 0 Brandl-Welt** fehlt — ohne sie sind S1/6/7 nur Proxy  
8. **S3 Nachtrag+Zahlplan** und **S4 Storno-Varianten** = größte Geld-Risiken, fast alles ☐  

---

## Empfohlene Reihenfolge Fix + Retest

1. **Fix F-176 + P1** (PDF id-Route)  
2. **Lead `fe37acab` Mittelteil:** HV-Portal → „An Bärenwald übergeben“ → CRM „Angebot erstellen“ → Paar unter/über 500 € → Freigabe ablehnen/korrigieren/erteilen → Partner-Gate  
3. **Rechner manuell** (Los geht's → Funnel → DB-Lead) — Bug vs. Runner entscheiden  
4. **Finanz-Kette:** Nachtrag, Storno-Modi, „Als bezahlt“-Confirm/Revert/Zahlplan  
5. Seed Phase 0 (Logo, Einheiten, Aliasse optional)  
6. Phase 6 Kennung/Logo/Schwelle  
7. Phase 7 Lösch-Session  

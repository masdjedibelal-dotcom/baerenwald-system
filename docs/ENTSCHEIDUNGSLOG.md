# Entscheidungslog — Autonomer Durchlauf Nr. 1–11

Format: **Frage** | Optionen | **gewählt** | Begründung

---

## Vorarbeit (vor Nr. 1)

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| DetailShell für Anfrage/Angebot/Auftrag committen vor Nr. 1? | Mit Nr. 1 mischen / Separater Commit | **In Nr.-1-Commit gebündelt** | Shared `globals.css`/`tailwind.config.ts` nicht sauber trennbar; DetailShell war bereits freigegeben — im Commit-Body als Vorarbeit vermerkt |
| Projektübersicht-Card unter Stammdaten? | Behalten / Entfernen | Entfernen | Mock hat keine Projektübersicht-Card im Stammdaten-Tab; Projekt-Kette oberhalb bleibt |

---

## Nr. 1 — Listen Welle 1

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| L6 Dots-Menü in Listen ohne bestehende Row-Actions? | Dots ohne Logik / Nur phone/WA wo möglich / Struktur-Lücke | Phone/WA in Anfragen-Liste wo Telefon vorhanden; sonst Struktur-Lücke | Regel „Kein Feature ohne Funktion“; Mock-Dots brauchen entityMenu — existiert in Listenzeilen nicht |
| L6 Dots Angebote/Aufträge/Kunden/HW/Partner | Improvisieren / Offen | Struktur-Lücke → OFFENE-PUNKTE (Nr. 2/7) | Keine List-Row-Menü-Items verdrahtet |
| L8 Sort-Icons | MockIcon / Lucide | Lucide behalten, Opacity 0.35 | Explizit freigegeben |
| L9 listcard Shadow | shadow-card / Mock `--shadow` / keiner | Border 0.5px, Radius var(--r)=13px, kein shadow-card | Mock listcard: border + radius, kein Card-Shadow |
| L10 Mobile-Pane | Mitnehmen / Zurückstellen | Zurückstellen (Nr. 11) | Auftrag: kein L10 in Nr. 1 |
| Icon-Farben in Nr. 1 vorziehen? | Ja / Nur Nr. 2 | Ja (Token `--icon-*` + `.mock-icon`) | Auftrag erlaubt Vorziehen wenn Token-Binding; sonst Screenshots unbrauchbar |

---

## Nr. 2 — Listen Welle 2

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Anfragen-Spalten Mock vs CRM | Exakt Mock / CRM-Extras behalten | **Exakt Mock** Nr.·Anfrage·Kunde·Betrag·Eingang·Status·Actions | Auftrag: Grid exakt; Bereiche/Region/Avatar aus Desktop entfernt (Mobile unverändert) |
| Angebot: Erstellt-Spalte | Eigene Spalte / Sub unter Titel | **Sub unter Titel** | Mock hat Erstellt in Subzeile, nicht als Spalte |
| Aufträge: Fortschritt ohne Wert | Balken 0 / Em-Dash | **—** wenn null/undefined | Keine Fake-Progress |
| Kunden: Umsatz/Aufträge Desktop | Behalten / Entfernen | **Entfernen Desktop** | Mock hat sie nicht; Export + Mobile behalten Daten |
| Dots in Stammdaten-/Angebot-Zeilen | Improvisieren / Leer | **Leere Actions-Zelle** | Kein Feature ohne Funktion |
| Toolbar-DOM | ListFilterBar belassen + Klassen / Komplett neu | **`.toolbar`/`.chiprow`-Wrapper** um bestehende Filter | Mock-Struktur-Klassen ohne Logikbruch |
| Mock-Chip „Angebot“ (Anfragen) | Sofort / Nr. 9b | **Pipeline `status=angebot` existiert bereits** als Filterwert | 1:1 mit `LeadStatus`; kein Resolver nötig |
| Mock Angebot-Chips fine stages (HW akzeptiert etc.) | 1:1 flat status_einfach / Resolver | **status_einfach beibehalten**; fine stages → OFFENE-PUNKTE Nr. 9b | Resolver-Phasenmodell nicht improvisieren |
| Alt-Komponenten löschen | Sofort löschen / Inventur only | **Inventur + nur null-use löschen** | Regel 4; ListToolbar bleibt verwaiste Option |

### Chip-Mapping (1:1 aus heutigen Feldern)

| Liste | Mock-Chip | CRM-Feld | Status |
|-------|-----------|----------|--------|
| Anfragen | Alle/Neu/Kontaktiert/Termin/Angebot | `leads.status` Pipeline | gebaut (CRM hat zusätzlich Anlass/Org — behalten) |
| Angebote | Alle + Status-Stufen | `status_einfach` | gebaut flat |
| Aufträge | Alle/Aktiv/Fertig | Status-Groups | gebaut analog |
| Kunden | Alle/Privat/HV/Gewerbe | Kundentyp | gebaut |
| Handwerker | Gewerke + Compliance | gewerk / compliance | gebaut |
| Partner | Kategorien | partner_kategorien | gebaut |
| Angebot fine HW/Kunde | Resolver-Phasen | — | **Nr. 9b** |


## Nr. 3 — WizardShell

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Shell-Radius Fullscreen | Mock Card-Shell / CRM Fullscreen belassen | **CRM Fullscreen + innere Tokens** | Mock-Wizard ist Overlay; CRM ist Full-Page — keine strukturelle UX-Änderung (Regel 9) |
| PosBoard jetzt | Optisch Accordion / PosBoard | **Accordion optisch** | PosBoard = Nr. 8b |

## Nr. 4 — Status-Sync

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Sync-Mechanismus | Nur Portal-API / Nur DB / Beides | **Lokal Lead-Patch + optional Portal-API** | Shared Supabase braucht lokales Update; API für Notify/Audit mit skipMieterMail |
| Storno hv_meldung_status | immer abgelehnt / nur wenn gesetzt | **nur wenn bereits gesetzt** | Spez: abgelehnt-Phase; HV-Feld nur bei HV-Pipeline |
| Bei API-Fehler | throw / warn | **warn, kein throw** | Abschluss darf nicht blockieren |


## Nr. 5 — Kanal-Fix

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Labels für hv_* | Spec-Labels | **HV-Meldung / HV-Katalog / HV manuell** | Auftrag |
| Unbekannter Kanal | Crash / Fallback | **kanalLabel() + Circle-Icon** | Nie wieder crashen |


## Nr. 6 — SQL Cleanup

Belal selbst — Cursor überspringt. Hinweis: Keine Testszenarien mit einer E-Mail in zwei Rollen bis Nr. 7 fertig.

## Nr. 7a — Admin-Flag

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Admin-Quelle | nur app_metadata / nur user_metadata | **app_metadata kanonisch + user_metadata Fallback lesen** | Spec; Legacy-Nutzer nicht ausschließen |
| Manager darf Impersonation? | ja / nein | **nein (nur admin)** | Spec Admin-Impersonation |

## Nr. 7c — Buttons „Als … öffnen“

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Sichtbarkeit | Nur Server-Reject / auch Client-Hide | **Client hide via `/api/crm/me` + Server `requireCrmAdmin`** | Spec: Nicht-Admins sehen Buttons nicht |
| Label vs Mock „Admin Login“ | Mock-Label / Spec-Labels 7c | **Spec-Labels 7c** (HV-Portal / Partner-Portal / Mieter-Ansicht) | Auftrag 7c explizit; Mock-„Admin Login“ folgt in 7d als Alias wo sinnvoll |
| Mieter | Echte Session / Status-Token-Vorschau | **Status-Token read-only** | Spec: ohne Auth-User |

## Nr. 7d — Banner + Admin Login verdrahten

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Menu-Label final | Spec-7c Langform / Mock „Admin Login“ | **Admin Login** + Hint mit Zielname | Mock entityMenu; 7c-Labels bleiben als Hint |
| Auftrag-Detail Admin Login | nur Stammdaten / auch Auftrag | **auch Auftrag** (Kunde-Impersonation) | Mock onPortal auf entity |
| Portal-Banner | eigener CRM-Commit / Sibling-Repo | **handwerks-plattform AdminViewBanner angepasst** | Banner lebt im Portal-Layout |
| Token-Tabelle remote | soft-fail belassen / Migration apply | **apply_migration remote** | One-time jti jetzt hart |

## Nr. 8a — `/neu`-Speichern Datenverlust

| Frage | Optionen | Gewählt | Begründung |
|-------|----------|---------|------------|
| Root Cause | Speichern fehlschlägt / Redirect-Race | **onDone+onClose Race** auf `/rechnungen/neu` | onClose überschreibt Detail-Redirect |
| Standalone Reload | Nur Fix Race / auch Bootstrap | **beides** | Detail blockierte Edit ohne `auftrag_id` |
| `/angebote/neu` | Wizard zurück / Legacy-Redirect bleiben | **Legacy-Redirect bleiben** | Create läuft über Anfrage; kein Wizard-Stateverlust auf dieser Route |
| Build-Regression crm-access | belassen / split | **`crm-access-server.ts`** | `next/headers` darf nicht Client-Login pullen |





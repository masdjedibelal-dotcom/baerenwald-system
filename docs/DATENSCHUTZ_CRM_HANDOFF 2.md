# Datenschutz CRM-Handoff — Melde-Flow / Auftraggeber-Portal

Stand: 25.06.2026  
Zielgruppe: **baerenwald-crm-dashboard** (Betrieb, Entwicklung, Datenschutz)

> Dieses Dokument bündelt alle offenen CRM-/Rechts-To-dos.  
> Produktseitig (handwerks-plattform) sind Art.-13-Hinweise, DSE-Abschnitte und Vertragsvorlagen vorbereitet.

---

## 1. Was im Frontend bereits fertig ist

| Bereich | Status | Dateien |
|---------|--------|---------|
| Art.-13-Kurzhinweis Meldeformular | ✅ | `MeldeDatenschutzHinweis.tsx`, `melde-datenschutz-copy.ts` |
| Modus `melden` + `ergaenzen` | ✅ | gleiche Komponente |
| Fotos-Hinweis (datensparsam) | ✅ | `MeldeFormular.tsx` |
| DSE Abschnitt 3b/3c (`#melden-hv`) | ✅ | `datenschutz/page.tsx` |
| DSE Speicherdauer Melder-Leads/Fotos | ✅ | Abschnitt 10 |
| HV-Einladungsflow Hinweis | ✅ | `OrganisationMeldungErfassenForm.tsx` |
| HV-Portal Einstellungen Hinweis | ✅ | `OrganisationEinstellungenPanel.tsx` |
| Bestätigungsseite „Registrierung optional“ | ✅ | `melden/bestaetigung/page.tsx` |
| Vertragsvorlagen (Anwalt) | ✅ | `docs/legal/*` |

**Spiegel im CRM:** `docs/DATENSCHUTZ_CRM_HANDOFF.md` (vollständig)

---

## 2. Rollenmodell (mit Anwalt finalisieren)

**Empfehlung (Option A):**

- **Hausverwaltung (HV):** Verantwortlicher gegenüber Mietern (Art. 24 DSGVO)
- **Bärenwald:** Auftragsverarbeiter (Art. 28) — technische Plattform, CRM, Koordination

**Alternative (Option B):** Gemeinsame Verantwortlichkeit Art. 26 — nur wenn HV und Bärenwald gemeinsam Zweck/Mittel bestimmen. Dann separate Art.-26-Vereinbarung Pflicht.

**Datenfluss:**

```
Mieter → /melden → Lead (kanal: hv_melder_link)
       → HV-Portal Eingang → Freigabe
       → Bärenwald koordiniert → Handwerker (nach Freigabe)
```

**Felder im Lead:**

- `melder_name`, `melder_einheit`, `melder_telefon`, `melder_email`
- `funnel_daten.fotos` (Storage-URLs)
- `anlass: meldung`, `erfassung_von: melder | org`
- `auftraggeber_kunde_id`, `kunde_objekt_id`

---

## 3. Vertragsunterlagen (Anwalt)

Vorlagen liegen im Frontend-Repo unter `docs/legal/`:

| Datei | Inhalt |
|-------|--------|
| `ORGANISATION_AUFTRAGGEBERVERTRAG_GLIEDERUNG.md` | Hauptvertrag HV |
| `ORGANISATION_AVV_ANLAGE_VORLAGE.md` | AVV Art. 28 |
| `ORGANISATION_BETROFFENENRECHTE_PROZESS.md` | Auskunft/Löschung/Panne |
| `ORGANISATION_ONBOARDING_CHECKLISTE_HV.md` | Go-Live je HV |

### Offen (Anwalt)

- [ ] Auftraggebervertrag finalisieren und unterschreiben lassen
- [ ] AVV-Anlage finalisieren
- [ ] Rollenmodell (A vs. B) verbindlich festlegen
- [ ] Notfall-Ausnahme (`notfall_direkt`) vertraglich absichern
- [ ] DSE-Formulierungen final prüfen

---

## 4. CRM — VVT (Verarbeitungsverzeichnis)

Neuer Eintrag **„Mieter-Schadenmeldungen (Melde-Link)“** in CRM-Datenschutz-Modul:

| Feld | Inhalt |
|------|--------|
| Zweck | Entgegennahme und Bearbeitung von Schadenmeldungen über öffentlichen Link |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. b (Mietverhältnis) und/oder lit. f — **HV verantwortlich, mit Anwalt** |
| Kategorien betroffener Personen | Mieter, ggf. Ansprechpartner HV |
| Datenarten | Kontakt, Einheit, Schadensbeschreibung, Fotos, Objektbezug |
| Empfänger | HV, Bärenwald, ggf. Handwerker nach Freigabe |
| Drittland | Resend/Netlify (DPF), siehe AVV-Anlage |
| Löschfrist | siehe Abschnitt 5 |
| TOMs | RLS, Portal-Auth, Rate-Limit, Löschlog |

**To-do CRM:**

- [x] VVT-Eintrag im UI anlegen (`Einstellungen → Integration → Datenschutz → VVT`)
- [x] AVV-Register Unterauftragsverarbeiter aktuell halten (`avv-register.ts` + UI-Tab)

---

## 5. CRM — Löschfristen (Migration)

Bestehende Tabelle: `datenschutz_fristen` (Migration `20260419100000_datenschutz.sql`).

**Neue Kategorien einfügen** (Migration im CRM-Repo anlegen):

```sql
-- Migration: datenschutz_fristen_melder.sql
insert into public.datenschutz_fristen (kategorie, bezeichnung, frist_monate, beschreibung, gesetzliche_grundlage)
values
  (
    'melder_leads_offen',
    'Melder-Leads ohne Auftrag (offen/abgebrochen)',
    12,
    'Schadenmeldungen über /melden ohne weiterführenden Auftrag',
    'DSGVO Art. 17 — berechtigtes Interesse endet nach Abschluss/Ablehnung'
  ),
  (
    'melder_leads_abgeschlossen',
    'Melder-Leads mit abgeschlossenem Vorgang ohne Auftrag',
    24,
    'Abgelehnte oder erledigte Meldungen ohne Auftragsanlage',
    'DSGVO Art. 17'
  ),
  (
    'melder_fotos',
    'Fotos in Melder-Meldungen',
    12,
    'funnel_daten.fotos bei Leads kanal hv_melder_link / hv_einladung',
    'DSGVO Art. 17 — Zweckbindung Schadensdokumentation'
  )
on conflict (kategorie) do nothing;
```

**Löschlogik (`execute-loeschung.ts`):**

- [x] Kategorie `melder_fotos`: URLs aus `leads.funnel_daten.fotos` lesen → Storage löschen → Array leeren
- [x] Kategorie `melder_leads_*`: `melder_*` Felder nullen, `kontakt_*` anonymisieren, `funnel_daten` bereinigen
- [x] Prüfung: Lead mit aktivem Auftrag → **nicht** löschen (wie bestehende Lead-Logik)
- [x] Cron/Scheduled Job: Kandidaten aus `datenschutz_fristen` + `created_at`/`status` ermitteln

**Referenz:** bestehende Implementierung in `src/lib/datenschutz/execute-loeschung.ts` (Kategorien `leads_abgebrochen`, `fotos_auftraege`).

---

## 6. CRM — Betroffenenanfragen

Prozess: `docs/legal/ORGANISATION_BETROFFENENRECHTE_PROZESS.md`

**To-dos:**

- [x] Anfrage-Typ/Tag „Mieter-Meldung“ in `datenschutz_anfragen` (Spalte `kontext`)
- [x] Lead-Suche nach `melder_email` + `kanal in (hv_melder_link, hv_einladung)`
- [x] Export „Melder-Auskunft“ aus Lead-Detail (strukturierter Text)
- [x] Lösch-Button mit Melder-spezifischer Kategorie
- [x] Schulungs-Sheet für CRM-Nutzer (1 Seite, datensparsame Nutzung)

**Zuständigkeit:** Mieter → primär HV; Bärenwald unterstützt technisch.

---

## 7. CRM — Operatives Onboarding je HV

Checkliste: `docs/legal/ORGANISATION_ONBOARDING_CHECKLISTE_HV.md`

Kurz:

1. Vertrag + AVV
2. Kunde `portal_modus = organisation`, `org_kennung`, Objekte + `melde_slug`
3. Test-Meldung mit/ohne Foto
4. Freigabe-Workflow + Partner-Gate testen
5. Melde-Link in HV-Kommunikation

---

## 8. CRM — Schulung intern

Themen für CRM-Nutzer:

- Nur notwendige Melderdaten erfassen (HV-Einladung)
- Keine Screenshots/Fotos außerhalb des Systems
- Bei Auskunftsanfragen: Frist 1 Monat, HV einbinden
- Löschungen nur über Datenschutz-Modul, nicht manuell in DB

---

## 9. Technische Referenz (bereits vorhanden)

| CRM-Komponente | Pfad |
|----------------|------|
| Datenschutz-Modul | `src/lib/datenschutz/` |
| Löschung API | `src/app/api/datenschutz/loeschen/route.ts` |
| UI Einstellungen | `src/app/(dashboard)/einstellungen/integration?section=datenschutz` |
| Lead Melder-Block | `src/components/anfragen/LeadOrgKontextBlock.tsx` |
| Org-Mail bei Meldung | `src/lib/org/org-mail-notify.ts` |
| SQL Org-Felder | `supabase/migrations/20260708120000_organisation_portal_stamm.sql` |

---

## 10. Priorisierte To-do-Liste (CRM)

### P0 — vor erstem Live-HV

1. Auftraggebervertrag + AVV (Anwalt)
2. VVT-Eintrag Mieter-Schadenmeldungen
3. Onboarding-Checkliste operativ nutzen
4. HV informiert Mieter (eigene DSE/Hausordnung)

### P1 — innerhalb 4 Wochen nach Go-Live

5. [x] Migration `datenschutz_fristen` Melder-Kategorien (`20260725120000_datenschutz_melder.sql`)
6. [x] `execute-loeschung.ts` erweitern (`melder_fotos`, `melder_leads_*`)
7. [x] Cron für automatische Löschkandidaten (`loadDatenschutzFaellige` + `/api/cron/datenschutz`)
8. [x] Betroffenenanfragen-Prozess im CRM testen (UI + Melder-Suche)

### P2 — Verbesserungen

9. [x] Export Melder-Auskunft (Text; PDF optional offen)
10. Optional: Checkbox „Hinweis gelesen“ im Meldeformular (Rechtsbewertung)
11. Incident-Log für Datenpannen

---

## 11. Verknüpfung mit anderen Docs

| Dokument | Ort |
|----------|-----|
| Melde-Flow To-dos (Status) | `handwerks-plattform/docs/DATENSCHUTZ_MELDEFLOW_TODOS.md` |
| Org-Portal Backend | `handwerks-plattform/docs/ORGANISATION_PORTAL_BACKEND.md` |
| Org-Portal Übersicht | `handwerks-plattform/docs/ORGANISATION_PORTAL.md` |
| Vertragsvorlagen | `docs/legal/` (Spiegel aus handwerks-plattform) |

---

## 12. Hinweis

Alle Texte in Produkt und Vorlagen sind **keine Rechtsberatung**. Finale Freigabe durch Datenschutzbeauftragten/Anwalt vor produktivem Einsatz mit echten Mieterdaten.

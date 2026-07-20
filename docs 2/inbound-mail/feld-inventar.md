# Feld-Inventar: Inbound-Mail ↔ CRM ↔ Meldeformular

**Stand:** Juli 2026 (DELTA Belal)  
**Mail-Spec:** [mail-vorlage-spec.md](./mail-vorlage-spec.md)  
**Zielkanal:** Inbound-Mail → `kanal=hv_mail` (Spec) / interim `hv_manuell`, `erfassung_von=organisation`

---

## DELTA-Entscheidungen (Belal) — Kurz

| # | Entscheidung | Auswirkung Matrix |
|---|--------------|-------------------|
| 1 | Kein `Kostenträger:` in Mail | Default `kostentraeger=unklar` |
| 2 | Pflicht `Auftrag:` (NOTFALL / Direkt / Angebot) | Neuer Key `funnel_daten.bestellabsicht` |
| 3 | `Einheit & Ort:` statt `Melder Einheit:` | `melder_einheit` + Notiz-Prefix |
| 4 | `Kontakt vor Ort:` ein Feld | Regex → Name/Telefon; bedingte Telefon-Pflicht |
| 5 | Fotos Pflicht kommuniziert, nie reject | Badge `ohne_foto`, In-Reply-To-Anhänge |
| 6 | Optionale Dispositions-Felder | `funnel_daten`-Keys (s. unten) |
| 7 | Keine Pflicht Kategorie/Bereich | Heuristik + CRM-Triage |
| 8 | Fixtures aktualisiert | `fixtures/` |
| 9 | **Kaskade A/B/C** statt Vorlagen-Zwang | Stufe A/B/C + Matching-Kaskade |
| 10 | `org_inbound_domains` / `org_inbound_emails` | Neue Spalten auf `kunden` (Spec) |
| 11 | Threading zuerst | In-Reply-To → Merge, kein Duplikat-Lead |
| 12 | NOTFALL B/C nur `havarie_verdacht` | Kein Auto-`havarie=true` außer Stufe A `Auftrag: NOTFALL` |

---

## Parse-Kaskade (Inbound)

| Stufe | Bedingung | Ergebnis | Badge |
|-------|-----------|----------|-------|
| **A** | ≥ 3 von 5 Pflicht-Labels | Volles Parsing (Vorlagen-Spec) | — |
| **B** | 1–2 Labels | Felder + Rest → `notizen` | `teilweise_erfasst` |
| **C** | 0 Labels | Betreff + Body → `notizen` | `unstrukturiert` |

**Matching-Kaskade** (parallel zu Stufe): Absender-E-Mail → Domain → Adresse im Text → `hv_zuordnen`.

**Neue `inbound_flags`:** `teilweise_erfasst`, `unstrukturiert`, `havarie_verdacht`, `kontakt_neu`, `zuordnung_pruefen`, `hv_zuordnen`, `automail_pruefen`.

Details: [parser-mapping.ts-SPEC.md](./parser-mapping.ts-SPEC.md) §0–7.

---

## Match-Status DELTA-Felder (aktueller Code)

| Feld (fachlich) | Ziel | Match heute? | Anmerkung |
|-----------------|------|--------------|-----------|
| `Objekt:` | `kunde_objekt_id` | ✅ | Lookup `melde_slug` / `titel` existiert |
| `Auftrag: NOTFALL` | `melde_kategorie=notfall`, `havarie=true` | ✅ | `funnel_daten.havarie` in `hv-lead-actions.ts` + E2E |
| `Auftrag: Angebot` | Angebotsweg | ✅ | `hv_meldung_status=neu` (Default) |
| `Auftrag: Direkt bis X €` | `bestellabsicht=direkt` + Betrag | ⚠️ **NEU** | `bestellabsicht` fehlt im Code; `org_freigabe_log.betrag_eur` existiert |
| `Beschreibung:` | `notizen` | ✅ | — |
| Kategorie/Bereich (abgeleitet) | `melde_kategorie`, `melde_bereich` | ⚠️ | Heuristik **neu**; Keys existieren |
| `Einheit & Ort:` | `melder_einheit` + Notiz-Prefix | ✅ | Spalte existiert; Prefix-Logik **neu** |
| `Kontakt vor Ort:` | `melder_name`, `melder_telefon` | ✅ | Spalten existieren; Regex **neu** |
| Kostenträger (entfernt) | `kostentraeger=unklar` | ✅ | Spalte + Enum; `vorgeschlagenerKostentraeger()` existiert |
| Fotos Anhang | `funnel_daten.fotos` | ✅ | Array existiert; Inbound-Upload **neu** |
| Badge `ohne_foto` | `funnel_daten.inbound_flags` | ⚠️ **NEU** | JSON-Array, keine Migration |
| Badge `kontakt_fehlt` | `funnel_daten.inbound_flags` | ⚠️ **NEU** | — |
| Badge `kategorie_offen` / `bereich_offen` | `funnel_daten.inbound_flags` | ⚠️ **NEU** | — |
| `Erreichbar:` | `funnel_daten.erreichbar_ab` | ⚠️ **NEU** | Key reservieren (Formular-Welle 2) |
| `Zugang:` | `funnel_daten.zugang_hinweis` | ✅ | Alias in `anfrage-adresse.ts` |
| `Schon unternommen:` | `funnel_daten.schon_unternommen` | ⚠️ **NEU** | — |
| `Etage / Aufzug:` | `funnel_daten.etage_aufzug` | ⚠️ **NEU** | — |
| `Gerät:` | `funnel_daten.geraet` | ⚠️ **NEU** | nicht verwechseln mit `eingangsrechnungen.kategorie=geraete` |
| `Versicherungs-Nr.:` | `versicherungs_nr` | ✅ | Spalte auf `leads` |
| `Kostenstelle:` (optional) | `funnel_daten.kostenstelle_override` | ⚠️ **NEU** | Stamm `kunden_objekte.kostenstelle_nr` existiert |
| In-Reply-To Foto | gleicher Lead | ⚠️ **NEU** | Resend-Webhook vorhanden, Anbindung offen |
| `org_inbound_domains` | Org-Match Kaskade 2 | ⚠️ **NEU** | Migration Spec in Parser-Spec |
| Stufe A/B/C | `funnel_daten.inbound_stufe` | ⚠️ **NEU** | — |
| `mail_betreff` (Stufe C) | `funnel_daten.mail_betreff` | ⚠️ **NEU** | — |

**Fazit:** Kern-Spalten matchbar; **neu:** Kaskaden-Parser, `org_inbound_*`, Thread-Merge, `inbound_flags`, `bestellabsicht`, Signatur-Strip.

---

## Schritt 3 — Abgleich-Matrix (DELTA Mail-Vorlage)

| Feld (fachlich) | DB-Spalte / JSON | CRM braucht | Formular | Mail DELTA | Pflicht Mail | Fallback | Kat. |
|-----------------|------------------|-------------|----------|------------|--------------|----------|------|
| Objekt | `kunde_objekt_id` | ja | URL | ja | **ja** | CRM-Zuordnung | MATCH |
| Auftrag (NOTFALL/Direkt/Angebot) | `funnel_daten.bestellabsicht` | ja | nein | ja | **ja** | `angebot` | **NEU** |
| Beschreibung | `notizen` | ja | ja | ja | **ja** | — | MATCH |
| Einheit & Ort | `melder_einheit` + Notiz-Prefix | ja | `melder_einheit` | ja | **ja** | leer | MATCH |
| Kontakt vor Ort | `melder_name`, `melder_telefon` | ja | getrennt | ja | **ja**† | Badge `kontakt_fehlt` | MATCH |
| Fotos | `funnel_daten.fotos` | hilfreich | optional | Hinweis | kommuniziert | Badge `ohne_foto` | MATCH |
| Kategorie | `funnel_daten.melde_kategorie` | ja | ja | **nein** | nein | Heuristik / Triage | DELTA |
| Bereich | `funnel_daten.melde_bereich` | ja | ja | **nein** | nein | Heuristik / Triage | DELTA |
| Kostenträger | `kostentraeger` | ja (spät) | nein | **nein** | nein | `unklar` | DELTA |
| Havarie-Flag | `funnel_daten.havarie` | ja | via Notfall | via Auftrag | — | `false` | MATCH |
| Direkt-Betrag | `org_freigabe_log.betrag_eur` | Freigabe | nein | in `Auftrag:` | — | — | MATCH |
| Erreichbar | `funnel_daten.erreichbar_ab` | Dispo | Welle 2 | optional | nein | — | **NEU** |
| Zugang | `funnel_daten.zugang_hinweis` | Dispo | Welle 2 | optional | nein | — | MATCH |
| Schon unternommen | `funnel_daten.schon_unternommen` | Dispo | Welle 2 | optional | nein | — | **NEU** |
| Etage / Aufzug | `funnel_daten.etage_aufzug` | Dispo | Welle 2 | optional | nein | — | **NEU** |
| Gerät | `funnel_daten.geraet` | Dispo | Welle 2 | optional | nein | — | **NEU** |
| Versicherungs-Nr. | `versicherungs_nr` | bei Fall | nein | optional | nein | leer | MATCH |
| Kostenstelle Override | `funnel_daten.kostenstelle_override` | Export | nein | optional | nein | Objektstamm | **NEU** |
| Inbound-Flags | `funnel_daten.inbound_flags` | UI | — | System | — | `[]` | **NEU** |

† Telefon Pflicht bei NOTFALL / Wohnungszugang; sonst weich.

---

## `funnel_daten` — Kanonische Keys (Mail + künftiges Formular)

```json
{
  "quelle": "hv_mail",
  "bestellabsicht": "notfall | direkt | angebot",
  "havarie": true,
  "melde_kategorie": "notfall | schaden | reparatur | sonstiges | null",
  "melde_bereich": "wasser | … | null",
  "fotos": [],
  "inbound_flags": ["ohne_foto", "kontakt_fehlt", "kategorie_offen", "bereich_offen"],
  "erreichbar_ab": "string",
  "zugang_hinweis": "string",
  "schon_unternommen": "string",
  "etage_aufzug": "string",
  "geraet": "string",
  "kostenstelle_override": "string"
}
```

**Konsistenz-Regel:** Dieselben Keys und Labels in Mail-Vorlage und Meldeformular (Welle 2) — keine dritte Benennung.

---

## Offene Implementierungs-Punkte

| # | Thema | Aufwand |
|---|-------|---------|
| 1 | Parser + Persist (`src/lib/inbound-mail/`) | M |
| 2 | `inbound_flags` Badges in `LeadOrgKontextBlock` | S |
| 3 | Resend Inbound → Lead + In-Reply-To Foto-Merge | M |
| 4 | Kategorie/Bereich-Heuristik aus Beschreibung | S |
| 5 | Meldeformular Optionalfelder (Welle 2) gleiche Keys | M |
| 6 | Enum `lead_kanal.hv_mail` | S |
| 7 | Migration `org_inbound_domains` + `org_inbound_emails` | S |
| 8 | CRM „Absender merken“ + Badges in LeadOrgKontext | M |
| 9 | Kaskaden-Parser + 8 Fixtures als Vitest | M |

---

## Referenzen

- Havarie: `src/lib/org/hv-lead-actions.ts` (`funnel_daten.havarie`)
- Zugang-Alias: `src/lib/anfrage-adresse.ts`
- Freigabe-Log: `supabase/migrations/20260708120200_organisation_freigabe_log.sql`
- Fixtures: [fixtures/](./fixtures/)

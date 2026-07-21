# Mail-Vorlage-Spec: HV-Inbound Schadenmeldung

**Stand:** Juli 2026 (DELTA Belal)  
**Ableitung aus:** [feld-inventar.md](./feld-inventar.md)  
**Prinzip:** Kurz für die HV — Prozesswissen (Kostenträger, Kategorie, Gewerk) wird intern geklärt oder abgeleitet.

> **Kaskade:** Die Vorlage ist **empfohlen**, nicht Pflicht. Der Parser erkennt sie als **Stufe A** (≥ 3 strukturierte Felder). Freitext-Mails landen in Stufe B/C — siehe [parser-mapping.ts-SPEC.md](./parser-mapping.ts-SPEC.md).

---

## Vorlage (Copy-Paste für Hausverwaltungen)

```
Betreff: Meldung — Musterhaus GH12

--- Pflicht ---

Objekt: GH12 Musterstraße
Auftrag: Angebot
Beschreibung: Seit gestern tropft der Hahn im Bad Whg. 12, Wasser läuft in die Schublade.
Einheit & Ort: Whg. 12, 2. OG links, Bad
Kontakt vor Ort: Max Mustermann, 0170 1234567

Bitte 1–2 Fotos vom Schaden als Anhang mitschicken.

--- Optional ---

Erreichbar: ab 14:00, Mo–Fr
Zugang: Schlüssel beim Hausmeister Müller, EG links
Schon unternommen: Hauptwasserhahn zugedreht
Etage / Aufzug: 2. OG, kein Aufzug
Gerät: Waschbecken-Armatur
Versicherungs-Nr.:
Kostenstelle:
```

### Auftrag-Zeile — erlaubte Werte (Beispiele)

| Auftrag (HV tippt) | Bedeutung |
|--------------------|-----------|
| `NOTFALL` / `sofort` | Havarie, sofortige Disposition |
| `Direkt erledigen bis 500 €` / `direkt bis 500` | Direktbeauftragung mit Freigabe-Obergrenze |
| `Angebot` / `Angebot erwünscht` | Angebotsweg (**Default** wenn Zeile fehlt oder unklar) |

---

## Feld-Spezifikation

### Pflicht-Sektion

| # | Feldname (exakt) | Beispielzeile | Parser-Zielformat | DB / JSON-Ziel |
|---|------------------|---------------|-------------------|----------------|
| 1 | `Objekt:` | `Objekt: GH12 Musterstraße` | string (titel oder slug) | `kunde_objekt_id` |
| 2 | `Auftrag:` | `Auftrag: Direkt erledigen bis 500 €` | enum s. unten | `funnel_daten.bestellabsicht` + Side-Effects |
| 3 | `Beschreibung:` | Freitext ≥8 Zeichen | string | `notizen` (ohne Prefix) |
| 4 | `Einheit & Ort:` | `Whg. 12, 2. OG, Bad` | string, nicht splitten | `melder_einheit` + Prefix in `notizen` |
| 5 | `Kontakt vor Ort:` | `Max Mustermann, 0170 …` | Name + Telefon (Regex) | `melder_name`, `melder_telefon` |

**Fotos:** Kein Label in der Vorlage — Hinweiszeile unter Pflicht. **Kein Hard-Reject** ohne Anhang (s. Validierung).

### Optional-Sektion

| Feldname | Beispiel | DB-Ziel |
|----------|----------|---------|
| `Erreichbar:` | `ab 14:00, Mo–Fr` | `funnel_daten.erreichbar_ab` |
| `Zugang:` | `Schlüssel beim Hausmeister` | `funnel_daten.zugang_hinweis` |
| `Schon unternommen:` | `Hauptwasserhahn zu` | `funnel_daten.schon_unternommen` |
| `Etage / Aufzug:` | `2. OG, kein Aufzug` | `funnel_daten.etage_aufzug` |
| `Gerät:` | `Waschbecken-Armatur` | `funnel_daten.geraet` |
| `Versicherungs-Nr.:` | Police / Schadennummer | `versicherungs_nr` |
| `Kostenstelle:` | nur wenn abweichend vom Objektstamm | `funnel_daten.kostenstelle_override` |

---

## `Auftrag:` → System-Mapping

| Parser-Erkennung | `funnel_daten.bestellabsicht` | Weitere Felder |
|------------------|-------------------------------|----------------|
| `NOTFALL`, `sofort`, `notfall` | `notfall` | `melde_kategorie=notfall`, `funnel_daten.havarie=true`, `zeitraum=sofort`, `situation=notfall` |
| `Direkt … bis {n} €`, `direkt bis {n}` | `direkt` | `org_freigabe_log`: `aktion=angefordert`, `betrag_eur=n`, `notiz=HV-Mail Direktauftrag`; `preis_min=max=n` |
| `Angebot`, leer, unklar | `angebot` | `hv_meldung_status=neu` (Angebotsweg; Default) |

**Entfernt:** `Kostenträger:` (nicht in Vorlage) → Lead `kostentraeger=unklar`, `kostentraeger_vorgeschlagen=false`; Klärung via bestehende `vorgeschlagenerKostentraeger()` + CRM.

**Entfernt:** `Kategorie:` / `Bereich:` aus Pflicht → Parser leitet aus `Beschreibung` ab (Keyword-Heuristik); sonst CRM-Triage + Badges `kategorie_offen` / `bereich_offen`.

**Entfernt:** `Freigabe:` Freitext → ersetzt durch `Auftrag: Direkt erledigen bis X €`.

---

## `Einheit & Ort:` — Spezialregel

- **Nicht splitten** — gesamter Wert → `melder_einheit`
- Zusätzlich Prefix in `notizen`: `[Ort: {Wert}]\n{Beschreibung}`
- Raumangabe (Bad, Küche, Flur, Keller, …) ist Dispositions-relevant und bleibt im Freitext erhalten

---

## `Kontakt vor Ort:` — Spezialregel

**Regex (vereinfacht):** letztes Telefon-Muster im String → `melder_telefon`; Rest → `melder_name`  
Unterstützt: `0170 1234567`, `+49 170 …`, `(089) …`

| Situation | Telefon-Pflicht? | Wenn fehlt |
|-----------|------------------|------------|
| `Auftrag=NOTFALL` | **ja** | Lead anlegen + Badge `kontakt_fehlt` |
| Wohnungszugang (Heuristik*) | **ja** | Badge `kontakt_fehlt` |
| sonst | nein | Badge optional; E-Mail aus Kontakt falls vorhanden |

\*Wohnungszugang-Heuristik: `Einheit & Ort` oder `Beschreibung` enthält `whg`, `wohnung`, `bad`, `küche`, `zimmer`, `mieter`, `schlafzimmer` **oder** abgeleiteter `melde_bereich` ∈ `{wasser, heizung, strom, fenster_tuer, schimmel}`.

---

## Fotos

| Zustand | Verhalten |
|---------|-----------|
| ≥1 Bild-Anhang | URLs → `funnel_daten.fotos[]` |
| kein Anhang | Lead **trotzdem** anlegen; Badge `ohne_foto` in `funnel_daten.inbound_flags` |
| Auto-Reply | „Bitte senden Sie uns 1–2 Fotos als Antwort auf diese Mail.“ + `In-Reply-To` → Anhänge an **denselben** Lead |

---

## System-Felder nach Parse

| Feld | Wert |
|------|------|
| `kanal` | `hv_mail` (Spec; bis Enum da: `hv_manuell`) |
| `erfassung_von` | `organisation` |
| `anlass` | `meldung` |
| `kostentraeger` | `unklar` |
| `melde_tracking_token` | `null` |
| `vorgang_phase` | `eingegangen` |
| `funnel_daten.quelle` | `hv_mail` |

---

## Bewusst NICHT in der Vorlage

| Feld | Begründung |
|------|------------|
| **Kostenträger** | Default `unklar`; Vorschlags-Logik + CRM-Klärung |
| **Kategorie / Bereich** | Aus Beschreibung oder CRM-Triage (2 Klicks) |
| **Melder E-Mail separat** | in `Kontakt vor Ort` oder Follow-up |
| **Kostenstelle** | Objektstamm; optional Override |
| **Fachdetail-Fragen** | in Beschreibung |

---

## Validierung

| Fehler | Verhalten |
|--------|-----------|
| Objekt nicht eindeutig | Rückmail, kein Lead |
| Beschreibung &lt; 8 Zeichen | Rückmail, kein Lead |
| Keine Fotos | **kein** Reject — Badge + Auto-Reply |
| NOTFALL ohne Telefon | Lead + Badge `kontakt_fehlt` + Auto-Reply mit Bitte um Nummer |
| Kategorie/Bereich nicht ableitbar | Lead + Badges; CRM setzt bei Triage |

---

## Fixtures

Beispiel-Mails: [fixtures/](./fixtures/)

**Stufe A:** `standard-mit-foto`, `direkt-bis-500`, `notfall-ohne-foto`  
**Kaskade:** `prosa-ohne-struktur`, `thread-antwort-foto`, `abwesenheitsnotiz`, `signatur-muell`, `adresse-im-fliesstext`

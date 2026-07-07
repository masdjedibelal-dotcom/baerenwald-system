# parser-mapping.ts — Spezifikation (DELTA Belal + Kaskade)

**Stand:** Juli 2026  
**Ziel:** `src/lib/inbound-mail/` — Parser, Zuordnung, Persistenz, Threading

**Leitidee:** Jede eingehende Mail landet in **genau einer** Parse-Stufe (A/B/C). Vorlage ist **optional** (Stufe A), nicht Voraussetzung.

---

## 0. Pipeline-Übersicht (Reihenfolge!)

```
1. Automail-Erkennung (Abwesenheit, noreply, Auto-Submitted)
2. Threading: In-Reply-To / References → bestehender Lead?
   → ja: Anhang/Kommentar anhängen, ENDE (kein neuer Lead)
3. Body bereinigen (Signaturen/Disclaimer kappen)
4. Parse-Stufe A | B | C bestimmen
5. Matching-Kaskade: Org + Objekt (unabhängig von Stufe)
6. NOTFALL-Verdacht (Stufe B/C; Stufe A siehe §3)
7. Persist Lead
8. Auto-Reply (außer Automail)
```

---

## 1. Parse-Stufen

### Pflichtfelder (Vorlagen-Zähler)

Zählt erkannte `Label: Wert`-Zeilen unter:

| Key | Labels |
|-----|--------|
| `objekt` | Objekt, Liegenschaft, … |
| `auftrag` | Auftrag, Beauftragung, … |
| `beschreibung` | Beschreibung, Problem, … |
| `einheit_ort` | Einheit & Ort, Lage, … |
| `kontakt_vor_ort` | Kontakt vor Ort, Ansprechpartner, … |

### STUFE A — Vorlage erkannt (`≥ 3` Pflichtfelder)

- Volles Parsing wie [mail-vorlage-spec.md](./mail-vorlage-spec.md)
- `funnel_daten.inbound_stufe = 'A'`
- `funnel_daten.inbound_flags` — **keine** Stufen-Badges (nur fachliche Flags wie `ohne_foto`, `kontakt_fehlt`)
- `Auftrag: NOTFALL` → `bestellabsicht=notfall`, `melde_kategorie=notfall`, `havarie=true` (explizite HV-Anweisung)

### STUFE B — teilstrukturiert (`1–2` Pflichtfelder)

- Erkannte Felder normal übernehmen (Label-Aliase §4)
- **Rest der bereinigten Mail** (ohne erkannte Label-Zeilen) → an `notizen` anhängen
- `funnel_daten.inbound_stufe = 'B'`
- Badge: `teilweise_erfasst`

### STUFE C — unstrukturiert (`0` Pflichtfelder)

- **Titel:** bereinigter Betreff → `funnel_daten.mail_betreff` + erste Zeile `notizen`
  - Prefix `Mail:` entfernen
  - `Fwd:` / `WG:` / `Re:` / `Aw:` strippen (mehrfach)
- **Body:** bereinigter Volltext → `notizen` (nach Signatur-Kappung §2)
- Anhänge → `funnel_daten.fotos` (wie immer)
- `funnel_daten.inbound_stufe = 'C'`
- Badge: `unstrukturiert`

**Stufe C — kein Hard-Reject** wegen fehlender Beschreibungslänge.

---

## 2. Body-Bereinigung (alle Stufen)

```typescript
function stripMailBody(raw: string): string {
  let body = raw.replace(/\r\n/g, '\n')
  // 1) RFC-Signatur
  const dashSig = body.search(/\n--\s*\n/)
  if (dashSig >= 0) body = body.slice(0, dashSig)
  // 2) Deutsche Grußformeln + Folgetext
  const gruss = /(\nMit freundlichen Grüßen[\s\S]*$|\nFreundliche Grüße[\s\S]*$|\nViele Grüße[\s\S]*$|\nBeste Grüße[\s\S]*$)/i
  body = body.replace(gruss, '')
  // 3) Disclaimer-Blöcke (best-effort)
  body = body.replace(/\nDiese (E-)?Mail[\s\S]*$/i, '')
  return body.trim()
}
```

```typescript
function cleanSubject(raw: string): string {
  return raw
    .replace(/^(?:(?:Re|Fwd|WG|Aw|Antwort):\s*)+/gi, '')
    .replace(/^Mail:\s*/i, '')
    .trim()
}
```

---

## 3. NOTFALL-Erkennung

| Kontext | Verhalten |
|---------|-----------|
| **Stufe A** + `Auftrag: NOTFALL` | `havarie=true`, `bestellabsicht=notfall` (HV hat explizit gewählt) |
| **Stufe B/C** — Betreff/Body-Scan | Keywords: `notfall`, `dringend`, `wasserschaden akut`, `rohrbruch`, `sofort`, `überflut` |
| Stufe B/C bei Treffer | Badge `havarie_verdacht` + **interne Benachrichtigung** (`notifyInterneNeueMeldung` o.ä.) |
| Stufe B/C | **kein** `havarie=true` — Mensch bestätigt im CRM |

---

## 4. Label-Aliase (Stufe A/B)

Unverändert zur Vorlagen-Spec — siehe vorherige Version:

- `objekt`, `auftrag`, `beschreibung`, `einheit_ort`, `kontakt_vor_ort`
- Optional: `erreichbar_ab`, `zugang_hinweis`, `schon_unternommen`, `etage_aufzug`, `geraet`, `versicherungs_nr`, `kostenstelle_override`

`einheit_ort` → `melder_einheit`; bei Stufe A: `notizen = [Ort: …]\n{beschreibung}`  
`kontakt_vor_ort` → Regex Name/Telefon/E-Mail

---

## 5. Matching-Kaskade (alle Stufen)

Läuft **nach** Parse-Stufe, **vor** Persist.

| Stufe | Aktion | Bei Treffer |
|-------|--------|-------------|
| **1** | Absender-E-Mail **exakt** gegen `org_inbound_emails` ∪ `kunden.email` ∪ historische `melder_email` (HV-Kontakte, scope Org) | `auftraggeber_kunde_id` |
| **2** | Absender-**Domain** gegen `org_inbound_domains[]` (pro `kunden`) | `auftraggeber_kunde_id` + Badge `kontakt_neu` |
| **3** | Freitext-Scan Body nach `kunden_objekte.strasse` + `hausnummer` (fuzzy, eindeutig) | `kunde_objekt_id` + `auftraggeber_kunde_id` (vom Objekt) + Badge `zuordnung_pruefen` |
| **4** | Kein Treffer | kein `auftraggeber_kunde_id` + Badge `hv_zuordnen`; Absender prominent: `funnel_daten.inbound_absender` |

**Nach manueller HV-Zuordnung im CRM:** Aktion „Absender dieser Organisation merken“ → schreibt exakte E-Mail in `org_inbound_emails` (oder Domain in `org_inbound_domains`) → nächste Mail Stufe 1/2.

### Schema (neu, Spec)

```sql
-- an kunden anbinden
alter table public.kunden
  add column if not exists org_inbound_domains text[] not null default '{}',
  add column if not exists org_inbound_emails text[] not null default '{}';
```

Index-GIN optional für Domain-Lookup. Bis Migration: Fallback nur `kunden.email`.

### Objekt-Fuzzy (Stufe 3)

- Normalisiere: `straße`→`strasse`, lowercase
- Baue aus Stamm: `"{strasse} {hausnummer}"`, `"{strasse} {hausnummer}, {plz} {ort}"`
- Treffer nur wenn **genau ein** Objekt im Tenant-Kontext (oder global mit eindeutiger Org)

---

## 6. Threading (Priorität 1 nach Automail-Check)

```typescript
async function resolveInboundThread(
  inReplyTo: string | null,
  references: string[] | null
): Promise<{ leadId: string } | null>
```

- Lookup `email_log.message_id` oder `leads.funnel_daten.inbound_message_ids[]`
- **Treffer:** Anhänge → `funnel_daten.fotos`; Text → `lead_timeline` / Notiz / `kontakt_nachricht` append
- Entferne Badge `ohne_foto` wenn Foto nachgereicht
- **Kein neuer Lead** — häufigste Duplikat-Quelle vermeiden
- Auto-Reply optional kürzer („Fotos erhalten, danke“)

Speichere bei neuem Lead: `funnel_daten.inbound_message_id` für künftige Threads.

---

## 7. Automail-Erkennung

| Signal | Aktion |
|--------|--------|
| `From` enthält `noreply`, `no-reply`, `mailer-daemon` | Lead anlegen, **kein** Auto-Reply |
| Header `Auto-Submitted`, `X-Auto-Response-Suppress` | dito |
| Body: Abwesenheit (`Abwesenheit`, `out of office`, `automatische Antwort`) | dito |
| | Badge: `automail_pruefen` |

---

## 8. Kern-Typen

```typescript
type InboundStufe = 'A' | 'B' | 'C'

type InboundFlag =
  | 'ohne_foto'
  | 'kontakt_fehlt'
  | 'kategorie_offen'
  | 'bereich_offen'
  | 'teilweise_erfasst'      // Stufe B
  | 'unstrukturiert'         // Stufe C
  | 'havarie_verdacht'       // B/C NOTFALL-Scan
  | 'kontakt_neu'            // Kaskade 2
  | 'zuordnung_pruefen'      // Kaskade 3
  | 'hv_zuordnen'            // Kaskade 4
  | 'automail_pruefen'

type InboundParseResult = {
  stufe: InboundStufe
  fields: Partial<Record<InboundFieldKey, string>>
  auftrag: ParsedAuftrag
  kontakt: ParsedKontakt
  subject: string
  bodyClean: string
  anhaenge: string[]
  flags: InboundFlag[]
  zuordnung: {
    auftraggeber_kunde_id: string | null
    kunde_objekt_id: string | null
    absender_email: string
  }
  threadMerge?: { leadId: string }
  skipAutoReply: boolean
}
```

---

## 9. Persistenz (vereinheitlicht)

| Feld | Stufe A | Stufe B | Stufe C |
|------|---------|---------|---------|
| `notizen` | strukturiert | Felder + Rest-Body | `mail_betreff\n\n{body}` |
| `kostentraeger` | `unklar` | `unklar` | `unklar` |
| `kanal` | `hv_mail` | `hv_mail` | `hv_mail` |
| `erfassung_von` | `organisation` | `organisation` | `organisation` |
| `funnel_daten.inbound_stufe` | `A` | `B` | `C` |
| `funnel_daten.inbound_absender` | immer | immer | **prominent** |
| `funnel_daten.mail_betreff` | optional | optional | **ja** |

Direkt-Auftrag (`bestellabsicht=direkt`) nur wenn Stufe A/B das Feld `auftrag` erkannt hat.

---

## 10. Auto-Reply (alle Stufen, außer Automail / Thread-Merge)

**Standard:**

> Ihre Meldung ist bei uns eingegangen (Vorgang {REF}).  
> Bitte senden Sie uns 1–2 Fotos vom Schaden als Antwort auf diese Mail.

**Stufe C zusätzlich:**

> Für eine schnellere Bearbeitung können Sie unsere Vorlage nutzen: [Link zur mail-vorlage-spec]

**Kontakt fehlt** (Stufe A/B): Zusatzzeile Telefonnummer-Bitte.

Header: `In-Reply-To` = eingehende Message-ID.

---

## 11. Validierung — kein Reject in Produktion

| Situation | Verhalten |
|-----------|-----------|
| Objekt unbekannt | Lead mit `hv_zuordnen` / manuell |
| Beschreibung kurz (C) | trotzdem anlegen |
| Keine Fotos | Badge `ohne_foto` + Reply |
| Thread bekannt | Merge, kein neuer Lead |

---

## 12. Fixtures

Siehe [fixtures/README.md](./fixtures/README.md).

| Fixture | Stufe | Fokus |
|---------|-------|-------|
| `standard-mit-foto` | A | Volle Vorlage |
| `direkt-bis-500` | A | Direktauftrag |
| `notfall-ohne-foto` | A | NOTFALL + Flags |
| `prosa-ohne-struktur` | C | Freitext |
| `thread-antwort-foto` | — | Merge, kein neuer Lead |
| `abwesenheitsnotiz` | C | Automail |
| `signatur-muell` | C | Body-Strip |
| `adresse-im-fliesstext` | C | Kaskade 3 |

---

## 13. Test-Matrix (erweitert)

| Fixture | Stufe | `inbound_flags` | Auto-Reply | Neuer Lead? |
|---------|-------|-----------------|------------|-------------|
| standard-mit-foto | A | `[]` | ja | ja |
| direkt-bis-500 | A | `ohne_foto` | ja | ja |
| notfall-ohne-foto | A | `ohne_foto`, `kontakt_fehlt` | ja | ja |
| prosa-ohne-struktur | C | `unstrukturiert`, `hv_zuordnen` | ja | ja |
| thread-antwort-foto | — | — | kurz | **nein** |
| abwesenheitsnotiz | C | `automail_pruefen` | **nein** | ja |
| signatur-muell | C | `unstrukturiert` | ja | ja |
| adresse-im-fliesstext | C | `zuordnung_pruefen` | ja | ja |

# Inbound-Mail Fixtures

Parser-Tests und manuelle Abnahme.

| Datei | Inhalt |
|-------|--------|
| `*.mail.txt` | Rohtext (+ ggf. Metadaten-Kommentar `<!-- meta: ... -->`) |
| `*.expected.json` | Erwartetes Ergebnis nach Pipeline §0 |

**Stubs:** Org „Musterverwaltung“ — `org_inbound_domains: ["musterverwaltung.de"]`, Objekt `GH12 Musterstraße` / `Musterstraße 12, 80331 München`, `melde_slug=gh12-muster`.

---

## Vorlagen-Stufe A

| Fixture | Beschreibung |
|---------|--------------|
| [standard-mit-foto](./standard-mit-foto.mail.txt) | ≥3 Pflichtfelder, Anhang |
| [direkt-bis-500](./direkt-bis-500.mail.txt) | `Auftrag: Direkt …` |
| [notfall-ohne-foto](./notfall-ohne-foto.mail.txt) | `Auftrag: NOTFALL`, kein Anhang |

## Kaskade / Stufe B–C

| Fixture | Beschreibung |
|---------|--------------|
| [prosa-ohne-struktur](./prosa-ohne-struktur.mail.txt) | Stufe C, keine Labels |
| [thread-antwort-foto](./thread-antwort-foto.mail.txt) | In-Reply-To → bestehender Lead |
| [abwesenheitsnotiz](./abwesenheitsnotiz.mail.txt) | Automail, kein Reply |
| [signatur-muell](./signatur-muell.mail.txt) | Stufe C + Signatur wird gekappt |
| [adresse-im-fliesstext](./adresse-im-fliesstext.mail.txt) | Stufe C, Objekt nur im Fließtext |

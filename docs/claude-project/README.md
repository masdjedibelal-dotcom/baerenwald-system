# Claude-Projekt — Bärenwald Wissenspack

**Zweck:** Diese Dateien in ein [Claude Project](https://claude.ai) hochladen, damit Claude das gesamte Produkt versteht — Website, Portale und CRM.

**Zielgruppe der Inhalte:** Belal und Claude (nicht-technisch erklärt, aber vollständig).

**Repos:** `baerenwald` (Website + Portale) und `baerenwald-system` (CRM + Token-Links).

---

## So richtest du das Claude-Projekt ein

1. Auf [claude.ai](https://claude.ai) → **Projects** → neues Projekt, z. B. **„Bärenwald Gesamtprodukt“**.
2. Unter **Project instructions** den kompletten Text aus `00-CUSTOM-INSTRUCTIONS.md` einfügen.
3. Unter **Project knowledge** alle Dateien `01`–`08` hochladen (diese README optional).
4. Bei großen Produktänderungen: betroffene Dateien aktualisieren und neu hochladen.

---

## Datei-Übersicht

| Datei | Inhalt |
|-------|--------|
| `00-CUSTOM-INSTRUCTIONS.md` | Regeln für Claude (in Project Instructions, nicht nur als Knowledge) |
| `01-UEBERBLICK.md` | Was Bärenwald ist, Landkarte der Systeme, wer nutzt was |
| `02-GLOSSAR.md` | Alle wichtigen Begriffe |
| `03-WEBSITE.md` | Marketing-Seiten, SEO, Rechner, BärenwaldGPT |
| `04-PORTALE.md` | Melden, MeinBärenwald, Partner-Portal |
| `05-CRM.md` | Mitarbeiter-CRM: Navigation, Screens, Aktionen |
| `06-PROZESSE.md` | End-to-End-Abläufe über alle Systeme |
| `07-DESIGN.md` | Design-Sprache Website + CRM |
| `08-FUNKTIONEN-CHECKLISTE.md` | Kompakte Inventarliste „was existiert“ |

---

## Pflege

- Owner: Belal
- Bei neuem Feature: zuerst `08-FUNKTIONEN-CHECKLISTE.md` und das passende Themen-Dokument ergänzen
- Secrets, Passwörter, API-Keys **niemals** in diese Dateien schreiben

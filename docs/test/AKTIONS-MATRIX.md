# AKTIONS-MATRIX — Bearbeiten / Löschen / Entfernen auf Cards & Zeilen

**Status:** Referenz nach AUFTRAG B (2026-08-26) · dauerhaft pflegen  
**Maßstab:** `docs/ui-audit/PATTERN-LEITFADEN.md` — ⋯-Menü, destruktiv nur mit Confirm (Verb+Objekt), gleiche Entität = gleiches Muster, nicht verfügbar = **deaktiviert mit Grund** (nicht verstecken).  
**Repos:** `baerenwald-system` (CRM) + `baerenwald` (Portale)  
**Report:** `docs/test/TESTREPORT-ETAPPE-8.md` · Umbau: AUFTRAG B (B1–B7)

### Legende

| Kürzel | Bedeutung |
|---|---|
| ⋯ | `MockEntityRowMenu` / `ActionSheet` / `PortalActionMenu` / Detail-`ActionsMenu` |
| Swipe | `SwipeRow` (primär mobil) |
| Inline | Papierkorb/Pencil direkt sichtbar |
| Bulk | Auswahl → Bulk-Leiste |
| Sheet | Aktion nur im EditorSheet/Footer |
| Confirm | `MockModal` via `confirmDelete` / `PortalSheetConfirm` |
| — | Aktion fehlt |

**Deaktiviert-mit-Grund:** Menü-Items mit `disabled: true` + `hint` (sichtbar, nicht klickbar). Primitives: `ActionsMenuItem`, `EntityMenuItem`, `MockPopoverItem`.

---

## CRM

| Card/Zeile (Entität) | Vorkommen | Bearbeiten | Löschen/Entfernen | Duplizieren | Weitere | Muster | Confirm destruktiv? | Deaktiviert-mit-Grund oder versteckt? |
|---|---|---|---|---|---|---|---|---|
| Vorgangszeile | `/vorgaenge`; eingebettet Kunde/Objekt | ⋯ Öffnen/Bearbeiten; Swipe mobil | ⋯ Löschen; Bulk; Swipe mobil | ⋯ Duplizieren; Swipe | Export Bulk | **⋯ + Swipe + Bulk** | Bulk + `runDelete*`: **confirmDelete** ✅ | Kopieren: Toast wenn Typ ungeeignet |
| Kunden-Zeile | `/kunden` | ⋯ Öffnen/Bearbeiten; Swipe | ⋯; Bulk; Detail ⋯ | ⋯ Duplizieren | — | **⋯ + Swipe + Bulk** | Bulk MockModal; `confirmKundeDelete` ✅ | — |
| Handwerker-Zeile | `/handwerker` | ⋯ Öffnen/Bearbeiten; Swipe | ⋯; Bulk | ⋯ Duplizieren | — | **⋯ + Swipe + Bulk** | confirmDelete ✅ | — |
| Rechnung Detail-Header | `/rechnungen/[id]` | Secondary CTA Bearbeiten | ⋯ Löschen (nur Entwurf) | — | ⋯ PDF · Storno/Korrektur · Zahlungserinnerung | **Detail-⋯** (`overflowMenuItems`) | Löschen: confirmDelete ✅ | Statusabhängig disabled+hint („Gesendet — …“) |
| Positions-Zeile PosBoard | Angebot-/RE-Wizard, Direktauftrag | ⋯ Bearbeiten | ⋯ Löschen | ⋯ Kopieren | — | **⋯** (+ mobil Swipe) | MockModal „Position löschen?“ ✅ | Menü nur wenn `editable` |
| Mangel-Eintrag | Abnahme-Checkliste | ⋯ Bearbeiten | ⋯ Löschen | — | Status-Buttons | **⋯** | confirmDelete ✅ | nur Edit-Modus |
| Dokument Akte | Kunde / Anfrage / Auftrag Akte | — | ⋯ Löschen (+ Öffnen/Bearbeiten) | — | Upload | **⋯** | confirmDelete ✅ | `disabled={busy}` · B3: AuftragDokumenteTab Inline-Trash entfernt |
| Notiz Akte | Kunde / Anfrage / Termin | — | ⋯ Löschen | — | Speichern Compose | **⋯** | confirmDelete (Vorschau 1. Zeile) ✅ | `disabled={pending}` |
| Termin | `/kalender` | Chip → Sheet | Sheet-Footer Löschen | — | Neuer Termin | **Sheet** | `confirm()` (noch) | Löschen nur bestehender Termin |
| To-do | Todos-Panel / Kalender-Tab | Zeile → Sheet | Sheet-Footer | — | — | **Sheet** | `confirm()` | nur Edit |
| Objekt-Card CRM | Kunde-Tab Objekte | Bulk bei 1er-Auswahl; Klick → Akte | Bulk | — | — | Bulk/Klick | Bulk MockModal ✅ | Bearbeiten nur 1 ausgewählt |
| Einheit/Bewohner | Objektakte Einheiten | ⋯ / Sheet | ⋯ Löschen | — | Privatkunde verknüpfen | **⋯** + Sheet | confirm / Bulk MockModal ✅ | kontextabhängig |
| Compliance-Dokument | HW-Detail / Auftrag | Sheet | Sheet-Footer | — | Ablehnen | Sheet | confirm ✅ | `disabled={busy}` |
| Preislisten-Eintrag | Einstellungen Preise | ⋯ Bearbeiten / Zeilen-Klick | ⋯ Löschen → softDelete | — | CSV Import, +Leistung | **⋯** | confirmDelete ✅ | Soft-Delete (`aktiv: false`); Fehler → Toast |
| Vorlage (Angebot) | Einstellungen Vorlagen | ⋯ Öffnen / Link | ⋯ Löschen | — | — | **⋯** | confirmDelete ✅ | API-Fehler → Toast |
| Teammitglied CRM | Einstellungen Team | Klick → Sheet | — (Deaktivieren) | — | Einladen | Sheet | — | Anzeige deaktiviert |
| Zahlplan-Rate | Zahlung / Abschlagsplan | Drawer / Inline | Trash; frozen: **disabled Trash** | — | Erstellen | Inline + disabled-mit-Grund | Entfernen ohne Confirm (nicht frozen) | Frozen: sichtbar, `title`/hint „Gebunden an gesendete Rechnung [Nr]“ ✅ |
| Zahlplan Dead-Ref | Rate nach RE-Hard-Delete | — | — | — | Badge | Hint am Status | — | Zusatzhinweis „vorherige Rechnung gelöscht“ |
| Phase-Chip Angebot | VorgangPhasenVerlauf | — | — | — | Navigation | Chip disabled | — | tot: „nicht mehr vorhanden“; nie da: „noch nicht erstellt“ |
| Eingangsrechnung-Zeile | HW-Eingangsrechnungen | Klick Modal | — | — | „Als überwiesen“ | Inline CTA | — | nur Status `eingereicht` |
| Benachrichtigung Glocke | TopBar | Klick öffnen | — | — | Alle gelesen | kein ⋯ | — | — |

---

## Portale (`baerenwald`)

| Card/Zeile (Entität) | Vorkommen | Bearbeiten | Löschen/Entfernen | Duplizieren | Weitere | Muster | Confirm destruktiv? | Deaktiviert-mit-Grund oder versteckt? |
|---|---|---|---|---|---|---|---|---|
| HV-Vorgangszeile | Portal Org Vorgänge/Eingang | Klick öffnen | Bulk-Löschen **nicht freigeschaltet** | — | Inline Freigabe/Ablehnen Eingang | kein ⋯; Inline-CTAs | — | `HV_BULK_DELETE_DISABLED_HINT`; HM: Actions null |
| Objekt-Card HV | Portal Objekte | ⋯ Bearbeiten | ⋯ Löschen | ⋯ Kopieren | Aushang PDF, Link, QR | **⋯ PortalActionMenu** ✅ | PortalSheetConfirm ✅ | Aushang/Link/QR: disabled + title-Hint |
| Einheit/Mieter HV | Objekt-Detail Einheiten | ⋯ | ⋯ + SheetConfirm | — | Portal-Link | **⋯** ✅ | PortalSheetConfirm ✅ | HM Link: `disabled: !canEinladen` |
| Teammitglied HV | — | — | — | — | — | Feature aus | — | deaktiviert |
| Partner-Vorgangszeile | Partner Listen | Klick öffnen | — | — | — | kein ⋯ | — | — |
| Partner-Dokument/Rechnung | Stamm/Compliance/Auftrag | — | Inline Trash wenn `canDelete` | — | Upload | Inline Trash | PortalSheetConfirm ✅ | Trash nur wenn erlaubt |
| Bautagebuch Partner | Partner Auftrag Doku | Flow Bearbeiten | — | — | Erfassen | Flow | — | `readOnly` wenn erledigt |
| Planer-Eintrag | Partner Planer | Klick/Navigation | — | — | — | kein ⋯ | — | — |
| Mieter-Meldung Liste | Portal Privat/Mieter | Öffnen | — | — | Filter | kein ⋯ | — | — |

---

## Soll vs. Ist — Kurz (nach AUFTRAG B)

| Regel | Fazit |
|---|---|
| ⋯ an gleicher Position | CRM-Listen (Vorgänge/Kunden/HW), Detail-Rechnung, Akte Notiz/Dokument, Mangel, Preislisten/Vorlagen: **⋯** |
| Destruktiv nie ohne Confirm | Kernpfade über `confirmDelete` / MockModal; Termin/To-do Sheet noch `confirm()` |
| Deaktiviert-mit-Grund | Rechnung-⋯, Zahlplan-Frozen-Trash; Phase-Chip / Dead-Ref-Hints |
| Natürlicher Ort | Preislisten/Vorlagen: Löschen am Zeilen-⋯ |

---

## Pflege

Bei neuen Features: Zeile ergänzen oder Muster anpassen. Abweichungen als Fund in Testreports mit Verweis auf diese Matrix.

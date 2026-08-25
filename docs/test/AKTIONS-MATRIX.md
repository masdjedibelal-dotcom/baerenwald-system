# AKTIONS-MATRIX — Bearbeiten / Löschen / Entfernen auf Cards & Zeilen

**Status:** Referenz ab Etappe 8 (2026-08-25) · dauerhaft pflegen  
**Maßstab:** `docs/ui-audit/PATTERN-LEITFADEN.md` — ⋯-Menü, destruktiv nur mit Confirm (Verb+Objekt), gleiche Entität = gleiches Muster, nicht verfügbar = **deaktiviert mit Grund** (nicht verstecken).  
**Repos:** `baerenwald-system` (CRM) + `baerenwald` (Portale)  
**Report:** `docs/test/TESTREPORT-ETAPPE-8.md`

### Legende

| Kürzel | Bedeutung |
|---|---|
| ⋯ | `MockEntityRowMenu` / `ActionSheet` / `PortalActionMenu` / Detail-`ActionsMenu` |
| Swipe | `SwipeRow` (primär mobil) |
| Inline | Papierkorb/Pencil direkt sichtbar |
| Bulk | Auswahl → Bulk-Leiste |
| Sheet | Aktion nur im EditorSheet/Footer |
| Confirm | `MockModal` / `PortalSheetConfirm` / `window.confirm` |
| — | Aktion fehlt |

---

## CRM

| Card/Zeile (Entität) | Vorkommen | Bearbeiten | Löschen/Entfernen | Duplizieren | Weitere | Muster | Confirm destruktiv? | Deaktiviert-mit-Grund oder versteckt? |
|---|---|---|---|---|---|---|---|---|
| Vorgangszeile | `/vorgaenge`; eingebettet Kunde/Objekt | Zeilen-Klick / Swipe | Bulk-Leiste; Swipe mobil | Swipe / Copy-Actions | Export Bulk | **Desktop: Bulk, kein ⋯**; **Mobil: Swipe** | Bulk: **MockModal** ✅; Swipe/`runDeleteVorgang`: **kein Confirm** ❌ | Kopieren: Toast wenn Typ ungeeignet; kein disabled-Grund im Menü |
| Positions-Zeile PosBoard | Angebot-/RE-Wizard, Direktauftrag | ⋯ Bearbeiten | ⋯ Löschen | ⋯ Kopieren | — | **⋯** (+ mobil Swipe) | **Nein** — direkt `remove` ❌ | Menü nur wenn `editable` (sonst versteckt) |
| Positions-Zeile Wizard | = PosBoard (`AngebotWizard`/`RechnungWizard`) | = PosBoard | = PosBoard | = PosBoard | — | = PosBoard | = PosBoard | = PosBoard |
| Bautagebuch-Eintrag | Auftrag-Detail Bautagebuch | Klick → Sheet | Bericht-Card: Sheet/Confirm; Feed oft — | — | +Hinzufügen Header | **kein ⋯**; Klick/Sheet | Bericht: `confirm()`; Feed: oft kein Löschen | Header weg wenn `disabled` |
| Mangel-Eintrag | Abnahme-Checkliste / Mängel-Flow | Inline Pencil | Inline Trash | — | Status-Buttons | **Inline Icons** ❌ vs. ⋯-Soll | **Kein** Confirm ❌ | Trash nur Edit-Modus (versteckt sonst) |
| Dokument Akte | Kunde / Anfrage / Auftrag Akte | — (Download/Öffnen) | **Inline Trash** | — | Upload | **Inline Trash** ❌ | `confirm()` ✅ | `disabled={busy}` |
| Notiz Akte | Kunde / Anfrage Akte | — | **Inline Löschen** | — | Speichern Compose | **Inline** ❌ | `window.confirm` („Notiz löschen?“) ✅ | `disabled={pending}` |
| Termin | `/kalender` | Chip → Sheet | Sheet-Footer Löschen | — | Neuer Termin | **Sheet**, kein Listen-⋯ | `confirm()` ✅ | Löschen nur bestehender Termin |
| To-do | Todos-Panel / Kalender-Tab | Zeile → Sheet | Sheet-Footer | — | — | **Sheet** | `confirm()` ✅ | nur Edit, nicht Neu |
| Kunde-Zeile | `/kunden` | Swipe / Zeilen-Klick | Bulk; Detail ⋯ | Swipe / `duplicateKunde` | — | Liste: **Swipe+Bulk**, Desktop ohne ⋯; Detail: **⋯** | Bulk MockModal; `runDeleteKunde` confirm ✅ | Desktop-Liste ohne Zeilen-⋯ |
| Objekt-Card CRM | Kunde-Tab Objekte | Bulk bei 1er-Auswahl; Klick → Akte | Bulk | — | — | **kein ⋯**; Bulk/Klick | Bulk MockModal ✅ | Bearbeiten nur 1 ausgewählt |
| Einheit/Bewohner | Objektakte Einheiten | ⋯ / Sheet Bearbeiten | ⋯ Löschen / Sheet Entfernen | — | Privatkunde verknüpfen | **⋯** + Sheet | Person `confirm()`; Bulk MockModal ✅ | Items kontextabhängig |
| Handwerker-Zeile | `/handwerker` | wie Kunde | Bulk + confirm | Swipe Duplikat | — | **Swipe+Bulk**, Desktop ohne ⋯ | Bulk MockModal; delete confirm ✅ | Desktop ohne ⋯ |
| Compliance-Dokument | HW-Detail / Auftrag Compliance | Sheet | Sheet-Footer / Inline Trash | — | Ablehnen | Sheet / Inline | `confirm()` ✅ | `disabled={busy}` |
| Preislisten-Eintrag | Einstellungen Preise | Zeilen-Klick → Sheet | **—** | — | CSV Import, +Leistung | **kein ⋯/Löschen** | — | +Leistung disabled ohne Gewerk |
| Vorlage (Angebot) | Einstellungen Vorlagen | Link öffnen | **—** in Liste | — | — | nur Navigation | — | — |
| Teammitglied CRM | Einstellungen Team | Klick → Sheet | **—** (Deaktivieren statt Delete) | — | Einladen | Sheet; Label „deaktiviert“ | — | Anzeige deaktiviert, kein Delete-⋯ |
| Zahlplan-Rate | Zahlung / Abschlagsplan | Drawer / Inline | Inline Trash | — | Erstellen | Inline / Drawer | **Kein** Confirm ❌ | Frozen: Trash **versteckt** + Badge „fest“ (title) — nicht disabled-im-⋯ |
| Eingangsrechnung-Zeile | HW-Eingangsrechnungen | Klick Modal | **—** | — | „Als überwiesen“ | Inline CTA | — | Button nur Status `eingereicht` (sonst versteckt) |
| Benachrichtigung Glocke | TopBar | Klick öffnen | **—** | — | Alle gelesen; Rechtsklick Detail | **kein ⋯** | — | — |

---

## Portale (`baerenwald`)

| Card/Zeile (Entität) | Vorkommen | Bearbeiten | Löschen/Entfernen | Duplizieren | Weitere | Muster | Confirm destruktiv? | Deaktiviert-mit-Grund oder versteckt? |
|---|---|---|---|---|---|---|---|---|
| HV-Vorgangszeile | Portal Org Vorgänge/Eingang | Klick öffnen | Bulk-Löschen **nicht freigeschaltet** | — | Inline Freigabe/Ablehnen Eingang | **kein ⋯**; Inline-CTAs Eingang | — | `HV_BULK_DELETE_DISABLED_HINT`; HM: Actions null (**versteckt**) |
| Objekt-Card HV | Portal Objekte | ⋯ Bearbeiten | ⋯ Löschen | ⋯ Kopieren | Aushang PDF, Link, QR | **⋯ PortalActionMenu** ✅ | **PortalSheetConfirm** ✅ | Aushang/Link/QR: `disabled` + **title**-Hint (Legal) ✅ näher am Soll |
| Einheit/Mieter HV | Objekt-Detail Einheiten | ⋯ | ⋯ + SheetConfirm | — | Portal-Link | **⋯** ✅ | PortalSheetConfirm ✅ | HM Link: `disabled: !canEinladen` |
| Teammitglied HV | — | — | — | — | — | **Feature aus** (Redirect) | — | deaktiviert („ein Zugang pro HV“) |
| Partner-Vorgangszeile | Partner Listen | Klick öffnen | — | — | — | **kein ⋯** | — | — |
| Partner-Dokument/Rechnung | Stamm/Compliance/Auftrag | — | Inline Trash wenn `canDelete` | — | Upload | **Inline Trash** | PortalSheetConfirm ✅ | Trash sichtbar nur wenn erlaubt (**versteckt** sonst) |
| Bautagebuch Partner | Partner Auftrag Doku | Flow Bearbeiten | — Listen-Löschen | — | Erfassen | Flow, kein ⋯ | — | `readOnly` wenn erledigt |
| Planer-Eintrag | Partner Planer | Klick/Navigation | — | — | — | **kein ⋯** | — | — |
| Mieter-Meldung Liste | Portal Privat/Mieter | Öffnen | — | — | Filter | **kein ⋯** | — | — |

---

## Soll vs. Ist — Kurz

| Regel | Ist-Fazit |
|---|---|
| ⋯ an gleicher Position | Nur teilweise (PosBoard, HV-Objekt, CRM-Einheit, Detail-Header). Listen oft Swipe/Bulk **statt** Desktop-⋯ |
| Destruktiv nie direkt ohne Confirm | Verletzt: PosBoard-Löschen, Mangel-Trash, Zahlplan-Trash, **Vorgang-Swipe** |
| Gleiche Entität = gleiches Muster | Position: ⋯ im PosBoard; Mangel: Inline; Dokument/Notiz: Inline vs. Vorgang: Bulk |
| Deaktiviert-mit-Grund | Selten; oft **versteckt** oder nur `title`. HV Legal-Hints besser. Kein CRM-`disabledReason`-Feld |
| Natürlicher Ort | Preislisten/Vorlagen: Löschen fehlt am natürlichen Ort |

---

## Pflege

Bei neuen Features: Zeile ergänzen oder Muster anpassen. Abweichungen als Fund in Testreports mit Verweis auf diese Matrix.

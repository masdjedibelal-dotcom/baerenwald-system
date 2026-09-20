# Copy-Regeln (CRM · Portal · Website)

**Quellen (eine je App):**
| App | Pfad |
|-----|------|
| CRM | `baerenwald-system/src/lib/copy` |
| Portal | `baerenwald/src/lib/portal-copy` |
| Website | `baerenwald/src/lib/web-copy` |

Bereiche je Quelle: **Aktionen** (Verben), **Status** (Anzeige aus `status-vokabular` / `COPY_STATUS`), **Rollen** (E5: immer „Partner“ in der UI), **Leer**, **Fehler**, **Erfolg**, **Bestätigungen**.

Verwandt: [SURFACE-NUTZER-COPY.md](./SURFACE-NUTZER-COPY.md) (Wort-Budgets Surfaces).

---

## 1. Anrede (Stimme)

| Oberfläche | Anrede | Begründung |
|------------|--------|------------|
| **Portal** (Kunde, HV, Partner, HM, Eigentümer, Mieter) | immer **Sie** | Formell, einheitlich; keine Du-Ausnahme mehr für Partner |
| **CRM intern** (Staff-UI, Toasts, Empty-Hints) | **du** (neutral wo möglich) | Team-Tool; kurze Toasts ohne „dein/Sie“ |
| **CRM → Kunde** (Mails, PDFs, Kunden-Portal-Texte im CRM) | **Sie** | Kundenbeziehung |
| **Website / Funnel / Ratgeber** | **du** erlaubt | Marketing-Ton; Copy nur über `web-copy` |

**Vorschlag CRM (festgeschrieben bis Belal widerspricht):** Staff = **du**; Formulare/Toasts möglichst **neutral** („Gespeichert“, nicht „Dein Eintrag wurde gespeichert“). Code: `CRM_COPY_VOICE` in `src/lib/copy/voice.ts`.

---

## 2. Verben (kanonisch)

Nur diese Aktionswörter in Buttons/Menüs (Erweiterung nur in der Copy-Quelle):

| Key | Label |
|-----|--------|
| speichern | Speichern |
| abbrechen | Abbrechen |
| loeschen | Löschen |
| senden | Senden |
| annehmen | Annehmen |
| ablehnen | Ablehnen |

Weitere erlaubte Verben nur im Copy-Katalog (`COPY_BUTTON` / Portal-`ACTIONS`), keine freien Synonyme („Übernehmen“ nur wo Katalog es vorsieht).

---

## 3. Budgets

| Slot | Limit |
|------|--------|
| Toast | ≤ **8 Wörter** |
| Titel (Empty, Dialog, Sheet) | ≤ **4 Wörter** |
| Dirty-Confirm-Frage | ≤ **3 Wörter** (Soll: „Änderungen verwerfen?“) |

---

## 4. Verbote

- **Keine DB-Werte** in der UI (`akzeptiert`, `handwerker_akzeptiert`, snake_case) — Label aus Status-Vokabular / `COPY_STATUS`.
- **Keine Anglizismen** in Kunden-/Portal-Oberflächen: kein „Lead“, „Deal“, „Dashboard“ als Nutzerwort (intern/Code ok). CRM-Vertrieb: „Anfrage“, nicht „Lead“.
- **Keine** freien Leertexte („Keine …“) außerhalb Copy + Empty-Komponente.
- **Keine** Toast-Stringliterale außerhalb Copy (`toast_ohne_copy=0`).
- Portal: **kein** informelles Du (`du_im_portal=0`).

---

## 5. Komponenten-Pflicht

| Zustand | CRM | Portal |
|---------|-----|--------|
| Leer | `MockEmpty` + `EMPTY.*` / `COPY` + optional `action` (erster Schritt) | `PortalInboxEmpty` / `PortalEmptyState` + `portal-copy` EMPTY |
| Fehler-Toast | `toast.error(userMessage(…))` oder `TOAST.*` / `COPY_ERROR.*` | `portalToastError(userMessage(…))` bzw. Katalog |
| Erfolg-Toast | `TOAST.*` / `COPY` | Portal-Toast-Presets / `portal-copy` TOAST |
| Dirty | `CONFIRM.dirty` + `ConfirmPopup` | gleiche Wörter aus `portal-copy` CONFIRM |
| Löschen | `CONFIRM.delete` | analog |
| Offline / Sitzung / Rechte | `COPY_ERROR.offline` · `sessionExpired` · `forbidden` | analog + `PortalOfflineState` / `PortalForbiddenState` |

---

## 6. Messung

```bash
# CRM
node scripts/audit-status.mjs   # freie_leertexte=0 · toast_ohne_copy=0

# Portal (+ Website-Repo)
node scripts/audit-status.mjs   # freie_leertexte=0 · toast_ohne_copy=0 · du_im_portal=0
```

Erledigt nur wenn die drei Zähler **0** melden.

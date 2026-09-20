# P2-7: Mail / Notify — Inventur (Sync vs. app-spezifisch)

**Entscheidung für Block 5:** Mail- und Notify-Module sind **app-spezifisch** — **nicht** Teil von `scripts/sync-shared-domain.mjs`.

| Bereich | CRM | Portal | Sync? |
|---------|-----|--------|-------|
| Transaktions-Mails (Angebot, Rechnung, Partner) | `src/lib/mail/*`, Actions | Partner-/Org-Notify-APIs | **Nein** — Templates, Absender, Links app-eigen |
| Partner-Notify (CRM→Portal Bridge) | `src/lib/portal/notify*` / interne Calls | `src/app/api/internal/partner-notify*` | **Nein** — HTTP-Vertrag, nicht Domänen-Lib |
| Lead-Status Runtime-Sync | `sync-portal-lead-status.ts` | Empfänger-APIs | **Nein** — Runtime, kein Byte-Sync |
| Domänen-Labels / Resolver / Geld-Datum | `status-*`, `geld-datum` | `shared-domain/*` | **Ja** (P2-4) |

Wenn später gemeinsame Mail-Texte nötig sind: eigenes Ticket + explizite Dateiliste in `shared-domain-files.json` — nicht ad-hoc kopieren.

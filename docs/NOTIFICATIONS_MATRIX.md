# Benachrichtigungen — wer bekommt was?

| Aktion | Mieter-Mail | HV-Glocke | Partner-Glocke | CRM |
|--------|-------------|-----------|----------------|-----|
| Mieter meldet (Melde-Link) | Bestätigung | Neue Meldung | — | Lead neu |
| HV: Angebot einfordern | — | Bestätigung | — | Notify CRM |
| CRM: Angebot an Kunde | — | — | — | Timeline |
| CRM: HW-Anfrage | — | — | Ja (+ Mail) | — |
| HV: Angebot freigeben | Status (Phase) | — | Sichtbarkeit | Notify CRM |
| CRM: Auftrag aus Angebot | Bestätigung Kunde | Phase „beauftragt“ | Zuweisung | Timeline |
| Partner: Bautagebuch | — | **Ja (neu)** | — | Intern-Mail |
| CRM/Partner: Auftrag abgeschlossen | „Erledigt“ | Erledigt-Tab | — | Timeline |

Sync CRM → Portal: `POST /api/internal/sync-lead-phase` (Bearer `PARTNER_INTERNAL_API_SECRET`).

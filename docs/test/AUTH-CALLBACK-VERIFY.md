# Auth-Callback-Verify (C3) — Staging 2026-08-26

**CRM:** `https://staging--baerenwald-backend.netlify.app`  
**Supabase:** `soqownnkxmtfgvsbrgsl`

## Ergebnis

| Flow | Status | Evidenz |
|------|--------|---------|
| Login (Passwort) | ✅ | Admin → Dashboard |
| Logout | ✅ | zurück `/login` |
| Callback ohne `code` | ✅ | Redirect `/login?error=auth_callback` |
| Callback Splash (mit `code`) | ✅ kurz sichtbar | Text „Anmeldung wird abgeschlossen…“ dann Fehler-Redirect (ungültiger Code) |
| Magic-Link → Staging-Callback | 🚫 Blocker | `generateLink` setzt `redirect_to=http://localhost:3000` (Site URL) |
| Passwort-Reset-Link | 🚫 Blocker | gleiches Site-URL-Problem; Catcher-Mail in `email_log` enthält Verify-URL → localhost |
| Einladung | 🚫 Blocker | gleiches Site-URL-Problem |

## Blocker (nicht Client-Exchange)

Staging-Auth **Site URL** = `http://localhost:3000`. Erlaubte Redirects enthalten offenbar nicht  
`https://staging--baerenwald-backend.netlify.app/auth/callback…` → Supabase fällt auf Site URL zurück.

**Fix (Dashboard, Staging-Projekt):**  
Auth → URL Configuration:

1. **Site URL** → `https://staging--baerenwald-backend.netlify.app`
2. **Redirect URLs** ergänzen:
   - `https://staging--baerenwald-backend.netlify.app/auth/callback`
   - `https://staging--baerenwald-backend.netlify.app/auth/callback?**`
   - ggf. `http://localhost:3000/**` für lokale Dev behalten

Danach: Reset/Invite/Magic erneut, Link aus `email_log` (Catcher), frischer Browser → Splash → Ziel.

## Architektur

- **Splash:** Client-`page.tsx` („Anmeldung wird abgeschlossen…“).
- **Exchange:** Server Action `completeAuthCallback` (`exchangeCodeForSession` / `verifyOtp`) — **kein** clientseitiges `exchangeCodeForSession` (PKCE-Falle bei E-Mail-Links).
- Live-End-to-End Invite/Magic/Reset auf Staging-Netlify weiterhin blockiert, bis **Site URL / Redirect URLs** im Staging-Supabase stimmen (`localhost:3000` → Staging-CRM).


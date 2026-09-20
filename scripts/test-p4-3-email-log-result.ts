/**
 * P4-3: email_log-Ergebnis-Mapping (gesendet | fehler) — Bugfix-Test.
 * Rot bevor Helper/Mail-Pfad Status setzen; grün danach.
 *
 * Usage: npx tsx scripts/test-p4-3-email-log-result.ts
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function mustInclude(path: string, patterns: RegExp[], label: string) {
  const src = readFileSync(join(ROOT, path), 'utf8')
  for (const re of patterns) {
    if (!re.test(src)) {
      console.error(`FAIL ${label}: fehlt ${re} in ${path}`)
      process.exit(1)
    }
  }
  console.log(`ok ${label}`)
}

mustInclude(
  'src/lib/mail-service.ts',
  [/status:\s*'gesendet'/, /status:\s*'fehler'/, /insertEmailLogRow/, /async function logMailError/],
  'sendMail → email_log gesendet|fehler'
)

mustInclude(
  'src/lib/kommunikation/log-notify-email-result.ts',
  [/status:\s*input\.ok \? 'gesendet' : 'fehler'/, /insertEmailLogRow/, /fehlgeschlagen/],
  'logNotifyEmailResult Mapping'
)

mustInclude(
  'src/lib/partner/notify-partner-unified.ts',
  [/logNotifyEmailResult/, /ok:\s*false/, /ok:\s*true/],
  'notify-partner-unified loggt Ergebnis'
)

mustInclude(
  'src/components/kommunikation/KommunikationCard.tsx',
  [/status === 'fehler'/, /Fehlgeschlagen/],
  'CRM-E-Mail-Log zeigt Fehlgeschlagen'
)

mustInclude(
  'src/lib/errors/safe-void-notify.ts',
  [/export function safeVoidNotify/, /logDbError/, /logNotifyEmailResult/],
  'safeVoidNotify Helfer'
)

mustInclude(
  'src/lib/push/send.ts',
  [/logNotifyEmailResult/, /crm_push/],
  'sendCrmPushToStaff → email_log'
)

mustInclude(
  'scripts/void-call-allowlist.txt',
  [/closeWizardClean|patchRow|\(expr\)/],
  'UI-void Allowlist'
)

console.log('P4-3 email_log Ergebnis: alle Checks grün')

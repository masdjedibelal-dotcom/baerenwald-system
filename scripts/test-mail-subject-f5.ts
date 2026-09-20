/**
 * Smoke-Test F5 Betreff + Plain-Text.
 * node --experimental-strip-types / npx tsx scripts/test-mail-subject-f5.ts
 */
import { buildSubject, buildPartnerSubject, buildInternSubject } from '../src/lib/mail/build-subject'
import { htmlToPlainText } from '../src/lib/mail/html-to-plain-text'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

assert(
  buildSubject({ objekt: 'Malerarbeiten EG', ereignis: 'Angebot bereit', nummer: 'AG-2026-041' }) ===
    'Malerarbeiten EG – Angebot bereit · AG-2026-041',
  'kunde angebot'
)
assert(
  buildPartnerSubject({ gewerk: 'Maler', ort: '80337', ereignis: 'Neue Anfrage' }) ===
    'Maler, 80337 – Neue Anfrage',
  'partner'
)
assert(
  buildInternSubject({ objekt: 'WEG Test', ereignis: 'Freigabe freigegeben' }) ===
    'Intern · WEG Test – Freigabe freigegeben',
  'intern'
)

const plain = htmlToPlainText(
  '<p>Hallo,</p><p>Text</p><p><a href="https://example.com">Zum Portal</a></p>'
)
assert(plain.includes('Hallo'), 'plain hallo')
assert(plain.includes('Zum Portal (https://example.com)'), 'plain link')
assert(!plain.includes('<p>'), 'plain no tags')

console.log('OK test-mail-subject-f5')

import assert from 'node:assert/strict'

function formatLastSavedAt(at, now = Date.now()) {
  if (at == null) return null
  const ms = typeof at === 'number' ? at : at.getTime()
  if (!Number.isFinite(ms) || ms <= 0) return null
  const mins = Math.max(0, Math.floor((now - ms) / 60_000))
  if (mins < 1) return 'Zuletzt gespeichert gerade eben'
  if (mins === 1) return 'Zuletzt gespeichert vor 1 Min.'
  return `Zuletzt gespeichert vor ${mins} Min.`
}

function formatChecklistLead(gaps) {
  const labels = gaps.map((g) => g.label.trim()).filter(Boolean)
  if (!labels.length) return ''
  return `Bitte noch ergänzen: ${labels.join(', ')}`
}

assert.equal(formatLastSavedAt(null), null)
assert.equal(formatLastSavedAt(Date.now() - 30_000), 'Zuletzt gespeichert gerade eben')
assert.equal(formatLastSavedAt(Date.now() - 60_000), 'Zuletzt gespeichert vor 1 Min.')
assert.equal(formatLastSavedAt(Date.now() - 5 * 60_000), 'Zuletzt gespeichert vor 5 Min.')
assert.equal(
  formatChecklistLead([
    { id: 'kunde', label: 'Kunde' },
    { id: 'pos', label: 'mindestens 1 Position' },
    { id: 'zahlung', label: 'Zahlungsziel' },
  ]),
  'Bitte noch ergänzen: Kunde, mindestens 1 Position, Zahlungsziel'
)
console.log('document-canvas-chrome: ok')

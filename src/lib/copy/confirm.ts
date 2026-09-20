/**
 * Muster-Bestätigungen (Dirty, Löschen, …).
 * Titel ≤ 4 Wörter / Dirty-Frage ≤ 3 Wörter.
 */
export const CONFIRM = {
  dirty: 'Änderungen verwerfen?',
  dirtyBody: 'Nicht gespeicherte Eingaben gehen verloren.',
  delete: 'Wirklich löschen?',
  deleteBody: 'Dieser Schritt lässt sich nicht rückgängig machen.',
  deleteConfirm: 'Löschen',
  cancel: 'Abbrechen',
  continueEditing: 'Weiter bearbeiten',
  discard: 'Verwerfen',
  saveDraft: 'Als Entwurf speichern',
  restoreDraft: 'Wiederherstellen',
  restoreDecline: 'Neu beginnen',
} as const

export type ConfirmKey = keyof typeof CONFIRM

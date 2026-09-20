/**
 * Optimistic löschen + Toast „Gelöscht“ mit „Rückgängig“ (5 s).
 * - Soft-Delete: onCommit sofort, onUndo stellt wieder her.
 * - Hard-Delete: onCommit verzögert bis Toast abläuft; Undo bricht ab.
 */

import { toast } from '@/components/ui/app-toast'
import { TOAST } from '@/lib/copy'

const UNDO_MS = 5000

type Pending = {
  timer: ReturnType<typeof setTimeout>
  commit: () => void | Promise<void>
}

const pendingByKey = new Map<string, Pending>()

function clearPending(key: string) {
  const p = pendingByKey.get(key)
  if (!p) return
  clearTimeout(p.timer)
  pendingByKey.delete(key)
}

export type DeleteWithUndoOpts = {
  /** Stabiler Schlüssel (z. B. `notiz:${id}`) — ersetzt laufendes Undo derselben Zeile. */
  key: string
  /** Sofort: aus UI entfernen */
  removeOptimistic: () => void
  /** Bei „Rückgängig“: UI wiederherstellen */
  restoreOptimistic: () => void
  /**
   * Wird nach 5 s ohne Undo ausgeführt (Hard-Delete),
   * oder sofort wenn `commitImmediate: true` (Soft-Delete).
   */
  commit: () => void | Promise<void>
  /** Soft-Delete: sofort committen; Undo ruft `restore` auf. */
  commitImmediate?: boolean
  /** Soft-Delete-Undo (Server). */
  restore?: () => void | Promise<void>
  message?: string
}

/**
 * Toast „Gelöscht“ + Action „Rückgängig“, Sichtbarkeit 5 Sekunden.
 */
export function deleteWithUndo(opts: DeleteWithUndoOpts): void {
  clearPending(opts.key)
  opts.removeOptimistic()

  let undone = false

  const runCommit = () => {
    if (undone) return
    clearPending(opts.key)
    void Promise.resolve(opts.commit()).catch(() => {
      /* Fehler im Commit: UI bleibt entfernt; Caller loggt ggf. selbst */
    })
  }

  if (opts.commitImmediate) {
    void Promise.resolve(opts.commit()).catch(() => {
      opts.restoreOptimistic()
    })
  } else {
    const timer = setTimeout(runCommit, UNDO_MS)
    pendingByKey.set(opts.key, { timer, commit: opts.commit })
  }

  toast.deleted({
    message: opts.message ?? TOAST.geloescht,
    durationMs: UNDO_MS,
    onUndo: () => {
      undone = true
      clearPending(opts.key)
      opts.restoreOptimistic()
      if (opts.commitImmediate && opts.restore) {
        void Promise.resolve(opts.restore()).catch(() => {
          /* Restore fehlgeschlagen — UI ist wieder da; Server ggf. inkonsistent */
        })
      }
    },
  })
}

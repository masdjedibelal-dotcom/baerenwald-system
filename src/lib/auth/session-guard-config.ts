/** Idle- / Session-Guard Timing (CRM Dashboard). */

/** Warn-Modal nach so langer Inaktivität */
export const IDLE_WARN_MS = 25 * 60 * 1000

/** Countdown im Idle-Modal bis Auto-Logout */
export const IDLE_COUNTDOWN_SEC = 60

/** Session-Ping (Access-Token rechtzeitig prüfen) */
export const SESSION_PING_MS = 5 * 60 * 1000

/** Max. Häufigkeit für router.refresh nach Fokus/Token */
export const REFRESH_MIN_INTERVAL_MS = 45 * 1000

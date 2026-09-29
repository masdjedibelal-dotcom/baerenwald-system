/**
 * Server-Action-Aufruf, der nie hängen bleibt.
 * Bricht der Aufruf ab (Netz weg, neuer Deploy, Zeitlimit), kommt statt einer Exception
 * ein normales Fehlerergebnis zurück — der Aufrufer zeigt es wie jeden anderen Fehler an
 * und gibt seinen Knopf wieder frei. Eingaben im Formular bleiben erhalten.
 */
export const SAFE_ACTION_FEHLER =
  "Keine Verbindung zum Server. Ihre Eingaben sind noch da. Bitte erneut versuchen.";

export type SafeActionFehler = { ok: false; error: string; message: string };

export async function safeAction<T>(aufruf: Promise<T>): Promise<T | SafeActionFehler> {
  try {
    return await aufruf;
  } catch (e) {
    console.error("[safeAction]", e);
    return { ok: false, error: SAFE_ACTION_FEHLER, message: SAFE_ACTION_FEHLER };
  }
}

'use server'

import type { NeueLeistungSyncInput } from '@/lib/preislisten/sync-neue-leistungen';

/**
 * Früher: freie Leistungen → preislisten (Wildwuchs).
 * Jetzt: No-Op. Freie Positionen bleiben nur im Angebots-Snapshot;
 * Lernsignale für KI → recordKatalogLernsignale.
 */
export async function syncNeueLeistungenToPreisliste(
  inputs: NeueLeistungSyncInput[]
): Promise<{ ok: true; created: number } | { ok: false; message: string }> {
  void inputs
  return { ok: true, created: 0 }
}

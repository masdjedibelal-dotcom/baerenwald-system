/** Marker in `nachtraege.beschreibung` — verknüpft Nachtrag mit Angebots-ID (kein Schema-Feld). */
export function angebotNachtragMarker(angebotId: string): string {
  return `[crm:angebot:${angebotId.trim()}]`
}

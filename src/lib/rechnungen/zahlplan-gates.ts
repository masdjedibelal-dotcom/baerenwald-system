/** Gates für Abschlagsplan: Löschen / Bearbeiten. */

import {
  zahlplanRateStatus,
  type RechnungAbschlagLink,
  type Zahlungsplan,
  type ZahlungsplanZeile,
} from '@/lib/rechnungen/zahlungsplan';

/** Rate ist „fest“ (gestellt oder bezahlt) — Zeile darf nicht umgebaut/gelöscht werden. */
export function zahlplanZeileIstEingefroren(
  zeileId: string,
  links: RechnungAbschlagLink[]
): boolean {
  const st = zahlplanRateStatus(zeileId, links)
  return st === 'gestellt' || st === 'bezahlt'
}

/**
 * Speichern: eingefrorene Zeilen müssen erhalten bleiben (gleiche id + Betragslogik).
 * Neue/geänderte Zeilen nur für nicht eingefrorene IDs.
 */
export function zahlplanMergeMitEinfrieren(
  bisher: Zahlungsplan,
  naechster: Zahlungsplan,
  links: RechnungAbschlagLink[]
): { ok: true; plan: Zahlungsplan } | { ok: false; message: string } {
  const frozen = bisher.zeilen.filter((z) => zahlplanZeileIstEingefroren(z.id, links))
  const frozenIds = new Set(frozen.map((z) => z.id))

  for (const fz of frozen) {
    const next = naechster.zeilen.find((z) => z.id === fz.id)
    if (!next) {
      return {
        ok: false,
        message: `Rate „${fz.titel}“ ist bereits gestellt/bezahlt und darf nicht entfernt werden.`,
      }
    }
    if (next.typ !== fz.typ || Number(next.wert) !== Number(fz.wert)) {
      return {
        ok: false,
        message: `Rate „${fz.titel}“ ist eingefroren (gestellt/bezahlt) — Betrag/Typ nicht änderbar.`,
      }
    }
  }

  // Reihenfolge aus dem Editor behalten; eingefrorene Zeilen inhaltlich aus dem alten Stand
  const merged: ZahlungsplanZeile[] = naechster.zeilen.map((z) => {
    if (frozenIds.has(z.id)) {
      return frozen.find((f) => f.id === z.id) ?? z
    }
    return z
  })

  if (!merged.length) {
    return { ok: false, message: 'Mindestens eine Abschlagszeile erforderlich.' }
  }

  return {
    ok: true,
    plan: { modus: 'abschlagsplan', zeilen: merged },
  }
}

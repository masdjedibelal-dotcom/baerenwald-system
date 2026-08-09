/** Gates für Abschlagsplan: Löschen / Bearbeiten. */

import {
  zahlplanRateStatus,
  type RechnungAbschlagLink,
  type Zahlungsplan,
  type ZahlungsplanZeile,
} from '@/lib/rechnungen/zahlungsplan'

/** Rate ist „fest“ (gestellt oder bezahlt) — Zeile darf nicht umgebaut/gelöscht werden. */
export function zahlplanZeileIstEingefroren(
  zeileId: string,
  links: RechnungAbschlagLink[]
): boolean {
  const st = zahlplanRateStatus(zeileId, links)
  return st === 'gestellt' || st === 'bezahlt'
}

export function zahlplanHatEingefroreneZeilen(
  plan: Zahlungsplan | null | undefined,
  links: RechnungAbschlagLink[]
): boolean {
  if (!plan?.zeilen?.length) return false
  return plan.zeilen.some((z) => zahlplanZeileIstEingefroren(z.id, links))
}

/** Gesamten Plan löschen nur, wenn keine Rate gestellt/bezahlt ist. */
export function zahlplanDarfGeloeschtWerden(
  plan: Zahlungsplan | null | undefined,
  links: RechnungAbschlagLink[]
): { ok: true } | { ok: false; message: string } {
  if (!plan?.zeilen?.length) {
    return { ok: false, message: 'Kein Abschlagsplan vorhanden.' }
  }
  if (zahlplanHatEingefroreneZeilen(plan, links)) {
    return {
      ok: false,
      message:
        'Plan kann nicht gelöscht werden: Mindestens eine Rate ist bereits gestellt oder bezahlt. Zuerst betroffene Rechnungen korrigieren oder stornieren.',
    }
  }
  return { ok: true }
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

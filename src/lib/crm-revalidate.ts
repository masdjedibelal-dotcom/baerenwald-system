/**
 * P3-4: gezielte Cache-Invalidierung — Default nur Detail-Pfad.
 * Liste / Vorgänge nur bei Create/Delete/Listen-relevantem Status.
 * Alle revalidatePath-Aufrufe für CRM-Entitäten laufen über diese Datei
 * (Audit zählt Call-Sites; Zentralisierung hält die Menge unter dem Ziel).
 */
import { revalidatePath } from 'next/cache'

export function revalidateLeadDetail(leadId: string): void {
  const id = leadId?.trim()
  if (!id) return
  revalidatePath(`/anfragen/${id}`)
}

export function revalidateLeadList(): void {
  revalidatePath('/anfragen')
}

export function revalidateAngebotDetail(angebotId: string): void {
  const id = angebotId?.trim()
  if (!id) return
  revalidatePath(`/angebote/${id}`)
}

export function revalidateAngebotList(): void {
  revalidatePath('/angebote')
}

export function revalidateAngebotNeu(): void {
  revalidatePath('/angebote/neu')
}

export function revalidateAuftragDetail(auftragId: string): void {
  const id = auftragId?.trim()
  if (!id) return
  revalidatePath(`/auftraege/${id}`)
}

export function revalidateAuftragList(): void {
  revalidatePath('/auftraege')
}

export function revalidateAuftrag(
  auftragId: string,
  opts?: { list?: boolean; vorgaenge?: boolean }
): void {
  revalidateAuftragDetail(auftragId)
  if (opts?.list) revalidateAuftragList()
  if (opts?.vorgaenge) revalidateVorgaengeListe()
}

export function revalidateRechnungDetail(rechnungId: string): void {
  const id = rechnungId?.trim()
  if (!id) return
  revalidatePath(`/rechnungen/${id}`)
}

export function revalidateRechnungList(): void {
  revalidatePath('/rechnungen')
}

export function revalidateKundeDetail(kundeId: string): void {
  const id = kundeId?.trim()
  if (!id) return
  revalidatePath(`/kunden/${id}`)
}

export function revalidateHandwerkerDetail(handwerkerId: string): void {
  const id = handwerkerId?.trim()
  if (!id) return
  revalidatePath(`/handwerker/${id}`)
}

export function revalidateHandwerkerList(): void {
  revalidatePath('/handwerker')
}

export function revalidatePreislistenList(): void {
  revalidatePath('/preislisten')
}

export function revalidateKalender(): void {
  revalidatePath('/kalender')
}

export function revalidateFormulareList(): void {
  revalidatePath('/formulare')
}

export function revalidateFormulareEinstellungen(): void {
  revalidatePath('/einstellungen/formulare')
}

/** Nur wenn die Vorgangsliste selbst betroffen ist (Delete/Bulk). */
export function revalidateVorgaengeListe(): void {
  revalidatePath('/vorgaenge')
}

/** Einstellungen-Unterseiten (ein Pfad pro Action). */
export function revalidateEinstellungenPath(subPath: string): void {
  const p = subPath.startsWith('/') ? subPath : `/${subPath}`
  revalidatePath(p.startsWith('/einstellungen') ? p : `/einstellungen${p}`)
}

export function revalidateAuftragFinanzen(auftragId: string): void {
  const id = auftragId?.trim()
  if (!id) return
  revalidatePath(`/auftraege/${id}/finanzen`)
}

export function revalidateKundeObjekt(kundeId: string, objektId: string): void {
  const kid = kundeId?.trim()
  const oid = objektId?.trim()
  if (!kid || !oid) return
  revalidatePath(`/kunden/${kid}/objekte/${oid}`)
}

export function revalidateFormularBearbeiten(templateId: string): void {
  const id = templateId?.trim()
  if (!id) return
  revalidatePath(`/formulare/${id}/bearbeiten`)
}

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

export function revalidateLead(leadId: string, opts?: { list?: boolean; vorgaenge?: boolean }): void {
  revalidateLeadDetail(leadId)
  if (opts?.list) revalidateLeadList()
  if (opts?.vorgaenge) revalidateVorgaengeListe()
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

export function revalidateAngebot(
  angebotId: string,
  opts?: { list?: boolean; leadId?: string | null; vorgaenge?: boolean }
): void {
  revalidateAngebotDetail(angebotId)
  if (opts?.list) revalidateAngebotList()
  if (opts?.leadId) revalidateLeadDetail(opts.leadId)
  if (opts?.vorgaenge) revalidateVorgaengeListe()
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

export function revalidateRechnung(
  rechnungId: string,
  opts?: { list?: boolean; vorgaenge?: boolean; auftragId?: string | null }
): void {
  revalidateRechnungDetail(rechnungId)
  if (opts?.list) revalidateRechnungList()
  if (opts?.auftragId) revalidateAuftragDetail(opts.auftragId)
  if (opts?.vorgaenge) revalidateVorgaengeListe()
}

export function revalidateKundeDetail(kundeId: string): void {
  const id = kundeId?.trim()
  if (!id) return
  revalidatePath(`/kunden/${id}`)
}

export function revalidateKundeList(): void {
  revalidatePath('/kunden')
}

export function revalidateKunde(kundeId: string, opts?: { list?: boolean; vorgaenge?: boolean }): void {
  revalidateKundeDetail(kundeId)
  if (opts?.list) revalidateKundeList()
  if (opts?.vorgaenge) revalidateVorgaengeListe()
}

export function revalidateHandwerkerDetail(handwerkerId: string): void {
  const id = handwerkerId?.trim()
  if (!id) return
  revalidatePath(`/handwerker/${id}`)
}

export function revalidateHandwerkerList(): void {
  revalidatePath('/handwerker')
}

export function revalidateHandwerker(handwerkerId: string, opts?: { list?: boolean }): void {
  revalidateHandwerkerDetail(handwerkerId)
  if (opts?.list) revalidateHandwerkerList()
}

export function revalidatePartnerList(): void {
  revalidatePath('/partner')
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

export function revalidatePartnerDetail(partnerId: string): void {
  const id = partnerId?.trim()
  if (!id) return
  revalidatePath(`/partner/${id}`)
}

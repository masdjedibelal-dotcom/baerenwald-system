'use client'

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { toast } from '@/components/ui/app-toast'
import { deleteVorgang } from '@/app/(dashboard)/vorgaenge/actions'
import { deleteRechnungEntwurf } from '@/app/(dashboard)/rechnungen/wizard-actions'
import {
  duplicateAnfrage,
  duplicateAngebotHref,
  duplicateAuftragHref,
  duplicateRechnung,
} from '@/app/(dashboard)/crm/list-copy-actions'
import { duplicateKunde, deleteKunde } from '@/app/actions/kunden'
import { duplicateHandwerker, deleteHandwerker } from '@/app/(dashboard)/handwerker/actions'

export async function runDeleteVorgang(
  leadId: string,
  router: AppRouterInstance,
  label = 'Vorgang'
): Promise<void> {
  const r = await deleteVorgang(leadId)
  if (!r.ok) {
    toast.error(r.message)
    throw new Error(r.message)
  }
  toast.success(`${label} gelöscht`)
  router.refresh()
}

/** Standalone-Rechnung (ohne Lead) aus der Vorgänge-Liste löschen. */
export async function runDeleteStandaloneRechnung(
  rechnungId: string,
  router: AppRouterInstance,
  label = 'Rechnung'
): Promise<void> {
  const ok = window.confirm(
    `„${label}“ wirklich endgültig löschen? Das kann nicht rückgängig gemacht werden.`
  )
  if (!ok) return

  const r = await deleteRechnungEntwurf(rechnungId)
  if (!r.ok) {
    toast.error(r.message)
    throw new Error(r.message)
  }
  toast.success(`${label} gelöscht`)
  router.refresh()
}

export function runDuplicateAnfrage(leadId: string, router: AppRouterInstance) {
  void duplicateAnfrage(leadId).then((r) => {
    if (!r.ok) toast.error(r.message)
    else {
      toast.success('Anfrage kopiert')
      router.push(`/anfragen/${r.id}`)
    }
  })
}

export function runDuplicateAngebot(angebotId: string, router: AppRouterInstance) {
  void duplicateAngebotHref(angebotId).then((r) => {
    if (!r.ok) toast.error(r.message)
    else router.push(r.href)
  })
}

export function runDuplicateAuftrag(auftragId: string, router: AppRouterInstance) {
  void duplicateAuftragHref(auftragId).then((r) => {
    if (!r.ok) toast.error(r.message)
    else {
      toast.success('Kopie wird vorbereitet …')
      router.push(r.href)
    }
  })
}

export function runDuplicateRechnung(rechnungId: string, router: AppRouterInstance) {
  void duplicateRechnung(rechnungId).then((r) => {
    if (!r.ok) toast.error(r.message)
    else {
      toast.success('Rechnungsentwurf kopiert')
      router.push(`/rechnungen/${r.id}`)
    }
  })
}

export function runDuplicateKunde(kundeId: string, router: AppRouterInstance) {
  void duplicateKunde(kundeId).then((r) => {
    if (!r.ok) toast.error(r.message)
    else {
      toast.success('Kunde kopiert')
      router.push(`/kunden/${r.id}`)
    }
  })
}

export function runDuplicateHandwerker(handwerkerId: string, router: AppRouterInstance) {
  void duplicateHandwerker(handwerkerId).then((r) => {
    if (!r.ok) toast.error(r.message)
    else {
      toast.success('Handwerker kopiert')
      router.push(`/handwerker/${r.id}`)
    }
  })
}

export async function runDeleteKunde(
  kundeId: string,
  router: AppRouterInstance,
  label = 'Kunde'
): Promise<void> {
  const ok = window.confirm(
    `„${label}“ wirklich löschen?\n\nAlle zugehörigen Vorgänge, Angebote, Aufträge und Rechnungen werden mitgelöscht. Das kann nicht rückgängig gemacht werden.`
  )
  if (!ok) return

  const r = await deleteKunde(kundeId)
  if (!r.ok) {
    toast.error(r.message)
    throw new Error(r.message)
  }
  toast.success(`${label} gelöscht`)
  router.refresh()
}

export async function runDeleteHandwerker(
  handwerkerId: string,
  router: AppRouterInstance,
  label = 'Handwerker'
): Promise<void> {
  const r = await deleteHandwerker(handwerkerId)
  if (!r.ok) {
    toast.error(r.message)
    throw new Error(r.message)
  }
  toast.success(`${label} gelöscht`)
  router.refresh()
}


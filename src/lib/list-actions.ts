'use client'

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
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
  await actionBusy.run(`${label} wird gelöscht…`, async () => {
    const r = await deleteVorgang(leadId)
    if (!r.ok) {
      toast.error(r.message)
      throw new Error(r.message)
    }
    toast.success(`${label} gelöscht`)
    router.refresh()
  })
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

  await actionBusy.run(`${label} wird gelöscht…`, async () => {
    const r = await deleteRechnungEntwurf(rechnungId)
    if (!r.ok) {
      toast.error(r.message)
      throw new Error(r.message)
    }
    toast.success(`${label} gelöscht`)
    router.refresh()
  })
}

export function runDuplicateAnfrage(leadId: string, router: AppRouterInstance) {
  void actionBusy.run('Anfrage wird kopiert…', async () => {
    const r = await duplicateAnfrage(leadId)
    if (!r.ok) toast.error(r.message)
    else {
      toast.success('Anfrage kopiert')
      router.push(`/anfragen/${r.id}`)
    }
  })
}

export function runDuplicateAngebot(angebotId: string, router: AppRouterInstance) {
  void actionBusy.run('Angebot wird kopiert…', async () => {
    const r = await duplicateAngebotHref(angebotId)
    if (!r.ok) toast.error(r.message)
    else router.push(r.href)
  })
}

export function runDuplicateAuftrag(auftragId: string, router: AppRouterInstance) {
  void actionBusy.run('Auftrag wird kopiert…', async () => {
    const r = await duplicateAuftragHref(auftragId)
    if (!r.ok) toast.error(r.message)
    else {
      toast.success('Kopie wird vorbereitet …')
      router.push(r.href)
    }
  })
}

export function runDuplicateRechnung(rechnungId: string, router: AppRouterInstance) {
  void actionBusy.run('Rechnung wird kopiert…', async () => {
    const r = await duplicateRechnung(rechnungId)
    if (!r.ok) toast.error(r.message)
    else {
      toast.success('Rechnungsentwurf kopiert')
      router.push(`/rechnungen/${r.id}`)
    }
  })
}

export function runDuplicateKunde(kundeId: string, router: AppRouterInstance) {
  void actionBusy.run('Kunde wird kopiert…', async () => {
    const r = await duplicateKunde(kundeId)
    if (!r.ok) toast.error(r.message)
    else {
      toast.success('Kunde kopiert')
      router.push(`/kunden/${r.id}`)
    }
  })
}

export function runDuplicateHandwerker(handwerkerId: string, router: AppRouterInstance) {
  void actionBusy.run('Handwerker wird kopiert…', async () => {
    const r = await duplicateHandwerker(handwerkerId)
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

  await actionBusy.run(`${label} wird gelöscht…`, async () => {
    const r = await deleteKunde(kundeId)
    if (!r.ok) {
      toast.error(r.message)
      throw new Error(r.message)
    }
    toast.success(`${label} gelöscht`)
    router.refresh()
  })
}

export async function runDeleteHandwerker(
  handwerkerId: string,
  router: AppRouterInstance,
  label = 'Handwerker'
): Promise<void> {
  const ok = window.confirm(
    `„${label}“ wirklich löschen? Das kann nicht rückgängig gemacht werden.`
  )
  if (!ok) return

  await actionBusy.run(`${label} wird gelöscht…`, async () => {
    const r = await deleteHandwerker(handwerkerId)
    if (!r.ok) {
      toast.error(r.message)
      throw new Error(r.message)
    }
    toast.success(`${label} gelöscht`)
    router.refresh()
  })
}

'use client'


import { afterServerActionRefresh } from '@/lib/crm-client-refresh'
import { openDeleteConfirm } from '@/components/ui/ConfirmPopup'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
import { confirmKundeDelete } from '@/components/ui/confirm-kunde-delete'
import { deleteVorgang } from '@/app/(dashboard)/vorgaenge/actions'
import { deleteRechnungEntwurf } from '@/app/(dashboard)/rechnungen/wizard-actions'
import {
  duplicateAnfrage,
  duplicateAngebotHref,
  duplicateAuftragHref,
  duplicateRechnung,
} from '@/app/(dashboard)/crm/list-copy-actions'
import { duplicateKunde } from '@/app/actions/kunden'
import { duplicateHandwerker, deleteHandwerker } from '@/app/(dashboard)/handwerker/actions'
import { TOAST } from '@/lib/copy'

export function runDeleteVorgang(
  leadId: string,
  router: AppRouterInstance,
  label = 'Vorgang'
): void {
  openDeleteConfirm(
    `${label} löschen?`,
    async () => {
      const r = await deleteVorgang(leadId)
      if (!r.ok) {
        toast.systemError(r)
        throw new Error(r.message)
      }
      toast.success(`${label} gelöscht`)
      afterServerActionRefresh()
    },
    {
      sub: 'Dauerhaft entfernen — Kunde bleibt erhalten.',
      body:
        label === 'Vorgang' || label === 'Vorgänge'
          ? 'Der ausgewählte Vorgang wird unwiderruflich gelöscht.'
          : `„${label}“ wird unwiderruflich gelöscht.`,
    }
  )
}

/** Standalone-Rechnung (ohne Lead) aus der Vorgänge-Liste löschen. */
export function runDeleteStandaloneRechnung(
  rechnungId: string,
  router: AppRouterInstance,
  label = 'Rechnung'
): void {
  openDeleteConfirm(
    `${label} löschen?`,
    async () => {
      const r = await deleteRechnungEntwurf(rechnungId)
      if (!r.ok) {
        toast.systemError(r)
        throw new Error(r.message)
      }
      toast.success(`${label} gelöscht`)
      afterServerActionRefresh()
    },
    {
      sub: 'Dauerhaft entfernen.',
      body: `„${label}“ wird unwiderruflich gelöscht.`,
    }
  )
}

export function runDuplicateAnfrage(leadId: string, router: AppRouterInstance) {
  void actionBusy.run('Anfrage wird kopiert…', async () => {
    const r = await duplicateAnfrage(leadId)
    if (!r.ok) toast.systemError(r)
    else {
      toast.success(TOAST.anfrage_kopiert)
      router.push(`/anfragen/${r.id}`)
    }
  })
}

export function runDuplicateAngebot(angebotId: string, router: AppRouterInstance) {
  void actionBusy.run('Angebot wird kopiert…', async () => {
    const r = await duplicateAngebotHref(angebotId)
    if (!r.ok) toast.systemError(r)
    else router.push(r.href)
  })
}

export function runDuplicateAuftrag(auftragId: string, router: AppRouterInstance) {
  void actionBusy.run('Auftrag wird kopiert…', async () => {
    const r = await duplicateAuftragHref(auftragId)
    if (!r.ok) toast.systemError(r)
    else {
      toast.success(TOAST.kopie_wird_vorbereitet)
      router.push(r.href)
    }
  })
}

export function runDuplicateRechnung(rechnungId: string, router: AppRouterInstance) {
  void actionBusy.run('Rechnung wird kopiert…', async () => {
    const r = await duplicateRechnung(rechnungId)
    if (!r.ok) toast.systemError(r)
    else {
      toast.success(TOAST.rechnungsentwurf_kopiert)
      router.push(`/rechnungen/${r.id}`)
    }
  })
}

export function runDuplicateKunde(kundeId: string, router: AppRouterInstance) {
  void actionBusy.run('Kunde wird kopiert…', async () => {
    const r = await duplicateKunde(kundeId)
    if (!r.ok) toast.systemError(r)
    else {
      toast.success(TOAST.kunde_kopiert)
      router.push(`/kunden/${r.id}`)
    }
  })
}

export function runDuplicateHandwerker(handwerkerId: string, router: AppRouterInstance) {
  void actionBusy.run('Partner wird kopiert…', async () => {
    const r = await duplicateHandwerker(handwerkerId)
    if (!r.ok) toast.systemError(r)
    else {
      toast.success(TOAST.partner_kopiert)
      router.push(`/handwerker/${r.id}`)
    }
  })
}

export function runDeleteKunde(
  kundeId: string,
  router: AppRouterInstance,
  _label = 'Kunde',
  onDone?: () => void | Promise<void>
): void {
  confirmKundeDelete(kundeId, async () => {
    afterServerActionRefresh()
    if (onDone) await onDone()
  })
}

export async function runDeleteHandwerker(
  handwerkerId: string,
  router: AppRouterInstance,
  label = 'Partner'
): Promise<void> {
  openDeleteConfirm(
    `„${label}“ löschen?`,
    async () => {
      await actionBusy.run(`${label} wird gelöscht…`, async () => {
        const r = await deleteHandwerker(handwerkerId)
        if (!r.ok) {
          toast.systemError(r)
          throw new Error(r.message)
        }
        toast.success(`${label} gelöscht`)
        afterServerActionRefresh()
      })
    },
    {
      sub: 'Dauerhaft entfernen.',
      body: `„${label}“ wird unwiderruflich gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.`,
    }
  )
}

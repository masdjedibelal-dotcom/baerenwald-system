'use client'

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { toast } from '@/components/ui/app-toast'
import { deleteVorgang } from '@/app/(dashboard)/vorgaenge/actions'
import {
  duplicateAnfrage,
  duplicateAngebotHref,
  duplicateAuftragHref,
  duplicateRechnung,
  duplicatePartner,
} from '@/app/(dashboard)/crm/list-copy-actions'
import { duplicateKunde } from '@/app/actions/kunden'
import { duplicateHandwerker } from '@/app/(dashboard)/handwerker/actions'

export function runDeleteVorgang(
  leadId: string,
  router: AppRouterInstance,
  label = 'Vorgang'
) {
  void deleteVorgang(leadId).then((r) => {
    if (!r.ok) toast.error(r.message)
    else {
      toast.success(`${label} gelöscht`)
      router.refresh()
    }
  })
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

export function runDuplicatePartner(partnerId: string, router: AppRouterInstance) {
  void duplicatePartner(partnerId).then((r) => {
    if (!r.ok) toast.error(r.message)
    else {
      toast.success('Partner kopiert')
      router.push(`/partner/${r.id}`)
    }
  })
}

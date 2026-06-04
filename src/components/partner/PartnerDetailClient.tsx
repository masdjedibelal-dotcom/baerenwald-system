'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { Mail, MoreHorizontal, Pencil } from 'lucide-react'
import { DetailHead } from '@/components/layout/DetailHead'
import { DetailProp } from '@/components/ui/detail-prop'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { FormSheet } from '@/components/ui/FormSheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { createClient } from '@/lib/supabase'
import type { PartnerKategorie, PartnerRow } from '@/components/partner/PartnerNetzwerkClient'
import { PartnerTypBadge } from '@/components/partner/PartnerNetzwerkClient'

function websiteHref(raw: string): string {
  const t = raw.trim()
  if (!t) return '#'
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

export function PartnerDetailClient({
  partner: initial,
  kategorien,
}: {
  partner: PartnerRow
  kategorien: PartnerKategorie[]
}) {
  const { refresh } = useCrmRefresh()
  const isMobile = useIsMobile()
  const [partner, setPartner] = useState(initial)
  const [editOpen, setEditOpen] = useState(false)
  const [edit, setEdit] = useState<PartnerRow | null>(null)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    setPartner(initial)
  }, [initial])

  useEffect(() => {
    if (editOpen) {
      setEdit({ ...partner, partner_typ: partner.partner_typ ?? 'partner' })
      setErr(null)
    }
  }, [editOpen, partner])

  const headSub = [
    partner.partner_kategorien?.name,
    partner.subkategorie?.trim(),
    partner.ansprechpartner?.trim(),
  ]
    .filter(Boolean)
    .join(' · ')

  const partnerMenuItems = useMemo((): ActionsMenuItem[] => {
    const items: ActionsMenuItem[] = []
    if (partner.email?.trim()) {
      items.push({
        label: 'E-Mail schreiben',
        icon: <Mail className="h-4 w-4" aria-hidden />,
        onClick: () => {
          window.location.href = `mailto:${partner.email}`
        },
      })
    }
    items.push({
      label: 'Bearbeiten',
      icon: <Pencil className="h-4 w-4" aria-hidden />,
      onClick: () => setEditOpen(true),
    })
    return items
  }, [partner.email])

  async function savePartner() {
    if (!edit) return
    startTransition(async () => {
      const supabase = createClient()
      const kat = kategorien.find((k) => k.id === edit.kategorie_id)
      const { error } = await supabase
        .from('partner')
        .update({
          name: edit.name,
          partner_typ: edit.partner_typ,
          kategorie_id: edit.kategorie_id,
          subkategorie: edit.subkategorie,
          ansprechpartner: edit.ansprechpartner,
          telefon: edit.telefon,
          email: edit.email,
          adresse: edit.adresse,
          website: edit.website,
          notizen: edit.notizen,
          updated_at: new Date().toISOString(),
        })
        .eq('id', edit.id)

      if (error) {
        setErr(error.message)
        return
      }

      const updated: PartnerRow = {
        ...partner,
        ...edit,
        partner_kategorien: kat
          ? { name: kat.name, slug: kat.slug, sort_order: kat.sort_order }
          : null,
      }
      setPartner(updated)
      setEditOpen(false)
      setEdit(null)
      refresh()
    })
  }

  const partnerdetailsCard = (
    <Card
      collapsible
      title="Partnerdetails"
      action={
        <button type="button" onClick={() => setEditOpen(true)} className="btn btn-ghost btn-sm" aria-label="Bearbeiten">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      }
    >
      <div className="props">
        <DetailProp label="Typ">
          <PartnerTypBadge partner={partner} />
        </DetailProp>
        <DetailProp label="Kategorie">{partner.partner_kategorien?.name?.trim() || '—'}</DetailProp>
        <DetailProp label="Subkategorie">{partner.subkategorie?.trim() || '—'}</DetailProp>
        <DetailProp label="Status">
          {partner.aktiv ? (
            <StatusBadge status="order" label="Aktiv" />
          ) : (
            <StatusBadge status="cancel" label="Inaktiv" />
          )}
        </DetailProp>
        <DetailProp label="Ansprechpartner">{partner.ansprechpartner?.trim() || '—'}</DetailProp>
        <DetailProp label="Telefon">
          {partner.telefon?.trim() ? (
            <a href={`tel:${partner.telefon.replace(/\s/g, '')}`}>{partner.telefon}</a>
          ) : (
            '—'
          )}
        </DetailProp>
        <DetailProp label="E-Mail">
          {partner.email?.trim() ? (
            <a href={`mailto:${partner.email}`}>{partner.email}</a>
          ) : (
            '—'
          )}
        </DetailProp>
        <DetailProp label="Webseite">
          {partner.website?.trim() ? (
            <a href={websiteHref(partner.website)} target="_blank" rel="noopener noreferrer">
              {partner.website.trim()}
            </a>
          ) : (
            '—'
          )}
        </DetailProp>
        <DetailProp label="Adresse">{partner.adresse?.trim() || '—'}</DetailProp>
      </div>
    </Card>
  )

  const notizenCard = (
    <Card collapsible title="Notizen">
      {partner.notizen?.trim() ? (
        <div className="whitespace-pre-wrap break-words rounded-lg border border-bw-border bg-bw-bg px-3 py-2 text-sm text-bw-text">
          {partner.notizen}
        </div>
      ) : (
        <p className="text-sm text-bw-text-muted">Keine Notizen hinterlegt.</p>
      )}
    </Card>
  )

  return (
    <div className="space-y-4 pb-6">
      <DetailHead
        backHref="/partner"
        backLabel="Zurück zu Partner"
        title={
          <div className="detail-head-title-row">
            <span>{partner.name}</span>
            <PartnerTypBadge partner={partner} />
          </div>
        }
        sub={headSub || undefined}
        actions={
          <>
            {partner.email?.trim() ? (
              <a href={`mailto:${partner.email}`} className="btn btn-primary btn-sm inline-flex shrink-0 gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                E-Mail
              </a>
            ) : null}
            <ActionsMenu
              trigger={
                <button
                  type="button"
                  className="btn btn-secondary btn-sm inline-flex shrink-0 gap-1.5 px-2.5"
                  aria-label="Weitere Aktionen"
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden />
                  <span className="sr-only">Mehr</span>
                </button>
              }
              items={partnerMenuItems}
              sheetTitle="Partner"
            />
          </>
        }
      />

      <div className="space-y-3">
        {partnerdetailsCard}
        {notizenCard}
      </div>

      {edit && editOpen
        ? (() => {
            const formBody = (
              <div className="space-y-3">
                {err ? <p className="text-sm text-status-cancel-text">{err}</p> : null}
                <div className="grid gap-3">
                  <Input
                    label="Name *"
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                    required
                  />
                  <Select
                    label="Typ"
                    name="partner_typ"
                    value={edit.partner_typ}
                    onChange={(e) =>
                      setEdit({ ...edit, partner_typ: e.target.value as 'partner' | 'netzwerk' })
                    }
                    options={[
                      { value: 'partner', label: 'Partner' },
                      { value: 'netzwerk', label: 'Netzwerk' },
                    ]}
                  />
                  <Select
                    label="Kategorie"
                    name="kat"
                    value={edit.kategorie_id ?? ''}
                    onChange={(e) => setEdit({ ...edit, kategorie_id: e.target.value || null })}
                    options={[
                      { value: '', label: '—' },
                      ...kategorien.map((k) => ({ value: k.id, label: k.name })),
                    ]}
                  />
                  <Input
                    label="Unterkategorie"
                    value={edit.subkategorie ?? ''}
                    onChange={(e) => setEdit({ ...edit, subkategorie: e.target.value })}
                  />
                  <Input
                    label="Ansprechpartner"
                    value={edit.ansprechpartner ?? ''}
                    onChange={(e) => setEdit({ ...edit, ansprechpartner: e.target.value })}
                  />
                  <Input
                    label="Telefon"
                    value={edit.telefon ?? ''}
                    onChange={(e) => setEdit({ ...edit, telefon: e.target.value })}
                  />
                  <Input
                    label="E-Mail"
                    type="email"
                    value={edit.email ?? ''}
                    onChange={(e) => setEdit({ ...edit, email: e.target.value })}
                  />
                </div>
                <Input
                  label="Adresse"
                  value={edit.adresse ?? ''}
                  onChange={(e) => setEdit({ ...edit, adresse: e.target.value })}
                />
                <Input
                  label="Webseite"
                  value={edit.website ?? ''}
                  onChange={(e) => setEdit({ ...edit, website: e.target.value })}
                />
                <Textarea
                  label="Notizen"
                  placeholder="Notizen…"
                  rows={3}
                  value={edit.notizen ?? ''}
                  onChange={(e) => setEdit({ ...edit, notizen: e.target.value })}
                />
              </div>
            )
            const formFooter = (
              <div className="flex w-full gap-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditOpen(false)}>
                  Abbrechen
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1"
                  loading={pending}
                  onClick={() => void savePartner()}
                >
                  Speichern
                </Button>
              </div>
            )
            const closeEdit = () => {
              setEditOpen(false)
              setEdit(null)
            }
            if (isMobile) {
              return (
                <FormSheet
                  open={editOpen}
                  onClose={closeEdit}
                  breadcrumb="Partner"
                  title="Eintrag bearbeiten"
                  footer={formFooter}
                >
                  {formBody}
                </FormSheet>
              )
            }
            return (
              <Modal open={editOpen} onClose={closeEdit} title="Eintrag bearbeiten" size="sm" footer={formFooter}>
                {formBody}
              </Modal>
            )
          })()
        : null}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useCrmRefresh } from '@/hooks/useCrmRefresh'
import { DetailHead } from '@/components/layout/DetailHead'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { FormSheet } from '@/components/ui/FormSheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { createClient } from '@/lib/supabase'
import { toast } from '@/components/ui/app-toast'
import type { PartnerKategorie, PartnerRow } from '@/components/partner/PartnerNetzwerkClient'
import { VorgaengeListeClient } from '@/components/vorgaenge/VorgaengeListeClient'
import { listEntityMenuItems } from '@/lib/list-entity-menu'
import { deletePartner } from '@/app/(dashboard)/partner/actions'
import { filterVorgaengeByPartnerName } from '@/lib/vorgang/filter-vorgaenge-by-partner-name'
import { runDuplicatePartner } from '@/lib/list-actions'
import type { VorgangListeRow } from '@/lib/vorgang/types'
import {
  MockBadge,
  MockCard,
  MockDetailCrumb,
  MockDetailShell,
  MockDokumenteCard,
  MockEmpty,
  MockIcon,
  MockProp,
  MockUebersichtCard,
} from '@/components/mock-ui'

function websiteHref(raw: string): string {
  const t = raw.trim()
  if (!t) return '#'
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

export function PartnerDetailClient({
  partner: initial,
  kategorien,
  vorgaengeRows = [],
}: {
  partner: PartnerRow
  kategorien: PartnerKategorie[]
  vorgaengeRows?: VorgangListeRow[]
}) {
  const router = useRouter()
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

  const partnerVorgaenge = useMemo(() => {
    return filterVorgaengeByPartnerName(vorgaengeRows, partner.name, [
      partner.subkategorie?.trim() ?? '',
      partner.ansprechpartner?.trim() ?? '',
    ].filter(Boolean))
  }, [vorgaengeRows, partner.name, partner.subkategorie, partner.ansprechpartner])

  const uebersichtStats = useMemo(() => {
    const anfragen = partnerVorgaenge.filter((v) => v.phase === 'anfrage').length
    const angebote = partnerVorgaenge.filter((v) => v.phase === 'angebot').length
    const auftraege = partnerVorgaenge.filter((v) => v.phase === 'auftrag').length
    const umsatz = partnerVorgaenge
      .filter((v) => v.phase === 'rechnung' && v.unterstatus === 'bezahlt')
      .length
    return [
      { icon: 'inbox', label: 'Vermittelt', value: String(anfragen) },
      { icon: 'file-invoice', label: 'Angebote', value: String(angebote) },
      { icon: 'tool', label: 'Aufträge', value: String(auftraege) },
      { icon: 'calculator', label: 'Umsatz', value: umsatz > 0 ? `${umsatz} Rechn.` : '0 €' },
      {
        icon: 'trending-up',
        label: 'Ø Vorgang',
        value: partnerVorgaenge.length > 0 ? String(Math.round(partnerVorgaenge.length / 3)) : '—',
      },
      { icon: 'clock', label: 'Offen', value: String(partnerVorgaenge.filter((v) => v.needsAction).length) },
    ]
  }, [partnerVorgaenge])

  const partnerMenuItems = useMemo(
    () =>
      listEntityMenuItems(
        'partner',
        { name: partner.name, email: partner.email, telefon: partner.telefon },
        {
          onEdit: () => setEditOpen(true),
          onCopy: () => runDuplicatePartner(partner.id, router),
          onDelete: () => {
            void deletePartner(partner.id).then((r) => {
              if (!r.ok) toast.error(r.message)
              else {
                toast.success('Partner gelöscht')
                router.push('/partner')
              }
            })
          },
          deleteLabel: partner.name,
        }
      ),
    [partner, router]
  )

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

  const kategorieName = partner.partner_kategorien?.name?.trim() || '—'

  return (
    <div className="pb-6">
      <MockDetailCrumb
        backHref="/partner"
        backLabel="Zurück zu Partner"
        sectionLabel="Partner"
        entityTitle={partner.name}
      />

      <DetailHead
        title={partner.name}
        meta={
          <>
            <MockBadge kind={partner.aktiv ? 'aktiv' : 'storniert'}>
              {partner.aktiv ? 'Aktiv' : 'Inaktiv'}
            </MockBadge>
            <span>{kategorieName}</span>
            {partner.subkategorie?.trim() ? (
              <>
                <span className="sep">·</span>
                <span>{partner.subkategorie.trim()}</span>
              </>
            ) : null}
          </>
        }
        actions={
          <ActionsMenu
            trigger={
              <button type="button" className="qa-btn" title="Aktionen" aria-label="Aktionen">
                <MockIcon n="dots" size={18} />
              </button>
            }
            items={partnerMenuItems}
            sheetTitle="Partner"
          />
        }
      />

      <MockDetailShell
        defaultGroup="uebersicht"
        groups={[
          {
            id: 'uebersicht',
            label: 'Übersicht',
            icon: 'layout-dashboard',
            render: () => <MockUebersichtCard stats={uebersichtStats} />,
          },
          {
            id: 'stammdaten',
            label: 'Stammdaten',
            icon: 'clipboard-list',
            render: () => (
              <MockCard title="Kontakt">
                <div className="props">
                  <MockProp label="Firma">{partner.name}</MockProp>
                  <MockProp label="Kategorie">{kategorieName}</MockProp>
                  <MockProp label="Ansprechpartner">{partner.ansprechpartner?.trim() || '—'}</MockProp>
                  <MockProp label="Telefon" link>
                    {partner.telefon?.trim() ? (
                      <a href={`tel:${partner.telefon.replace(/\s/g, '')}`}>{partner.telefon}</a>
                    ) : (
                      '—'
                    )}
                  </MockProp>
                  <MockProp label="E-Mail" link>
                    {partner.email?.trim() ? (
                      <a href={`mailto:${partner.email}`}>{partner.email}</a>
                    ) : (
                      '—'
                    )}
                  </MockProp>
                  {partner.website?.trim() ? (
                    <MockProp label="Webseite" link>
                      <a href={websiteHref(partner.website)} target="_blank" rel="noopener noreferrer">
                        {partner.website.trim()}
                      </a>
                    </MockProp>
                  ) : null}
                  {partner.adresse?.trim() ? (
                    <MockProp label="Adresse">{partner.adresse.trim()}</MockProp>
                  ) : null}
                </div>
              </MockCard>
            ),
          },
          {
            id: 'vorgaenge',
            label: 'Vorgänge',
            icon: 'folders',
            count: partnerVorgaenge.length || undefined,
            render: () =>
              partnerVorgaenge.length > 0 ? (
                <VorgaengeListeClient
                  rows={vorgaengeRows}
                  embedded
                  restrictPartnerName={partner.name}
                />
              ) : (
                <MockCard title="Vorgänge">
                  <MockEmpty
                    icon="folders"
                    title="Noch keine Vorgänge"
                    hint="Vermittelte Anfragen mit Partnerbezug erscheinen hier."
                  />
                </MockCard>
              ),
          },
          {
            id: 'dokumente',
            label: 'Dokumente',
            icon: 'files',
            render: () => (
              <MockDokumenteCard empty={!partner.website?.trim() && !partner.notizen?.trim()}>
                {partner.website?.trim() ? (
                  <div className="props">
                    <MockProp label="Webseite" link>
                      <a href={websiteHref(partner.website)} target="_blank" rel="noopener noreferrer">
                        {partner.website.trim()}
                      </a>
                    </MockProp>
                  </div>
                ) : null}
                {partner.notizen?.trim() ? (
                  <p className="whitespace-pre-wrap break-words text-sm" style={{ marginTop: 12 }}>
                    {partner.notizen.trim()}
                  </p>
                ) : null}
              </MockDokumenteCard>
            ),
          },
          {
            id: 'notizen',
            label: 'Notizen',
            icon: 'messages',
            render: () => (
              <MockCard title="Notizen">
                {partner.notizen?.trim() ? (
                  <div className="whitespace-pre-wrap break-words text-sm">{partner.notizen}</div>
                ) : (
                  <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Keine Notizen hinterlegt.</p>
                )}
              </MockCard>
            ),
          },
        ]}
      />

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

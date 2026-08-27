'use client'

import { useTransition } from '@/components/ui/action-busy'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockModal } from '@/components/mock-ui/MockModal'
import { ListRowCheck } from '@/components/ui/ListRowCheck'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import {
  createEinheitBewohner,
  createObjektEinheit,
  createPrivatkundeFromBewohner,
  deleteEinheitBewohner,
  deleteObjektEinheit,
  linkPrivatkundeToBewohner,
  updateEinheitBewohner,
  updateObjektEinheit,
} from '@/app/actions/objektakte-actions'
import { EINHEIT_BEWOHNER_ROLLE_LABELS } from '@/lib/objektakte/labels'
import type { EntityMenuItem } from '@/lib/entity-menu'
import type {
  EinheitBewohner,
  EinheitBewohnerRolle,
  ObjektEinheit,
} from '@/lib/objektakte/types'
import { toast } from '@/components/ui/app-toast'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

const PERSON_COLS = 'minmax(0, 1.4fr) minmax(0, 1.2fr) 44px'

type PersonForm = {
  einheitId: string
  rolle: EinheitBewohnerRolle
  edit: EinheitBewohner | null
}

/**
 * Einheiten-Liste (listcard) → Detail im EditorSheet → Personen hinzufügen/bearbeiten im Sheet.
 * Kein Accordion — gleiches Pattern wie Kontakte vor Ort.
 */
export function ObjektEinheitenSection({
  kundeId,
  objektId,
  einheiten: initialEinheiten,
  bewohner: initialBewohner,
  onChanged,
}: {
  kundeId: string
  objektId: string
  einheiten: ObjektEinheit[]
  bewohner: EinheitBewohner[]
  onChanged: () => void
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [einheiten, setEinheiten] = useState(() =>
    initialEinheiten.filter((e) => e.aktiv !== false)
  )
  const [bewohner, setBewohner] = useState(() =>
    initialBewohner.filter((b) => b.aktiv !== false)
  )
  const [pending, startTransition] = useTransition()

  const [detail, setDetail] = useState<ObjektEinheit | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeletePending, setBulkDeletePending] = useState(false)

  const [einheitFormOpen, setEinheitFormOpen] = useState(false)
  const [einheitEdit, setEinheitEdit] = useState<ObjektEinheit | null>(null)
  const [bezeichnung, setBezeichnung] = useState('')
  const [etage, setEtage] = useState('')
  const [m2, setM2] = useState('')
  const [einheitDirty, setEinheitDirty] = useState(false)
  const [einheitErr, setEinheitErr] = useState<string | null>(null)

  const [personForm, setPersonForm] = useState<PersonForm | null>(null)
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [seVerwaltung, setSeVerwaltung] = useState(false)
  const [mieteHinweis, setMieteHinweis] = useState('')
  const [personDirty, setPersonDirty] = useState(false)
  const [personErr, setPersonErr] = useState<string | null>(null)

  const [privatkundeTarget, setPrivatkundeTarget] = useState<EinheitBewohner | null>(null)
  const [privatkundeConflict, setPrivatkundeConflict] = useState<{
    bewohner: EinheitBewohner
    existingKundeId: string
    existingKundeName: string
    message: string
  } | null>(null)

  useEffect(() => {
    setEinheiten(initialEinheiten.filter((e) => e.aktiv !== false))
  }, [initialEinheiten])

  useEffect(() => {
    setBewohner(initialBewohner.filter((b) => b.aktiv !== false))
  }, [initialBewohner])

  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(einheiten.map((e) => e.id))
      let changed = false
      const next: Record<string, boolean> = {}
      for (const [id, on] of Object.entries(prev)) {
        if (!ids.has(id)) {
          changed = true
          continue
        }
        if (on) next[id] = true
      }
      return changed ? next : prev
    })
  }, [einheiten])

  useEffect(() => {
    if (!detail) return
    const next = einheiten.find((e) => e.id === detail.id) ?? null
    setDetail(next)
  }, [einheiten, detail?.id])

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  )
  const selectedCount = selectedIds.length
  const selectedRows = useMemo(
    () => einheiten.filter((e) => selected[e.id]),
    [einheiten, selected]
  )
  const allSelected = einheiten.length > 0 && selectedCount === einheiten.length

  function toggleSel(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleAll() {
    if (allSelected) {
      setSelected({})
      return
    }
    const next: Record<string, boolean> = {}
    for (const e of einheiten) next[e.id] = true
    setSelected(next)
  }

  const byEinheit = useMemo(() => {
    const map = new Map<string, EinheitBewohner[]>()
    for (const b of bewohner) {
      const list = map.get(b.objekt_einheit_id) ?? []
      list.push(b)
      map.set(b.objekt_einheit_id, list)
    }
    return map
  }, [bewohner])

  function peopleFor(einheitId: string) {
    return byEinheit.get(einheitId) ?? []
  }

  function metaFor(u: ObjektEinheit) {
    const people = peopleFor(u.id)
    const eigentuemer = people.filter((p) => p.rolle === 'eigentuemer').length
    const mieter = people.filter((p) => p.rolle !== 'eigentuemer').length
    return [
      u.etage?.trim() ? `Etage ${u.etage.trim()}` : null,
      u.wohnflaeche_m2 != null ? `${u.wohnflaeche_m2} m²` : null,
      eigentuemer ? `${eigentuemer} Eigentümer` : null,
      mieter ? `${mieter} Mieter` : null,
    ]
      .filter(Boolean)
      .join(' · ')
  }

  function openEinheitNeu() {
    setEinheitEdit(null)
    setBezeichnung('')
    setEtage('')
    setM2('')
    setEinheitErr(null)
    setEinheitDirty(false)
    setEinheitFormOpen(true)
  }

  function openEinheitBearbeiten(u: ObjektEinheit) {
    setEinheitEdit(u)
    setBezeichnung(u.bezeichnung)
    setEtage(u.etage?.trim() || '')
    setM2(u.wohnflaeche_m2 != null ? String(u.wohnflaeche_m2) : '')
    setEinheitErr(null)
    setEinheitDirty(false)
    setEinheitFormOpen(true)
  }

  function openPersonForm(
    einheitId: string,
    rolle: EinheitBewohnerRolle,
    edit: EinheitBewohner | null = null
  ) {
    if (edit) {
      const parts = edit.name.trim().split(/\s+/).filter(Boolean)
      setVorname(parts[0] ?? '')
      setNachname(parts.slice(1).join(' '))
      setEmail(edit.email ?? '')
      setTelefon(edit.telefon ?? '')
      setSeVerwaltung(Boolean(edit.sondereigentum_verwaltung))
      setMieteHinweis(edit.miete_hinweis ?? '')
    } else {
      setVorname('')
      setNachname('')
      setEmail('')
      setTelefon('')
      setSeVerwaltung(false)
      setMieteHinweis('')
    }
    setPersonErr(null)
    setPersonDirty(false)
    setPersonForm({ einheitId, rolle, edit })
  }

  function speichernEinheit() {
    const label = bezeichnung.trim()
    if (!label) {
      setEinheitErr('Bezeichnung ist erforderlich.')
      return
    }
    const fl = Number(String(m2).replace(',', '.'))
    const flaeche = Number.isFinite(fl) && fl > 0 ? fl : null
    setEinheitErr(null)
    startTransition(async () => {
      if (einheitEdit) {
        const r = await updateObjektEinheit(kundeId, objektId, einheitEdit.id, {
          bezeichnung: label,
          etage: etage.trim() || null,
          wohnflaeche_m2: flaeche,
        })
        if (!r.ok) {
          setEinheitErr(r.message)
          return
        }
        toast.success('Einheit gespeichert')
      } else {
        const r = await createObjektEinheit(kundeId, objektId, {
          bezeichnung: label,
          etage: etage.trim() || null,
          wohnflaeche_m2: flaeche,
        })
        if (!r.ok) {
          setEinheitErr(r.message)
          return
        }
        toast.success('Einheit angelegt')
        setDetail(r.einheit)
      }
      setEinheitFormOpen(false)
      onChanged()
    })
  }

  function speichernPerson() {
    if (!personForm) return
    const name = [vorname, nachname].map((s) => s.trim()).filter(Boolean).join(' ')
    if (!name) {
      setPersonErr('Vor- und Nachname sind erforderlich.')
      return
    }
    setPersonErr(null)
    const rolle = personForm.rolle
    startTransition(async () => {
      if (personForm.edit) {
        const r = await updateEinheitBewohner(kundeId, objektId, personForm.edit.id, {
          name,
          email,
          telefon,
          rolle,
          sondereigentum_verwaltung: rolle === 'eigentuemer' ? seVerwaltung : false,
          miete_hinweis: rolle === 'mieter' ? mieteHinweis.trim() || null : null,
        })
        if (!r.ok) {
          setPersonErr(r.message)
          return
        }
        toast.success('Gespeichert')
      } else {
        const r = await createEinheitBewohner(kundeId, objektId, {
          objekt_einheit_id: personForm.einheitId,
          name,
          email,
          telefon,
          rolle,
          sondereigentum_verwaltung: rolle === 'eigentuemer' ? seVerwaltung : false,
          miete_hinweis: rolle === 'mieter' ? mieteHinweis.trim() || null : null,
        })
        if (!r.ok) {
          setPersonErr(r.message)
          return
        }
        toast.success(`${EINHEIT_BEWOHNER_ROLLE_LABELS[rolle]} angelegt`)
      }
      setPersonForm(null)
      onChanged()
    })
  }

  function entfernenPerson(b: EinheitBewohner) {
    if (!confirm(`„${b.name}“ wirklich entfernen?`)) return
    startTransition(async () => {
      const r = await deleteEinheitBewohner(kundeId, objektId, b.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gelöscht')
      onChanged()
    })
  }

  function entfernenEinheit(u: ObjektEinheit) {
    startTransition(async () => {
      const r = await deleteObjektEinheit(kundeId, objektId, u.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      if (detail?.id === u.id) setDetail(null)
      toast.success('Einheit gelöscht')
      onChanged()
    })
  }

  async function runBulkDelete() {
    if (!selectedRows.length || bulkDeletePending) return
    setBulkDeletePending(true)
    try {
      const failed: string[] = []
      for (const u of selectedRows) {
        const r = await deleteObjektEinheit(kundeId, objektId, u.id)
        if (!r.ok) {
          failed.push(u.bezeichnung)
          continue
        }
        if (detail?.id === u.id) setDetail(null)
      }
      setSelected({})
      setBulkDeleteOpen(false)
      if (failed.length) {
        toast.error(
          failed.length === 1
            ? `„${failed[0]}“ konnte nicht gelöscht werden.`
            : `${failed.length} Einheiten konnten nicht gelöscht werden.`
        )
      } else {
        toast.success(
          selectedRows.length === 1
            ? 'Einheit gelöscht'
            : `${selectedRows.length} Einheiten gelöscht`
        )
      }
      onChanged()
    } finally {
      setBulkDeletePending(false)
    }
  }

  function openBearbeitenBulk() {
    if (selectedRows.length !== 1) return
    openEinheitBearbeiten(selectedRows[0]!)
  }

  function personMenu(b: EinheitBewohner, rolle: EinheitBewohnerRolle): EntityMenuItem[] {
    const linkedId = b.portal_kunde_id?.trim()
    const items: EntityMenuItem[] = [
      {
        icon: 'pencil',
        label: 'Bearbeiten',
        onClick: () => openPersonForm(b.objekt_einheit_id, rolle, b),
      },
    ]
    if (linkedId) {
      items.push({
        icon: 'user',
        label: 'Privatkunde öffnen',
        onClick: () => router.push(`/kunden/${linkedId}`),
      })
    } else {
      items.push({
        icon: 'user-plus',
        label: 'Als Privatkunde anlegen',
        onClick: () => setPrivatkundeTarget(b),
      })
    }
    items.push('sep', {
      icon: 'trash',
      label: 'Löschen',
      danger: true,
      onClick: () => {
        if (pending) return
        entfernenPerson(b)
      },
    })
    return items
  }

  function anlegenPrivatkunde(b: EinheitBewohner) {
    startTransition(async () => {
      const r = await createPrivatkundeFromBewohner(kundeId, objektId, b.id)
      if (r.ok) {
        toast.success(r.created ? 'Privatkunde angelegt' : 'Verknüpft')
        setPrivatkundeTarget(null)
        setPrivatkundeConflict(null)
        onChanged()
        router.push(`/kunden/${r.kundeId}`)
        return
      }
      if (r.code === 'already_linked' && r.linkedKundeId) {
        toast.success('Bereits verknüpft')
        setPrivatkundeTarget(null)
        router.push(`/kunden/${r.linkedKundeId}`)
        return
      }
      if (r.code === 'email_exists' && r.existingKundeId) {
        setPrivatkundeTarget(null)
        setPrivatkundeConflict({
          bewohner: b,
          existingKundeId: r.existingKundeId,
          existingKundeName: r.existingKundeName ?? 'Kunde',
          message: r.message,
        })
        return
      }
      toast.error(r.message)
      setPrivatkundeTarget(null)
    })
  }

  function verknuepfenPrivatkunde() {
    if (!privatkundeConflict) return
    const { bewohner: b, existingKundeId } = privatkundeConflict
    startTransition(async () => {
      const r = await linkPrivatkundeToBewohner(kundeId, objektId, b.id, existingKundeId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Mit bestehendem Kunden verknüpft')
      setPrivatkundeConflict(null)
      onChanged()
      router.push(`/kunden/${r.kundeId}`)
    })
  }

  const detailPeople = detail ? peopleFor(detail.id) : []
  const detailEigentuemer = detailPeople.filter((p) => p.rolle === 'eigentuemer')
  const detailMieter = detailPeople.filter((p) => p.rolle !== 'eigentuemer')
  const personEinheitLabel =
    personForm && einheiten.find((e) => e.id === personForm.einheitId)?.bezeichnung
  const canSavePerson = Boolean(vorname.trim() && nachname.trim())

  function renderPersonBlock(rolle: EinheitBewohnerRolle, people: EinheitBewohner[]) {
    if (!detail) return null
    const title = EINHEIT_BEWOHNER_ROLLE_LABELS[rolle]
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="form-section-h" style={{ margin: 0, border: 0, padding: 0, flex: 1 }}>
            {title}
          </div>
          <MockBtn
            sm
            kind="ghost"
            icon="plus"
            disabled={pending}
            onClick={() => openPersonForm(detail.id, rolle)}
          >
            {title}
          </MockBtn>
        </div>
        {people.length === 0 ? (
          <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
            Noch keine {title}.
          </p>
        ) : (
          <div className="listcard">
            <div className="list-row head" style={{ gridTemplateColumns: PERSON_COLS }} aria-hidden>
              <div>Name</div>
              <div>Kontakt</div>
              <div />
            </div>
            {people.map((b) => {
              const kontakt =
                [b.telefon?.trim(), b.email?.trim()].filter(Boolean).join(' · ') || '—'
              const hint =
                rolle === 'eigentuemer'
                  ? b.sondereigentum_verwaltung
                    ? 'SE-Verwaltung'
                    : null
                  : b.miete_hinweis?.trim() || null
              const linked = Boolean(b.portal_kunde_id?.trim())
              return (
                <div
                  key={b.id}
                  className="list-row"
                  style={{ gridTemplateColumns: PERSON_COLS, cursor: 'default' }}
                >
                  <div className="lc-title" style={{ fontWeight: 600 }}>
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      {b.name}
                      {linked ? <MockBadge kind="aktiv">Privatkunde</MockBadge> : null}
                    </span>
                    {hint ? (
                      <div
                        className="lc-sub"
                        style={{
                          fontSize: 'var(--fs-meta)',
                          fontWeight: 400,
                          color: 'var(--text-3)',
                          marginTop: 2,
                        }}
                      >
                        {hint}
                      </div>
                    ) : null}
                  </div>
                  <div
                    className="lc-sub"
                    style={{ color: 'var(--text-2)' }}
                    title={kontakt}
                  >
                    {kontakt}
                  </div>
                  <div
                    className="row-actions always"
                    onClick={(e) => e.stopPropagation()}
                    style={{ justifyContent: 'flex-end' }}
                  >
                    <MockEntityRowMenu items={personMenu(b, rolle)} title={title} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  function einheitRow(u: ObjektEinheit) {
    const people = peopleFor(u.id)
    const leer = people.length === 0
    const meta = metaFor(u)
    const isChecked = Boolean(selected[u.id])
    return (
      <div
        key={u.id}
        className={cn(
          isMobile ? 'ap-mobile-card ap-mobile-card--row' : 'ap-list__row ap-list__row--select',
          isChecked && 'is-checked'
        )}
      >
        <ListRowCheck
          checked={isChecked}
          onToggle={() => toggleSel(u.id)}
          title={`${u.bezeichnung} auswählen`}
        />
        <button
          type="button"
          className={isMobile ? 'ap-mobile-card__hit' : 'ap-list__hit'}
          onClick={() => setDetail(u)}
        >
          {isMobile ? (
            <>
              <div className="ap-mobile-card__top">
                <span className="ap-mobile-card__name">{u.bezeichnung}</span>
                <MockBadge kind={leer ? 'warten' : 'aktiv'}>{leer ? 'leer' : 'belegt'}</MockBadge>
              </div>
              <div className="ap-mobile-card__meta">{meta || 'Keine Personen'}</div>
            </>
          ) : (
            <>
              <span className="ap-list__name-cell">{u.bezeichnung}</span>
              <span className="ap-list__dim">{meta || 'Keine Personen'}</span>
              <span className="ap-list__dim">
                <MockBadge kind={leer ? 'warten' : 'aktiv'}>{leer ? 'leer' : 'belegt'}</MockBadge>
              </span>
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <>
      <MockCard
        title={einheiten.length ? `Einheiten · ${einheiten.length}` : 'Einheiten'}
        icon="building"
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {einheiten.length > 0 ? (
              <MockBtn
                sm
                kind="ghost"
                onClick={toggleAll}
                title={allSelected ? 'Auswahl aufheben' : 'Alle auswählen'}
              >
                {allSelected ? 'Keine' : 'Alle'}
              </MockBtn>
            ) : null}
            <MockBtn sm kind="primary" icon="plus" onClick={openEinheitNeu} disabled={pending}>
              Hinzufügen
            </MockBtn>
          </div>
        }
      >
        <p
          className="mb-3 text-[length:var(--fs-meta)] leading-relaxed"
          style={{ color: 'var(--text-3)' }}
        >
          Einheit öffnen → Eigentümer und Mieter verwalten (wie im HV-Portal).
        </p>

        {selectedCount > 0 ? (
          <div className="bulkbar" style={{ marginBottom: 12 }}>
            <span className="bulkbar-count">
              <b>{selectedCount}</b> ausgewählt
            </span>
            <div style={{ flex: 1 }} />
            {selectedCount === 1 ? (
              <MockBtn
                kind="ghost"
                sm
                icon="pencil"
                onClick={openBearbeitenBulk}
                disabled={pending}
              >
                Bearbeiten
              </MockBtn>
            ) : null}
            <MockBtn
              kind="danger"
              sm
              icon="trash"
              onClick={() => setBulkDeleteOpen(true)}
              disabled={bulkDeletePending || pending}
            >
              Löschen
            </MockBtn>
            <MockBtn
              kind="ghost"
              sm
              className="qa-btn bulkbar-clear"
              icon="x"
              onClick={() => setSelected({})}
              title="Auswahl aufheben"
            />
          </div>
        ) : null}

        {einheiten.length === 0 ? (
          <MockEmpty
            icon="building"
            title="Noch keine Einheiten"
            hint="Einheit anlegen — danach Eigentümer und Mieter zuordnen. Über „+“ oben hinzufügen."
          />
        ) : isMobile ? (
          <div className="ap-cards vg-selectmode">{einheiten.map(einheitRow)}</div>
        ) : (
          <div className="ap-list vg-selectmode">
            <div className="ap-list__head ap-list__head--select">
              <span aria-hidden />
              <span>Einheit</span>
              <span>Details</span>
              <span>Status</span>
            </div>
            {einheiten.map(einheitRow)}
          </div>
        )}
      </MockCard>

      <MockModal
        open={bulkDeleteOpen}
        onClose={() => {
          if (!bulkDeletePending) setBulkDeleteOpen(false)
        }}
        icon="trash"
        title={selectedCount === 1 ? 'Einheit löschen?' : `${selectedCount} Einheiten löschen?`}
        sub="Zugeordnete Personen werden mitgelöscht."
        size="sm"
        footer={
          <>
            <MockBtn kind="ghost" disabled={bulkDeletePending} onClick={() => setBulkDeleteOpen(false)}>
              Abbrechen
            </MockBtn>
            <div style={{ flex: 1 }} />
            <MockBtn
              kind="danger"
              icon={bulkDeletePending ? undefined : 'trash'}
              disabled={bulkDeletePending}
              onClick={() => void runBulkDelete()}
            >
              {bulkDeletePending ? 'Wird gelöscht…' : 'Löschen'}
            </MockBtn>
          </>
        }
      >
        <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.5 }}>
          {bulkDeletePending
            ? 'Bitte warten…'
            : selectedCount === 1
              ? `„${selectedRows[0]?.bezeichnung ?? 'Einheit'}“ wird unwiderruflich gelöscht.`
              : `${selectedCount} ausgewählte Einheiten werden unwiderruflich gelöscht.`}
        </div>
      </MockModal>

      {/* Detail: Einheit + Personen */}
      <EditorSheet
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.bezeichnung ?? 'Einheit'}
        crumb="Einheiten >"
        size="md"
        footer={
          detail ? (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <MockBtn
                kind="danger"
                sm
                icon="trash"
                disabled={pending}
                onClick={() => {
                  if (!detail || pending) return
                  entfernenEinheit(detail)
                }}
              >
                Löschen
              </MockBtn>
              <MockBtn
                kind="ghost"
                sm
                icon="pencil"
                disabled={pending}
                onClick={() => openEinheitBearbeiten(detail)}
              >
                Bearbeiten
              </MockBtn>
            </div>
          ) : null
        }
      >
        {detail ? (
          <div className="space-y-5">
            <div>
              <div className="form-section-h">Einheit</div>
              <p style={{ margin: '0 0 4px', fontSize: 'var(--fs-text)', color: 'var(--text-2)' }}>
                {[
                  detail.etage?.trim() ? `Etage ${detail.etage.trim()}` : null,
                  detail.wohnflaeche_m2 != null ? `${detail.wohnflaeche_m2} m²` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Keine weiteren Angaben'}
              </p>
              <div className="vgid-chips" style={{ marginTop: 8 }}>
                <span className="vgid-chip ghost">
                  <MockIcon ctx="default" n="users" size={14} />
                  {detailEigentuemer.length} Eigentümer
                </span>
                <span className="vgid-chip ghost">
                  <MockIcon ctx="default" n="users" size={14} />
                  {detailMieter.length} Mieter
                </span>
              </div>
            </div>
            {renderPersonBlock('eigentuemer', detailEigentuemer)}
            {renderPersonBlock('mieter', detailMieter)}
          </div>
        ) : null}
      </EditorSheet>

      {/* Anlegen / Bearbeiten Einheit */}
      <EditorSheet
        open={einheitFormOpen}
        onClose={() => setEinheitFormOpen(false)}
        title={einheitEdit ? 'Einheit bearbeiten' : 'Einheit anlegen'}
        crumb="Einheiten >"
        dirty={einheitDirty}
        size="md"
        onConfirm={speichernEinheit}
        confirmDisabled={pending || !bezeichnung.trim()}
        confirmBusy={pending}
      >
        <div className="kunde-create">
          {einheitErr ? <p className="kunde-create__err">{einheitErr}</p> : null}
          <MockFormSection title="Einheit" icon="building">
            <MockField label="Bezeichnung" required full>
              <input
                className="input"
                value={bezeichnung}
                onChange={(e) => {
                  setBezeichnung(e.target.value)
                  setEinheitDirty(true)
                }}
                placeholder="z. B. WE 12"
              />
            </MockField>
            <MockField label="Etage (optional)" full>
              <input
                className="input"
                value={etage}
                onChange={(e) => {
                  setEtage(e.target.value)
                  setEinheitDirty(true)
                }}
                placeholder="z. B. 3. OG"
              />
            </MockField>
            <MockField label="Wohnfläche m² (optional)" full>
              <input
                className="input"
                value={m2}
                onChange={(e) => {
                  setM2(e.target.value)
                  setEinheitDirty(true)
                }}
                placeholder="z. B. 68"
                inputMode="decimal"
              />
            </MockField>
          </MockFormSection>
        </div>
      </EditorSheet>

      {/* Anlegen / Bearbeiten Person */}
      <EditorSheet
        open={Boolean(personForm)}
        onClose={() => setPersonForm(null)}
        title={
          personForm?.edit
            ? `${EINHEIT_BEWOHNER_ROLLE_LABELS[personForm.rolle]} bearbeiten`
            : personForm?.rolle === 'eigentuemer'
              ? 'Eigentümer hinzufügen'
              : 'Mieter hinzufügen'
        }
        crumb={personEinheitLabel ? `Einheiten › ${personEinheitLabel} >` : 'Einheiten >'}
        dirty={personDirty}
        size="md"
        onConfirm={speichernPerson}
        confirmDisabled={pending || !canSavePerson}
        confirmBusy={pending}
      >
        <div className="kunde-create">
          {personErr ? <p className="kunde-create__err">{personErr}</p> : null}
          <MockFormSection
            title={personForm ? EINHEIT_BEWOHNER_ROLLE_LABELS[personForm.rolle] : 'Person'}
            icon="users"
          >
            <MockField label="Vorname" required>
              <input
                className="input"
                value={vorname}
                onChange={(e) => {
                  setVorname(e.target.value)
                  setPersonDirty(true)
                }}
                placeholder="Max"
                autoComplete="given-name"
              />
            </MockField>
            <MockField label="Nachname" required>
              <input
                className="input"
                value={nachname}
                onChange={(e) => {
                  setNachname(e.target.value)
                  setPersonDirty(true)
                }}
                placeholder="Mustermann"
                autoComplete="family-name"
              />
            </MockField>
            <MockField label="E-Mail (optional)" full>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setPersonDirty(true)
                }}
                placeholder="max@example.de"
                autoComplete="email"
              />
            </MockField>
            <MockField label="Telefon (optional)" full>
              <input
                className="input"
                type="tel"
                value={telefon}
                onChange={(e) => {
                  setTelefon(e.target.value)
                  setPersonDirty(true)
                }}
                placeholder="+49 …"
                autoComplete="tel"
              />
            </MockField>
            {personForm?.rolle === 'eigentuemer' ? (
              <MockField label="Sondereigentumsverwaltung" full>
                <label
                  className="flex items-center gap-2"
                  style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)' }}
                >
                  <input
                    type="checkbox"
                    checked={seVerwaltung}
                    onChange={(e) => {
                      setSeVerwaltung(e.target.checked)
                      setPersonDirty(true)
                    }}
                  />
                  HV führt SE-Aufträge (Freigabe über Schwelle beim Eigentümer)
                </label>
              </MockField>
            ) : (
              <MockField label="Miet-Hinweis (optional)" full>
                <input
                  className="input"
                  value={mieteHinweis}
                  onChange={(e) => {
                    setMieteHinweis(e.target.value)
                    setPersonDirty(true)
                  }}
                  placeholder="z. B. seit 2022"
                />
              </MockField>
            )}
          </MockFormSection>
        </div>
      </EditorSheet>

      <EditorSheet
        open={Boolean(privatkundeTarget)}
        onClose={() => setPrivatkundeTarget(null)}
        title="Als Privatkunde anlegen"
        crumb="Einheiten >"
        size="md"
        onConfirm={() => privatkundeTarget && anlegenPrivatkunde(privatkundeTarget)}
        confirmDisabled={pending || !privatkundeTarget}
        confirmBusy={pending}
        compose
        composeLabel="Anlegen"
      >
        {privatkundeTarget ? (
          <div className="space-y-3">
            <p style={{ margin: 0, fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.45 }}>
              Legt einen eigenen CRM-Kunden für{' '}
              <strong>{privatkundeTarget.name}</strong> an — für Anfragen, Aufträge und
              Rechnungen im CRM.
            </p>
            <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-3)', lineHeight: 1.45 }}>
              Die Person bleibt weiterhin in der Objektakte der HV. Im Portal gibt es keine
              eigenen Vorgänge außerhalb der Hausverwaltung.
            </p>
            <div className="form-section-h">Übernahme</div>
            <p style={{ margin: 0, fontSize: 'var(--fs-text)', color: 'var(--text-2)' }}>
              {[privatkundeTarget.email, privatkundeTarget.telefon].filter(Boolean).join(' · ') ||
                'Keine Kontaktdaten — nur Name wird übernommen.'}
            </p>
          </div>
        ) : null}
      </EditorSheet>

      <EditorSheet
        open={Boolean(privatkundeConflict)}
        onClose={() => setPrivatkundeConflict(null)}
        title="Kunde verknüpfen?"
        crumb="Einheiten >"
        size="md"
        onConfirm={verknuepfenPrivatkunde}
        confirmDisabled={pending || !privatkundeConflict}
        confirmBusy={pending}
        compose
        composeLabel="Verknüpfen"
      >
        {privatkundeConflict ? (
          <div className="space-y-3">
            <p style={{ margin: 0, fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.45 }}>
              {privatkundeConflict.message}
            </p>
            <p style={{ margin: 0, fontSize: 'var(--fs-text)', color: 'var(--text)', fontWeight: 600 }}>
              {privatkundeConflict.existingKundeName}
            </p>
            <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
              Person: {privatkundeConflict.bewohner.name}
            </p>
          </div>
        ) : null}
      </EditorSheet>
    </>
  )
}

'use client'

import { useTransition } from '@/components/ui/action-busy'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { MockIcon } from '@/components/mock-ui/MockIcon'
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

const EINHEIT_COLS = 'minmax(0, 1.4fr) minmax(0, 1.2fr) 72px 28px'
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
  const [einheiten, setEinheiten] = useState(() =>
    initialEinheiten.filter((e) => e.aktiv !== false)
  )
  const [bewohner, setBewohner] = useState(() =>
    initialBewohner.filter((b) => b.aktiv !== false)
  )
  const [pending, startTransition] = useTransition()

  const [detail, setDetail] = useState<ObjektEinheit | null>(null)

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
    if (!detail) return
    const next = einheiten.find((e) => e.id === detail.id) ?? null
    setDetail(next)
  }, [einheiten, detail?.id])

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
      toast.success('Entfernt')
      onChanged()
    })
  }

  function entfernenEinheit(u: ObjektEinheit) {
    if (
      !confirm(
        `Einheit „${u.bezeichnung}“ wirklich entfernen? Zugeordnete Personen werden mitentfernt.`
      )
    ) {
      return
    }
    startTransition(async () => {
      const r = await deleteObjektEinheit(kundeId, objektId, u.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      if (detail?.id === u.id) setDetail(null)
      toast.success('Einheit entfernt')
      onChanged()
    })
  }

  function einheitMenu(u: ObjektEinheit): EntityMenuItem[] {
    return [
      { icon: 'eye', label: 'Details', onClick: () => setDetail(u) },
      { icon: 'pencil', label: 'Bearbeiten', onClick: () => openEinheitBearbeiten(u) },
      'sep',
      {
        icon: 'trash',
        label: 'Löschen',
        danger: true,
        onClick: () => {
          if (pending) return
          entfernenEinheit(u)
        },
      },
    ]
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

  return (
    <>
      <MockCard
        title={
          einheiten.length
            ? `Einheiten · ${einheiten.length}`
            : 'Einheiten'
        }
        icon="building"
        actions={
          <MockBtn sm kind="primary" icon="plus" onClick={openEinheitNeu} disabled={pending}>
            Einheit
          </MockBtn>
        }
      >
        <p
          className="mb-3 text-[length:var(--fs-meta)] leading-relaxed"
          style={{ color: 'var(--text-3)' }}
        >
          Einheit öffnen → Eigentümer und Mieter verwalten (wie im HV-Portal).
        </p>
        {einheiten.length === 0 ? (
          <MockEmpty
            icon="building"
            title="Noch keine Einheiten"
            hint="Einheit anlegen — danach Eigentümer und Mieter zuordnen"
          />
        ) : (
          <div className="listcard">
            <div className="list-row head" style={{ gridTemplateColumns: EINHEIT_COLS }} aria-hidden>
              <div>Einheit</div>
              <div>Details</div>
              <div>Status</div>
              <div />
            </div>
            {einheiten.map((u) => {
              const people = peopleFor(u.id)
              const leer = people.length === 0
              const meta = metaFor(u)
              return (
                <div
                  key={u.id}
                  role="button"
                  tabIndex={0}
                  className="list-row"
                  style={{ gridTemplateColumns: EINHEIT_COLS, alignItems: 'center' }}
                  onClick={() => setDetail(u)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault()
                      setDetail(u)
                    }
                  }}
                >
                  <div className="lc-title" style={{ fontWeight: 600 }}>
                    {u.bezeichnung}
                  </div>
                  <div
                    className="lc-sub"
                    style={{ color: 'var(--text-2)' }}
                    title={meta || 'Keine Personen'}
                  >
                    {meta || 'Keine Personen'}
                  </div>
                  <div className="lc-pills">
                    <MockBadge kind={leer ? 'warten' : 'aktiv'}>
                      {leer ? 'leer' : 'belegt'}
                    </MockBadge>
                  </div>
                  <div
                    className="row-actions always"
                    onClick={(e) => e.stopPropagation()}
                    style={{ justifyContent: 'flex-end' }}
                  >
                    <MockEntityRowMenu items={einheitMenu(u)} title="Einheit" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </MockCard>

      {/* Detail: Einheit + Personen */}
      <EditorSheet
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.bezeichnung ?? 'Einheit'}
        crumb="Einheiten >"
        size="md"
        footer={
          detail ? (
            <div className="kunde-create-footer">
              <button
                type="button"
                className="btn ghost"
                disabled={pending}
                onClick={() => openEinheitBearbeiten(detail)}
              >
                Bearbeiten
              </button>
              <MockBtn
                kind="ghost"
                disabled={pending}
                onClick={() => entfernenEinheit(detail)}
              >
                Entfernen
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

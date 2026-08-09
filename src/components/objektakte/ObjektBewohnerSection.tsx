'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  createEinheitBewohner,
  deleteEinheitBewohner,
  updateEinheitBewohner,
} from '@/app/actions/objektakte-actions'
import type { EntityMenuItem } from '@/lib/entity-menu'
import type { EinheitBewohner, ObjektEinheit } from '@/lib/objektakte/types'
import { toast } from '@/components/ui/app-toast'

const COLS = 'minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1.2fr) 44px'

export function ObjektBewohnerSection({
  kundeId,
  objektId,
  einheiten,
  bewohner: initial,
  onChanged,
}: {
  kundeId: string
  objektId: string
  einheiten: ObjektEinheit[]
  bewohner: EinheitBewohner[]
  onChanged: () => void
}) {
  const [liste, setListe] = useState(initial)
  const [modalOpen, setModalOpen] = useState(false)
  const [edit, setEdit] = useState<EinheitBewohner | null>(null)
  const [pending, startTransition] = useTransition()

  const [einheitId, setEinheitId] = useState('')
  const [name, setName] = useState('')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  const einheitOptions = useMemo(
    () => [
      { value: '', label: '— Einheit wählen —' },
      ...einheiten.map((e) => ({ value: e.id, label: e.bezeichnung })),
    ],
    [einheiten]
  )

  useEffect(() => {
    setListe(initial)
  }, [initial])

  function openNeu() {
    setEdit(null)
    setEinheitId(einheiten[0]?.id ?? '')
    setName('')
    setTelefon('')
    setEmail('')
    setErr(null)
    setDirty(false)
    setModalOpen(true)
  }

  function openBearbeiten(b: EinheitBewohner) {
    setEdit(b)
    setEinheitId(b.objekt_einheit_id)
    setName(b.name)
    setTelefon(b.telefon ?? '')
    setEmail(b.email ?? '')
    setErr(null)
    setDirty(false)
    setModalOpen(true)
  }

  function speichern() {
    setErr(null)
    startTransition(async () => {
      if (edit) {
        const r = await updateEinheitBewohner(kundeId, objektId, edit.id, {
          name,
          telefon,
          email,
        })
        if (!r.ok) {
          setErr(r.message)
          return
        }
        setListe((prev) =>
          prev.map((b) =>
            b.id === edit.id
              ? {
                  ...b,
                  name: name.trim(),
                  telefon: telefon.trim() || null,
                  email: email.trim() || null,
                }
              : b
          )
        )
        toast.success('Bewohner gespeichert')
      } else {
        const r = await createEinheitBewohner(kundeId, objektId, {
          objekt_einheit_id: einheitId,
          name,
          telefon,
          email,
        })
        if (!r.ok) {
          setErr(r.message)
          return
        }
        setListe((prev) => [...prev, r.bewohner])
        toast.success('Bewohner angelegt')
      }
      setDirty(false)
      setModalOpen(false)
      onChanged()
    })
  }

  function entfernen(b: EinheitBewohner) {
    if (!confirm(`Bewohner „${b.name}“ entfernen?`)) return
    startTransition(async () => {
      const r = await deleteEinheitBewohner(kundeId, objektId, b.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setListe((prev) => prev.filter((x) => x.id !== b.id))
      toast.success('Bewohner entfernt')
      onChanged()
    })
  }

  function rowMenuItems(b: EinheitBewohner): EntityMenuItem[] {
    return [
      { icon: 'pencil', label: 'Bearbeiten', onClick: () => openBearbeiten(b) },
      'sep',
      {
        icon: 'trash',
        label: 'Löschen',
        danger: true,
        onClick: () => {
          if (pending) return
          entfernen(b)
        },
      },
    ]
  }

  return (
    <>
      <MockCard
        title={liste.length ? `Bewohner · ${liste.length}` : 'Bewohner'}
        icon="users"
        actions={
          <MockBtn sm kind="primary" icon="plus" onClick={openNeu} disabled={einheiten.length === 0}>
            Hinzufügen
          </MockBtn>
        }
      >
        <p className="mb-3 text-[length:var(--fs-meta)] leading-relaxed" style={{ color: 'var(--text-3)' }}>
          Bewohner je Einheit — Einheiten werden im HV-Portal gepflegt.
        </p>
        {einheiten.length === 0 ? (
          <MockEmpty
            icon="users"
            title="Noch keine Einheiten"
            hint="Bitte im Auftraggeber-Portal unter „Einheiten“ anlegen"
          />
        ) : liste.length === 0 ? (
          <MockEmpty icon="users" title="Noch keine Bewohner" hint="Bewohner hinzufügen" />
        ) : (
          <div className="listcard">
            <div className="list-row head" style={{ gridTemplateColumns: COLS }} aria-hidden>
              <div>Name</div>
              <div>Einheit</div>
              <div>Kontakt</div>
              <div />
            </div>
            {liste.map((b) => {
              const kontaktZeile = [b.telefon?.trim(), b.email?.trim()].filter(Boolean).join(' · ') || '—'
              return (
                <div key={b.id} className="list-row" style={{ gridTemplateColumns: COLS, cursor: 'default' }}>
                  <div className="lc-title" style={{ fontWeight: 600 }}>
                    {b.name}
                  </div>
                  <div className="lc-sub" style={{ color: 'var(--text-2)' }}>
                    {b.objekt_einheiten?.bezeichnung ?? 'Einheit'}
                  </div>
                  <div
                    className="lc-sub"
                    style={{
                      color: 'var(--text-2)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={kontaktZeile}
                  >
                    {kontaktZeile}
                  </div>
                  <div
                    className="row-actions always"
                    onClick={(e) => e.stopPropagation()}
                    style={{ justifyContent: 'flex-end' }}
                  >
                    <MockEntityRowMenu items={rowMenuItems(b)} title="Bewohner" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </MockCard>

      <EditorSheet
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Bewohner"
        context="detail"
        dirty={dirty}
        confirmBusy={pending}
        confirmDisabled={pending || (!edit && !einheitId)}
        onConfirm={speichern}
      >
        <div className="space-y-3">
          {!edit ? (
            <Select
              label="Einheit"
              name="einheit"
              value={einheitId}
              onChange={(e) => {
                setDirty(true)
                setEinheitId(e.target.value)
              }}
              options={einheitOptions}
            />
          ) : (
            <p className="text-[length:var(--fs-text)]" style={{ color: 'var(--text-3)' }}>
              Einheit: {edit.objekt_einheiten?.bezeichnung ?? '—'}
            </p>
          )}
          <Input
            label="Name"
            value={name}
            onChange={(e) => {
              setDirty(true)
              setName(e.target.value)
            }}
            required
          />
          <Input
            label="Telefon"
            value={telefon}
            onChange={(e) => {
              setDirty(true)
              setTelefon(e.target.value)
            }}
            type="tel"
          />
          <Input
            label="E-Mail"
            value={email}
            onChange={(e) => {
              setDirty(true)
              setEmail(e.target.value)
            }}
            type="email"
          />
          {err ? <p className="text-[length:var(--fs-text)] text-danger">{err}</p> : null}
        </div>
      </EditorSheet>
    </>
  )
}

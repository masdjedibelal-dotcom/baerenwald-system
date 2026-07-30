'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useState } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import {
  createObjektKontakt,
  deleteObjektKontakt,
  updateObjektKontakt,
} from '@/app/actions/objektakte-actions'
import {
  OBJEKT_KONTAKT_ROLLE_LABELS,
  OBJEKT_KONTAKT_ROLLEN,
} from '@/lib/objektakte/labels'
import type { EntityMenuItem } from '@/lib/entity-menu'
import type { ObjektKontakt, ObjektKontaktInput, ObjektKontaktRolle } from '@/lib/objektakte/types'
import { toast } from '@/components/ui/app-toast'

const ROLLE_OPTIONS = OBJEKT_KONTAKT_ROLLEN.map((r) => ({
  value: r,
  label: OBJEKT_KONTAKT_ROLLE_LABELS[r],
}))

const COLS = 'minmax(0, 1.3fr) 120px minmax(0, 1.2fr) 44px'

export function ObjektKontakteSection({
  kundeId,
  objektId,
  kontakte: initial,
  onChanged,
}: {
  kundeId: string
  objektId: string
  kontakte: ObjektKontakt[]
  onChanged: () => void
}) {
  const [liste, setListe] = useState(initial)
  const [modalOpen, setModalOpen] = useState(false)
  const [edit, setEdit] = useState<ObjektKontakt | null>(null)
  const [pending, startTransition] = useTransition()

  const [rolle, setRolle] = useState<ObjektKontaktRolle>('hausmeister')
  const [name, setName] = useState('')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [notiz, setNotiz] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setListe(initial)
  }, [initial])

  function openNeu() {
    setEdit(null)
    setRolle('hausmeister')
    setName('')
    setTelefon('')
    setEmail('')
    setNotiz('')
    setErr(null)
    setDirty(false)
    setModalOpen(true)
  }

  function openBearbeiten(k: ObjektKontakt) {
    setEdit(k)
    setRolle(k.rolle)
    setName(k.name)
    setTelefon(k.telefon ?? '')
    setEmail(k.email ?? '')
    setNotiz(k.notiz ?? '')
    setErr(null)
    setDirty(false)
    setModalOpen(true)
  }

  function speichern() {
    const payload: ObjektKontaktInput = {
      rolle,
      name,
      telefon,
      email,
      notiz,
    }
    setErr(null)
    startTransition(async () => {
      if (edit) {
        const r = await updateObjektKontakt(kundeId, objektId, edit.id, payload)
        if (!r.ok) {
          setErr(r.message)
          return
        }
        setListe((prev) =>
          prev.map((k) =>
            k.id === edit.id
              ? {
                  ...k,
                  ...payload,
                  telefon: payload.telefon?.trim() || null,
                  email: payload.email?.trim() || null,
                  notiz: payload.notiz?.trim() || null,
                  name: payload.name.trim(),
                }
              : k
          )
        )
        toast.success('Kontakt gespeichert')
      } else {
        const r = await createObjektKontakt(kundeId, objektId, payload)
        if (!r.ok) {
          setErr(r.message)
          return
        }
        setListe((prev) => [...prev, r.kontakt])
        toast.success('Kontakt angelegt')
      }
      setDirty(false)
      setModalOpen(false)
      onChanged()
    })
  }

  function entfernen(k: ObjektKontakt) {
    if (!confirm(`Kontakt „${k.name}“ entfernen?`)) return
    startTransition(async () => {
      const r = await deleteObjektKontakt(kundeId, objektId, k.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setListe((prev) => prev.filter((x) => x.id !== k.id))
      toast.success('Kontakt entfernt')
      onChanged()
    })
  }

  function rowMenuItems(k: ObjektKontakt): EntityMenuItem[] {
    return [
      { icon: 'pencil', label: 'Bearbeiten', onClick: () => openBearbeiten(k) },
      'sep',
      {
        icon: 'trash',
        label: 'Löschen',
        danger: true,
        onClick: () => {
          if (pending) return
          entfernen(k)
        },
      },
    ]
  }

  return (
    <>
      <MockCard
        title={liste.length ? `Kontakte vor Ort · ${liste.length}` : 'Kontakte vor Ort'}
        icon="user"
        actions={
          <MockBtn sm kind="primary" icon="plus" onClick={openNeu}>
            Hinzufügen
          </MockBtn>
        }
      >
        <p className="mb-3 text-[length:var(--fs-meta)] leading-relaxed" style={{ color: 'var(--text-3)' }}>
          Hausmeister, Beirat, Notfallkontakte — für die Disposition.
        </p>
        {liste.length === 0 ? (
          <MockEmpty icon="user" title="Noch keine Kontakte" hint="Kontakt hinzufügen" />
        ) : (
          <div className="listcard">
            <div className="list-row head" style={{ gridTemplateColumns: COLS }} aria-hidden>
              <div>Name</div>
              <div>Rolle</div>
              <div>Kontakt</div>
              <div />
            </div>
            {liste.map((k) => {
              const kontaktZeile = [k.telefon?.trim(), k.email?.trim()].filter(Boolean).join(' · ') || '—'
              return (
                <div key={k.id} className="list-row" style={{ gridTemplateColumns: COLS, cursor: 'default' }}>
                  <div className="lc-title" style={{ fontWeight: 600 }}>
                    {k.name}
                    {k.notiz ? (
                      <div
                        className="lc-sub"
                        style={{
                          fontSize: 'var(--fs-meta)',
                          fontWeight: 400,
                          color: 'var(--text-3)',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={k.notiz}
                      >
                        {k.notiz}
                      </div>
                    ) : null}
                  </div>
                  <div className="lc-pills">
                    <span className="pill-tag" style={{ cursor: 'default' }}>
                      {OBJEKT_KONTAKT_ROLLE_LABELS[k.rolle]}
                    </span>
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
                    <MockEntityRowMenu items={rowMenuItems(k)} title="Kontakt" />
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
        title="Kontakt"
        context="detail"
        dirty={dirty}
        confirmBusy={pending}
        onConfirm={speichern}
      >
        <div className="space-y-3">
          <Select
            label="Rolle"
            name="rolle"
            value={rolle}
            onChange={(e) => {
              setDirty(true)
              setRolle(e.target.value as ObjektKontaktRolle)
            }}
            options={ROLLE_OPTIONS}
          />
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
          <Textarea
            label="Notiz"
            value={notiz}
            onChange={(e) => {
              setDirty(true)
              setNotiz(e.target.value)
            }}
            rows={3}
          />
          {err ? <p className="text-[length:var(--fs-text)] text-danger">{err}</p> : null}
        </div>
      </EditorSheet>
    </>
  )
}

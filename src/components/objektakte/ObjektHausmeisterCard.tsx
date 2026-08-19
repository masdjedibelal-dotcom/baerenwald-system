'use client'

import { useEffect, useState } from 'react'
import { useTransition } from '@/components/ui/action-busy'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { toast } from '@/components/ui/app-toast'
import {
  inviteObjektHausmeister,
  removeObjektHausmeister,
  saveObjektHausmeister,
} from '@/app/actions/org-hausmeister'
import { PortalLoginIconButton } from '@/components/portal/PortalLoginIconButton'
import type { HausmeisterAmObjekt, OrgHausmeister } from '@/lib/org/org-hausmeister-types'

type Props = {
  kundeId: string
  objektId: string
  liste: OrgHausmeister[]
  amObjekt: HausmeisterAmObjekt | null
  onChanged: () => void
}

/**
 * Hausmeister am Objekt — analog HV-Portal:
 * ohne Zuordnung → neu anlegen; optional bestehenden Org-HM zuweisen.
 */
export function ObjektHausmeisterCard({
  kundeId,
  objektId,
  liste: initialListe,
  amObjekt: initialAmObjekt,
  onChanged,
}: Props) {
  const [liste, setListe] = useState(initialListe)
  const [amObjekt, setAmObjekt] = useState(initialAmObjekt)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const [mode, setMode] = useState<'existing' | 'new'>('new')
  const [hmId, setHmId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [portalZugang, setPortalZugang] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setListe(initialListe)
    setAmObjekt(initialAmObjekt)
  }, [initialListe, initialAmObjekt])

  function openSheet() {
    setErr(null)
    // Wie Portal: am Objekt schon HM → bearbeiten; sonst → neu anlegen
    if (amObjekt && !amObjekt.isLegacy) {
      setMode('existing')
      setHmId(amObjekt.id)
      setName(amObjekt.name)
      setEmail(amObjekt.email ?? '')
      setPortalZugang(Boolean(amObjekt.portal_zugang))
    } else {
      setMode('new')
      setHmId('')
      setName(amObjekt?.isLegacy ? amObjekt.name : '')
      setEmail(amObjekt?.isLegacy ? amObjekt.email ?? '' : '')
      setPortalZugang(false)
    }
    setSheetOpen(true)
  }

  function onSelectChange(v: string) {
    if (v === '__new__') {
      setMode('new')
      setHmId('')
      setName('')
      setEmail('')
      setPortalZugang(false)
      return
    }
    setMode('existing')
    setHmId(v)
    const found = liste.find((h) => h.id === v)
    if (found) {
      setName(found.name)
      setEmail(found.email ?? '')
      setPortalZugang(Boolean(found.portal_zugang))
    }
  }

  function speichern() {
    setErr(null)
    if (mode === 'new' && !name.trim()) {
      setErr('Bitte Name eingeben.')
      return
    }
    if (mode === 'new' && portalZugang && !email.trim()) {
      setErr('E-Mail ist für Portal-Zugang erforderlich.')
      return
    }
    if (mode === 'existing' && !hmId) {
      setErr('Bitte Hausmeister wählen.')
      return
    }

    startTransition(async () => {
      const invite = mode === 'new' ? portalZugang : false
      const r = await saveObjektHausmeister(kundeId, objektId, {
        hausmeisterId: mode === 'existing' ? hmId : null,
        name: name.trim() || undefined,
        email: mode === 'new' ? (portalZugang ? email : null) : email || null,
        portalZugang,
        invite,
      })
      if (!r.ok) {
        setErr(r.message)
        toast.error(r.message)
        return
      }
      toast.success(mode === 'new' ? 'Hausmeister angelegt' : 'Hausmeister gespeichert')
      setSheetOpen(false)
      if (r.inviteMailto) {
        window.location.href = r.inviteMailto
      }
      onChanged()
    })
  }

  function entfernen() {
    if (!amObjekt || amObjekt.isLegacy) return
    startTransition(async () => {
      const r = await removeObjektHausmeister(kundeId, objektId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Zuordnung entfernt')
      onChanged()
    })
  }

  function einladen() {
    if (!amObjekt || amObjekt.isLegacy || !amObjekt.portal_zugang) return
    startTransition(async () => {
      const r = await inviteObjektHausmeister(kundeId, objektId, amObjekt.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Einladungslink erzeugt')
      if (r.inviteMailto) {
        window.location.href = r.inviteMailto
      } else if (r.inviteUrl) {
        try {
          await navigator.clipboard.writeText(r.inviteUrl)
          toast.success('Link in Zwischenablage')
        } catch {
          toast.message(r.inviteUrl)
        }
      }
      onChanged()
    })
  }

  const selectOptions = [
    { value: '__new__', label: '＋ Neu anlegen' },
    ...liste.map((h) => ({
      value: h.id,
      label: h.portal_zugang ? `${h.name} · Portal` : h.name,
    })),
  ]

  const ctaLabel =
    amObjekt && !amObjekt.isLegacy
      ? 'Bearbeiten'
      : amObjekt?.isLegacy
        ? 'Als Org-HM speichern'
        : liste.length > 0
          ? 'Anlegen / Zuweisen'
          : 'Anlegen'

  return (
    <>
      <MockCard
        title="Hausmeister"
        icon="key"
        actions={
          <MockBtn sm kind="ghost" onClick={openSheet} disabled={pending}>
            {ctaLabel}
          </MockBtn>
        }
      >
        {!amObjekt ? (
          <MockEmpty
            title="Kein Hausmeister"
            hint="Neu anlegen oder bestehenden Org-Hausmeister zuweisen — Pflicht für Meldungen."
          />
        ) : (
          <div className="space-y-2" style={{ fontSize: 'var(--fs-body)' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{amObjekt.name}</div>
              {amObjekt.email ? (
                <div style={{ color: 'var(--text-3)', marginTop: 2 }}>{amObjekt.email}</div>
              ) : null}
            </div>
            <div style={{ color: 'var(--text-3)', fontSize: 'var(--fs-meta)' }}>
              Portal-Zugang:{' '}
              {amObjekt.isLegacy
                ? 'nur Kontakt (Legacy)'
                : amObjekt.portal_zugang
                  ? amObjekt.portal_kunde_id
                    ? 'aktiv'
                    : 'Einladung möglich'
                  : 'nein'}
            </div>
            {amObjekt.isLegacy ? (
              <p style={{ color: 'var(--text-3)', fontSize: 'var(--fs-meta)', margin: 0 }}>
                Noch unter Objekt-Kontakte. Bitte hier als Org-Hausmeister speichern, damit Portal und
                Auto-Zuweisung greifen.
              </p>
            ) : null}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {!amObjekt.isLegacy && amObjekt.portal_zugang && !amObjekt.portal_kunde_id ? (
                <MockBtn sm kind="secondary" disabled={pending} onClick={einladen}>
                  Einladung senden
                </MockBtn>
              ) : null}
              {!amObjekt.isLegacy && amObjekt.portal_zugang && amObjekt.portal_kunde_id ? (
                <PortalLoginIconButton
                  kundeId={amObjekt.portal_kunde_id}
                  label="Hausmeister-Portal öffnen"
                  withLabel
                />
              ) : null}
              {!amObjekt.isLegacy ? (
                <MockBtn sm kind="ghost" disabled={pending} onClick={entfernen}>
                  Entfernen
                </MockBtn>
              ) : null}
            </div>
          </div>
        )}
      </MockCard>

      <EditorSheet
        open={sheetOpen}
        onClose={() => !pending && setSheetOpen(false)}
        title={mode === 'new' ? 'Hausmeister anlegen' : 'Hausmeister zuweisen'}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <MockBtn sm kind="ghost" disabled={pending} onClick={() => setSheetOpen(false)}>
              Abbrechen
            </MockBtn>
            <MockBtn sm kind="primary" disabled={pending} onClick={speichern}>
              Speichern
            </MockBtn>
          </div>
        }
      >
        <div className="space-y-3">
          {liste.length > 0 ? (
            <Select
              label="Auswahl"
              value={mode === 'new' ? '__new__' : hmId}
              options={selectOptions}
              onChange={(e) => onSelectChange(e.target.value)}
            />
          ) : null}

          {mode === 'new' ? (
            <>
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Max Mustermann"
                autoComplete="name"
                required
              />
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  fontSize: 'var(--fs-meta)',
                  color: 'var(--text-2)',
                }}
              >
                <input
                  type="checkbox"
                  checked={portalZugang}
                  onChange={(e) => setPortalZugang(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span>Portal-Zugang — Einladung per E-Mail nach Speichern</span>
              </label>
              {portalZugang ? (
                <Input
                  label="E-Mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@firma.de"
                  autoComplete="email"
                  required
                />
              ) : null}
            </>
          ) : (
            <>
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  fontSize: 'var(--fs-meta)',
                  color: 'var(--text-2)',
                }}
              >
                <input
                  type="checkbox"
                  checked={portalZugang}
                  onChange={(e) => setPortalZugang(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span>Portal-Zugang</span>
              </label>
              <Input
                label="E-Mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@firma.de"
                autoComplete="email"
                disabled={!portalZugang}
              />
            </>
          )}

          {err ? (
            <p style={{ color: 'var(--danger)', fontSize: 'var(--fs-meta)', margin: 0 }}>{err}</p>
          ) : null}
        </div>
      </EditorSheet>
    </>
  )
}

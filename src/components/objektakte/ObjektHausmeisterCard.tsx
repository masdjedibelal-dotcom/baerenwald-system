'use client'

import { useEffect, useState } from 'react'
import { useTransition } from '@/components/ui/action-busy'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { toast } from '@/components/ui/app-toast'
import {
  activateObjektHausmeisterPortal,
  inviteObjektHausmeister,
  removeObjektHausmeister,
  saveObjektHausmeister,
} from '@/app/actions/org-hausmeister'
import { getPortalLoginHint } from '@/app/actions/kunden'
import { openPortalAsKunde } from '@/app/(dashboard)/impersonation/actions'
import { useIsCrmAdmin } from '@/hooks/useIsCrmAdmin'
import { isBaerenwaldPrimaryStaffEmail } from '@/lib/auth/crm-access'
import { cn } from '@/lib/utils'
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
 * Portal-Zeile wie Kunde/Handwerker: Status · Einladen/Aktivieren · Login.
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
  const isCrmAdmin = useIsCrmAdmin()

  const [mode, setMode] = useState<'existing' | 'new'>('new')
  const [hmId, setHmId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [portalZugang, setPortalZugang] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [registered, setRegistered] = useState<boolean | null>(null)
  const [loginBusy, setLoginBusy] = useState(false)

  useEffect(() => {
    setListe(initialListe)
    setAmObjekt(initialAmObjekt)
  }, [initialListe, initialAmObjekt])

  const portalKundeId = amObjekt?.portal_kunde_id?.trim() || null
  const hmEmail = amObjekt?.email?.trim() || ''
  const primaryStaff = isBaerenwaldPrimaryStaffEmail(hmEmail)

  useEffect(() => {
    if (!amObjekt || amObjekt.isLegacy || !amObjekt.portal_zugang) {
      setRegistered(null)
      return
    }
    if (!portalKundeId) {
      // Primary Staff: Auth existiert schon (CRM) → nach Aktivierung „aktiv“
      setRegistered(false)
      return
    }
    let cancelled = false
    void (async () => {
      const hint = await getPortalLoginHint(portalKundeId)
      if (cancelled) return
      if (hint.ok && hint.hasAuthAccount) {
        setRegistered(true)
        return
      }
      // Primary Staff: Auth oft nur an Handwerker/CRM — trotzdem Login möglich
      if (primaryStaff) {
        setRegistered(true)
        return
      }
      setRegistered(false)
    })()
    return () => {
      cancelled = true
    }
  }, [amObjekt, portalKundeId, primaryStaff, amObjekt?.portal_zugang, amObjekt?.isLegacy])

  function openSheet() {
    setErr(null)
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
      const staffMail = isBaerenwaldPrimaryStaffEmail(
        mode === 'new' ? email : email || amObjekt?.email
      )
      toast.success(
        staffMail && portalZugang
          ? 'Hausmeister gespeichert — Portal aktiviert'
          : mode === 'new'
            ? 'Hausmeister angelegt'
            : 'Hausmeister gespeichert'
      )
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

  function einladenOderAktivieren() {
    if (!amObjekt || amObjekt.isLegacy || !amObjekt.portal_zugang) return
    startTransition(async () => {
      if (primaryStaff || !portalKundeId) {
        const r = await activateObjektHausmeisterPortal(kundeId, objektId, amObjekt.id)
        if (!r.ok) {
          toast.error(r.message)
          return
        }
        toast.success(
          r.primaryStaff
            ? 'Hausmeister-Portal aktiv (Team-Login)'
            : r.hasAuthAccount
              ? 'Portal aktiv'
              : 'Portal-Stub angelegt — Einladung senden'
        )
        if (!r.primaryStaff && !r.hasAuthAccount) {
          const inv = await inviteObjektHausmeister(kundeId, objektId, amObjekt.id)
          if (inv.ok && inv.inviteMailto) {
            window.location.href = inv.inviteMailto
          }
        }
        onChanged()
        return
      }
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

  async function openLogin() {
    if (loginBusy || !portalKundeId) return
    setLoginBusy(true)
    const popup = window.open('about:blank', '_blank')
    try {
      const r = await openPortalAsKunde(portalKundeId)
      if (!r.ok) {
        popup?.close()
        toast.error(r.message)
        return
      }
      if (popup) popup.location.href = r.url
      else window.location.assign(r.url)
    } catch {
      popup?.close()
      toast.error('Portal konnte nicht geöffnet werden.')
    } finally {
      setLoginBusy(false)
    }
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

  const showPortalZeile =
    amObjekt && !amObjekt.isLegacy && amObjekt.portal_zugang
  const statusLabel =
    registered === true
      ? 'Portal aktiv'
      : registered === false
        ? 'Noch nicht registriert'
        : showPortalZeile
          ? '…'
          : null
  const showInvite = showPortalZeile && registered === false
  const showLogin =
    showPortalZeile && registered === true && Boolean(portalKundeId) && isCrmAdmin

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
            {amObjekt.isLegacy ? (
              <p style={{ color: 'var(--text-3)', fontSize: 'var(--fs-meta)', margin: 0 }}>
                Noch unter Objekt-Kontakte. Bitte hier als Org-Hausmeister speichern, damit Portal und
                Auto-Zuweisung greifen.
              </p>
            ) : !amObjekt.portal_zugang ? (
              <div style={{ color: 'var(--text-3)', fontSize: 'var(--fs-meta)' }}>
                Portal-Zugang: nein
              </div>
            ) : (
              <div className="vgid-portal">
                <span
                  className={cn(
                    'd',
                    registered === true ? 'is-on' : registered === false ? 'is-off' : ''
                  )}
                  aria-hidden
                />
                <span className="t">{statusLabel}</span>
                {showInvite ? (
                  <span className="a">
                    <button
                      type="button"
                      className="vgid-portal__invite"
                      onClick={einladenOderAktivieren}
                      disabled={pending}
                      aria-label={primaryStaff ? 'Portal aktivieren' : 'Portal-Einladung senden'}
                      title={
                        primaryStaff
                          ? 'Team-Login als Hausmeister aktivieren'
                          : 'Portal-Einladung erneut senden'
                      }
                    >
                      <MockIcon ctx="default" n="send" size={15} />
                      <span>{primaryStaff ? 'Aktivieren' : 'Einladen'}</span>
                    </button>
                  </span>
                ) : null}
                {showLogin ? (
                  <span className="a">
                    <button
                      type="button"
                      className="vgid-portal__login"
                      onClick={() => void openLogin()}
                      disabled={loginBusy || pending}
                      aria-label="Hausmeister-Portal Login"
                      title="Als Hausmeister im Portal anmelden"
                    >
                      <MockIcon ctx="btn" n="log-in" size={15} />
                      <span>Login</span>
                    </button>
                  </span>
                ) : null}
              </div>
            )}
            {primaryStaff && amObjekt.portal_zugang ? (
              <p style={{ color: 'var(--text-3)', fontSize: 'var(--fs-meta)', margin: 0 }}>
                Team-Mail: gleiches Login wie CRM / Partner / HV — kein separates Registrieren.
              </p>
            ) : null}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
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
                <span>
                  {isBaerenwaldPrimaryStaffEmail(email)
                    ? 'Portal-Zugang — Team-Login sofort aktiv'
                    : 'Portal-Zugang — Einladung per E-Mail nach Speichern'}
                </span>
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

'use client'

import { useEffect, useState } from 'react'
import { useTransition } from '@/components/ui/action-busy'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { MockModal } from '@/components/mock-ui/MockModal'
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
import { PortalLoginIconButton } from '@/components/portal/PortalLoginIconButton'
import { useIsCrmAdmin } from '@/hooks/useIsCrmAdmin'
import { useIsMobile } from '@/hooks/useIsMobile'
import { isBaerenwaldPrimaryStaffEmail } from '@/lib/auth/crm-access'
import { LIST } from '@/lib/crm-labels'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { cn } from '@/lib/utils'
import type { HausmeisterAmObjekt, OrgHausmeister } from '@/lib/org/org-hausmeister-types'

const HM_LIST_COLS = 'minmax(0, 1.2fr) minmax(0, 0.9fr) minmax(0, 1.2fr) auto'

type Props = {
  kundeId: string
  objektId: string
  liste: OrgHausmeister[]
  amObjekt: HausmeisterAmObjekt | null
  onChanged: () => void
}

/**
 * Hausmeister am Objekt — gleiche Listen-Card wie Kontakte/Ansprechpartner
 * (ap-list + ⋯-Menü für Bearbeiten/Entfernen).
 */
export function ObjektHausmeisterCard({
  kundeId,
  objektId,
  liste: initialListe,
  amObjekt: initialAmObjekt,
  onChanged,
}: Props) {
  const isMobile = useIsMobile()
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
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removePending, setRemovePending] = useState(false)

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

  async function runEntfernen() {
    if (!amObjekt || amObjekt.isLegacy || removePending) return
    setRemovePending(true)
    try {
      const r = await removeObjektHausmeister(kundeId, objektId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setRemoveOpen(false)
      toast.success('Zuordnung entfernt')
      onChanged()
    } finally {
      setRemovePending(false)
    }
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

  const showPortalZeile =
    amObjekt && !amObjekt.isLegacy && amObjekt.portal_zugang
  const statusLabel = amObjekt?.isLegacy
    ? 'Legacy (Objekt-Kontakt)'
    : !amObjekt?.portal_zugang
      ? 'Ohne Portal'
      : registered === true
        ? 'Portal aktiv'
        : registered === false
          ? 'Noch nicht registriert'
          : '…'
  const showInvite = Boolean(showPortalZeile && registered === false)
  /** Login sobald Portal-Stub existiert (nicht erst nach Auth-Check). */
  const showLogin = Boolean(
    showPortalZeile && portalKundeId && isCrmAdmin
  )

  function rowMenu(): EntityMenuItem[] {
    if (!amObjekt) return []
    const items: EntityMenuItem[] = [
      {
        icon: 'pencil',
        label: amObjekt.isLegacy ? 'Als Org-HM speichern' : 'Bearbeiten',
        onClick: openSheet,
      },
    ]
    if (showInvite) {
      items.push({
        icon: 'send',
        label: primaryStaff ? 'Portal aktivieren' : 'Einladen',
        onClick: einladenOderAktivieren,
        disabled: pending,
      })
    }
    if (showLogin) {
      items.push({
        icon: 'log-in',
        label: 'Login',
        onClick: () => void openLogin(),
        disabled: loginBusy || pending,
      })
    }
    if (!amObjekt.isLegacy) {
      items.push('sep', {
        icon: 'trash',
        label: 'Entfernen',
        danger: true,
        onClick: () => setRemoveOpen(true),
      })
    }
    return items
  }

  function rowBody() {
    if (!amObjekt) return null
    const kontakt = amObjekt.email?.trim() || '—'
    return (
      <div
        className={isMobile ? 'ap-mobile-card ap-mobile-card--row' : 'ap-list__row'}
        style={isMobile ? undefined : { gridTemplateColumns: HM_LIST_COLS }}
      >
        <button
          type="button"
          className={isMobile ? 'ap-mobile-card__hit' : 'ap-list__hit'}
          onClick={openSheet}
        >
          {isMobile ? (
            <>
              <div className="ap-mobile-card__top">
                <span className="ap-mobile-card__name">{amObjekt.name}</span>
              </div>
              <div className="ap-mobile-card__meta">{statusLabel}</div>
              <div className="ap-mobile-card__meta">{kontakt}</div>
            </>
          ) : (
            <>
              <span className="ap-list__name-cell">{amObjekt.name}</span>
              <span className="ap-list__dim">
                {showPortalZeile ? (
                  <span className="vgid-portal" style={{ display: 'inline-flex' }}>
                    <span
                      className={cn(
                        'd',
                        registered === true ? 'is-on' : registered === false ? 'is-off' : ''
                      )}
                      aria-hidden
                    />
                    <span className="t">{statusLabel}</span>
                  </span>
                ) : (
                  statusLabel
                )}
              </span>
              <span className="ap-list__dim">{kontakt}</span>
            </>
          )}
        </button>
        <div
          className="row-actions always"
          onClick={(e) => e.stopPropagation()}
          style={{ justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}
        >
          {showLogin ? (
            <PortalLoginIconButton
              kundeId={portalKundeId}
              label="Hausmeister-Portal öffnen"
              withLabel
            />
          ) : null}
          <MockEntityRowMenu items={rowMenu()} title={amObjekt.name} />
        </div>
      </div>
    )
  }

  return (
    <>
      <MockCard
        title={amObjekt ? 'Hausmeister · 1' : 'Hausmeister'}
        icon="key"
        actions={
          !amObjekt ? (
            <MockBtn sm kind="primary" icon="plus" onClick={openSheet} disabled={pending}>
              {LIST.hinzufuegen}
            </MockBtn>
          ) : null
        }
      >
        {!amObjekt ? (
          <MockEmpty
            icon="key"
            title="Kein Hausmeister"
            hint="Neu anlegen oder bestehenden Org-Hausmeister zuweisen — Pflicht für Meldungen."
          />
        ) : isMobile ? (
          <div className="ap-cards">{rowBody()}</div>
        ) : (
          <div className="ap-list">
            <div
              className="ap-list__head"
              style={{ gridTemplateColumns: HM_LIST_COLS }}
            >
              <span>Name</span>
              <span>Status</span>
              <span>Kontakt</span>
              <span aria-hidden />
            </div>
            {rowBody()}
          </div>
        )}
      </MockCard>

      <MockModal
        open={removeOpen}
        onClose={() => {
          if (!removePending) setRemoveOpen(false)
        }}
        icon="trash"
        title="Hausmeister entfernen?"
        sub="Zuordnung am Objekt aufheben."
        size="sm"
        footer={
          <>
            <MockBtn kind="ghost" disabled={removePending} onClick={() => setRemoveOpen(false)}>
              Abbrechen
            </MockBtn>
            <div style={{ flex: 1 }} />
            <MockBtn
              kind="danger"
              icon={removePending ? undefined : 'trash'}
              disabled={removePending}
              onClick={() => void runEntfernen()}
            >
              {removePending ? 'Wird entfernt…' : 'Entfernen'}
            </MockBtn>
          </>
        }
      >
        <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.5 }}>
          {removePending
            ? 'Bitte warten…'
            : `„${amObjekt?.name ?? 'Hausmeister'}“ wird vom Objekt entfernt.`}
        </div>
      </MockModal>

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

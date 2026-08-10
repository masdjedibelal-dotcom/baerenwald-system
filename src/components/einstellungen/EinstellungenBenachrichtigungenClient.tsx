'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { toast } from '@/components/ui/app-toast'
import {
  getCrmPushSetup,
  removeCrmPushSubscription,
  saveCrmPushSubscription,
  setCrmPushPrefSwitch,
} from '@/app/(dashboard)/einstellungen/benachrichtigungen/actions'
import {
  ensureCrmServiceWorker,
  serializePushSubscription,
  showLocalTestNotification,
  subscribeCrmPush,
  unsubscribeCrmPush,
} from '@/lib/push/client'
import {
  isCrmPwaStandalone,
  pushSupportedInBrowser,
  resolvePushCapabilityStatus,
  type PushCapabilityStatus,
} from '@/lib/push/detect'
import {
  CRM_PUSH_PREF_DEFAULTS,
  CRM_PUSH_SWITCHES,
  type CrmPushPrefKey,
  type CrmPushPrefs,
} from '@/lib/push/prefs'

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          paddingBottom: 8,
          borderBottom: '0.5px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.01em' }}>{title}</span>
        <div style={{ flex: 1 }} />
      </div>
      <div>{children}</div>
    </div>
  )
}

function statusCopy(status: PushCapabilityStatus, hasSub: boolean): {
  title: string
  sub: string
} {
  switch (status) {
    case 'unsupported':
      return {
        title: 'Nicht unterstützt',
        sub: 'Dieser Browser kann keine Push-Benachrichtigungen.',
      }
    case 'not_installed':
      return {
        title: 'App nicht auf dem Home-Bildschirm',
        sub: 'Nur in der installierten PWA (zum Home-Bildschirm hinzufügen). Safari: Teilen → Zum Home-Bildschirm. Chrome: Menü → App installieren.',
      }
    case 'permission_denied':
      return {
        title: 'Berechtigung blockiert',
        sub: 'In den System-/Browser-Einstellungen für Bärenwald CRM Benachrichtigungen erlauben.',
      }
    case 'permission_default':
      return {
        title: 'Berechtigung ausstehend',
        sub: 'Master einschalten und „Erlauben“ tippen — nur in der PWA möglich.',
      }
    case 'ready':
      return {
        title: hasSub ? 'Aktiv auf diesem Gerät' : 'Bereit',
        sub: hasSub
          ? 'Push kommt auch bei geschlossener App. Ohne Login öffnet der Tip den Login-Screen.'
          : 'Master einschalten, um dieses Gerät zu registrieren.',
      }
  }
}

export function EinstellungenBenachrichtigungenClient() {
  const [prefs, setPrefs] = useState<CrmPushPrefs>({ ...CRM_PUSH_PREF_DEFAULTS })
  const [vapid, setVapid] = useState<string | null>(null)
  const [hasSub, setHasSub] = useState(false)
  const [cap, setCap] = useState<PushCapabilityStatus>('unsupported')
  const [pending, startTransition] = useTransition()

  const refreshCap = useCallback(() => {
    setCap(resolvePushCapabilityStatus())
  }, [])

  useEffect(() => {
    refreshCap()
    startTransition(async () => {
      const setup = await getCrmPushSetup()
      setPrefs(setup.prefs)
      setVapid(setup.vapidPublicKey)
      setHasSub(setup.hasSubscription)
    })
    void ensureCrmServiceWorker().catch(() => {
      /* ignore outside secure context */
    })
  }, [refreshCap])

  function applyPrefs(next: CrmPushPrefs) {
    setPrefs(next)
  }

  function toggleMaster(nextOn: boolean) {
    startTransition(async () => {
      if (nextOn) {
        if (!isCrmPwaStandalone()) {
          toast.error('Bitte die App zuerst zum Home-Bildschirm hinzufügen.')
          refreshCap()
          return
        }
        if (!pushSupportedInBrowser()) {
          toast.error('Push wird von diesem Browser nicht unterstützt.')
          return
        }
        if (!vapid) {
          toast.error('Push ist serverseitig noch nicht konfiguriert (VAPID).')
          return
        }
        try {
          const perm = await Notification.requestPermission()
          refreshCap()
          if (perm !== 'granted') {
            toast.error('Berechtigung nicht erteilt.')
            return
          }
          const sub = await subscribeCrmPush(vapid)
          const serialized = serializePushSubscription(sub)
          const saved = await saveCrmPushSubscription(serialized)
          if (!saved.ok) {
            toast.error(saved.message)
            return
          }
          const prefRes = await setCrmPushPrefSwitch('push_enabled', true)
          if (!prefRes.ok) {
            toast.error(prefRes.message)
            return
          }
          applyPrefs(prefRes.prefs)
          setHasSub(true)
          toast.success('Push aktiviert')
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Aktivierung fehlgeschlagen')
        }
        return
      }

      try {
        await unsubscribeCrmPush()
      } catch {
        /* ignore */
      }
      const removed = await removeCrmPushSubscription()
      if (!removed.ok) {
        toast.error(removed.message)
        return
      }
      const prefRes = await setCrmPushPrefSwitch('push_enabled', false)
      if (!prefRes.ok) {
        toast.error(prefRes.message)
        return
      }
      applyPrefs(prefRes.prefs)
      setHasSub(false)
      toast.success('Push deaktiviert')
    })
  }

  function toggleEvent(key: CrmPushPrefKey, nextOn: boolean) {
    startTransition(async () => {
      const res = await setCrmPushPrefSwitch(key, nextOn)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      applyPrefs(res.prefs)
      toast.success(nextOn ? 'Aktiviert' : 'Deaktiviert')
    })
  }

  function onTest() {
    startTransition(async () => {
      try {
        await showLocalTestNotification()
        toast.success('Test-Banner gesendet')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Test fehlgeschlagen')
      }
    })
  }

  const copy = statusCopy(cap, hasSub)
  const masterOn = prefs.push_enabled
  const eventsDisabled = !masterOn || pending

  return (
    <>
      <Sec title="Geräte-Push">
        <div className="setting-row">
          <div>
            <div className="lbl">Push-Benachrichtigungen</div>
            <div className="sub">
              Auf dem Home-Bildschirm, auch wenn die App zu ist. Tip ohne Login → Login-Screen.
            </div>
          </div>
          <button
            type="button"
            className={`switch${masterOn ? ' on' : ''}`}
            aria-pressed={masterOn}
            disabled={pending || cap === 'unsupported'}
            onClick={() => toggleMaster(!masterOn)}
          />
        </div>
        <p className="mt-3 text-[length:var(--fs-text)] text-[var(--text-3)]">
          <strong className="font-medium text-[var(--text)]">{copy.title}</strong>
          <br />
          {copy.sub}
        </p>
        {typeof Notification !== 'undefined' && Notification.permission === 'granted' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn ghost sm" disabled={pending} onClick={onTest}>
              Test-Benachrichtigung
            </button>
          </div>
        ) : null}
      </Sec>

      <Sec title="Wann benachrichtigen?">
        {CRM_PUSH_SWITCHES.map((sw) => {
          const on = prefs[sw.key]
          return (
            <div key={sw.key} className={`setting-row${eventsDisabled ? ' opacity-55' : ''}`}>
              <div>
                <div className="lbl">{sw.label}</div>
                <div className="sub">{sw.desc}</div>
              </div>
              <button
                type="button"
                className={`switch${on ? ' on' : ''}`}
                aria-pressed={on}
                disabled={eventsDisabled}
                onClick={() => toggleEvent(sw.key, !on)}
              />
            </div>
          )
        })}
      </Sec>
    </>
  )
}

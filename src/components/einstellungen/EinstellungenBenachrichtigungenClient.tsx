'use client'

import { MockBtn } from '@/components/mock-ui'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { toast } from '@/components/ui/app-toast'
import { EinstellungenSectionHeading } from '@/components/einstellungen/EinstellungenUi'
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
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <EinstellungenSectionHeading className="mb-3.5">{title}</EinstellungenSectionHeading>
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
        sub: 'In den System-/Browser-Einstellungen für Bärenwald Benachrichtigungen erlauben.',
      }
    case 'permission_default':
      return {
        title: 'Berechtigung ausstehend',
        sub: 'Master einschalten und „Erlauben“ tippen — nur in der PWA möglich.',
      }
    case 'ready':
      return {
        title: hasSub ? '' : 'Bereit',
        sub: hasSub
          ? ''
          : 'Master einschalten, um dieses Gerät zu registrieren.',
      }
  }
}

export function EinstellungenBenachrichtigungenClient() {
  const [prefs, setPrefs] = useState<CrmPushPrefs>({ ...CRM_PUSH_PREF_DEFAULTS })
  const [vapid, setVapid] = useState<string | null>(null)
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
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
          applyFieldErrors({ _form: TOAST.bitte_die_app_zuerst_zum_home_bildschirm_hinzufu })
          refreshCap()
          return
        }
        if (!pushSupportedInBrowser()) {
          toast.error(TOAST.push_wird_von_diesem_browser_nicht_unterstuetzt)
          return
        }
        if (!vapid) {
          toast.error(TOAST.push_ist_serverseitig_noch_nicht_konfiguriert_va)
          return
        }
        try {
          const perm = await Notification.requestPermission()
          refreshCap()
          if (perm !== 'granted') {
            toast.error(TOAST.berechtigung_nicht_erteilt)
            return
          }
          const sub = await subscribeCrmPush(vapid)
          const serialized = serializePushSubscription(sub)
          const saved = await saveCrmPushSubscription(serialized)
          if (!saved.ok) {
            toast.systemError(saved)
            return
          }
          const prefRes = await setCrmPushPrefSwitch('push_enabled', true)
          if (!prefRes.ok) {
            toast.systemError(prefRes)
            return
          }
          applyPrefs(prefRes.prefs)
          setHasSub(true)
          toast.success(TOAST.push_aktiviert)
        } catch (e) {
          toast.systemError(e, 'ui', 'Aktivierung fehlgeschlagen')
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
        toast.systemError(removed)
        return
      }
      const prefRes = await setCrmPushPrefSwitch('push_enabled', false)
      if (!prefRes.ok) {
        toast.systemError(prefRes)
        return
      }
      applyPrefs(prefRes.prefs)
      setHasSub(false)
      toast.success(TOAST.push_deaktiviert)
    })
  }

  function toggleEvent(key: CrmPushPrefKey, nextOn: boolean) {
    startTransition(async () => {
      const res = await setCrmPushPrefSwitch(key, nextOn)
      if (!res.ok) {
        toast.systemError(res)
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
        toast.success(TOAST.test_banner_gesendet)
      } catch (e) {
        toast.systemError(e, 'ui', 'Test fehlgeschlagen')
      }
    })
  }

  const copy = statusCopy(cap, hasSub)
  const masterOn = prefs.push_enabled
  const eventsDisabled = !masterOn || pending
  const showStatus = Boolean(copy.title || copy.sub)

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
          <MockBtn className={`switch${masterOn ? ' on' : ''}`} type="button" aria-pressed={masterOn} disabled={pending || cap === 'unsupported'} onClick={() => toggleMaster(!masterOn)} />
        </div>
        {showStatus ? (
          <p className="mt-3 text-[length:var(--fs-text)] text-[var(--text-3)]">
            {copy.title ? (
              <>
                <strong className="font-medium text-[var(--text)]">{copy.title}</strong>
                {copy.sub ? <br /> : null}
              </>
            ) : null}
            {copy.sub}
          </p>
        ) : null}
        {typeof Notification !== 'undefined' && Notification.permission === 'granted' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <MockBtn kind="primary" sm type="button" disabled={pending} onClick={onTest}>
              Test-Benachrichtigung
            </MockBtn>
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
              <MockBtn className={`switch${on ? ' on' : ''}`} type="button" aria-pressed={on} disabled={eventsDisabled} onClick={() => toggleEvent(sw.key, !on)} />
            </div>
          )
        })}
      </Sec>
    </>
  )
}

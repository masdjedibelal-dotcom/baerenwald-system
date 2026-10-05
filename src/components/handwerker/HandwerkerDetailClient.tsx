'use client'

import {
DetailShell,
EntityDetailLayout,
type DetailShellGroup,
} from '@/components/layout/EntityDetailLayout'
import { MockNotizComposer,MockNotizenCard } from '@/components/mock-ui/MockDetailCards'
import { MockField,MockInput } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { afterServerActionRefresh } from '@/lib/crm-client-refresh'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useLocalTransition } from '@/components/ui/action-busy'
import { C } from '@/lib/tokens/colors'

import { useCallback,useEffect,useMemo,useRef,useState,Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'
import { DetailActionsBar } from '@/components/layout/DetailActionsBar'
import { EntityHandwerkerStammdatenCard } from '@/components/crm/EntityHandwerkerStammdatenCard'
import { EntityHandwerkerBankCard } from '@/components/crm/EntityHandwerkerBankCard'
import { HandwerkerAkteDokumente } from '@/components/handwerker/HandwerkerAkteDokumente'
import {
filterStandardComplianceTypen,
istEigeneUnterlageTyp,
} from '@/lib/handwerker/compliance-katalog'
import { useDetailQuickActions } from '@/components/vorgang/DetailQuickActions'
import { VorgangAkteTab } from '@/components/vorgang/VorgangAkteTab'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ClientOnly } from '@/components/ui/ClientOnly'
import { RahmenvertragWizard } from '@/components/vertraege/RahmenvertragWizard'
import {
type RahmenVertragWizardBootstrap
} from '@/app/(dashboard)/vertraege/wizard-actions'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'
import { toast } from '@/components/ui/app-toast'
import type { HandwerkerDetailPayload } from '@/app/(dashboard)/handwerker/actions'
import {
formatHandwerkerBewertung
} from '@/lib/handwerker/bewertung-kategorien'
import {
updateHandwerkerNotizen,
getPartnerPortalLoginHint
} from '@/app/(dashboard)/handwerker/actions'
import {
handwerkerDisplayName,
handwerkerGfName,
} from '@/lib/handwerker-stammdaten'
import {
resolveHandwerkerAnschrift,
} from '@/lib/handwerker-anschrift'
import {
getPartnerPortalMailDraft,
previewPartnerPortalMail,
sendPartnerPortalLinkMail,
} from '@/app/actions/mails'
import { parseEmailTokens } from '@/lib/email-recipients'
import { buildPartnerDashboardLink } from '@/lib/portal-utils'
import type { ComplianceDokumentTyp,Gewerk,Handwerker } from '@/lib/types'
import {
FabVorgangStartModal,
type FabVorgangArt,
} from '@/components/neu/FabVorgangStartModal'
import { VorgaengeListeClient } from '@/components/vorgaenge/VorgaengeListeClient'
import type { VorgangListeRow } from '@/lib/vorgang/types'
import { TOAST } from '@/lib/copy'

type HandwerkerDetailTab = 'uebersicht' | 'vorgaenge' | 'compliance' | 'akte'

function gewerkSlugsFromField(gewerke: unknown): string[] {
  if (gewerke == null) return []
  if (Array.isArray(gewerke)) {
    return gewerke
      .map((x) => (typeof x === 'string' ? x.trim().toLowerCase() : ''))
      .filter(Boolean)
  }
  if (typeof gewerke === 'string') {
    try {
      return gewerkSlugsFromField(JSON.parse(gewerke) as unknown)
    } catch {
      return gewerke.trim() ? [gewerke.trim().toLowerCase()] : []
    }
  }
  return []
}

function gewerkTagsFromSlugs(gewerke: unknown, slugToName: Map<string, string>): string[] {
  return gewerkSlugsFromField(gewerke).map((slug) => slugToName.get(slug) ?? slug)
}

export function HandwerkerDetailClient({
  payload,
  gewerkeSlugs,
  gewerke = [],
  complianceTypen,
  rahmenVertrag = null,
  vorgaengeRows = [],
}: {
  payload: HandwerkerDetailPayload
  gewerkeSlugs: { slug: string; name: string }[]
  gewerke?: Gewerk[]
  complianceTypen: ComplianceDokumentTyp[]
  rahmenVertrag?: HandwerkerVertragRow | null
  vorgaengeRows?: VorgangListeRow[]
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const hw = payload.handwerker as Handwerker
  const slugToName = useMemo(
    () => new Map(gewerkeSlugs.map((g) => [g.slug.toLowerCase(), g.name])),
    [gewerkeSlugs]
  )
  const gewerkNamen = useMemo(() => gewerkTagsFromSlugs(hw.gewerke, slugToName), [hw.gewerke, slugToName])
  const hwGewerkSlugs = useMemo(() => gewerkSlugsFromField(hw.gewerke), [hw.gewerke])
  const [tab, setTab] = useState<HandwerkerDetailTab>('uebersicht')
  const [notizen, setNotizen] = useState(hw.notizen ?? '')
  const [notizDraft, setNotizDraft] = useState('')
  const notizenTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [rahmenWizardOpen, setRahmenWizardOpen] = useState(false)
  const [rahmenWizardBootstrap, setRahmenWizardBootstrap] =
    useState<RahmenVertragWizardBootstrap | null>(null)
  const [rahmenWizardKey, ] = useState(0)
  const [, ] = useLocalTransition()
  const [, setErr] = useState<string | null>(null)

  const [portalModalOpen, setPortalModalOpen] = useState(false)
  const [portalSending, setPortalSending] = useState(false)
  const [portalLink, setPortalLink] = useState('')
  const [portalTo, setPortalTo] = useState('')
  const [portalCc, setPortalCc] = useState('')
  const [portalBetreff, setPortalBetreff] = useState('')
  const [portalText, setPortalText] = useState('')
  const [portalHtml, setPortalHtml] = useState('')
  const [vorgangArt, setVorgangArt] = useState<FabVorgangArt | null>(null)
  const [, ] = useState(false)
  const [istPortalGesperrt, setIstPortalGesperrt] = useState(Boolean(hw.ist_portal_gesperrt))

  useEffect(() => {
    setIstPortalGesperrt(Boolean(hw.ist_portal_gesperrt))
  }, [hw.id, hw.ist_portal_gesperrt])

  useEffect(() => {
    setNotizen(hw.notizen ?? '')
  }, [hw.id, hw.notizen])

  useEffect(() => {
    void (async () => {
      const hint = await getPartnerPortalLoginHint(hw.id)
      if (hint.ok) {
        setPortalLink(hint.loginLink)
      } else {
        setPortalLink(buildPartnerDashboardLink())
      }
    })()
  }, [hw.id])

  useEffect(() => {
    if (notizenTimer.current) clearTimeout(notizenTimer.current)
    notizenTimer.current = setTimeout(() => {
      const t = notizen.trim()
      if (t === (hw.notizen ?? '').trim()) return
      void (async () => {
        const r = await updateHandwerkerNotizen(hw.id, t || null)
        if (!r.ok) setErr(r.message)
        else afterServerActionRefresh()
      })()
    }, 800)
    return () => {
      if (notizenTimer.current) clearTimeout(notizenTimer.current)
    }
  }, [notizen, hw.id, hw.notizen, router])

  // Pflichtnachweise entfallen (04.10.2026): nur noch die Handwerkskarte, Rahmenvertrag separat
  const complianceTypenStandard = useMemo(
    () =>
      filterStandardComplianceTypen(complianceTypen, hwGewerkSlugs, gewerke).filter(
        (t) => t.slug === 'handwerkskarte'
      ),
    [complianceTypen, hwGewerkSlugs, gewerke]
  )

  const bewertungGesamt = hw.bewertung_gesamt ?? null
  const kategorie = hw.subkategorie?.trim() || gewerkNamen[0] || 'Partner'

  async function openPortalModal() {
    const draft = await getPartnerPortalMailDraft(hw.id)
    if (!draft.ok) {
      toast.systemError(draft)
      return
    }
    setPortalLink(draft.portalLink)
    setPortalTo(draft.to)
    setPortalCc(draft.cc.join('; '))
    setPortalBetreff(draft.betreff)
    setPortalText(draft.text)
    setPortalHtml(draft.html)
    setPortalModalOpen(true)
  }

  async function sendenPortalLink() {
    setPortalSending(true)
    const toList = parseEmailTokens(portalTo)
    const ccList = parseEmailTokens(portalCc)
    const toPrimary = toList[0] ?? ''
    const ccMerged = [...ccList, ...toList.slice(1)].filter(Boolean)
    const res = await sendPartnerPortalLinkMail({
      handwerkerId: hw.id,
      to: toPrimary,
      cc: ccMerged,
      betreff: portalBetreff,
      text: portalText,
    })
    setPortalSending(false)
    if (!res.ok) {
      toast.systemError(res)
      return
    }
    toast.success(TOAST.partner_link_versendet)
    setPortalModalOpen(false)
  }

  useEffect(() => {
    if (!portalModalOpen) return
    const timer = setTimeout(() => {
      void (async () => {
        const preview = await previewPartnerPortalMail({
          handwerkerId: hw.id,
          text: portalText,
        })
        if (!preview.ok) return
        setPortalHtml(preview.html)
      })()
    }, 300)
    return () => clearTimeout(timer)
  }, [portalModalOpen, portalText, hw.id])

  const anschriftView = resolveHandwerkerAnschrift(hw)
  const adresseView =
    [
      [anschriftView.strasse, anschriftView.hausnummer].filter(Boolean).join(' '),
      [anschriftView.plz, anschriftView.ort].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(', ') ||
    hw.adresse?.trim() ||
    '—'

  const gewerkeOptionen = useMemo(
    () =>
      gewerke.map((g) => ({ id: g.id, name: g.name, slug: g.slug })).filter((g) => g.slug),
    [gewerke]
  )

  const uebersichtInhalt = (
    <div className="space-y-4">
      <EntityHandwerkerStammdatenCard
        handwerkerId={hw.id}
        editHandwerker={hw}
        gewerkeOptionen={gewerkeOptionen}
        initial={{
          displayName: handwerkerDisplayName(hw),
          firma: hw.firma ?? '',
          geschaeftsfuehrer: handwerkerGfName(hw),
          gewerkLabel: gewerkNamen.join(' · ') || kategorie,
          telefon: hw.telefon ?? '',
          email: hw.email ?? '',
          adresse: adresseView === '—' ? '' : adresseView,
        }}
        portalGesperrt={istPortalGesperrt}
        onInvite={() => void openPortalModal()}
      />

      <EntityHandwerkerBankCard handwerker={hw} gewerkeOptionen={gewerkeOptionen} />

    </div>
  )

  const vorgaengeInhalt = (
    <Suspense fallback={<CrmInlineLoading label="Vorgänge werden geladen …" />}>
      <VorgaengeListeClient rows={vorgaengeRows} embedded restrictHandwerkerId={hw.id} />
    </Suspense>
  )

  const appendNotiz = useCallback(() => {
    const text = notizDraft.trim()
    if (!text) return
    const next = notizen.trim() ? `${notizen.trim()}\n\n${text}` : text
    setNotizen(next)
    setNotizDraft('')
  }, [notizDraft, notizen])

  const notizenInhalt = (
    <MockNotizenCard
      notes={
        notizen.trim()
          ? [{ autor: 'Notiz', text: notizen.trim() }]
          : []
      }
      emptyHint={
        isMobile
          ? 'Noch keine Notizen. Über „Notiz“ oben hinzufügen.'
          : undefined
      }
      composer={
        isMobile ? undefined : (
          <MockNotizComposer
            value={notizDraft}
            onChange={setNotizDraft}
            onSubmit={appendNotiz}
            placeholder="Notiz schreiben"
          />
        )
      }
    />
  )

  const akteDateien = (
    <HandwerkerAkteDokumente
      handwerkerId={hw.id}
      dokumente={payload.dokumente}
      auftraege={payload.auftraege}
      handwerkskarteTyp={complianceTypenStandard[0] ?? null}
    />
  )

  const akteInhalt = (
    <VorgangAkteTab dateien={akteDateien} notizen={notizenInhalt} />
  )

  const vorgaengeCount = useMemo(
    () => vorgaengeRows.filter((r) => (r.handwerkerIds ?? []).includes(hw.id)).length,
    [vorgaengeRows, hw.id]
  )

  const akteDocsAnzahl = useMemo(
    () =>
      payload.dokumente.filter(
        (d) => d.datei_url?.trim() && (istEigeneUnterlageTyp(d.typ) || d.typ === 'handwerkskarte')
      ).length,
    [payload.dokumente]
  )
  const akteAnzahl = akteDocsAnzahl + (hw.notizen?.trim() ? 1 : 0)

  const detailShellGroups: DetailShellGroup[] = [
    {
      id: 'uebersicht',
      label: 'Übersicht',
      icon: 'layout-dashboard',
      render: () => uebersichtInhalt,
    },
    {
      id: 'vorgaenge',
      label: 'Vorgänge',
      icon: 'folders',
      count: vorgaengeCount || undefined,
      render: () => vorgaengeInhalt,
    },
    {
      id: 'akte',
      label: 'Akte',
      icon: 'file-text',
      count: akteAnzahl || undefined,
      render: () => akteInhalt,
    },
  ]

  const { quickBar, sheets: quickActionSheets } = useDetailQuickActions({
    telefon: hw.telefon,
    email: hw.email,
    whatsapp: { handwerkerId: hw.id },
    notiz: { kind: 'handwerker', handwerkerId: hw.id, initial: hw.notizen ?? '' },
    dokument: { kind: 'handwerker', handwerkerId: hw.id },
    onSaved: () => afterServerActionRefresh(),
  })

  return (
    <EntityDetailLayout
      crumbBackHref="/handwerker"
      crumbBackLabel="Zurück zur Liste"
      quickBar={quickBar}
      head={{
        title: handwerkerDisplayName(hw),
        titleBadges: undefined,
        badges: (
          <>
            {gewerkNamen.length > 0 ? (
              <span>{gewerkNamen.join(' · ')}</span>
            ) : kategorie ? (
              <span>{kategorie}</span>
            ) : null}
            {bewertungGesamt != null && bewertungGesamt > 0 ? (
              <span className="rating inline-flex items-center gap-1">
                <MockIcon
                  ctx="default"
                  n="star-filled"
                  size={12}
                  className={`text-[var(--yel-tx,${C.accentGold})]`}
                />
                {formatHandwerkerBewertung(bewertungGesamt)}
              </span>
            ) : null}
            {istPortalGesperrt ? (
              <MockBadge kind="storniert">
                <span className="inline-flex items-center gap-1">
                  <MockIcon ctx="default" n="shield-x" size={10} />
                  Portal gesperrt
                </span>
              </MockBadge>
            ) : null}
          </>
        ),
        actions: <DetailActionsBar sheetTitle="Partner" menuItems={[]} />,
      }}
    >
      <DetailShell
        groups={detailShellGroups}
        value={tab}
        onChange={(id) => setTab(id as HandwerkerDetailTab)}
      />

      <EditorSheet
        open={portalModalOpen}
        onClose={() => setPortalModalOpen(false)}
        title="Partner-Link versenden"
        size="lg"
        secondary={{ label: 'Abbrechen' }}
        primary={{
          label: 'Senden',
          onClick: () => void sendenPortalLink(),
          busy: portalSending,
        }}
      >
        <div className="space-y-3">
          <MockField label="An"><MockInput value={portalTo} onChange={(e) => setPortalTo(e.target.value)} placeholder="partner@beispiel.de; weitere@beispiel.de" /></MockField>
          <MockField label="CC (optional)"><MockInput value={portalCc} onChange={(e) => setPortalCc(e.target.value)} placeholder="intern@baerenwald.de; team@baerenwald.de" /></MockField>
          <MockField label="Betreff"><MockInput value={portalBetreff} onChange={(e) => setPortalBetreff(e.target.value)} /></MockField>
          <MockField label="Text"><RichTextEditor value={typeof (portalText) === 'string' ? (portalText) : ''} onChange={(__v) => setPortalText(__v)} minHeight={144} aria-label="Text" /></MockField>
          <div>
            <p className="mb-1 text-[length:var(--fs-meta)] font-medium text-bw-text-muted">Mail-Vorschau</p>
            <iframe
              title="Partner-Portal Mail Vorschau"
              sandbox="allow-same-origin"
              className="h-[300px] w-full rounded-card border border-bw-border bg-white"
              srcDoc={portalHtml}
            />
          </div>
          <MockField label="Partner-Portal Login"><MockInput value={portalLink} readOnly className="bg-bw-bg-soft" /></MockField>
        </div>
      </EditorSheet>

      {rahmenWizardOpen && rahmenWizardBootstrap ? (
        <ClientOnly>
          <RahmenvertragWizard
            key={rahmenWizardKey}
            bootstrap={rahmenWizardBootstrap}
            onClose={() => {
              setRahmenWizardOpen(false)
              setRahmenWizardBootstrap(null)
            }}
            onDone={() => afterServerActionRefresh()}
          />
        </ClientOnly>
      ) : null}

      <FabVorgangStartModal
        open={vorgangArt != null}
        art={vorgangArt}
        onClose={() => setVorgangArt(null)}
      />

      {quickActionSheets}
    </EntityDetailLayout>
  )
}

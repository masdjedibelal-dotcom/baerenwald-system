# N1 — Typo & Spacing Migration (vollständig Vorgangs-UI)

## Mapping
| Alter Wert | Neuer Token |
|---|---|
| ≤12.75px | `var(--fs-meta)` (=12px) |
| ≤14.75px | `var(--fs-text)` (=13.5px) |
| ≤16.5px | `var(--fs-title)` (=15px) |
| >16.5px | `var(--fs-head)` (=19px) |
| `text-xs`/`footnote` | `--fs-meta` |
| `text-sm` | `--fs-text` |
| `text-base` | `--fs-title` |
| `text-lg`+ | `--fs-head` |

## Aggregierte Ersetzungen (TSX + CSS)

- `text-sm → text-[length:var(--fs-text)]` ×227
- `text-xs → text-[length:var(--fs-meta)]` ×214
- `13px → var(--fs-text)` ×86
- `12px → var(--fs-meta)` ×47
- `11px → var(--fs-meta)` ×39
- `12.5px → var(--fs-meta)` ×29
- `text-lg → text-[length:var(--fs-head)]` ×23
- `10px → var(--fs-meta)` ×16
- `14px → var(--fs-text)` ×13
- `11.5px → var(--fs-meta)` ×8
- `18px → var(--fs-head)` ×5
- `17px → var(--fs-head)` ×3
- `15px → var(--fs-title)` ×3
- `text-base → text-[length:var(--fs-title)]` ×2
- `text-2xl → text-[length:var(--fs-head)]` ×1
- `text-xl → text-[length:var(--fs-head)]` ×1

## Dateien (TSX)

### `src/components/anfragen/AnfrageDokumenteTab.tsx`
- `fontSize: 11.5` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 12` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 12.5` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 13` → `fontSize: 'var(--fs-text)'`

### `src/components/anfragen/AnfrageLeadTabsShared.tsx`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/anfragen/AnfrageNeuForm.tsx`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/anfragen/AnfrageNotizenTab.tsx`
- `fontSize: 12` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 12.5` → `fontSize: 'var(--fs-meta)'`

### `src/components/anfragen/AnfrageWizard.tsx`
- `fontSize: 12.5` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 18` → `fontSize: 'var(--fs-head)'`

### `src/components/anfragen/DuplikatBand.tsx`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-[12px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`

### `src/components/anfragen/HvMeldungKontextCards.tsx`
- `fontSize: 12.5` → `fontSize: 'var(--fs-meta)'`

### `src/components/anfragen/LeadFunnelProjektAnzeige.tsx`
- `text-[13px]` → `text-[length:var(--fs-text)]`

### `src/components/anfragen/LeadGptStudioBlock.tsx`
- `text-[10px]` → `text-[length:var(--fs-meta)]`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/anfragen/LeadNaechsteSchritteCard.tsx`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/anfragen/LeadOrgKontextBlock.tsx`
- `text-[12px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`

### `src/components/anfragen/LeadTermineCard.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/anfragen/PipelineKontextBadge.tsx`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/anfragen/StatusModal.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/anfragen/TerminBestaetigungMailEditor.tsx`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/anfragen/TerminModal.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/anfragen/staff-funnel/StaffFunnelUi.tsx`
- `text-[12.5px]` → `text-[length:var(--fs-meta)]`

### `src/components/anfragen/staff-funnel/StaffFunnelWizard.tsx`
- `text-[12.5px]` → `text-[length:var(--fs-meta)]`
- `text-[12px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`

### `src/components/angebote/AngebotAnhaengeTab.tsx`
- `fontSize: 11.5` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 12` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 12.5` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 13` → `fontSize: 'var(--fs-text)'`

### `src/components/angebote/AngebotAuswahlPanel.tsx`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-lg` → `text-[length:var(--fs-head)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/AngebotBearbeitenWahlModal.tsx`
- `text-[10px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/AngebotHandwerkerPartnerSection.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/AngebotNeuForm.tsx`
- `text-2xl` → `text-[length:var(--fs-head)]`
- `text-lg` → `text-[length:var(--fs-head)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/AngebotNeuKundeGate.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/angebote/AngebotOrgFreigabeBanner.tsx`
- `text-[12px]` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/AngebotVersandSection.tsx`
- `text-lg` → `text-[length:var(--fs-head)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/AngebotVisualisierungClient.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/AngebotVisualisierungenTab.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/AngebotWizard.tsx`
- `fontSize: 12` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 12.5` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 14` → `fontSize: 'var(--fs-text)'`
- `fontSize: 17` → `fontSize: 'var(--fs-head)'`
- `fontSize: 18` → `fontSize: 'var(--fs-head)'`
- `text-[13px]` → `text-[length:var(--fs-text)]`

### `src/components/angebote/AngebotWizardAngebotDetailsCard.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/angebote/AngebotWizardAngebotstitelCard.tsx`
- `text-[11px]` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/AngebotWizardComplete.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xl` → `text-[length:var(--fs-head)]`

### `src/components/angebote/AngebotWizardFotodokumentation.tsx`
- `text-[12px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/AngebotWizardHandwerkerStep.tsx`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/angebote/AngebotWizardMailPreview.tsx`
- `fontSize: 12` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 13` → `fontSize: 'var(--fs-text)'`

### `src/components/angebote/AngebotWizardPdfPreview.tsx`
- `fontSize: 12` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 13` → `fontSize: 'var(--fs-text)'`
- `fontSize: 14` → `fontSize: 'var(--fs-text)'`

### `src/components/angebote/AngebotWizardPositionen.tsx`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-[12.5px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-lg` → `text-[length:var(--fs-head)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/AngebotWizardPositionenByGewerk.tsx`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-[12.5px]` → `text-[length:var(--fs-meta)]`
- `text-[12px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-lg` → `text-[length:var(--fs-head)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/AngebotWizardRechtlicheHinweiseCard.tsx`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`

### `src/components/angebote/AngebotWizardVersandEmpfaengerCard.tsx`
- `text-[12.5px]` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/AngebotWizardVizBlock.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/HandwerkerEinreichungManuellModal.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/angebote/HandwerkerEinreichungPruefung.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/HwKonditionenPruefungTable.tsx`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/OfferPositionCard.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/VizPrepareQuestions.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/VizZielbildCard.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/positionen-v3/AngebotLeistungEditModal.tsx`
- `text-[14px]` → `text-[length:var(--fs-text)]`

### `src/components/angebote/positionen-v3/AngebotLeistungNewModal.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/angebote/positionen-v3/AngebotPositionDetailModal.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/angebote/positionen-v3/AngebotPositionenV3Tab.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/AbnahmeMaengelBearbeitenFlow.tsx`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/auftraege/AbnahmeprotokollChecklist.tsx`
- `text-[12px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-[14px]` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/AbnahmeprotokollCreateWizard.tsx`
- `text-[12px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-[14px]` → `text-[length:var(--fs-text)]`
- `text-[15px]` → `text-[length:var(--fs-title)]`
- `text-[17px]` → `text-[length:var(--fs-head)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/AbschlagsplanEditorModal.tsx`
- `fontSize: 11` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 12` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 12.5` → `fontSize: 'var(--fs-meta)'`

### `src/components/auftraege/AuftragAbnahmeprotokollCard.tsx`
- `fontSize: 13` → `fontSize: 'var(--fs-text)'`

### `src/components/auftraege/AuftragBaustelleScreen.tsx`
- `text-base` → `text-[length:var(--fs-title)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/AuftragBautagesberichtCard.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/AuftragComplianceTab.tsx`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-base` → `text-[length:var(--fs-title)]`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/auftraege/AuftragDokumenteTab.tsx`
- `text-[11.5px]` → `text-[length:var(--fs-meta)]`
- `text-[12.5px]` → `text-[length:var(--fs-meta)]`
- `text-[12px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/auftraege/AuftragFinanzenClient.tsx`
- `text-lg` → `text-[length:var(--fs-head)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/AuftragHandwerkerPanel.tsx`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/AuftragKundenUpdatePanel.tsx`
- `text-[10px]` → `text-[length:var(--fs-meta)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/AuftragNachtragBaustoppSection.tsx`
- `text-lg` → `text-[length:var(--fs-head)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/AuftragNotfallBanner.tsx`
- `text-[13px]` → `text-[length:var(--fs-text)]`

### `src/components/auftraege/AuftragPartnerCompliancePanel.tsx`
- `text-[10px]` → `text-[length:var(--fs-meta)]`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/AuftragPositionHandwerkerPanel.tsx`
- `text-[10px]` → `text-[length:var(--fs-meta)]`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/AuftragPositionenGewerkView.tsx`
- `text-[10px]` → `text-[length:var(--fs-meta)]`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-[12.5px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-lg` → `text-[length:var(--fs-head)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/BaustelleBerichteDokumenteCard.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/BaustelleRegiearbeitenCard.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/BaustelleTeamCard.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/BaustelleWochenberichteCard.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/BautagebuchKundeSendModal.tsx`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/auftraege/HandwerkerAuswahlModal.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/auftraege/HandwerkerBewertungModal.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/HandwerkerDetailsModal.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/auftraege/HandwerkerKontaktModal.tsx`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/HandwerkerZuweisenModal.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/HandwerkerZuweisungMailModal.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/KundeInformierenModal.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/auftraege/MailUebersicht.tsx`
- `text-lg` → `text-[length:var(--fs-head)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/auftraege/NotfallDirektBeauftragenModal.tsx`
- `text-[12px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`

### `src/components/auftraege/leistungen-v3/AuftragGewerkAddRow.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/auftraege/leistungen-v3/AuftragLeistungZuweisungModal.tsx`
- `fontSize: 12` → `fontSize: 'var(--fs-meta)'`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/layout/DetailActionsBar.tsx`
- `text-[15px]` → `text-[length:var(--fs-title)]`

### `src/components/layout/DetailHead.tsx`
- `text-[10px]` → `text-[length:var(--fs-meta)]`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/layout/GlobalSearch.tsx`
- `text-[12px]` → `text-[length:var(--fs-meta)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/layout/ListPageParts.tsx`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/layout/PageHeader.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`

### `src/components/layout/TopBarSearch.tsx`
- `fontSize: 11.5` → `fontSize: 'var(--fs-meta)'`

### `src/components/rechnungen/RechnungAuswahlPanel.tsx`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`
- `text-lg` → `text-[length:var(--fs-head)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/rechnungen/RechnungDokumenteTab.tsx`
- `text-[12.5px]` → `text-[length:var(--fs-meta)]`
- `text-[12px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`

### `src/components/rechnungen/RechnungMahnverlaufCard.tsx`
- `fontSize: 11` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 12` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 13` → `fontSize: 'var(--fs-text)'`

### `src/components/rechnungen/RechnungWizard.tsx`
- `fontSize: 11` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 11.5` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 12` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 12.5` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 13` → `fontSize: 'var(--fs-text)'`
- `fontSize: 14` → `fontSize: 'var(--fs-text)'`
- `fontSize: 18` → `fontSize: 'var(--fs-head)'`
- `text-[12.5px]` → `text-[length:var(--fs-meta)]`

### `src/components/rechnungen/RechnungWizardDetailsCard.tsx`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-[13px]` → `text-[length:var(--fs-text)]`

### `src/components/rechnungen/RechnungWizardMailPreview.tsx`
- `fontSize: 12` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 13` → `fontSize: 'var(--fs-text)'`

### `src/components/rechnungen/RechnungWizardPdfPreview.tsx`
- `fontSize: 12` → `fontSize: 'var(--fs-meta)'`
- `fontSize: 13` → `fontSize: 'var(--fs-text)'`

### `src/components/rechnungen/RechnungWizardZahlungCard.tsx`
- `text-[12px]` → `text-[length:var(--fs-meta)]`

### `src/components/rechnungen/RechnungenExportModal.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/rechnungen/ZahlungserinnerungMailModal.tsx`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/rechnungen/ZahlungsplanEditor.tsx`
- `text-[11px]` → `text-[length:var(--fs-meta)]`
- `text-sm` → `text-[length:var(--fs-text)]`
- `text-xs` → `text-[length:var(--fs-meta)]`

### `src/components/surfaces/EditorSheet.tsx`
- `text-[14px]` → `text-[length:var(--fs-text)]`

## Spacing

- .prop vertical padding → --sp-row ×4
- padding 20px → sp-card (partial) ×4

## Verbleibende numerische fontSize/text-[Npx] in Scope: 0


## Spacing-Nachzug (CSS)

| Alt | Neu | × |
|---|---|---|
| `padding: 8px 0` (.prop) | `var(--sp-row) 0` | 3 |
| `padding: 9px 0` (.props .prop) | `var(--sp-row) 0` | 1 |
| `padding: 16px 18px` (.card-b nested) | `var(--sp-card) calc(var(--sp-card)-2px)` | 7 |
| `gap: 8px 16px` | `gap: 8px var(--sp-stack)` | 1 |
| `@apply … text-[12.5px]` | `font-size: var(--fs-meta)` | 1 |
| `@apply text-[Npx]` (übrige) | `text-[length:var(--fs-*)]` | siehe Script |

## Status N1

- `mock-design-system.css`: **0** numerische `font-size:` übrig
- Vorgangs-TSX-Scope (`vorgang*`, `leistungen`, `anfragen`, `angebote`, `auftraege`, `rechnungen`, `mock-ui`, `dashboard`, `layout`, `surfaces`): **0** `fontSize: N` / `text-[Npx]` übrig
- Tailwind `text-xs`/`sm`/`base`/`lg` in diesem Scope → Token-Klassen

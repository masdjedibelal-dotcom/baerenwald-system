/**
 * Mock-UI = Source of Truth für CRM-Primitives.
 *
 * Kanonisch:
 * - Modal: `@/components/ui/Modal` (Mock-CSS); Listen-API = `MockModal` (Adapter)
 * - Empty: `MockEmpty`; Legacy `EmptyState` = Adapter
 * - Detail-Tabs: `DetailShell`; `MockDetailShell` = uncontrolled Adapter
 *
 * Neue Screens: diese Exports nutzen, nicht parallele ui/layout-Varianten bauen.
 */
export { MockIcon, mockMenuIcon, type MockIconProps } from './MockIcon'
export { LeadStatusMockBadge } from './LeadStatusMockBadge'
export { DetailShell, type DetailShellGroup, type DetailShellProps } from './DetailShell'
export {
  MockBadge,
  MockBtn,
  MockChip,
  MockPager,
  MockSortHead,
} from './MockPrimitives'
export { MockListBar } from './MockListBar'
export { MockModal } from './MockModal'
export { MockEmpty } from './MockEmpty'
export { MockCard, MockCardArrowAction } from './MockCard'
export { MockToolbar } from './MockToolbar'
export { MockDetailShell, type MockDetailShellGroup } from './MockDetailShell'
export { MockDetailCrumb } from './MockDetailCrumb'
export { MockUebersichtCard, type MockUebersichtStat } from './MockUebersichtCard'
export { MockProp } from './MockProp'
export { MockProjektUebersichtCard } from './MockProjektUebersichtCard'
export { MockPopover, MockPopoverMenu, type MockPopoverItem } from './MockPopover'
export { MockEntityRowMenu } from './MockEntityRowMenu'
export {
  MockVerlaufCard,
  MockDokumenteCard,
  MockNotizenCard,
  MockNotizComposer,
  MockZahlplanCard,
  MockMahnungCard,
  MockBautagebuchCard,
  type MockNotiz,
} from './MockDetailCards'

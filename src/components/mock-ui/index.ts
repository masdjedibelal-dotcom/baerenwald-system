/**
 * Mock-UI = Source of Truth für CRM-Primitives.
 *
 * Kanonisch:
 * - Overlays: EditorSheet / ConfirmPopup
 * - Empty: `MockEmpty`
 * - Detail-Tabs: `DetailShell`; `MockDetailShell` = uncontrolled Adapter
 *
 * Neue Screens: diese Exports nutzen, nicht parallele ui/layout-Varianten bauen.
 */
export { MockIcon, mockMenuIcon, type MockIconProps } from './MockIcon'
export { LeadStatusMockBadge } from './LeadStatusMockBadge'
export {
  DetailShell,
  type DetailShellGroup,
  type DetailShellProps,
} from '@/components/layout/EntityDetailLayout'
export {
  MockBadge,
  MockBtn,
  MockChip,
  MockPager,
  MockSortHead,
  type MockBtnProps,
  type MockBtnKind,
  type MockBtnSize,
} from './MockPrimitives'
export { MockListBar } from './MockListBar'
export { MockEmpty } from './MockEmpty'
export { MetaTag } from './MetaTag'
export { ListBulkBar, type ListBulkBarProps } from './ListBulkBar'
export { MockCard, MockCardArrowAction } from './MockCard'
export { MockToolbar } from './MockToolbar'
export { MockDetailShell, type MockDetailShellGroup } from './MockDetailShell'
export { MockDetailCrumb } from './MockDetailCrumb'
export { MockUebersichtCard, type MockUebersichtStat } from './MockUebersichtCard'
export { MockProp } from './MockProp'
export { MockProjektUebersichtCard } from './MockProjektUebersichtCard'
export { MockPopover, type MockPopoverItem } from './MockPopover'
export {
  MockEntityRowMenu,
  MockListbarChrome,
  MockDetailOverflowMenu,
  MockNeuPopover,
  type ListbarActionItem,
} from './MockEntityRowMenu'
export { MockCheckbox, type MockCheckboxProps } from './MockCheckbox'
export { MockSegment, type MockSegmentOption } from './MockSegment'
export { MockTabs, type MockTabItem, type MockTabsProps } from './MockTabs'
export {
  MockTable,
  MockTableHead,
  MockTableBody,
  MockTableRow,
  MockTh,
  MockTd,
  type MockTableProps,
} from './MockTable'
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
export {
  MockFormSection,
  MockField,
  MockInput,
  MockSelect,
  MockTextarea,
} from './MockForm'
export { MockDragHandle } from './MockDragHandle'

import { toast } from '@/components/ui/app-toast'
import type { ExportField } from '@/hooks/useExport'

export function runMockListExport(
  exportToCSV: (
    data: Record<string, unknown>[],
    fields: ExportField[],
    filename: string
  ) => void,
  data: Record<string, unknown>[],
  fields: ExportField[],
  filename: string
) {
  exportToCSV(data, fields, filename)
  toast.success('Export gestartet')
}

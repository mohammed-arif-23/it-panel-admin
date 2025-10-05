import { useState } from 'react';
import { ExcelExportField } from '@/components/admin/ExcelExportDialog';

interface UseExcelExportOptions {
  data: any[];
  fields: ExcelExportField[];
  fileName?: string;
  sheetName?: string;
}

export function useExcelExport({
  data,
  fields: initialFields,
  fileName = 'export',
  sheetName = 'Sheet1'
}: UseExcelExportOptions) {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFields, setExportFields] = useState<ExcelExportField[]>(initialFields);

  const openExportDialog = () => {
    setExportFields(initialFields.map(f => ({ ...f, selected: true })));
    setIsExportDialogOpen(true);
  };

  const closeExportDialog = () => {
    setIsExportDialogOpen(false);
  };

  return {
    isExportDialogOpen,
    exportFields,
    openExportDialog,
    closeExportDialog,
    setExportFields
  };
}

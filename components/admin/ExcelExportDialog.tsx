"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, FileSpreadsheet, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';
import ExcelJS from 'exceljs';

export interface ExcelExportField {
  key: string;
  label: string;
  selected: boolean;
  formatter?: (value: any) => string;
}

interface ExcelExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  fields: ExcelExportField[];
  fileName?: string;
  sheetName?: string;
  logoUrl?: string;
  headerTitle?: string;
  headerSubtitle?: string;
}

export function ExcelExportDialog({
  isOpen,
  onClose,
  title,
  data,
  fields: initialFields,
  fileName = 'export',
  sheetName = 'Sheet1',
  logoUrl = 'https://avsec-it.vercel.app/logo.png',
  headerTitle = 'IT Department',
  headerSubtitle = 'Export Report'
}: ExcelExportDialogProps) {
  const [fields, setFields] = useState<ExcelExportField[]>(initialFields);
  const [isExporting, setIsExporting] = useState(false);
  const [selectAll, setSelectAll] = useState(true);

  useEffect(() => {
    setFields(initialFields);
    const allSelected = initialFields.every(f => f.selected);
    setSelectAll(allSelected);
  }, [initialFields]);

  const handleFieldToggle = (key: string) => {
    setFields(prev => prev.map(field => 
      field.key === key ? { ...field, selected: !field.selected } : field
    ));
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setFields(prev => prev.map(field => ({ ...field, selected: newSelectAll })));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Filter selected fields
      const selectedFields = fields.filter(f => f.selected);
      if (selectedFields.length === 0) {
        alert('Please select at least one field to export');
        setIsExporting(false);
        return;
      }

      // Create workbook and worksheet using ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      // Ensure at least 8 columns (A-H) so image range C1:H6 is valid
      const totalCols = Math.max(8, selectedFields.length);
      worksheet.columns = Array.from({ length: totalCols }).map((_, i) => ({
        width: 20,
        style: { font: { name: 'Times New Roman', size: 12 } }
      }));

      // No textual header info as per request; image first then data

      // Attempt to embed the logo image (placed around A5)
      try {
        if (logoUrl) {
          const resp = await fetch(logoUrl);
          const contentType = resp.headers.get('content-type') || '';
          const arrayBuf = await resp.arrayBuffer();
          const bytes = new Uint8Array(arrayBuf);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          const base64 = btoa(binary);
          const ext = contentType.includes('png') ? 'png' : (contentType.includes('jpeg') || contentType.includes('jpg')) ? 'jpeg' : 'png';
          const imageId = workbook.addImage({ base64, extension: ext as 'png' | 'jpeg' });
          // Place image spanning columns C to H and rows 1 to 6
          worksheet.addImage(imageId, 'C1:H6');
        }
      } catch (e) {
        console.warn('Logo embedding failed; continuing without image', e);
      }

      // First data header row at row 7, bold
      const headerRowIndex = 7;
      const headerLabels = selectedFields.map(f => f.label);
      const headerRow = worksheet.getRow(headerRowIndex);
      headerRow.values = headerLabels;
      headerRow.font = { name: 'Times New Roman', size: 12, bold: true };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 18;

      // Data rows (start after header)
      for (const r of data) {
        const values = selectedFields.map(field => {
          const value = r[field.key];
          return field.formatter ? field.formatter(value) : (value ?? '');
        });
        const newRow = worksheet.addRow(values);
        newRow.font = { name: 'Times New Roman', size: 12 };
      }

      // Adjust column widths based on header length
      worksheet.columns.forEach((col: any, idx: number) => {
        const hdr = headerLabels[idx] || '';
        col.width = Math.max(col.width || 20, hdr.length + 5);
      });

      // Generate and download file
      const timestamp = new Date().toISOString().split('T')[0];
      const fullFileName = `${fileName}_${timestamp}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fullFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Close dialog after successful export
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
      setIsExporting(false);
    }
  };

  const selectedCount = fields.filter(f => f.selected).length;
  const totalCount = fields.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Select the fields you want to include in the Excel export.
            The export will embed the department logo at the top of the sheet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Logo preview info */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <ImageIcon className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Header Image</p>
              <p className="text-xs text-blue-700">Logo will be embedded in the export</p>
            </div>
          </div>

          {/* Field selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">
                Select Fields ({selectedCount}/{totalCount} selected)
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectAll ? <XCircle className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                {selectAll ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg p-4">
              <div className="space-y-3">
                {fields.map((field) => (
                  <div
                    key={field.key}
                    className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Checkbox
                      id={field.key}
                      checked={field.selected}
                      onCheckedChange={() => handleFieldToggle(field.key)}
                    />
                    <Label
                      htmlFor={field.key}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      {field.label}
                      <span className="text-xs text-gray-500 ml-2">({field.key})</span>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Export info */}
          <div className="text-sm text-gray-600 space-y-1">
            <p>• {data.length} records will be exported</p>
            <p>• File format: Excel (.xlsx)</p>
            <p>• Header image: {logoUrl}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedCount === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {isExporting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

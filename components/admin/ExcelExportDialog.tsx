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
import * as XLSX from 'xlsx';

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

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare data for export
      const exportData: any[][] = [];
      
      // Add header rows with logo placeholder
      exportData.push([headerTitle]); // Main title
      exportData.push([headerSubtitle]); // Subtitle
      exportData.push([`Generated on: ${new Date().toLocaleString()}`]); // Timestamp
      exportData.push([]); // Empty row for spacing
      exportData.push([`Logo: ${logoUrl}`]); // Logo URL reference
      exportData.push([]); // Empty row for spacing
      
      // Add column headers
      const headers = selectedFields.map(f => f.label);
      exportData.push(headers);
      
      // Add data rows
      data.forEach(row => {
        const rowData = selectedFields.map(field => {
          const value = row[field.key];
          if (field.formatter) {
            return field.formatter(value);
          }
          return value ?? '';
        });
        exportData.push(rowData);
      });

      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      
      // Style the header rows (merge cells for title rows)
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: selectedFields.length - 1 } }, // Main title
        { s: { r: 1, c: 0 }, e: { r: 1, c: selectedFields.length - 1 } }, // Subtitle
        { s: { r: 2, c: 0 }, e: { r: 2, c: selectedFields.length - 1 } }, // Timestamp
        { s: { r: 4, c: 0 }, e: { r: 4, c: selectedFields.length - 1 } }, // Logo URL
      ];
      
      // Set column widths
      const colWidths = selectedFields.map(() => ({ wch: 20 }));
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Generate file name with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const fullFileName = `${fileName}_${timestamp}.xlsx`;
      
      // Write file
      XLSX.writeFile(wb, fullFileName);
      
      // Close dialog after successful export
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1000);
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
            The export will include a header with the department logo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Logo preview info */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <ImageIcon className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Header Image</p>
              <p className="text-xs text-blue-700">Logo will be referenced in the export</p>
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

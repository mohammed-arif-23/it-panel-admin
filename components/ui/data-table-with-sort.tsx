"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Download,
  RefreshCw,
  X
} from 'lucide-react';
import { sortData, filterData, toggleSortDirection, SortConfig } from '@/lib/sortUtils';

interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableWithSortProps<T> {
  title: string;
  description?: string;
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchFields?: (keyof T | string)[];
  searchPlaceholder?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  onExport?: (data: T[], filename: string) => void;
  exportFilename?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function DataTableWithSort<T extends Record<string, any>>({
  title,
  description,
  data,
  columns,
  searchable = true,
  searchFields = [],
  searchPlaceholder = "Search...",
  isLoading = false,
  onRefresh,
  onExport,
  exportFilename = 'data',
  emptyMessage = 'No data available',
  emptyIcon,
  className = '',
  actions,
}: DataTableWithSortProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Apply sorting and filtering
  const processedData = useMemo(() => {
    let result = [...data];

    // Filter
    if (searchable && searchQuery && searchFields.length > 0) {
      result = filterData(result, searchQuery, searchFields);
    }

    // Sort
    if (sortConfig) {
      result = sortData(result, sortConfig);
    }

    return result;
  }, [data, sortConfig, searchQuery, searchable, searchFields]);

  const handleSort = (key: keyof T | string) => {
    const newDirection = toggleSortDirection(
      sortConfig?.key as string || '',
      key as string,
      sortConfig?.direction || null
    );
    
    setSortConfig(newDirection ? { key, direction: newDirection } : null);
  };

  const getSortIcon = (columnKey: keyof T | string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 ml-2 opacity-50" />;
    }

    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-2 text-blue-600" />
      : <ArrowDown className="h-4 w-4 ml-2 text-blue-600" />;
  };

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                onClick={onRefresh}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            )}
            {onExport && processedData.length > 0 && (
              <Button
                onClick={() => onExport(processedData, exportFilename)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}
            {actions}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Bar */}
        {searchable && searchFields.length > 0 && (
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                onClick={() => setSearchQuery('')}
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2 text-blue-600" />
            <span>Loading data...</span>
          </div>
        ) : processedData.length === 0 ? (
          <div className="text-center py-8">
            {emptyIcon || <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />}
            <p className="text-gray-500 mb-2">{emptyMessage}</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={String(column.key)}
                        className="px-4 py-3 text-left text-sm font-semibold text-gray-700"
                      >
                        {column.sortable !== false ? (
                          <button
                            onClick={() => handleSort(column.key)}
                            className="flex items-center hover:text-blue-600 transition-colors font-semibold"
                          >
                            {column.label}
                            {getSortIcon(column.key)}
                          </button>
                        ) : (
                          column.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {processedData.map((row, rowIndex) => (
                    <tr 
                      key={rowIndex} 
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {columns.map((column) => (
                        <td key={String(column.key)} className="px-4 py-3 text-sm">
                          {column.render
                            ? column.render(getNestedValue(row, String(column.key)), row)
                            : String(getNestedValue(row, String(column.key)) || '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Info */}
        {!isLoading && processedData.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {processedData.length} {processedData.length === 1 ? 'entry' : 'entries'}
            {searchQuery && ` (filtered from ${data.length} total)`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

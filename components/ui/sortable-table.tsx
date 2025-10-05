"use client";

import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { sortData, filterData, paginateData, toggleSortDirection, SortConfig, SortDirection } from '@/lib/sortUtils';

interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface SortableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchFields?: (keyof T | string)[];
  paginated?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
}

export function SortableTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchFields = [],
  paginated = false,
  pageSize = 10,
  emptyMessage = 'No data available',
  className = '',
}: SortableTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Apply sorting, filtering, and pagination
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

    // Paginate
    if (paginated) {
      return paginateData(result, currentPage, pageSize);
    }

    return { data: result, totalPages: 1, currentPage: 1 };
  }, [data, sortConfig, searchQuery, currentPage, pageSize, searchable, searchFields, paginated]);

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
      ? <ArrowUp className="h-4 w-4 ml-2" />
      : <ArrowDown className="h-4 w-4 ml-2" />;
  };

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      {searchable && searchFields.length > 0 && (
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <Button
              variant="outline"
              onClick={() => setSearchQuery('')}
              size="sm"
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {columns.map((column) => (
                <TableHead key={String(column.key)} className="font-semibold">
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
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedData.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-gray-500">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              processedData.data.map((row, rowIndex) => (
                <TableRow key={rowIndex} className="hover:bg-gray-50 transition-colors">
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      {column.render
                        ? column.render(getNestedValue(row, String(column.key)), row)
                        : String(getNestedValue(row, String(column.key)) || '-')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {paginated && processedData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, data.length)} of {data.length} entries
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="text-sm text-gray-600">
              Page {currentPage} of {processedData.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(processedData.totalPages, currentPage + 1))}
              disabled={currentPage === processedData.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

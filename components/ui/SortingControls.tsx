'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface SortingControlsProps {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  sortOptions: Array<{
    value: string;
    label: string;
  }>;
  className?: string;
}

export function SortingControls({
  sortBy,
  sortOrder,
  onSortChange,
  sortOptions,
  className = ''
}: SortingControlsProps) {
  const toggleSortOrder = () => {
    onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={sortBy} onValueChange={(value) => onSortChange(value, sortOrder)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        variant="outline"
        size="sm"
        onClick={toggleSortOrder}
        className="px-3"
        title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
      >
        {sortOrder === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

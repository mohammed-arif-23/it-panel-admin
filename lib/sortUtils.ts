// Sorting utilities for tables and data management

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T> {
  key: keyof T | string;
  direction: SortDirection;
}

/**
 * Generic sorting function for arrays of objects
 */
export function sortData<T>(
  data: T[],
  sortConfig: SortConfig<T> | null
): T[] {
  if (!sortConfig || !sortConfig.direction) {
    return data;
  }

  const sortedData = [...data].sort((a, b) => {
    const aValue = getNestedValue(a, sortConfig.key as string);
    const bValue = getNestedValue(b, sortConfig.key as string);

    // Handle null/undefined values
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    // Handle different data types
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    }

    // Handle dates
    if (aValue instanceof Date && bValue instanceof Date) {
      return sortConfig.direction === 'asc'
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }

    // Handle date strings
    const aDate = new Date(aValue as string);
    const bDate = new Date(bValue as string);
    if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
      return sortConfig.direction === 'asc'
        ? aDate.getTime() - bDate.getTime()
        : bDate.getTime() - aDate.getTime();
    }

    // Default comparison
    return sortConfig.direction === 'asc'
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });

  return sortedData;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Toggle sort direction
 */
export function toggleSortDirection(
  currentKey: string,
  newKey: string,
  currentDirection: SortDirection
): SortDirection {
  if (currentKey !== newKey) {
    return 'asc';
  }
  
  if (currentDirection === 'asc') {
    return 'desc';
  }
  
  if (currentDirection === 'desc') {
    return null;
  }
  
  return 'asc';
}

/**
 * Search/filter data based on query string
 */
export function filterData<T>(
  data: T[],
  searchQuery: string,
  searchFields: (keyof T | string)[]
): T[] {
  if (!searchQuery.trim()) {
    return data;
  }

  const query = searchQuery.toLowerCase();
  
  return data.filter((item) => {
    return searchFields.some((field) => {
      const value = getNestedValue(item, field as string);
      return String(value).toLowerCase().includes(query);
    });
  });
}

/**
 * Paginate data
 */
export function paginateData<T>(
  data: T[],
  page: number,
  pageSize: number
): { data: T[]; totalPages: number; currentPage: number } {
  const totalPages = Math.ceil(data.length / pageSize);
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    data: data.slice(startIndex, endIndex),
    totalPages,
    currentPage,
  };
}

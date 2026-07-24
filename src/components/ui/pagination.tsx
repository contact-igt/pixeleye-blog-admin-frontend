import { Button } from './button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  itemLabel?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemLabel = 'items' }: PaginationProps) {
  if (totalPages <= 1 && (!totalItems || totalItems <= 0)) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-medium text-slate-600 shadow-xs">
      <span>
        Page {currentPage} of {totalPages || 1}{totalItems !== undefined ? ` - ${totalItems} ${itemLabel}` : ''}
      </span>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

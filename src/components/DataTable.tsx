import React from 'react';
import {
  Table,
  flexRender,
  HeaderGroup,
  Row,
  Cell,
  type RowData,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import Skeleton from './Skeleton';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Extra classes for this column's header and cells, e.g. 'hidden md:table-cell'. */
    className?: string;
  }
}

interface ExternalPagination {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<TData> {
  table: Table<TData>;
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  renderExpandedRow?: (row: TData) => React.ReactNode;
  stickyHeader?: boolean;
  className?: string;
  tableClassName?: string;
  skeletonRows?: number;
  pagination?: ExternalPagination;
  emptyMessage?: string;
}

export default function DataTable<TData>({
  table,
  loading = false,
  onRowClick,
  renderExpandedRow,
  stickyHeader = false,
  className = '',
  tableClassName = '',
  skeletonRows = 5,
  pagination,
  emptyMessage = 'No data available'
}: DataTableProps<TData>) {
  const columnsCount = table.getAllColumns().length;
  const hasInternalPagination = table.getPageCount() > 0 && table.getState().pagination != null;
  const currentPage = pagination?.page ?? (hasInternalPagination ? table.getState().pagination.pageIndex + 1 : 1);
  const totalPages = pagination?.totalPages ?? (hasInternalPagination ? Math.max(1, table.getPageCount()) : 1);

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => {
    if (totalPages <= 7) {
      return true;
    }

    return (
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1
    );
  });

  const changePage = (page: number) => {
    if (pagination) {
      pagination.onPageChange(page);
      return;
    }

    table.setPageIndex(page - 1);
  };

  const pagerBtn =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40';

  return (
    <div className={`flex min-h-0 min-w-0 w-full flex-1 flex-col ${className}`}>
      <div className="custom-scrollbar min-w-0 flex-1 overflow-x-auto">
        <table className={`w-full text-left ${tableClassName || 'border-separate border-spacing-y-2'}`}>
          <thead className={stickyHeader ? 'sticky top-0 z-20' : ''}>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
              <tr key={headerGroup.id} className="bg-slate-50">
                {headerGroup.headers.map((header) => {
                  const isSortable = header.column.getCanSort();
                  const sortingState = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className={`whitespace-nowrap border-b border-slate-200 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500 ${header.column.columnDef.meta?.className ?? ''}`}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          {...{
                            className: isSortable
                              ? 'group flex cursor-pointer select-none items-center gap-1.5 hover:text-slate-700'
                              : 'flex items-center gap-1.5',
                            onClick: header.column.getToggleSortingHandler(),
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {isSortable && (
                            <span className="text-slate-400 transition-colors group-hover:text-slate-600">
                              {sortingState === 'asc' ? (
                                <ArrowUp size={13} />
                              ) : sortingState === 'desc' ? (
                                <ArrowDown size={13} />
                              ) : (
                                <ArrowUpDown size={13} className="opacity-0 group-hover:opacity-100" />
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-slate-100 bg-white last:border-b-0">
                  {table.getVisibleLeafColumns().map((column, j) => (
                    <td key={`skeleton-cell-${j}`} className={`border-b border-slate-100 px-4 py-4 ${column.columnDef.meta?.className ?? ''}`}>
                      <Skeleton variant="text" className={j % 2 === 0 ? 'w-3/4' : 'w-1/2'} />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columnsCount} className="px-4 py-16 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row: Row<TData>) => (
                <React.Fragment key={row.id}>
                  <tr
                    className={`group relative bg-white transition-colors hover:bg-slate-50 ${onRowClick ? 'cursor-pointer' : ''} ${
                      row.getIsExpanded() ? 'bg-slate-50 shadow-[inset_3px_0_0_0_#0f172a]' : ''
                    }`}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell: Cell<TData, unknown>) => (
                      <td
                        key={cell.id}
                        className={`border-b border-slate-100 px-4 py-3 align-middle text-sm text-slate-700 group-last:border-b-0 ${cell.column.columnDef.meta?.className ?? ''} ${
                          !tableClassName.includes('border-spacing-y-0') && !tableClassName.includes('border-collapse')
                            ? 'first:rounded-l-xl last:rounded-r-xl'
                            : ''
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {renderExpandedRow && (
                    <tr
                      className={`transition-all duration-300 ease-in-out ${
                        row.getIsExpanded() ? 'bg-slate-50/80 opacity-100' : 'pointer-events-none invisible opacity-0'
                      }`}
                    >
                      <td colSpan={columnsCount} className={`p-0 ${row.getIsExpanded() ? 'border-b border-slate-200' : ''}`}>
                        <div
                          className={`grid transition-all duration-300 ease-in-out ${
                            row.getIsExpanded() ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                          }`}
                        >
                          <div className="overflow-hidden">{renderExpandedRow(row.original)}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
          <span className="text-[13px] text-slate-500">
            Page <span className="font-medium text-slate-900">{currentPage}</span> of{' '}
            <span className="font-medium text-slate-900">{totalPages}</span>
          </span>

          <div className="flex items-center gap-1">
            <button
              className={`${pagerBtn} hidden sm:flex`}
              disabled={currentPage <= 1}
              onClick={() => changePage(1)}
              title="First Page"
              type="button"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              className={pagerBtn}
              disabled={currentPage <= 1}
              onClick={() => changePage(currentPage - 1)}
              title="Previous Page"
              type="button"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="mx-1 hidden items-center gap-1 sm:flex">
              {pageNumbers.map((page, index) => {
                const previousPage = pageNumbers[index - 1];
                const showGap = previousPage != null && page - previousPage > 1;

                return (
                  <React.Fragment key={page}>
                    {showGap ? <span className="w-5 text-center text-xs text-slate-400">…</span> : null}
                    <button
                      aria-current={page === currentPage ? 'page' : undefined}
                      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[13px] font-medium transition-colors ${
                        page === currentPage ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      onClick={() => changePage(page)}
                      type="button"
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            <button
              className={pagerBtn}
              disabled={currentPage >= totalPages}
              onClick={() => changePage(currentPage + 1)}
              title="Next Page"
              type="button"
            >
              <ChevronRight size={16} />
            </button>
            <button
              className={`${pagerBtn} hidden sm:flex`}
              disabled={currentPage >= totalPages}
              onClick={() => changePage(totalPages)}
              title="Last Page"
              type="button"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

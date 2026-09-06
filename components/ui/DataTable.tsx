"use client";

import { useState } from "react";
import {
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";

export const dataTableFeatures = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<typeof dataTableFeatures, TData>[];
  data: TData[];
  emptyMessage: string;
  initialSorting?: SortingState;
  getRowId?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  getRowLabel?: (row: TData) => string;
  pageSize?: number;
}

export default function DataTable<TData extends RowData>({
  columns,
  data,
  emptyMessage,
  initialSorting = [],
  getRowId,
  onRowClick,
  getRowLabel,
  pageSize = 8,
}: DataTableProps<TData>) {
  const t = useTranslations("table");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });
  const table = useTable<typeof dataTableFeatures, TData>({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    state: { pagination },
    initialState: { sorting: initialSorting, pagination },
    onPaginationChange: setPagination,
    autoResetPageIndex: true,
    enableSortingRemoval: false,
  });

  const activateRow = (row: TData, target: EventTarget | null) => {
    if (!onRowClick) return;
    if (target instanceof Element && target.closest("a, button, input")) return;
    onRowClick(row);
  };

  return (
    <div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-start">
          <thead className="border-b border-slate-100 text-[0.65rem] font-bold uppercase tracking-[0.13em] text-slate-400">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} className="px-6 py-4 font-bold">
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1.5 hover:text-[#173b9a]"
                      >
                        <table.FlexRender header={header} />
                        <SortIcon direction={header.column.getIsSorted()} />
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-label={getRowLabel?.(row.original)}
                  onClick={(event) => activateRow(row.original, event.target)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      activateRow(row.original, event.target);
                    }
                  }}
                  className={
                    onRowClick
                      ? "cursor-pointer transition-colors hover:bg-blue-50/55 focus:bg-blue-50/55 focus:outline-none"
                      : undefined
                  }
                >
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 align-middle">
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 md:hidden">
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              aria-label={getRowLabel?.(row.original)}
              onClick={(event) => activateRow(row.original, event.target)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  activateRow(row.original, event.target);
                }
              }}
              className={`space-y-2.5 px-5 py-4 ${onRowClick ? "cursor-pointer transition-colors hover:bg-blue-50/55 focus:bg-blue-50/55 focus:outline-none" : ""}`}
            >
              {row.getAllCells().map((cell) => {
                const header = cell.column.columnDef.header;
                const label = typeof header === "string" ? header : undefined;
                return (
                  <div key={cell.id} className="flex items-center justify-between gap-3">
                    {label && (
                      <span className="shrink-0 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-slate-400">
                        {label}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 text-end text-sm text-slate-700 [&:only-child]:text-start">
                      <table.FlexRender cell={cell} />
                    </span>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            {emptyMessage}
          </div>
        )}
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
          <p>
            {t("page", {
              page: pagination.pageIndex + 1,
              pages: table.getPageCount(),
            })}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:border-blue-200 hover:text-[#173b9a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("previous")}
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:border-blue-200 hover:text-[#173b9a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (direction === "asc") return <ChevronUp size={13} />;
  if (direction === "desc") return <ChevronDown size={13} />;
  return <ChevronsUpDown size={13} className="opacity-45" />;
}

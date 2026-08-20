import React from 'react';

/**
 * ResponsiveTable — Renders a traditional table on desktop and a stacked card list on mobile.
 *
 * Props:
 *   columns   – Array of { key, label, className?, hideOnMobile?, mobileLabel? }
 *   data      – Array of row data objects
 *   renderCell(row, column) – Returns JSX for each cell
 *   renderMobileCard?(row, index) – Optional: fully custom mobile card renderer
 *   emptyState – JSX to show when data is empty
 *   keyField  – Field name used as React key (default: 'id')
 *   mobileActions?(row) – Optional: render action buttons for mobile card footer
 */
export default function ResponsiveTable({
  columns = [],
  data = [],
  renderCell,
  renderMobileCard,
  emptyState,
  keyField = 'id',
  mobileActions,
}) {
  if (data.length === 0 && emptyState) {
    return <div>{emptyState}</div>;
  }

  // Columns to show on mobile cards
  const mobileColumns = columns.filter((col) => !col.hideOnMobile);

  return (
    <div className="mobile-cards-only">
      {/* Desktop Table */}
      <div className="desktop-table overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80 text-[11px] tracking-wider">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {data.map((row) => (
              <tr key={row[keyField]} className="hover:bg-slate-50/60 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3.5 ${col.className || ''}`}>
                    {renderCell(row, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="mobile-card-list space-y-3 p-3">
        {data.map((row, index) => {
          // If custom mobile card renderer is provided, use it
          if (renderMobileCard) {
            return (
              <div key={row[keyField]}>
                {renderMobileCard(row, index)}
              </div>
            );
          }

          // Default mobile card layout
          return (
            <div
              key={row[keyField]}
              className="bg-white rounded-xl border border-slate-200/90 shadow-card overflow-hidden"
            >
              <div className="divide-y divide-slate-100">
                {mobileColumns.map((col) => (
                  <div
                    key={col.key}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide shrink-0">
                      {col.mobileLabel || col.label}
                    </span>
                    <span className="text-sm font-medium text-slate-900 text-right truncate">
                      {renderCell(row, col)}
                    </span>
                  </div>
                ))}
              </div>

              {mobileActions && (
                <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                  {mobileActions(row)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
